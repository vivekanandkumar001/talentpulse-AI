import { NextResponse, type NextRequest } from 'next/server';

/**
 * Global authentication gate + role-based route protection for Next.js App Router.
 *
 * Every page requires a valid, non-expired `tp_session` access token unless it
 * is explicitly public (marketing pages and public auth/onboarding flows).
 * A visitor without a usable token is redirected to /login with a `next` return
 * path so they land back where they were after signing in.
 *
 * The token is shape/expiry-checked here on the Edge runtime,
 * which serves as an instant pre-render redirect guard for UX and security.
 * The Flask API validates the cryptographic JWT signature, token version,
 * and database role on every single API request.
 */

// Path prefixes reachable without an access token.
const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/auth',
  '/verify-otp',
  '/forgot-password',
  '/team-invite',
  '/companion',
  '/about',
  '/services',
  '/portfolio',
  '/pricing',
  '/pay-us-now',
  '/career',
  '/careers',
  '/contact',
  '/privacy',
  '/terms',
  '/refund',
  '/ai-transparency',
  '/sitemap',
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
  '/llms-full.txt',
] as const;

// Exact-match public paths (the marketing landing page).
const PUBLIC_EXACT = new Set<string>(['/']);

interface JwtPayload {
  sub?: string;
  email?: string;
  role?: string;
  type?: string;
  exp?: number;
  ver?: number;
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const jsonStr = atob(base64);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function redirectToLogin(request: NextRequest, expired: boolean): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  if (expired) loginUrl.searchParams.set('error', 'session_expired');

  const response = NextResponse.redirect(loginUrl);
  // Clear all auth cookies so the client never loops between /login and protected routes
  response.cookies.delete('tp_session');
  response.cookies.delete('tp_role');
  response.cookies.delete('tp_refresh');
  response.cookies.delete('tp_email');
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Sanitize URLs to prevent credential leakage in search bar / logs
  const SENSITIVE_PASSWORD_PARAMS = [
    'password',
    'pwd',
    'pass',
    'newpassword',
    'new_password',
    'confirmpassword',
    'confirm_password',
    'current_password',
  ];
  const hasPasswordParam = SENSITIVE_PASSWORD_PARAMS.some((param) =>
    request.nextUrl.searchParams.has(param)
  );
  if (hasPasswordParam) {
    const cleanUrl = new URL(request.nextUrl.pathname, request.url);
    for (const [key, val] of request.nextUrl.searchParams.entries()) {
      const lowerKey = key.toLowerCase();
      if (!SENSITIVE_PASSWORD_PARAMS.includes(lowerKey)) {
        cleanUrl.searchParams.set(key, val);
      }
    }
    return NextResponse.redirect(cleanUrl);
  }

  const rawCookie = request.cookies.get('tp_session')?.value;
  let token = rawCookie ? decodeURIComponent(rawCookie).replace(/^"|"$/g, '') : null;
  let payload = token ? parseJwt(token) : null;
  let isExpired = payload?.exp ? Date.now() / 1000 >= payload.exp : false;

  const rawRefresh = request.cookies.get('tp_refresh')?.value;
  const refreshToken = rawRefresh ? decodeURIComponent(rawRefresh).replace(/^"|"$/g, '') : null;
  const newSetCookies: string[] = [];

  // Seamless session rotation: if access token is missing or expired, attempt refresh via tp_refresh
  if ((!token || isExpired || !payload || (payload.type && payload.type !== 'access') || !payload.role) && refreshToken) {
    try {
      const defaultBackend = process.env.NODE_ENV === 'production'
        ? 'https://api-atlas.progeni.live'
        : 'http://127.0.0.1:5000';
      const flaskBase = (process.env.NEXT_PUBLIC_API_URL?.split(',')[0] || '').replace(/\/+$/, '') || defaultBackend;
      const cookieHeader = `tp_refresh=${encodeURIComponent(refreshToken)}${token ? `; tp_session=${encodeURIComponent(token)}` : ''}`;
      const refreshRes = await fetch(`${flaskBase}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
          'Origin': request.nextUrl.origin,
          'X-Client-Platform': 'web',
        },
      });

      if (refreshRes.ok) {
        const setCookies =
          typeof refreshRes.headers.getSetCookie === 'function'
            ? refreshRes.headers.getSetCookie()
            : [refreshRes.headers.get('set-cookie') || ''];

        for (const cookieStr of setCookies) {
          if (!cookieStr) continue;
          newSetCookies.push(cookieStr);
          const match = cookieStr.match(/tp_session=([^;]+)/);
          if (match) {
            const rotatedToken = decodeURIComponent(match[1]).replace(/^"|"$/g, '');
            const rotatedPayload = parseJwt(rotatedToken);
            if (rotatedPayload && (!rotatedPayload.type || rotatedPayload.type === 'access') && rotatedPayload.role) {
              token = rotatedToken;
              payload = rotatedPayload;
              isExpired = false;
            }
          }
        }
      }
    } catch {
      // Refresh network failure: fall back to normal redirect
    }
  }

  // Role is taken ONLY from the session token payload — never from the JS-writable tp_role cookie.
  // (The backend enforces the real role on every API request from the database; this layer is UX routing.)
  const effectiveRole = (payload?.role ? String(payload.role) : '').toLowerCase().trim() || null;

  // A session is truly authenticated ONLY if we have a parsed payload, valid role, and not expired
  const isAuthenticated = Boolean(
    token &&
    payload &&
    (!payload.type || payload.type === 'access') &&
    effectiveRole &&
    !isExpired
  );

  // Auto-Redirect: Logged-in users visiting landing page ('/') or auth pages ('/login', '/register', '/auth')
  // are immediately auto-redirected to their role-specific Dashboard.
  const isAuthLandingPath = pathname === '/' || pathname === '/login' || pathname === '/register' || pathname === '/auth';
  const isExplicitLogout = pathname === '/login' && request.nextUrl.searchParams.has('logout');

  if (isAuthenticated && isAuthLandingPath && !isExplicitLogout) {
    const destination = effectiveRole === 'super_admin'
      ? '/super-admin'
      : (effectiveRole === 'recruiter' || effectiveRole === 'admin' || effectiveRole === 'hr')
        ? '/recruiter/dashboard'
        : '/candidate/dashboard';

    if ((pathname as string) !== destination) {
      const redirectRes = NextResponse.redirect(new URL(destination, request.url));
      for (const c of newSetCookies) redirectRes.headers.append('set-cookie', c);
      return redirectRes;
    }
  }

  // Allow explicitly public marketing and onboarding paths for unauthenticated users or public browsing
  if (isPublicPath(pathname)) {
    const res = NextResponse.next();
    if (isExplicitLogout) {
      res.cookies.delete('tp_session');
      res.cookies.delete('tp_role');
      res.cookies.delete('tp_refresh');
      res.cookies.delete('tp_email');
    }
    for (const c of newSetCookies) res.headers.append('set-cookie', c);
    return res;
  }

  // Not public and no valid authenticated session: instantly block, delete bad cookies, & redirect to login
  if (!isAuthenticated) {
    return redirectToLogin(request, isExpired);
  }

  const defaultAdminEmails = ['admin@progeni.live'];
  const allowedAdminEmailsStr = process.env.SUPER_ADMIN_EMAILS || process.env.PRIMARY_SUPER_ADMIN_EMAIL;
  const allowedAdminEmails = allowedAdminEmailsStr
    ? Array.from(new Set([...defaultAdminEmails, ...allowedAdminEmailsStr.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)]))
    : defaultAdminEmails;
  const role = effectiveRole;
  const email = String(payload?.email || '').toLowerCase().trim();

  const isCandidateRoute = pathname === '/candidate' || pathname.startsWith('/candidate/');
  const isRecruiterRoute = pathname === '/recruiter' || pathname.startsWith('/recruiter/');
  const isSuperAdminRoute =
    pathname === '/super-admin' || pathname.startsWith('/super-admin/') ||
    pathname === '/admin' || pathname.startsWith('/admin/');

  // Super Admin route protection: verified role super_admin (with optional environment allowlist if set)
  if (isSuperAdminRoute) {
    const isEmailAllowed = allowedAdminEmails ? allowedAdminEmails.includes(email) : true;
    if (role !== 'super_admin' || !isEmailAllowed) {
      if (role === 'recruiter' || role === 'admin' || role === 'hr') {
        if (pathname !== '/recruiter/dashboard') {
          const redirectRes = NextResponse.redirect(new URL('/recruiter/dashboard', request.url));
          for (const c of newSetCookies) redirectRes.headers.append('set-cookie', c);
          return redirectRes;
        }
      }
      if (role === 'candidate') {
        if (pathname !== '/candidate/dashboard') {
          const redirectRes = NextResponse.redirect(new URL('/candidate/dashboard', request.url));
          for (const c of newSetCookies) redirectRes.headers.append('set-cookie', c);
          return redirectRes;
        }
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
      loginUrl.searchParams.set('error', 'unauthorized_admin');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('tp_session');
      response.cookies.delete('tp_role');
      response.cookies.delete('tp_refresh');
      response.cookies.delete('tp_email');
      return response;
    }
  }

  // Candidate restrictions: never expose recruiter or platform-admin surfaces.
  if (role === 'candidate' && (isRecruiterRoute || isSuperAdminRoute)) {
    if (pathname !== '/candidate/dashboard') {
      const redirectRes = NextResponse.redirect(new URL('/candidate/dashboard', request.url));
      for (const c of newSetCookies) redirectRes.headers.append('set-cookie', c);
      return redirectRes;
    }
  }

  // Recruiter / HR / org-admin restrictions: never expose candidate personal dashboards or super-admin.
  if ((role === 'recruiter' || role === 'admin' || role === 'hr') && (isCandidateRoute || isSuperAdminRoute)) {
    if (pathname !== '/recruiter/dashboard') {
      const redirectRes = NextResponse.redirect(new URL('/recruiter/dashboard', request.url));
      for (const c of newSetCookies) redirectRes.headers.append('set-cookie', c);
      return redirectRes;
    }
  }

  // Super admin restrictions: never present recruiter or candidate personal dashboards.
  if (role === 'super_admin' && (isCandidateRoute || isRecruiterRoute)) {
    if (pathname !== '/super-admin') {
      const redirectRes = NextResponse.redirect(new URL('/super-admin', request.url));
      for (const c of newSetCookies) redirectRes.headers.append('set-cookie', c);
      return redirectRes;
    }
  }

  const response = NextResponse.next();
  for (const c of newSetCookies) {
    response.headers.append('set-cookie', c);
  }
  return response;
}

export const config = {
  // Run on every page except static assets, next internals, and the /api proxy
  matcher: [
    '/((?!api/|_next/|mediapipe/|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml|json|webmanifest|woff|woff2|ttf|otf|mp4|webm|mp3|wav)$).*)',
  ],
};

export default proxy;

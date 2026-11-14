/**
 * Progeni Atlas API Client
 * Connects Next.js Frontend to the FastAPI backend (the only backend serving the
 * real, database-backed candidate API).
 *
 * DATA INTEGRITY RULE FOR THIS FILE:
 * No helper in this module may return a placeholder/fallback business payload.
 * Every helper either returns data that came from the API, or `null` so the
 * caller can render an honest empty state. Inventing a score here is forbidden.
 */

import { FRONTEND_CONFIG } from './config';

/**
 * Backend origin, resolved on the *server* only. `next.config.ts` rewrites
 * `/api/*` here, so the browser never needs to know this address.
 */
export const API_PROXY_TARGET = FRONTEND_CONFIG.apiUrl.replace(/\/+$/, '');

/**
 * Returns a same-origin, relative path so the request is proxied by Next.js.
 */
export function getApiUrl(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export const USER_KEY = 'tp_user';

export function getActiveUserScope(): string {
  if (typeof window === 'undefined') return 'anon';
  try {
    const rawUser = window.localStorage.getItem(USER_KEY);
    if (rawUser) {
      const userObj = JSON.parse(rawUser);
      const idOrEmail = userObj?.id || userObj?._id || userObj?.email;
      if (idOrEmail) return String(idOrEmail).trim().toLowerCase();
    }
  } catch { }
  // 'anon' scope is NEVER cached (see apiJson) — a logged-out tab must never share a cache bucket
  return 'anon';
}


export function isValidSessionId(id: string | null | undefined): boolean {
  if (!id) return false;
  const s = String(id).trim().toLowerCase();
  if (s === '' || s === 'undefined' || s === 'null' || s === '[id]') return false;
  return s.length >= 8;
}

/** Clears browser-side profile state and session cookies. */
export function clearSession(): void {
  invalidateApiCache();
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(USER_KEY);
      window.localStorage.removeItem('tp_token');
      window.localStorage.removeItem('tp_email');
    } catch { }
    try {
      document.cookie = 'tp_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'tp_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'tp_refresh=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      document.cookie = 'tp_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    } catch { }
    // Privileged support-grant marker must not leak into the next session in this tab
    try {
      window.sessionStorage.removeItem('tp_support_reason');
      const audioKeys: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i += 1) {
        const k = window.sessionStorage.key(i);
        if (k && (k.startsWith('tp_audio_unlocked_') || k.startsWith('tp_pending_uploads'))) audioKeys.push(k);
      }
      audioKeys.forEach((k) => window.sessionStorage.removeItem(k));
    } catch { }
    try { window.dispatchEvent(new Event('tp_auth_change')); } catch { }
  }
}

/** Resolves the active access token from the HttpOnly session cookie only.
 *  We deliberately do NOT read tokens from localStorage (XSS-exfiltratable)
 *  or embed them in the display-user object — the cookie is the single
 *  source of truth, and it is set HttpOnly by the backend. */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const match = document.cookie.match(/(?:^|;\s*)tp_session=([^;]+)/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]).replace(/^"|"$/g, '');
      if (decoded && decoded !== 'undefined' && decoded !== 'null') return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null { return null; }

/**
 * Stores user *display* data. Session cookies are intentionally NOT (re)written from JS —
 * the backend sets tp_session/tp_role as HttpOnly cookies, and re-writing them via
 * document.cookie would strip the HttpOnly protection (XSS → token theft).
 */
export function persistSession(_accessToken?: string, _refreshToken?: string, user?: Record<string, unknown>): void {
  // Purge any stale cache from a previous session to prevent cross-user data leakage
  invalidateApiCache();
  if (typeof window !== 'undefined') {
    if (user) {
      try {
        window.localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch { }
    }
    try { window.dispatchEvent(new Event('tp_auth_change')); } catch { }
  }
}

export async function logout(clearRefreshTokens: boolean = true): Promise<void> {
  invalidateApiCache();
  if (typeof window !== 'undefined') {
    try {
      await fetch(getApiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include', cache: 'no-store' });
    } catch { }
    clearSession();
  }
}

/**
 * Refreshes the access token using the stored refresh token.
 * Rotates the refresh token (single-use) as the backend expects.
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  // Refresh tokens are single-use, so N concurrent refreshes with the same token
  // would leave N-1 of them rejected and clear the session out from under the
  // user. Collapse concurrent callers onto one in-flight request instead.
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = rotateRefreshToken().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function rotateRefreshToken(): Promise<string | null> {
  try {
    const res = await fetch(getApiUrl('/api/auth/refresh'), {
      method: 'POST', credentials: 'include', cache: 'no-store',
    });
    if (!res.ok) { clearSession(); return null; }
    return 'cookie';
  } catch { clearSession(); return null; }
}

let refreshInFlight: Promise<string | null> | null = null;

/** Central 401 handling: refresh once, retry, or report session expiration. */
async function retryAfterRefresh(
  path: string,
  init: RequestInit,
  cache: RequestCache | undefined
): Promise<Response | null> {
  const newToken = await refreshAccessToken();
  if (newToken) {
    const retryHeaders = new Headers(init.headers);
    return fetch(getApiUrl(path), { ...init, headers: retryHeaders, credentials: 'include', cache: cache ?? 'no-store' });
  }

  // Session expired: return a clear 401 Response object so callers can display an explicit error banner
  return new Response(
    JSON.stringify({
      error: 'Session expired. Please log in again.',
      error_code: 'session_expired',
      detail: 'Your access token has expired and could not be refreshed.',
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * `fetch` that attaches credentials and handles 401 with transparent single-attempt token refresh.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const reqHeaders = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !reqHeaders.has('Content-Type')) {
    reqHeaders.set('Content-Type', 'application/json');
  }
  if (typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined') {
    const supportReason = window.sessionStorage.getItem('tp_support_reason');
    if (supportReason && !reqHeaders.has('X-Support-Reason')) {
      reqHeaders.set('X-Support-Reason', supportReason);
    }
  }

  if (!reqHeaders.has('Authorization')) {
    const token = getAccessToken();
    if (token) {
      reqHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  // Mutations invalidate the shared response cache so the UI never shows stale pre-mutation data
  if (init.method && init.method.toUpperCase() !== 'GET') {
    invalidateApiCache();
  }

  const response = await fetch(getApiUrl(path), {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: reqHeaders,
  });

  const isAuthEntrypoint =
    path.includes('/api/auth/login') ||
    path.includes('/api/auth/register') ||
    path.includes('/api/auth/refresh') ||
    path.includes('/api/auth/logout') ||
    path.includes('/api/auth/verify-otp') ||
    path.includes('/api/auth/forgot-password') ||
    path.includes('/api/auth/reset-password');

  if (response.status === 401 && !isAuthEntrypoint && typeof window !== 'undefined') {
    const retried = await retryAfterRefresh(path, init, undefined);
    if (retried) return retried;
  }

  return response;
}

/* ------------------------------------------------------------------ types */

export interface CandidateProfile {
  id: string;
  email: string;
  full_name: string;
  fullName?: string;
  academicYear?: string | null;
  collegeName?: string | null;
  githubUrl?: string | null;
  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  skillsSummary?: string[];
  role: string;
  status: string;
  is_email_verified: boolean;
  avatar_url: string | null;
  headline: string | null;
  phone: string | null;
  bio: string | null;
  course: string | null;
  branch: string | null;
  academic_year: string | null;
  college_name: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  location: string | null;
  years_experience: number | null;
  created_at: string;
  resume?: CandidateResume | null;
}

export interface CandidateSkill {
  name: string;
  category: string | null;
  proficiency?: number | null;
  years_experience?: number | null;
  /** 0-5 stars, derived from practice/interview evidence (0 when untested). */
  scoreOutOf5?: number;
  level?: string;
  assessed?: boolean;
  sources?: Array<'interview' | 'practice'>;
  sessionsCount?: number;
  interviewEvidenceCount?: number;
}

export interface CandidateSkillInsight {
  name: string;
  /** 0-100 mark drawn from real and practice interview evidence. */
  score: number;
  level: string;
  /** Which evidence produced the mark: "interview" and/or "practice". */
  sources?: string[];
  evidenceCount?: number;
}

export interface CandidateSkillInsights {
  overallReadinessScore: number | null;
  readinessTier: string;
  competencies: CandidateSkillInsight[];
  skills?: CandidateSkill[];
  recommendedDrills?: Array<{
    title: string;
    category: string;
    estimatedTime: string;
    difficulty: string;
  }>;
}

export interface CandidateResume {
  id: string;
  file_name: string;
  file_size?: number;
  file_size_bytes?: number;
  fileSizeBytes?: number;
  mime_type?: string;
  status?: string;
  secure_url?: string;
  uploaded_at?: string;
  parse_error?: string | null;
  is_active?: boolean;
}

export interface InterviewSession {
  id: string;
  org_id: string;
  job_id: string | null;
  candidate_id: string;
  session_type: string;
  mode?: string | null;
  status: string;
  current_stage: string;
  agent_state: string;
  scheduled_at: string;
  duration_minutes: number;
  started_at: string | null;
  ended_at: string | null;
  total_score: number | null;
  final_recommendation: string | null;
  /** Real recruiter-scheduled role/company, denormalised onto the session. */
  job_title?: string | null;
  company_name?: string | null;
  roleTitle?: string | null;
  companyName?: string | null;
  /** Present only when a real report/scorecard exists for the session. */
  reportUrl?: string | null;
  isPractice?: boolean;
}

export interface PracticeHistoryItem {
  id: string;
  drillId?: string;
  drillTitle: string;
  category: string;
  difficulty: string;
  score: number;
  durationSeconds: number;
  completedAt: string;
  turns?: Array<{
    turnIndex: number;
    question: string;
    answer?: string;
    scores?: {
      relevance?: number;
      depth?: number;
      correctness?: number;
    };
    feedback?: string;
  }>;
}

export interface PracticeInterviewItem {
  sessionId: string;
  roleTitle: string;
  companyName: string;
  status: string;
  scheduledAt?: string;
  completedAt?: string;
  score?: number | null;
  recommendation?: string | null;
  reportUrl?: string;
  lobbyUrl?: string;
  durationMinutes: number;
}

export interface PracticeHistoryData {
  attempts: PracticeHistoryItem[];
  practice_interviews: PracticeInterviewItem[];
  stats: {
    totalDrillsCompleted: number;
    totalPracticeMinutes: number;
    averageScore: number;
    readinessPercentage: number;
    categoryBreakdown?: Record<string, number>;
  };
}

export interface InterviewInvitation {
  id: string;
  session_id: string;
  candidate_id: string;
  status: string;
  message: string | null;
  created_at: string;
  session: InterviewSession | null;
  job_title: string | null;
  org_name: string | null;
}

export interface DemoAllowance {
  userId: string;
  role: string;
  freeDemosTotal: number;
  freeDemosUsed: number;
  freeDemosRemaining: number;
  hasFreeDemoAvailable: boolean;
  demoDurationLimitSeconds: number;
  demoDurationMinutes: number;
  sessionsCount: number;
  updatedAt?: string;
}

export interface CandidateDashboard {
  profile_completion: number;
  has_resume: boolean;
  resume_status: string | null;
  skill_count: number;
  unread_notifications: number;
  upcoming_interviews: InterviewSession[];
  recent_interviews: InterviewSession[];
  demo_allowance?: DemoAllowance;
  free_demos_total?: number;
  free_demos_used?: number;
  free_demos_remaining?: number;
  demo_duration_limit_minutes?: number;
  candidate?: {
    name?: string;
    academicTag?: string;
    status?: string;
    readinessScore?: number;
    percentileRank?: number;
    growthChange?: number;
  };
  resumeStatus?: {
    fileName?: string;
    sizeBytes?: number;
    status?: string;
    extractedSkills?: string[];
  };
}

export interface ScorecardCompetency {
  competency: string;
  score: number | null;
  weight: number | null;
  evidence: string | null;
  evaluator_comment: string | null;
}

export interface EvaluationParameterScore {
  name: string;
  score: number | null;
  max_score: number;
  weight?: number;
  percentage?: number | null;
  description?: string;
}

export interface SessionScorecard {
  id?: string;
  session_id: string;
  status?: string;
  overall_score: number | null;
  recommendation: string | null;
  executive_summary: string | null;
  strengths: string[];
  concerns: string[];
  model_used?: string | null;
  generated_at?: string | null;
  competencies: ScorecardCompetency[];
  overall_parameter_scores?: EvaluationParameterScore[];
}

export interface CandidateNotification {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface SessionQuestion {
  id: string;
  turn_index: number;
  stage: string;
  prompt_text: string;
  expected_concepts: string[];
  is_ai_generated: boolean;
  candidate_answer?: string | null;
  score?: number | null;
  max_score?: number;
  score_percentage?: number | null;
  scores?: {
    relevance?: number | null;
    depth?: number | null;
    correctness?: number | null;
  } | null;
  parameter_scores?: EvaluationParameterScore[];
  missing_concepts?: string[];
  evaluator_feedback?: string | null;
  ideal_answer?: string | null;
}

export interface HealthCheckResponse {
  status: string;
  services: Record<string, { status: string; error?: string }>;
  timestamp: number;
}

/* ------------------------------------------------------------------ client */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

/**
 * Session storage helpers for API response cache.
 * Uses sessionStorage (per-tab lifecycle, cleared on tab close) to prevent
 * leaking candidate PII, resumes, and evaluation dossiers on shared machines.
 * In-flight request deduplication runs in-memory per browser tab.
 */
function loadPersistentCache(): Map<string, CacheEntry<unknown>> {
  if (typeof window === 'undefined') return new Map();

  // Purge any legacy unencrypted localStorage cache
  try { localStorage.removeItem('api_cache'); } catch { }

  try {
    const rawCache = sessionStorage.getItem('api_cache');
    const responseCache = new Map<string, CacheEntry<unknown>>();
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      parsed.forEach((entry: CacheEntry<unknown>, key: string) => {
        // Only keep entries that haven't expired
        const isValid =
          entry && (entry.timestamp + entry.ttlMs > Date.now() || entry.ttlMs === 0);
        if (isValid) {
          // If cached data contains null items in arrays, skip it to prevent stale poisoned state
          if (
            Array.isArray(entry.data) &&
            entry.data.some(
              (item: any) => item === null || (typeof item === 'object' && item && item.name === null)
            )
          ) {
            return;
          }
          responseCache.set(key, entry);
        }
      });
    }
    return responseCache;
  } catch (e) {
    _loggerException(e);
    return new Map();
  }
}

function savePersistentCache(responseCache: Map<string, CacheEntry<unknown>>) {
  if (typeof window === 'undefined') return;

  try {
    const cacheJson = JSON.stringify(Array.from(responseCache.entries()));
    sessionStorage.setItem('api_cache', cacheJson);
  } catch (e) {
    _loggerException(e);
  }
}

/** Minimal logger that works inside and outside a request context. */
function _loggerException(e: unknown) {
  console.warn('[API Persist] unexpected error:', e);
}

const responseCache = loadPersistentCache();
// In-memory active in-flight GET requests map (deduplicates concurrent requests across components)
const inFlightGetRequests = new Map<string, Promise<unknown>>();
// Bumped by invalidateApiCache(); async completions check it so they never resurrect
// entries that were purged while their fetch was in flight.
let cacheGeneration = 0;

function getTtlForPath(path: string): number {
  // Active interview / real-time endpoints -> NEVER CACHE (0 TTL)
  if (
    path.includes('/interview/') ||
    path.includes('/media-state') ||
    path.includes('/preflight') ||
    path.includes('/answer') ||
    path.includes('/speak') ||
    path.includes('/transcribe') ||
    path.includes('/companion/') ||
    path.includes('/code-run') ||
    path.includes('/lobby-checkin') ||
    path.includes('/retry') ||
    path.includes('/start') ||
    path.includes('/finish')
  ) {
    return 0;
  }

  // Wallet summary -> 60s (it's polled by the header; must not bypass the cache)
  if (path.includes('/billing/wallet') && !path.includes('/transactions')) {
    return 60_000;
  }

  // Profile & stable reference data -> 60s
  if (path.includes('/candidate/profile') || path.includes('/candidate/resume')) {
    return 60_000;
  }

  // Dashboard summaries, interview lists, skills, invitations, notifications, scorecards, drills -> 30s
  if (
    path.includes('/candidate/dashboard') ||
    path.includes('/candidate/interviews') ||
    path.includes('/candidate/invitations') ||
    path.includes('/candidate/skills') ||
    path.includes('/candidate/skill-insights') ||
    path.includes('/candidate/notifications') ||
    path.includes('/practice/drills') ||
    path.includes('/scorecard') ||
    path.includes('/questions')
  ) {
    return 30_000;
  }

  return 10_000;
}

export function invalidateApiCache(prefixOrPattern?: string): void {
  cacheGeneration += 1;
  if (!prefixOrPattern) {
    responseCache.clear();
    try { sessionStorage.removeItem('api_cache'); } catch { }
    try { localStorage.removeItem('api_cache'); } catch { }
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(prefixOrPattern)) {
      responseCache.delete(key);
    }
  }
  // Also remove matching entries from sessionStorage
  try {
    const existingCache = sessionStorage.getItem('api_cache');
    if (existingCache) {
      const parsed = JSON.parse(existingCache);
      const filtered = parsed.filter((entry: [string, CacheEntry<unknown>]) => {
        return !entry[0].includes(prefixOrPattern);
      });
      sessionStorage.setItem('api_cache', JSON.stringify(filtered));
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Authenticated JSON request against the FastAPI backend.
 *
 * Resolves to `null` on any non-2xx response or transport failure. Callers MUST
 * treat `null` as "no data available" and render an empty state – never as a
 * reason to substitute invented values.
 */
export async function apiJson<T>(
  path: string,
  init: RequestInit = {},
  options: { skipCache?: boolean } = {}
): Promise<T | null> {
  const method = (init.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  // Invalidate relevant cache entries on state-mutating requests
  if (!isGet) {
    if (path.includes('/profile') || path.includes('/resume')) {
      invalidateApiCache('/candidate/profile');
      invalidateApiCache('/candidate/resume');
      invalidateApiCache('/candidate/dashboard');
    } else if (path.includes('/practice') || path.includes('/interview') || path.includes('/invitations')) {
      invalidateApiCache('/candidate/dashboard');
      invalidateApiCache('/candidate/interviews');
      invalidateApiCache('/candidate/skills');
      invalidateApiCache('/candidate/invitations');
      invalidateApiCache('/scorecard');
    }
  }

  const userScope = getActiveUserScope();
  // Logged-out tabs share no cache bucket — 'anon' responses are never reused across callers
  const cacheable = userScope !== 'anon';
  const cacheKey = `${userScope}::${path}`;

  // 1. FAST-PATH FOR GET: Check in-memory / persistent cache FIRST before dispatching any fetch
  if (isGet && !init.body && !options.skipCache && cacheable) {
    const ttlMs = getTtlForPath(path);
    if (ttlMs > 0) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttlMs) {
        return cached.data as T;
      }
    }

    // 2. IN-FLIGHT DEDUPLICATION: If identical request is currently active, reuse its promise
    const existingPromise = inFlightGetRequests.get(cacheKey);
    if (existingPromise) {
      return existingPromise as Promise<T | null>;
    }
  }

  // 3. Initiate network fetch only when cache misses and no request is in-flight
  const generationAtFetch = cacheGeneration;
  const fetchPromise = (async (): Promise<T | null> => {
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (!headers.has('Authorization')) {
      const token = getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    // Identity is resolved server-side from the verified JWT — no client-supplied identity headers

    try {
      const res = await fetch(getApiUrl(path), { ...init, headers, credentials: 'include', cache: 'no-store' });
      if (res.status === 401 && typeof window !== 'undefined') {
        const retried = await retryAfterRefresh(path, init, 'no-store');
        if (retried) {
          if (retried.ok && (retried.headers.get('content-type') || '').includes('application/json')) {
            const data = (await retried.json()) as T;
            return data;
          }
          return null;
        }
        return null;
      }
      if (!res.ok) {
        console.warn(`[API] ${method} ${path} returned HTTP ${res.status}`);
        return null;
      }
      if (res.status === 204) return null;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return null;
      const data = (await res.json()) as T;

      // Cache successful GET responses strictly bound to the active user scope,
      // and only if the cache was not invalidated while this request was in flight.
      if (isGet && !init.body && data !== null && !options.skipCache && cacheable && generationAtFetch === cacheGeneration) {
        const ttlMs = getTtlForPath(path);
        if (ttlMs > 0) {
          responseCache.set(cacheKey, {
            data,
            timestamp: Date.now(),
            ttlMs,
          });
          savePersistentCache(responseCache);
        }
      }

      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      console.warn(`[API] ${method} ${path} could not reach the backend:`, error);
      return null;
    } finally {
      if (isGet) {
        inFlightGetRequests.delete(cacheKey);
      }
    }
  })();

  if (isGet && !init.body && !options.skipCache && cacheable) {
    inFlightGetRequests.set(cacheKey, fetchPromise as Promise<unknown>);
  }

  return fetchPromise;
}

/* ------------------------------------------------------------- endpoints */

export function fetchCandidateProfile(): Promise<CandidateProfile | null> {
  return apiJson<CandidateProfile>('/api/candidate/profile');
}

export async function fetchCandidateSkills(options: { skipCache?: boolean } = {}): Promise<CandidateSkill[] | null> {
  const data = await apiJson<any>('/api/candidate/skills', {}, options);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.skills)) return data.skills;
  if (data && Array.isArray(data.competencies)) return data.competencies;
  return [];
}

export function fetchCandidateResumes(): Promise<CandidateResume[] | null> {
  return apiJson<CandidateResume[]>('/api/candidate/resume');
}

export function fetchCandidateDashboard(): Promise<CandidateDashboard | null> {
  return apiJson<CandidateDashboard>('/api/candidate/dashboard');
}

export async function fetchCandidateInterviews(): Promise<InterviewSession[] | null> {
  const data = await apiJson<any>('/api/candidate/interviews');
  if (!data) return null;
  const list = Array.isArray(data) ? data : [...(data.upcoming || []), ...(data.completed || [])];
  if (!Array.isArray(list)) return null;
  return list.map((item) => {
    const id = item.id || item.sessionId || item.session_id || '';
    return {
      ...item,
      id,
      sessionId: item.sessionId || id,
      scheduled_at: item.scheduled_at || item.scheduledTime || item.scheduledAt || new Date().toISOString(),
      duration_minutes: item.duration_minutes ?? item.durationMinutes ?? 45,
      total_score: item.total_score ?? item.score ?? null,
      final_recommendation: item.final_recommendation ?? item.recommendation ?? null,
      reportUrl: item.reportUrl || (item.status === 'completed' ? `/candidate/interview/${id}/report` : null),
      isPractice: Boolean(item.isPractice || item.sessionType === 'mock' || item.is_practice),
    } as InterviewSession;
  });
}

export async function fetchCandidatePracticeHistory(): Promise<PracticeHistoryData | null> {
  const data = await apiJson<any>('/api/candidate/practice/history');
  if (!data || !data.success) {
    return {
      attempts: [],
      practice_interviews: [],
      stats: {
        totalDrillsCompleted: 0,
        totalPracticeMinutes: 0,
        averageScore: 0,
        readinessPercentage: 0,
      },
    };
  }
  return {
    attempts: Array.isArray(data.attempts) ? data.attempts : [],
    practice_interviews: Array.isArray(data.practice_interviews) ? data.practice_interviews : [],
    stats: data.stats || {
      totalDrillsCompleted: 0,
      totalPracticeMinutes: 0,
      averageScore: 0,
      readinessPercentage: 0,
    },
  };
}

export function fetchCandidateSkillInsights(): Promise<CandidateSkillInsights | null> {
  return apiJson<CandidateSkillInsights>('/api/candidate/skill-insights');
}

export function fetchCandidateInvitations(): Promise<InterviewInvitation[] | null> {
  return apiJson<InterviewInvitation[]>('/api/candidate/invitations');
}

export function fetchCandidateNotifications(): Promise<CandidateNotification[] | null> {
  return apiJson<CandidateNotification[]>('/api/candidate/notifications');
}

export async function markCandidateNotificationsAsRead(notificationIds: string[]): Promise<boolean> {
  if (!notificationIds || notificationIds.length === 0) return true;
  try {
    const res = await apiFetch('/api/candidate/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function fetchSessionScorecard(sessionId: string | null | undefined): Promise<SessionScorecard | null> {
  if (!sessionId) return Promise.resolve(null);
  return apiJson<SessionScorecard>(`/api/v1/interview-sessions/${sessionId}/scorecard`);
}

export function fetchSession(sessionId: string | null | undefined): Promise<InterviewSession | null> {
  if (!sessionId) return Promise.resolve(null);
  return apiJson<InterviewSession>(`/api/v1/interview-sessions/${sessionId}`);
}

/**
 * The questions asked during a session. The candidate's own answers, per-turn
 * evaluator scores and audio clips are NOT returned by this endpoint, so a UI
 * built on it must not display them.
 */
export function fetchSessionQuestions(sessionId: string | null | undefined): Promise<SessionQuestion[] | null> {
  if (!sessionId) return Promise.resolve(null);
  return apiJson<SessionQuestion[]>(`/api/v1/interview-sessions/${sessionId}/questions`);
}

export function fetchHealthCheck(): Promise<HealthCheckResponse | null> {
  return apiJson<HealthCheckResponse>('/api/health');
}

export interface CreatePracticeInterviewPayload {
  job_role: string;
  job_description?: string;
  file?: File;
}

export interface PracticeInterviewResult {
  session_id: string;
  job_id: string;
  target_url: string;
  status: string;
}

export async function createPracticeInterview(
  payload: CreatePracticeInterviewPayload
): Promise<PracticeInterviewResult> {
  let body: BodyInit;
  const headers: Record<string, string> = {};

  if (payload.file) {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('job_role', payload.job_role);
    body = formData;
  } else {
    body = JSON.stringify({
      job_role: payload.job_role,
      job_description: payload.job_description || '',
    });
    headers['Content-Type'] = 'application/json';
  }

  const res = await apiFetch('/api/candidate/practice-interview', {
    method: 'POST',
    body,
    headers,
  });

  if (!res.ok) {
    let errMessage = `Server returned HTTP ${res.status}`;
    try {
      const errData = await res.json();
      if (errData && typeof errData.error === 'string') {
        errMessage = errData.error;
      } else if (errData && typeof errData.detail === 'string') {
        errMessage = errData.detail;
      } else if (errData && typeof errData.message === 'string') {
        errMessage = errData.message;
      }
    } catch {
      // ignore json parse error
    }
    const requestId = res.status >= 500 ? res.headers.get('X-Request-ID') : null;
    if (requestId) errMessage = `${errMessage} (request ID: ${requestId})`;
    throw new Error(errMessage);
  }

  return (await res.json()) as PracticeInterviewResult;
}

export interface PracticeJobRoleOptions {
  roles: string[];
}

/**
 * Role suggestions for the practice setup dropdown, sourced from live job
 * postings plus the candidate's own past target roles (never a hardcoded enum).
 * The candidate can always type a role that is not in this list.
 */
export async function fetchPracticeJobRoles(): Promise<string[]> {
  const data = await apiJson<PracticeJobRoleOptions>('/api/candidate/practice/job-roles');
  return data?.roles ?? [];
}

export interface SuggestedJobDescription {
  job_description: string;
  source: 'job_posting' | 'ai_generated' | string;
  job_title?: string | null;
  company_name?: string | null;
}

/**
 * Ask the backend to draft a job description for a typed role. The backend reuses
 * a matching live job posting when available and otherwise generates the text on
 * demand; it never returns a canned/templated description.
 */
export async function suggestPracticeJobDescription(jobRole: string): Promise<SuggestedJobDescription> {
  const res = await apiFetch('/api/candidate/practice/suggest-jd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ job_role: jobRole }),
  });

  if (!res.ok) {
    let errMessage = `Server returned HTTP ${res.status}`;
    try {
      const errData = await res.json();
      if (errData && typeof errData.error === 'string') {
        errMessage = errData.error;
      } else if (errData && typeof errData.detail === 'string') {
        errMessage = errData.detail;
      }
    } catch {
      // ignore json parse error
    }
    throw new Error(errMessage);
  }

  return (await res.json()) as SuggestedJobDescription;
}

/**
 * The single server-authoritative interview contract. Clients render the next
 * step from `state`; they never advance it themselves and never invent fields.
 */
export interface InterviewContract {
  session_id: string;
  state: string;
  status: string;
  mode: string;
  question_id: string | null;
  question: string | null;
  turn_index: number | null;
  total_turns: number;
  answered_turns: number;
  interviewer_response: string | null;
  can_answer: boolean;
  remaining_time_seconds: number | null;
  question_deadline_at?: string | null;
  question_remaining_seconds?: number | null;
  question_expired?: boolean;
  finished?: boolean;
  outcome?: string;
  is_follow_up?: boolean;
  duration_minutes?: number;
  proctoring_status: string;
  stages?: string[];
  current_stage?: string;
  activeProblem?: any;
  error?: unknown;
}

export interface PreflightReport {
  camera_ok: boolean;
  microphone_ok: boolean;
  requires_livekit?: boolean;
  livekit_connected?: boolean;
  livekit_publishing?: boolean;
  fullscreen?: boolean;
  face_detected?: boolean;
  face_count?: number | null;
  proctoring_model_loaded?: boolean;
}

export type StartTurnResult = InterviewContract & { duration_minutes?: number };

export interface AnswerTurnResult extends InterviewContract {
  finished: boolean;
  outcome: string;
  scores: { relevance: number | null; depth: number | null; correctness: number | null } | null;
  feedback?: string | null;
  action_decision?: string;
  clarification?: boolean;
  is_follow_up?: boolean;
  next_question?: {
    text: string;
    question_id: string;
    turn_index: number;
    stage: string;
  } | null;
}

export interface InterviewStateResult extends InterviewContract {
  current_stage: string;
  turn: number;
  recovery_state?: string;
  history: Array<{
    turn_index: number;
    question: string;
    answer: string | null;
    stage: string;
    interviewer_response?: string | null;
    scores: { relevance: number | null; depth: number | null; correctness: number | null } | null;
  }>;
}

export interface FinishSessionResult extends InterviewContract {
  overall_score: number | null;
  recommendation: string;
  executive_summary: string | null;
  strengths: string[];
  concerns: string[];
  competencies?: Array<{
    competency: string;
    score: number | null;
    weight: number | null;
    evidence: string | null;
  }>;
}

export async function startInterviewSession(sessionId: string): Promise<StartTurnResult> {
  const res = await apiFetch(`/api/interview/${sessionId}/start`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function runInterviewPreflight(
  sessionId: string,
  report: PreflightReport,
): Promise<InterviewContract> {
  const res = await apiFetch(`/api/interview/${sessionId}/preflight`, {
    method: 'POST',
    body: JSON.stringify({ report }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const failures = Array.isArray(err.failures)
      ? err.failures.filter((f: unknown): f is string => typeof f === 'string')
      : [];
    const base =
      typeof err.detail === 'string'
        ? err.detail
        : typeof err.error === 'string'
          ? err.error
          : `HTTP ${res.status}`;
    // Surface every failed check, not just the summary line, so the room can
    // show the candidate the exact media reason preflight was rejected.
    const message = failures.length > 0 ? `${base} – ${failures.join('; ')}` : base;
    const errorObj = new Error(message) as Error & { status_code?: number; current_state?: string };
    errorObj.status_code = res.status;
    errorObj.current_state = typeof err.current_state === 'string' ? err.current_state : undefined;
    throw errorObj;
  }
  return res.json();
}

export async function reportInterviewMediaState(
  sessionId: string,
  connected: boolean,
  reason?: string,
): Promise<InterviewContract> {
  const res = await apiFetch(`/api/interview/${sessionId}/media-state`, {
    method: 'POST',
    body: JSON.stringify({ connected, reason }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function retryInterviewStage(
  sessionId: string,
  retryOf: string,
): Promise<InterviewContract> {
  const res = await apiFetch(`/api/interview/${sessionId}/retry`, {
    method: 'POST',
    body: JSON.stringify({ retry_of: retryOf }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function answerInterviewQuestion(
  sessionId: string,
  answer: string,
  questionId?: string | null,
  requestId?: string,
  code?: string,
  codeLanguage?: string,
): Promise<AnswerTurnResult> {
  const res = await apiFetch(`/api/interview/${sessionId}/answer`, {
    method: 'POST',
    body: JSON.stringify({
      answer,
      ...(questionId ? { question_id: questionId } : {}),
      ...(requestId ? { request_id: requestId } : {}),
      ...(code ? { code } : {}),
      ...(codeLanguage ? { code_language: codeLanguage } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const failure = new Error(err.detail || err.error || `HTTP ${res.status}`) as Error & {
      errorCode?: string;
      status?: number;
    };
    failure.errorCode = typeof err.error_code === 'string'
      ? err.error_code
      : typeof err.reason_code === 'string'
        ? err.reason_code
        : undefined;
    failure.status = res.status;
    throw failure;
  }
  return res.json();
}

export async function timeoutInterviewQuestion(
  sessionId: string,
  questionId: string,
  partialAnswer: string,
): Promise<InterviewContract & { finished: boolean; outcome: string }> {
  const res = await apiFetch(`/api/interview/${sessionId}/question-timeout`, {
    method: 'POST',
    body: JSON.stringify({ question_id: questionId, partial_answer: partialAnswer }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const failure = new Error(err.detail || err.error || `HTTP ${res.status}`) as Error & {
      recoveryState?: string;
      status?: number;
    };
    failure.recoveryState = typeof err.recovery_state === 'string' ? err.recovery_state : undefined;
    failure.status = res.status;
    throw failure;
  }
  return res.json();
}


export type VoiceFailure = Error & {
  /** Machine-readable backend code, e.g. `speech_not_configured`. */
  errorCode?: string;
  /** False when retrying cannot help (operator must fix configuration). */
  retryable?: boolean;
};

/**
 * Fetch real interviewer audio from the server-side speech provider.
 *
 * The backend is authoritative for interviewer voice. Any non-audio response
 * (an error envelope, an HTML error page from a proxy, an empty body) is
 * rejected here so the room can never advance a turn on silent audio.
 */
export async function speakInterviewText(
  sessionId: string,
  text: string,
  signal?: AbortSignal,
  voice?: "en" | "hinglish" | "default" | string,
): Promise<Blob> {
  const payload: { text: string; voice?: string } = { text };
  if (voice && voice !== "default") {
    payload.voice = voice;
  }
  const res = await apiFetch(`/api/interview/${sessionId}/speak`, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as Record<string, unknown>);
    const serverMessage = typeof err.error === 'string' ? err.error : typeof err.detail === 'string' ? err.detail : '';
    const failure = new Error(
      serverMessage || 'The interviewer’s voice is temporarily unavailable. Please use Replay to try again.',
    ) as VoiceFailure;
    failure.errorCode = typeof err.error_code === 'string' ? err.error_code : undefined;
    failure.retryable = typeof err.retryable === 'boolean' ? err.retryable : res.status !== 503;
    throw failure;
  }

  // Guard against a proxy that answers 200 with an error page or empty body.
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('audio/')) {
    const failure = new Error(
      'The interviewer’s voice could not be loaded. Please use Replay to try again.',
    ) as VoiceFailure;
    failure.errorCode = 'speech_invalid_content_type';
    failure.retryable = true;
    throw failure;
  }

  const blob = await res.blob();
  if (blob.size === 0) {
    const failure = new Error('The interviewer’s voice came back empty. Please use Replay to try again.') as VoiceFailure;
    failure.errorCode = 'speech_empty_audio';
    failure.retryable = true;
    throw failure;
  }
  return blob;
}

export async function transcribeInterviewAudio(sessionId: string, audio: Blob): Promise<string> {
  const form = new FormData();
  const extension = audio.type.includes('mp4') ? 'mp4' : 'webm';
  form.append('audio', audio, `answer.${extension}`);
  const res = await apiFetch(`/api/interview/${sessionId}/transcribe`, { method: 'POST', body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}) as Record<string, unknown>);
    const serverMessage = typeof err.error === 'string' ? err.error : typeof err.detail === 'string' ? err.detail : '';
    const failure = new Error(
      serverMessage || `Your answer could not be transcribed (HTTP ${res.status}). Please record again.`,
    ) as VoiceFailure;
    failure.errorCode = typeof err.error_code === 'string' ? err.error_code : undefined;
    failure.retryable = typeof err.retryable === 'boolean' ? err.retryable : true;
    throw failure;
  }
  const result = await res.json();
  if (typeof result.transcript !== 'string' || !result.transcript.trim()) {
    const failure = new Error('No speech was detected. Please record your answer again.') as VoiceFailure;
    failure.errorCode = 'transcription_empty';
    failure.retryable = true;
    throw failure;
  }
  return result.transcript.trim();
}

export async function getInterviewState(sessionId: string): Promise<InterviewStateResult> {
  const res = await apiFetch(`/api/interview/${sessionId}/state`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.error || err.detail || `HTTP ${res.status}`;
    const errorObj = new Error(message) as Error & { status_code?: number; recoveryState?: string };
    errorObj.status_code = res.status;
    errorObj.recoveryState = typeof err.recovery_state === 'string' ? err.recovery_state : undefined;
    throw errorObj;
  }
  return res.json();
}

export async function finishInterviewSession(sessionId: string): Promise<FinishSessionResult> {
  const res = await apiFetch(`/api/interview/${sessionId}/finish`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* -------------------------------------------------------------- helpers */

export function formatBytes(bytes: number | null | undefined): string | null {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function initialsOf(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ------------------------------------------------ recruiter live & recording */

export interface RecruiterLiveTokenResponse {
  livekitUrl: string;
  jwt: string;
  room: string;
  sessionId: string;
  role: string;
}

export interface InterviewRecordingResponse {
  status: 'available' | 'processing' | 'unavailable' | 'error';
  playbackUrl?: string | null;
  durationSec?: number | null;
  publicId?: string | null;
  mimeType?: string;
  message?: string;
  sessionId?: string;
}

export interface CandidateEvaluationReport {
  sessionId: string;
  candidate: {
    fullName: string | null;
    email: string;
    program?: string | null;
    academicYear?: string | null;
  };
  jobContext: {
    roleTitle: string | null;
    companyName: string | null;
    interviewDate: string | null;
    durationMinutes: number | null;
  };
  overallScore: number | null;
  hiringRecommendation: string | null;
  percentileRank: number | null;
  competencyPillars: Record<string, number> | null;
  executiveSummary: string | null;
  verifiedStrengths: string[];
  targetedGrowthAreas: string[];
  proctoringIntegritySummary: {
    totalEvents: number;
    warningCount: number;
    threshold: number;
    flagged: boolean;
    eventCounts: Record<string, number>;
    overallIntegrityScore?: number;
    gazeConsistencyPercentage?: number;
    tabSwitchCount?: number;
    multipleVoicesDetected?: boolean;
    suspiciousEvents?: Array<{
      id: string;
      title: string;
      timestampSec: number;
      formattedTime: string;
      severity: 'low' | 'medium' | 'high';
      reason?: string;
    }>;
  };
  turnReviews: Array<{
    turnIndex: number;
    timestampSec?: number;
    formattedTime?: string;
    stage: string;
    questionAsked: string;
    candidateAnswerSummary: string;
    isWeakAnswer?: boolean;
    scores: {
      relevance?: number | null;
      depth?: number | null;
      correctness?: number | null;
    };
    keyConceptsCovered: string[];
    missingConcepts: string[];
    evaluatorFeedback: string;
    candidate_code?: string;
    code_language?: string;
  }>;
  reportStatus: string;
  transcriptStatus: string;
  interviewState?: string | null;
  verificationDossierId: string;
}

export async function fetchRecruiterLiveToken(sessionId: string): Promise<RecruiterLiveTokenResponse> {
  const res = await apiFetch(`/api/v1/interview-sessions/${sessionId}/recruiter-viewer-token`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.error || err.detail || `Failed to fetch live monitoring token (${res.status})`;
    const errorObj = new Error(message) as Error & { status_code?: number };
    errorObj.status_code = res.status;
    throw errorObj;
  }
  return res.json();
}

export async function fetchInterviewRecording(sessionId: string): Promise<InterviewRecordingResponse> {
  const res = await apiFetch(`/api/v1/interview-sessions/${sessionId}/recording`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.error || err.detail || `Failed to fetch recording (${res.status})`;
    const errorObj = new Error(message) as Error & { status_code?: number };
    errorObj.status_code = res.status;
    throw errorObj;
  }
  return res.json();
}

export async function uploadInterviewRecording(
  sessionId: string,
  file: Blob | File,
  durationSec?: number
): Promise<InterviewRecordingResponse> {
  const formData = new FormData();
  formData.append('video', file, `interview-${sessionId}.webm`);
  if (durationSec !== undefined) {
    formData.append('duration_sec', String(durationSec));
  }
  const res = await apiFetch(`/api/v1/interview-sessions/${sessionId}/recording`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || `Recording upload failed (${res.status})`);
  }
  return res.json();
}

export async function fetchInterviewReport(sessionId: string): Promise<CandidateEvaluationReport | null> {
  const res = await apiFetch(`/api/v1/interview-sessions/${sessionId}/report`);
  if (!res.ok) {
    if (res.status === 404 || res.status === 409) return null;
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.detail || `Failed to fetch report (${res.status})`);
  }
  return res.json();
}


export interface RecruiterNotification {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  payload: {
    session_id?: string;
    job_id?: string;
    candidate_id?: string;
    action_url?: string;
    [key: string]: unknown;
  };
  is_read: boolean;
  created_at: string;
}

export async function fetchRecruiterNotifications(): Promise<RecruiterNotification[]> {
  try {
    const res = await apiFetch('/api/recruiter/notifications');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function markRecruiterNotificationsAsRead(notificationIds: string[]): Promise<boolean> {
  if (!notificationIds || notificationIds.length === 0) return true;
  try {
    const res = await apiFetch('/api/recruiter/notifications/mark-read', {
      method: 'POST',
      body: JSON.stringify({ notification_ids: notificationIds }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// APTITUDE & COGNITIVE SCREENING API CONTRACTS & CLIENTS
// -----------------------------------------------------------------------------

export interface AptitudeTemplateSection {
  name: string;
  questionCount: number;
  timeMinutes: number;
}

export interface AptitudeTemplate {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  sections: AptitudeTemplateSection[];
  negativeMarking: boolean;
  proctoringStrictness: string;
}

export interface AptitudeQuestionPublic {
  id: string;
  index: number;
  section: string;
  topic: string;
  difficulty: string;
  prompt: string;
  options: string[];
  timeRecommendedSeconds: number;
}

export interface AptitudeAnswerRecord {
  selectedOptionIndex?: number | null;
  isMarkedForReview: boolean;
  timeSpentSeconds: number;
  answeredAt?: string;
}

export interface AptitudeSessionData {
  sessionId: string;
  template: AptitudeTemplate;
  templateTitle?: string;
  questions: AptitudeQuestionPublic[];
  durationSeconds: number;
  startedAt: string;
  expiresAt: string;
  remainingSeconds?: number;
  answers?: Record<string, AptitudeAnswerRecord>;
  status?: string;
  telemetry?: {
    tabSwitchCount: number;
    fullscreenExitCount: number;
    devtoolsOpenedCount: number;
    copyPasteAttempts: number;
    unfocusedSeconds?: number;
  };
}

export interface AptitudeReviewItem {
  id: string;
  section: string;
  topic: string;
  prompt?: string;
  options?: string[];
  difficulty: string;
  selectedOptionIndex?: number | null;
  correctIndex: number;
  isCorrect: boolean;
  isAttempted: boolean;
  timeSpentSeconds: number;
  explanation: string;
  formula?: string;
}

export interface AptitudeScorecard {
  overallScore: number;
  percentile: number;
  totalQuestions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracyPercent: number;
  trustScore: number;
  integrityVerdict?: 'clean' | 'review' | 'flagged';
  speedIndex: string;
  avgSecondsPerQuestion?: number;
  accuracyVsSpeed?: 'fast_accurate' | 'fast_careless' | 'slow_accurate' | 'slow_careless';
  sectionBreakdown: Record<string, { total: number; attempted: number; correct: number; timeSpent: number }>;
  sectionalPercentile?: Record<string, number | null>;
  benchmarkScore?: number;
  radar?: Array<{ pillar: string; score: number; benchmark: number }>;
  deltaVsPrevious?: number | null;
  percentileBasis?: 'norm_pool' | 'insufficient_pool';
  normPoolSize?: number;
  review: AptitudeReviewItem[];
  generatedAt: string;
}

export interface AptitudeReportResponse {
  sessionId: string;
  candidateName: string;
  templateTitle: string;
  startedAt: string;
  completedAt: string;
  status: string;
  telemetry: Record<string, unknown>;
  scorecard: AptitudeScorecard;
  abVariant?: 'A' | 'B';
}

export interface AptitudeAttemptHistory {
  sessionId: string;
  templateTitle: string;
  startedAt: string;
  status: string;
  score: number;
  accuracy: number;
  percentile: number | null;
  percentileBasis?: 'norm_pool' | 'insufficient_pool';
  normPoolSize?: number;
  trustScore: number;
  integrityVerdict?: 'clean' | 'review' | 'flagged';
  speedIndex: string;
  deltaVsPrevious?: number | null;
}

export async function fetchAptitudeTemplates(): Promise<AptitudeTemplate[]> {
  try {
    const res = await apiFetch('/api/aptitude/templates');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.templates) ? data.templates : [];
  } catch {
    return [];
  }
}

export async function startAptitudeSession(templateId: string): Promise<AptitudeSessionData | null> {
  try {
    const res = await apiFetch('/api/aptitude/sessions/start', {
      method: 'POST',
      body: JSON.stringify({ templateId }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchAptitudeSession(sessionId: string): Promise<AptitudeSessionData | null> {
  if (!sessionId) return null;
  try {
    const res = await apiFetch(`/api/aptitude/sessions/${sessionId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function submitAptitudeAnswer(
  sessionId: string,
  questionId: string,
  selectedOptionIndex: number | null,
  isMarkedForReview: boolean,
  timeSpentSeconds: number
): Promise<boolean> {
  if (!sessionId || !questionId) return false;
  try {
    const res = await apiFetch(`/api/aptitude/sessions/${sessionId}/answer`, {
      method: 'POST',
      body: JSON.stringify({
        questionId,
        selectedOptionIndex,
        isMarkedForReview,
        timeSpentSeconds,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function logAptitudeViolation(
  sessionId: string,
  type: 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'DEVTOOLS_OPENED' | 'COPY_PASTE',
  details?: string
): Promise<{ totalTabSwitches?: number; isTerminated?: boolean }> {
  if (!sessionId) return {};
  try {
    const res = await apiFetch(`/api/aptitude/sessions/${sessionId}/violation`, {
      method: 'POST',
      body: JSON.stringify({ type, details: details || '' }),
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

export async function submitAptitudeTest(sessionId: string): Promise<AptitudeScorecard | null> {
  if (!sessionId) return null;
  try {
    const res = await apiFetch(`/api/aptitude/sessions/${sessionId}/submit`, {
      method: 'POST',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.scorecard || null;
  } catch {
    return null;
  }
}

export async function logAptitudeEvent(name: 'report_view' | 'retake_click' | 'share_click' | 'pdf_download', sessionId: string): Promise<boolean> {
  try {
    const res = await apiFetch('/api/aptitude/events', {
      method: 'POST',
      body: JSON.stringify({ name, sessionId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAptitudeReport(sessionId: string): Promise<AptitudeReportResponse | null> {
  if (!sessionId) return null;
  try {
    const res = await apiFetch(`/api/aptitude/sessions/${sessionId}/report`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchCandidateAptitudeHistory(): Promise<AptitudeAttemptHistory[]> {
  try {
    const res = await apiFetch('/api/candidate/aptitude/history');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.attempts) ? data.attempts : [];
  } catch {
    return [];
  }
}

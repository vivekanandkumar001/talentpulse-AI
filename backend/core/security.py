"""
Progeni Atlas ÔÇö Security & Authentication Helpers
===================================================
Provides JWT decoding, request authentication, role-based authorization decorators,
password hashing, OTP generation/verification, and transactional email dispatch.
"""

from core.http_utils import safe_log_tag
import logging

import os
import time
import sys
import re
import hmac
import hashlib
import secrets
import smtplib
import traceback
from datetime import datetime, timezone
from functools import wraps
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import jwt
from flask import request, jsonify, g
from core.db import get_mongo_db

SWAMI_SECRET_KEY = (
    os.environ.get("SWAMI_SECRET_KEY")
    or os.environ.get("JWT_SECRET")
    or os.environ.get("SECRET_KEY")
    or os.environ.get("FLASK_SECRET_KEY")
    or "progeni_atlas_enterprise_jwt_secret_key"
).strip()
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256").strip() or "HS256"

# OTP security policy
OTP_LENGTH = 6
OTP_TTL_SEC = int(os.environ.get("OTP_TTL_SEC", 120))
OTP_RESEND_COOLDOWN_SEC = int(os.environ.get("OTP_RESEND_COOLDOWN_SEC", 120))
OTP_MAX_ATTEMPTS = 5
OTP_RE = re.compile(r"^\d{6}$")

# Modern Cryptographic Password Hasher (Argon2id - OWASP Recommended)
try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError, InvalidHashError
    _ARGON2_HASHER = PasswordHasher(
        time_cost=3,
        memory_cost=65536,
        parallelism=4,
        hash_len=32
    )
except ImportError:
    _ARGON2_HASHER = None


logger = logging.getLogger(__name__)

def hash_password(password: str) -> str:
    """
    Hash password using state-of-the-art Argon2id (OWASP & Password Hashing Competition Winner).
    Falls back to PBKDF2-HMAC-SHA256 with 100,000 rounds if Argon2 is unavailable.
    """
    if not password:
        raise ValueError("Password cannot be empty.")
    if _ARGON2_HASHER is not None:
        return _ARGON2_HASHER.hash(password)
    # Secure PBKDF2 fallback
    salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"$pbkdf2$100000${salt}${derived.hex()}"


def verify_password(password: str, stored_hash: str) -> tuple[bool, bool]:
    """
    Cryptographically verify password against stored hash with zero-downtime migration.
    Returns: (is_valid: bool, needs_rehash: bool)
    - If valid and legacy (SHA-256 or PBKDF2), needs_rehash is True so caller can
      transparently upgrade the database record to Argon2id.
    """
    if not password or not stored_hash:
        return False, False

    stored = stored_hash.strip()

    # 1. Argon2id (current standard)
    if stored.startswith("$argon2"):
        if _ARGON2_HASHER is not None:
            try:
                _ARGON2_HASHER.verify(stored, password)
                needs_rehash = _ARGON2_HASHER.check_needs_rehash(stored)
                return True, needs_rehash
            except (VerifyMismatchError, InvalidHashError):
                return False, False
        return False, False

    # 2. Bcrypt fallback format ($2a$, $2b$, $2y$)
    if stored.startswith(("$2a$", "$2b$", "$2y$")):
        try:
            import bcrypt
            if bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8")):
                return True, True  # Valid, upgrade to Argon2id
        except Exception:
            pass
        return False, False

    # 3. PBKDF2 fallback format ($pbkdf2$<rounds>$<salt>$<hex>)
    if stored.startswith("$pbkdf2$"):
        parts = stored.split("$")
        if len(parts) == 5:
            try:
                rounds = int(parts[2])
                salt = parts[3].encode("utf-8")
                expected = parts[4]
                derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds).hex()
                if hmac.compare_digest(derived, expected):
                    return True, True  # Valid, upgrade to Argon2id
            except Exception:
                return False, False

    # 3. Legacy unsalted SHA-256 (64 hex characters) ÔÇö seamless upgrade path
    if len(stored) == 64 and all(c in "0123456789abcdefABCDEF" for c in stored):
        candidate = hashlib.sha256(password.encode("utf-8")).hexdigest()
        if hmac.compare_digest(candidate.lower(), stored.lower()):
            return True, True  # Valid, upgrade to Argon2id immediately!

    return False, False


def validate_password_strength(password: str) -> tuple[bool, str | None]:
    """Ensure password meets enterprise complexity standards."""
    if not password or len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password cannot exceed 128 characters."
    return True, None


def _as_aware_utc(dt) -> datetime:
    """Normalize DB timestamps to tz-aware UTC for safe comparison."""
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def hash_otp(otp_code: str) -> str:
    """HMAC-SHA256 OTP hash peppered with the server secret."""
    pepper = (
        os.environ.get("OTP_PEPPER")
        or os.environ.get("SWAMI_SECRET_KEY")
        or os.environ.get("JWT_SECRET")
        or "progeni_atlas_default_pepper"
    )
    return hmac.new(pepper.encode("utf-8"), otp_code.encode("utf-8"), hashlib.sha256).hexdigest()


def check_otp_hash(otp_code: str, stored_hash: str) -> bool:
    """Verify an HMAC-SHA256 OTP hash using constant-time comparison."""
    return hmac.compare_digest(hash_otp(otp_code), stored_hash)


def generate_otp_code() -> str:
    """Generate a cryptographically secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


_LINKED_CACHE: dict[str, float] = {}

def link_candidate_records_by_email(user_id: str, email: str) -> None:
    """Link pre-existing orphan sessions, invitations, and notifications to candidate user_id."""
    if not user_id or not email:
        return
    clean_email = email.strip().lower()
    cache_key = f"{user_id}:{clean_email}"
    now_ts = time.time()
    if cache_key in _LINKED_CACHE and (now_ts - _LINKED_CACHE[cache_key]) < 1800:
        return
    _LINKED_CACHE[cache_key] = now_ts

    try:
        db = get_mongo_db()
        if db is None:
            return
        now_iso = datetime.now(timezone.utc).isoformat()

        # Check before updating to avoid write locks if no orphan records exist
        has_orphan_sessions = db.interview_sessions.find_one({"candidate_email": clean_email, "candidate_id": {"$ne": user_id}}, {"_id": 1})
        if has_orphan_sessions:
            db.interview_sessions.update_many(
                {"candidate_email": clean_email, "candidate_id": {"$ne": user_id}},
                {"$set": {"candidate_id": user_id, "userId": user_id, "updated_at": now_iso}}
            )

        has_orphan_invites = db.interview_invitations.find_one({"candidate_email": clean_email, "candidate_id": {"$ne": user_id}}, {"_id": 1})
        if has_orphan_invites:
            db.interview_invitations.update_many(
                {"candidate_email": clean_email, "candidate_id": {"$ne": user_id}},
                {"$set": {"candidate_id": user_id, "updated_at": now_iso}}
            )

        has_orphan_notifs = db.candidate_notifications.find_one({"candidate_email": clean_email, "candidate_id": {"$ne": user_id}}, {"_id": 1})
        if has_orphan_notifs:
            db.candidate_notifications.update_many(
                {"candidate_email": clean_email, "candidate_id": {"$ne": user_id}},
                {"$set": {"candidate_id": user_id}}
            )
        print(f"[AUTO-CLAIM] Checked and linked orphan records for {safe_log_tag(clean_email)} -> Candidate ID: {user_id}")
    except Exception as e:
        print(f"[AUTO-CLAIM WARNING] Failed linking records for {safe_log_tag(email)}: {e}")


def _decode_access_token(raw_token: str) -> dict | None:
    """Return JWT claims or None if invalid/expired. Enforces strict cryptographic signature checks."""
    secret = (os.environ.get("JWT_SECRET") or SWAMI_SECRET_KEY or "").strip()
    if not raw_token or not secret:
        return None

    # Strip Bearer or quotes if present
    token = raw_token.strip().strip('"').strip("'")
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    claims = None
    try:
        from jose import jwt as jose_jwt
        claims = jose_jwt.decode(token, secret, algorithms=[JWT_ALGORITHM, "HS256"])
    except Exception:
        pass

    if not claims:
        try:
            claims = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM, "HS256"])
        except Exception:
            return None

    if not isinstance(claims, dict) or claims.get("type") == "refresh":
        return None

    # Expiry verification
    exp = claims.get("exp")
    if exp is not None:
        try:
            now_ts = datetime.now(timezone.utc).timestamp()
            if float(exp) < now_ts:
                return None
        except (ValueError, TypeError):
            return None

    return claims


def _authenticate_request() -> tuple[dict | None, tuple | None]:
    """Resolve caller from Authorization header or tp_session cookie."""
    header = request.headers.get("Authorization", "")
    scheme, _, param = header.partition(" ")
    raw_token = ""
    clean_param = param.strip()
    if scheme.lower() == "bearer" and clean_param and clean_param not in ("null", "undefined"):
        raw_token = clean_param
    elif request.cookies.get("tp_session"):
        cookie_val = request.cookies.get("tp_session", "").strip()
        if cookie_val and cookie_val not in ("null", "undefined"):
            raw_token = cookie_val

    if not raw_token:
        return None, (jsonify({"success": False, "error": "Authentication required"}), 401)

    claims = _decode_access_token(raw_token)
    if not claims:
        return None, (jsonify({"success": False, "error": "Invalid or expired credentials"}), 401)

    return claims, None


def resolve_user(user_id_or_conn, user_id=None) -> dict | None:
    """Load the caller account document from MongoDB."""
    target_id = user_id if user_id is not None else user_id_or_conn
    if hasattr(target_id, 'headers') or hasattr(target_id, 'environ'):
        try:
            claims, _ = _authenticate_request()
            target_id = claims.get("sub") or claims.get("email") if claims else None
        except Exception:
            target_id = None
    if not target_id:
        return None
    try:
        db = get_mongo_db()
        if db is None:
            return None
        s_id = str(target_id).strip()
        or_conditions = [{"id": s_id}, {"_id": s_id}, {"email": s_id.lower()}]
        try:
            from bson import ObjectId
            if ObjectId.is_valid(s_id):
                or_conditions.append({"_id": ObjectId(s_id)})
        except Exception:
            pass
        user = db.users.find_one({"$or": or_conditions})
        if user:
            user["id"] = str(user.get("id") or user.get("_id"))
        return user
    except Exception as e:
        print(f"[resolve_user] MongoDB lookup warning: {e}")
        return None


def require_auth(view):
    """Enforce authenticated user on route."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        claims, error = _authenticate_request()
        if error:
            return error

        try:
            user = resolve_user(claims.get("sub"))
        except Exception:
            traceback.print_exc()
            return jsonify({"success": False, "error": "Database unavailable"}), 503

        if user is None:
            return jsonify({"success": False, "error": "Account not found"}), 401
        if str(user.get("status", "")).lower() not in ("active", "1", "true"):
            return jsonify({"success": False, "error": "Account is suspended"}), 403

        g.user_claims = claims
        g.user = dict(user)
        return view(*args, **kwargs)

    return wrapper


def require_super_admin(view):
    """Require active super-admin or admin privileges."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        authorization = request.headers.get("Authorization", "")
        scheme, _, bearer = authorization.partition(" ")
        token = bearer.strip() if scheme.lower() == "bearer" else ""
        token = token or request.cookies.get("tp_session", "")
        claims = _decode_access_token(token)
        if not claims:
            return jsonify({"success": False, "error": "Authentication required"}), 401

        role = str(claims.get("role", "")).lower()
        if role not in ("super_admin", "admin"):
            return jsonify({"success": False, "error": "Platform administrator access required"}), 403

        user = resolve_user(claims.get("sub"))
        if not user and claims.get("email"):
            user = resolve_user(claims.get("email"))
        if not user:
            return jsonify({"success": False, "error": "Administrator account not found in system or has been revoked."}), 401

        if str(user.get("status", "")).lower() not in ("active", "1", "true"):
            return jsonify({"success": False, "error": "Account is suspended"}), 403

        g.user_claims = claims
        g.user = dict(user)
        return view(*args, **kwargs)

    return wrapper


def require_session_access(view):
    """
    Session-scoped authorization for /api/interview/.../<session_id> routes.

    Authenticates the caller and verifies the interview_sessions document
    addressed by the <session_id> URL parameter belongs to them. Access is
    granted to: the candidate owner, the recruiter owner, staff members of
    the owning organization, and super-admins. Everyone else gets 403.
    """
    @wraps(view)
    def wrapper(*args, **kwargs):
        claims, error = _authenticate_request()
        if error:
            return error

        try:
            user = resolve_user(claims.get("sub"))
        except Exception:
            traceback.print_exc()
            return jsonify({"success": False, "error": "Database unavailable"}), 503

        if user is None:
            return jsonify({"success": False, "error": "Account not found"}), 401
        if str(user.get("status", "")).lower() not in ("active", "1", "true"):
            return jsonify({"success": False, "error": "Account is suspended"}), 403

        session_id = kwargs.get("session_id") or (args[0] if args else None)
        session_id = str(session_id or "").strip()
        if not session_id:
            return jsonify({"success": False, "error": "Session id required"}), 400

        db = get_mongo_db()
        if db is None:
            return jsonify({"success": False, "error": "Database unavailable"}), 503

        session_doc = db.interview_sessions.find_one(
            {"$or": [{"id": session_id}, {"_id": session_id}, {"session_id": session_id}]},
        )
        if not session_doc:
            return jsonify({"error": "Interview session not found", "status": 404}), 404

        g.user_claims = claims
        g.user = dict(user)
        g.session_document = session_doc

        role = str(user.get("role", "")).lower()
        if role == "super_admin":
            return view(*args, **kwargs)

        uid = str(user.get("id") or user.get("_id") or "").strip().lower()
        email = str(user.get("email") or "").strip().lower()

        def _owns(*fields):
            for field in fields:
                value = session_doc.get(field)
                cleaned = str(value).strip().lower() if value else ""
                if cleaned and (cleaned == uid or cleaned == email):
                    return True
            return False

        # Candidate owner (id or email match)
        if _owns("candidate_id", "candidate_email", "candidateId", "candidateEmail", "user_id", "userId"):
            return view(*args, **kwargs)

        # Recruiter owner (id or email match)
        if _owns("recruiter_id", "recruiter_email", "recruiterId", "recruiterEmail"):
            return view(*args, **kwargs)

        # Staff member of the owning organization
        caller_org = str(user.get("org_id") or user.get("orgId") or "").strip()
        session_org = str(session_doc.get("org_id") or session_doc.get("orgId") or "").strip()
        if caller_org and session_org and caller_org == session_org:
            if role in ("recruiter", "hr", "admin", "employer"):
                return view(*args, **kwargs)

        return jsonify({"success": False, "error": "You do not have access to this interview session"}), 403

    return wrapper


def send_otp_email_smtp(to_email: str, otp_code: str, purpose: str = "REGISTRATION_VERIFY") -> tuple[bool, str | None]:
    """Dispatch email OTP via SMTP."""
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
    try:
        smtp_port = int(os.environ.get("SMTP_PORT", 465))
    except (ValueError, TypeError):
        smtp_port = 465

    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_pass = os.environ.get("SMTP_PASS", "").strip()
    from_name = os.environ.get("SMTP_FROM_NAME", "Progeni Atlas").strip()
    smtp_from = os.environ.get("SMTP_FROM", f'"{from_name}" <{smtp_user}>').strip()

    subject = "Progeni Atlas ÔÇö Verify Your Email Address"
    if purpose == "FORGOT_PASSWORD":
        subject = "Progeni Atlas ÔÇö Password Reset Verification Code"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 32px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;">
      <h2 style="color: #06b6d4; margin-bottom: 8px;">{from_name}</h2>
      <p style="color: #94a3b8; font-size: 14px;">Verification Security Code</p>
      <div style="background-color: #0f172a; border: 1px solid #334155; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #38bdf8;">{otp_code}</span>
      </div>
      <p style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">This single-use code is valid for <strong>2 minutes (120 seconds)</strong>.</p>
      <p style="color: #64748b; font-size: 11px;">If you did not request this verification code, please ignore this message.</p>
    </div>
    """

    try:
        from core.email import send_transactional_email
        ok, err = send_transactional_email(
            to_email=to_email,
            subject=subject,
            html_body=html_content,
        )
        if ok:
            print(f"[EMAIL] Transactional message delivered to {safe_log_tag(to_email)}")
        else:
            print(f"[EMAIL] Delivery failed for {safe_log_tag(to_email)}: {err}")
        return ok, err
    except Exception as err:
        logger.exception("[EMAIL] send_transactional_email crashed for %s", safe_log_tag(to_email))
        return False, f"Failed to deliver email: {str(err)}"

def send_interview_invite_email_smtp(
    to_email: str,
    candidate_name: str,
    role: str,
    company_name: str,
    invite_url: str,
    interview_date: str = "",
    interview_time: str = "",
    recruiter_name: str = "",
    recruiter_email: str = "",
    jd_text: str = "",
    duration_minutes: int = 30,
) -> tuple[bool, str | None]:
    """Send a professional, branded interview invitation with an optional JD PDF attachment."""
    from html import escape as _esc
    from datetime import datetime

    who = _esc((candidate_name or "Candidate").strip() or "Candidate")
    role_esc = _esc(role)
    company = _esc(company_name)
    recruiter_line = f"{_esc(recruiter_name)} · {_esc(recruiter_email)}" if recruiter_email else _esc(recruiter_name or "Recruiting Team")
    invite = _esc(invite_url)

    # Professional schedule phrasing
    schedule_text = "Open — you can start anytime using your personal link"
    if interview_date:
        try:
            d = datetime.strptime(interview_date.strip(), "%Y-%m-%d")
            schedule_text = d.strftime("%A, %d %B %Y")
            if interview_time:
                hh, mm = interview_time.strip().split(":")[:2]
                hour = int(hh); minute = mm[:2]
                suffix = "AM" if hour < 12 else "PM"
                disp = hour % 12 or 12
                schedule_text += f"  at  {disp}:{minute} {suffix} IST"
        except Exception:
            schedule_text = f"{interview_date}{(' at ' + interview_time) if interview_time else ''}"

    subject = f"Interview Invitation: {role} at {company_name}"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 18px rgba(15,23,42,0.08);">

  <!-- Brand header band -->
  <tr><td style="background:#0f172a;padding:22px 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <div style="font-size:19px;font-weight:800;color:#ffffff;letter-spacing:0.2px;">Progeni <span style="color:#22d3ee;">Atlas</span></div>
          <div style="font-size:10px;color:#94a3b8;letter-spacing:1.6px;text-transform:uppercase;margin-top:2px;">AI Technical Screening</div>
        </td>
        <td align="right" style="vertical-align:middle;">
          <div style="display:inline-block;border:1px solid #22d3ee;color:#22d3ee;font-size:10px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;border-radius:999px;padding:5px 12px;">Invitation</div>
        </td>
      </tr>
    </table>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#22d3ee,#38bdf8,#6366f1);line-height:3px;font-size:0;">&nbsp;</td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 30px 8px 30px;">
    <p style="margin:0 0 14px 0;font-size:15px;color:#0f172a;">Hi <strong>{who}</strong>,</p>
    <p style="margin:0 0 18px 0;font-size:13.5px;line-height:1.65;color:#334155;">
      You have been invited to complete an <strong>AI Technical Screening</strong> for the role of
      <strong>{role_esc}</strong> at <strong>{company}</strong>. The assessment is a live, two-way interview conducted
      by Progeni Atlas's AI interviewer — it adapts to your answers and evaluates you on structured rubrics.
    </p>

    <!-- Details table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin:0 0 18px 0;">
      <tr><td style="background:#f8fafc;padding:10px 14px;font-size:11px;color:#64748b;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;width:150px;">Position</td><td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:700;">{role_esc}</td></tr>
      <tr><td style="background:#f8fafc;padding:10px 14px;font-size:11px;color:#64748b;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;border-top:1px solid #e2e8f0;">Company</td><td style="padding:10px 14px;font-size:13px;color:#0f172a;border-top:1px solid #e2e8f0;">{company}</td></tr>
      <tr><td style="background:#f8fafc;padding:10px 14px;font-size:11px;color:#64748b;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;border-top:1px solid #e2e8f0;">Schedule</td><td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:700;border-top:1px solid #e2e8f0;">{schedule_text}</td></tr>
      <tr><td style="background:#f8fafc;padding:10px 14px;font-size:11px;color:#64748b;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;border-top:1px solid #e2e8f0;">Duration</td><td style="padding:10px 14px;font-size:13px;color:#0f172a;border-top:1px solid #e2e8f0;">{int(duration_minutes)} minutes  ·  camera, microphone &amp; a coding environment required</td></tr>
      <tr><td style="background:#f8fafc;padding:10px 14px;font-size:11px;color:#64748b;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;border-top:1px solid #e2e8f0;">Organiser</td><td style="padding:10px 14px;font-size:13px;color:#0f172a;border-top:1px solid #e2e8f0;">{recruiter_line}</td></tr>
    </table>

    <div style="margin:0 0 18px 0;padding:12px 14px;background:#ecfeff;border-left:3px solid #22d3ee;border-radius:6px;font-size:12px;line-height:1.6;color:#155e75;">
      <strong>Attached:</strong> full job description for this role (PDF) with preparation checklist — please review it before your interview.
    </div>

    <!-- CTA -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:6px 0 16px 0;">
      <a href="{invite}" style="display:inline-block;background:linear-gradient(135deg,#0891b2,#0284c7);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;letter-spacing:0.2px;border-radius:10px;padding:14px 36px;">Start Your Interview</a>
    </td></tr></table>
    <p style="margin:0 0 4px 0;font-size:11.5px;color:#64748b;text-align:center;">Or copy this link into your browser:</p>
    <p style="margin:0 0 16px 0;font-size:11px;color:#0891b2;text-align:center;word-break:break-all;">{invite}</p>

    <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">This link is personal to you. Do not forward, share, or post it. Interviews are monitored for integrity.</p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 30px;">
    <p style="margin:0;font-size:10.5px;line-height:1.6;color:#64748b;">
      You are receiving this email because {company} invited you via <strong>Progeni Atlas</strong>.
      Questions about this role? Reply directly to this email — it reaches {recruiter_line.split(' · ')[0]}.
      <br/>Progeni Atlas  ·  AI-led technical screening  ·  <a href="https://atlas.progeni.live" style="color:#0891b2;text-decoration:none;">atlas.progeni.live</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>"""

    attachments = []
    if jd_text and jd_text.strip():
        try:
            from core.email_docs import build_jd_pdf
            pdf_bytes, filename = build_jd_pdf(
                company=company_name,
                role=role,
                jd_text=jd_text,
                interview_date=interview_date,
                interview_time=interview_time,
                duration_minutes=duration_minutes,
                invite_url=invite_url,
                recruiter_name=recruiter_name,
            )
            attachments.append({"filename": filename, "content": pdf_bytes, "content_type": "application/pdf"})
        except Exception:
            logger.exception("[INVITE EMAIL] JD PDF generation failed; sending without attachment")

    try:
        from core.email import send_transactional_email
        ok, err = send_transactional_email(
            to_email=to_email,
            subject=subject,
            html_body=html_content,
            reply_to=recruiter_email or None,
            attachments=attachments,
        )
        if ok:
            print(f"[EMAIL] Interview invitation delivered to {safe_log_tag(to_email)}")
        else:
            print(f"[EMAIL] Delivery failed for {safe_log_tag(to_email)}: {err}")
        return ok, err
    except Exception as err:
        logger.exception("[EMAIL] send_transactional_email crashed for %s", safe_log_tag(to_email))
        return False, f"Failed to deliver email: {str(err)}"


def send_team_invite_email_smtp(
    to_email: str,
    org_name: str,
    inviter_name: str,
    role: str,
    invite_url: str,
    expires_in_days: int = 7,
) -> tuple[bool, str | None]:
    """Professional org team-workspace invitation email."""
    from html import escape as _esc

    org = _esc(org_name or "your organization")
    inviter = _esc(inviter_name or "Your workspace admin")
    role_esc = _esc(role)
    url = _esc(invite_url)
    subject = f"You've been invited to join {org_name} on Progeni Atlas"

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>{_esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 18px rgba(15,23,42,0.08);">
  <tr><td style="background:#0f172a;padding:22px 30px;">
    <div style="font-size:19px;font-weight:800;color:#ffffff;">Progeni <span style="color:#22d3ee;">Atlas</span></div>
    <div style="font-size:10px;color:#94a3b8;letter-spacing:1.6px;text-transform:uppercase;margin-top:2px;">Team Workspace Invitation</div>
  </td></tr>
  <tr><td style="height:3px;background:linear-gradient(90deg,#22d3ee,#38bdf8,#6366f1);line-height:3px;font-size:0;">&nbsp;</td></tr>
  <tr><td style="padding:28px 30px 10px 30px;">
    <p style="margin:0 0 14px 0;font-size:15px;color:#0f172a;">Hi there,</p>
    <p style="margin:0 0 16px 0;font-size:13.5px;line-height:1.65;color:#334155;">
      <strong>{inviter}</strong> has invited you to join <strong>{org}</strong> on Progeni Atlas as a
      <strong>{role_esc}</strong>. As a member you can review departments, interview dossiers, decision pipelines and team analytics.
    </p>
    <div style="margin:0 0 18px 0;padding:12px 14px;background:#f0f9ff;border-left:3px solid #22d3ee;border-radius:6px;font-size:12px;color:#155e75;">
      Accepting also links your account to <strong>{org}</strong> — no separate org code needed.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:4px 0 14px 0;">
      <a href="{url}" style="display:inline-block;background:linear-gradient(135deg,#0891b2,#0284c7);color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;border-radius:10px;padding:13px 34px;">Accept Invitation</a>
    </td></tr></table>
    <p style="margin:0 0 4px 0;font-size:11.5px;color:#64748b;text-align:center;">Or copy this link:</p>
    <p style="margin:0 0 14px 0;font-size:11px;color:#0891b2;text-align:center;word-break:break-all;">{url}</p>
    <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">This invitation expires in {int(expires_in_days)} days. If you were not expecting this invitation, you can safely ignore this email — nothing will be changed without your action.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:14px 30px;">
    <p style="margin:0;font-size:10.5px;line-height:1.6;color:#64748b;">{org} invited you via <strong>Progeni Atlas</strong> · <a href="https://atlas.progeni.live" style="color:#0891b2;text-decoration:none;">atlas.progeni.live</a></p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>"""

    try:
        from core.email import send_transactional_email
        ok, err = send_transactional_email(
            to_email=to_email,
            subject=subject,
            html_body=html_content,
        )
        if ok:
            print(f"[EMAIL] Team invite delivered to {safe_log_tag(to_email)}")
        else:
            print(f"[EMAIL] Team invite delivery failed for {safe_log_tag(to_email)}: {err}")
        return ok, err
    except Exception as err:
        logger.exception("[EMAIL] team invite send crashed for %s", safe_log_tag(to_email))
        return False, f"Failed to deliver email: {str(err)}"


def send_candidate_decision_email_smtp(
    to_email: str,
    candidate_name: str,
    role: str,
    company_name: str,
    decision: str,
    notes: str = ""
) -> tuple[bool, str | None]:
    """Send automated polite email notification to candidate on hiring decision (shortlisted/selected or rejected)."""
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
    try:
        smtp_port = int(os.environ.get("SMTP_PORT", 465))
    except (ValueError, TypeError):
        smtp_port = 465

    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_pass = os.environ.get("SMTP_PASS", "").strip()
    from_name = os.environ.get("SMTP_FROM_NAME", "Progeni Atlas").strip()
    smtp_from = os.environ.get("SMTP_FROM", f'"{from_name}" <{smtp_user}>').strip()

    decision_norm = str(decision).lower().strip()
    is_positive = decision_norm in ("selected", "shortlisted", "advanced_to_panel", "hire", "strong_hire")

    if is_positive:
        subject = f"Congratulations! Next Steps for {role} at {company_name}"
        status_badge_bg = "#059669"
        status_badge_text = "SHORTLISTED FOR NEXT ROUND"
        intro_heading = "Congratulations on being shortlisted!"
        main_message = f"""
        We are thrilled to inform you that following your AI technical assessment, our recruiting team at <strong>{company_name}</strong> has shortlisted your profile for the <strong>{role}</strong> position.
        <br/><br/>
        Your technical depth, problem-solving clarity, and practical approach throughout the interview demonstrated strong alignment with our engineering standards.
        """
        next_steps_block = f"""
        <div style="background-color: #0f172a; border-left: 4px solid #10b981; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin: 0 0 6px 0; color: #34d399; font-size: 14px;">Next Steps in the Hiring Process</h4>
          <p style="margin: 0; color: #cbd5e1; font-size: 13px; line-height: 1.5;">
            Our hiring coordinator will contact you shortly with scheduling details for your technical panel interview. Please ensure your contact details remain up to date.
          </p>
        </div>
        """
    else:
        subject = f"Update regarding your application for {role} at {company_name}"
        status_badge_bg = "#475569"
        status_badge_text = "APPLICATION STATUS UPDATE"
        intro_heading = "Thank you for your time and participation"
        main_message = f"""
        Thank you for taking the time to participate in our technical interview screening for the <strong>{role}</strong> position at <strong>{company_name}</strong>.
        <br/><br/>
        We truly appreciated learning more about your technical background and experience. After careful evaluation of all submissions against our immediate team requirements, we have decided not to advance your application to the next round at this time.
        """
        next_steps_block = f"""
        <div style="background-color: #0f172a; border-left: 4px solid #64748b; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <h4 style="margin: 0 0 6px 0; color: #94a3b8; font-size: 14px;">Future Opportunities with Us</h4>
          <p style="margin: 0; color: #cbd5e1; font-size: 13px; line-height: 1.5;">
            This was an extremely competitive applicant pool. We will keep your verified technical profile in our active talent pool for future openings that match your skill set.
          </p>
        </div>
        """

    feedback_block = ""
    if notes:
        feedback_block = f"""
        <div style="background-color: #1e293b; border: 1px solid #334155; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 4px 0; color: #94a3b8; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Notes from Hiring Team:</p>
          <p style="margin: 0; color: #f1f5f9; font-size: 13px; font-style: italic; line-height: 1.5;">&ldquo;{notes}&rdquo;</p>
        </div>
        """

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; padding: 36px 20px; max-width: 580px; margin: 0 auto; border-radius: 14px; border: 1px solid #1e293b;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 18px; margin-bottom: 24px;">
        <div>
          <h2 style="color: #38bdf8; margin: 0; font-size: 20px; font-weight: 700;">{company_name}</h2>
          <span style="color: #64748b; font-size: 12px;">Powered by Progeni Atlas</span>
        </div>
        <div style="text-align: right;">
          <span style="background-color: {status_badge_bg}; color: #ffffff; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
            {status_badge_text}
          </span>
        </div>
      </div>

      <h3 style="color: #f1f5f9; font-size: 17px; margin-top: 0; margin-bottom: 12px;">{intro_heading}</h3>

      <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin-top: 0;">
        Hello <strong>{candidate_name}</strong>,
      </p>

      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        {main_message}
      </div>

      <div style="background-color: #0c1322; border: 1px solid #1e293b; border-radius: 10px; padding: 14px 18px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Position:</td>
            <td style="color: #f1f5f9; font-weight: 600; text-align: right; padding: 4px 0;">{role}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Organization:</td>
            <td style="color: #38bdf8; font-weight: 600; text-align: right; padding: 4px 0;">{company_name}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Decision Status:</td>
            <td style="color: {'#34d399' if is_positive else '#94a3b8'}; font-weight: 700; text-align: right; padding: 4px 0;">
              {'Shortlisted / Selected' if is_positive else 'Not Selected'}
            </td>
          </tr>
        </table>
      </div>

      {feedback_block}

      {next_steps_block}

      <div style="border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 24px; color: #64748b; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 6px 0;">Best regards,</p>
        <p style="margin: 0; font-weight: 600; color: #94a3b8;">The Hiring Team at {company_name}</p>
        <p style="margin: 4px 0 0 0; color: #475569; font-size: 11px;">Progeni Atlas Autonomous Screening &bull; Verified Evaluation Notification</p>
      </div>
    </div>
    """

    try:
        from core.email import send_transactional_email
        ok, err = send_transactional_email(
            to_email=to_email,
            subject=subject,
            html_body=html_content,
        )
        if ok:
            print(f"[EMAIL] Transactional message delivered to {safe_log_tag(to_email)}")
        else:
            print(f"[EMAIL] Delivery failed for {safe_log_tag(to_email)}: {err}")
        return ok, err
    except Exception as err:
        logger.exception("[EMAIL] send_transactional_email crashed for %s", safe_log_tag(to_email))
        return False, f"Failed to deliver email: {str(err)}"

def send_interview_completion_email_smtp(
    to_email: str,
    candidate_name: str,
    role: str,
    company_name: str,
    overall_score: int | float | None = None
) -> tuple[bool, str | None]:
    """Send automated email notification to candidate confirming successful interview submission & AI evaluation."""
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
    try:
        smtp_port = int(os.environ.get("SMTP_PORT", 465))
    except (ValueError, TypeError):
        smtp_port = 465

    smtp_user = os.environ.get("SMTP_USER", "").strip()
    smtp_pass = os.environ.get("SMTP_PASS", "").strip()
    from_name = os.environ.get("SMTP_FROM_NAME", "Progeni Atlas").strip()
    smtp_from = os.environ.get("SMTP_FROM", f'"{from_name}" <{smtp_user}>').strip()

    subject = f"Technical Assessment Completed: {role} at {company_name}"
    score_badge = f'<div style="text-align: right;"><span style="background-color: #0284c7; color: #ffffff; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;">OVERALL SCORE: {overall_score}%</span></div>' if overall_score is not None else ''

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090d16; color: #f8fafc; padding: 36px 20px; max-width: 580px; margin: 0 auto; border-radius: 14px; border: 1px solid #1e293b;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 18px; margin-bottom: 24px;">
        <div>
          <h2 style="color: #38bdf8; margin: 0; font-size: 20px; font-weight: 700;">{company_name}</h2>
          <span style="color: #64748b; font-size: 12px;">Autonomous Technical Screening</span>
        </div>
        {score_badge}
      </div>

      <h3 style="color: #f1f5f9; font-size: 17px; margin-top: 0; margin-bottom: 12px;">Your technical assessment is complete!</h3>

      <p style="color: #e2e8f0; font-size: 14px; line-height: 1.6; margin-top: 0;">
        Hello <strong>{candidate_name}</strong>,
      </p>

      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
        Thank you for completing your technical interview session for the <strong>{role}</strong> position at <strong>{company_name}</strong>.
      </p>

      <div style="background-color: #0c1322; border: 1px solid #1e293b; border-radius: 10px; padding: 16px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Target Role:</td>
            <td style="color: #f1f5f9; font-weight: 600; text-align: right; padding: 4px 0;">{role}</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Status:</td>
            <td style="color: #34d399; font-weight: 700; text-align: right; padding: 4px 0;">Submitted & Verified</td>
          </tr>
          <tr>
            <td style="color: #64748b; padding: 4px 0;">Evaluation Model:</td>
            <td style="color: #94a3b8; text-align: right; padding: 4px 0;">4-Pillar Competency Engine</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #0f172a; border-left: 4px solid #0ea5e9; padding: 14px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; color: #cbd5e1; font-size: 13px; line-height: 1.5;">
          Our recruiting committee has been notified and is reviewing your scorecard, code execution benchmarks, and response transcripts. You will receive an email update as soon as the hiring team finalizes next steps.
        </p>
      </div>

      <div style="border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 24px; color: #64748b; font-size: 12px; line-height: 1.5;">
        <p style="margin: 0 0 4px 0;">Best regards,</p>
        <p style="margin: 0; font-weight: 600; color: #94a3b8;">Talent Acquisition Team &bull; {company_name}</p>
      </div>
    </div>
    """

    try:
        from core.email import send_transactional_email
        ok, err = send_transactional_email(
            to_email=to_email,
            subject=subject,
            html_body=html_content,
        )
        if ok:
            print(f"[EMAIL] Transactional message delivered to {safe_log_tag(to_email)}")
        else:
            print(f"[EMAIL] Delivery failed for {safe_log_tag(to_email)}: {err}")
        return ok, err
    except Exception as err:
        logger.exception("[EMAIL] send_transactional_email crashed for %s", safe_log_tag(to_email))
        return False, f"Failed to deliver email: {str(err)}"


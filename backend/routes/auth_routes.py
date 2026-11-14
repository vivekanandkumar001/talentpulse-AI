"""
Progeni Atlas — Authentication Blueprint
=========================================
Enterprise auth routes: email check, register, verify-otp, resend-otp,
login, logout, refresh, forgot-password, reset-password.
"""

from core.http_utils import safe_log_tag
import os
import uuid
import datetime
from datetime import datetime, timezone, timedelta
import traceback
import jwt
from flask import Blueprint, request, jsonify, make_response, g

from core.db import get_mongo_db
from core.wallet import grant_signup_free_credits
from core.security import (
    hash_password, verify_password, validate_password_strength,
    hash_otp, check_otp_hash, generate_otp_code,
    send_otp_email_smtp, _as_aware_utc, link_candidate_records_by_email,
    _decode_access_token, _authenticate_request, resolve_user, require_auth,
    SWAMI_SECRET_KEY, JWT_ALGORITHM, OTP_LENGTH, OTP_TTL_SEC,
    OTP_RESEND_COOLDOWN_SEC, OTP_MAX_ATTEMPTS, OTP_RE
)

auth_bp = Blueprint("auth_bp", __name__)

@auth_bp.route("/api/auth/check-email", methods=["POST"])
def check_email_exists():
    """Duplicate Account Guard: Check if email already exists in MongoDB."""
    try:
        data = request.get_json(silent=True, force=True) or {}
        email = data.get("email", "").strip().lower()
        if not email:
            return jsonify({"exists": False}), 400

        db = get_mongo_db()
        user = db.users.find_one({"email": email})
        if user:
            return jsonify({
                "exists": True,
                "isVerified": user.get("is_email_verified", False),
                "role": user.get("role", "candidate"),
                "message": "Account already exists with this email address."
            }), 200

        return jsonify({"exists": False}), 200
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred"}), 500


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    """User Registration with Duplicate Guard & 2-Minute Email OTP generation via MongoDB."""
    try:
        data = request.get_json(silent=True, force=True) or {}
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        full_name = data.get("fullName", "").strip()
        requested_role = data.get("role", "candidate").strip().lower()
        # Security Guard: Only candidate and recruiter roles can be publicly registered.
        # Administrative roles (admin, super_admin) must be granted by platform administrators.
        role = requested_role if requested_role in ("candidate", "recruiter") else "candidate"
        phone = str(data.get("phone") or "").strip()

        def _optional_text(key):
            value = data.get(key)
            return value.strip() if isinstance(value, str) and value.strip() else None

        def _optional_number(key):
            value = data.get(key)
            if value is None or value == "":
                return None
            try:
                return float(value)
            except (TypeError, ValueError):
                return None

        # Profile fields collected by the signup form. Previously the register
        # endpoint dropped course/branch/year/company details, so candidates and
        # recruiters had to re-enter everything after verification.
        profile_updates = {
            "course": _optional_text("course"),
            "branch": _optional_text("branch"),
            "academic_year": _optional_text("academic_year"),
            "education_status": _optional_text("education_status"),
            "years_experience": _optional_number("years_experience"),
            "headline": _optional_text("headline"),
            "org_name": _optional_text("org_name"),
            "company_name": _optional_text("company_name") or _optional_text("org_name") or _optional_text("companyName"),
            "designation": _optional_text("designation"),
            "company_size": _optional_text("company_size"),
        }

        if not email or not password or not full_name:
            return jsonify({"error": "Full name, email, and password are required."}), 400

        is_strong, pass_err = validate_password_strength(password)
        if not is_strong:
            return jsonify({"error": pass_err}), 400

        db = get_mongo_db()

        # 1. Duplicate Account Check (Only verified accounts strictly block re-registration)
        existing_user = db.users.find_one({"email": email})
        now_utc = datetime.now(timezone.utc)
        pwd_hash = hash_password(password)

        if existing_user:
            if existing_user.get("is_email_verified"):
                return jsonify({
                    "isDuplicate": True,
                    "redirectUrl": "/login",
                    "message": "An account with this email already exists. Please log in."
                }), 409
            else:
                # Account was registered previously but NOT verified yet.
                # Update credentials & info, then proceed to issue a fresh OTP.
                user_id = str(existing_user.get("id") or existing_user["_id"])
                update_fields = {
                    "password_hash": pwd_hash,
                    "full_name": full_name,
                    "role": role,
                    "phone": phone or existing_user.get("phone"),
                    "updated_at": now_utc,
                }
                update_fields.update({
                    key: value for key, value in profile_updates.items() if value is not None
                })
                db.users.update_one(
                    {"_id": existing_user["_id"]},
                    {"$set": update_fields}
                )
        else:
            # 2. Insert User into MongoDB
            user_id = str(uuid.uuid4())
            db.users.insert_one({
                "id": user_id,
                "email": email,
                "password_hash": pwd_hash,
                "full_name": full_name,
                "role": role,
                "status": "active",
                "is_email_verified": False,
                "phone": phone or None,
                **profile_updates,
                "created_at": now_utc,
                "updated_at": now_utc,
            })

        # 3. Generate 6-digit OTP (server-side TTL is the source of truth)
        otp_code = generate_otp_code()
        otp_hash = hash_otp(otp_code)
        expires_at = now_utc + timedelta(seconds=OTP_TTL_SEC)

        # Invalidate old OTPs for registration
        db.email_otps.delete_many({"email": email, "purpose": "REGISTRATION_VERIFY"})

        # Insert new OTP
        db.email_otps.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "otp_hash": otp_hash,
            "purpose": "REGISTRATION_VERIFY",
            "expires_at": expires_at,
            "attempts_count": 0,
            "created_at": now_utc,
        })

        email_sent, email_err = send_otp_email_smtp(email, otp_code, "REGISTRATION_VERIFY")
        if not email_sent:
            print(f"[OTP] Registration email handoff warning recipient={safe_log_tag(email)}: {email_err}")
            return jsonify({
                "success": True,
                "warning": "Account created. If the verification email does not arrive, check spam or request a resend.",
                "email": email,
                "role": role,
                "otpRequired": True,
                "expiresInSec": OTP_TTL_SEC,
                "redirectUrl": f"/verify-otp?email={email}&purpose=REGISTRATION_VERIFY"
            }), 201

        return jsonify({
            "success": True,
            "email": email,
            "role": role,
            "otpRequired": True,
            "expiresInSec": OTP_TTL_SEC,
            "redirectUrl": f"/verify-otp?email={email}&purpose=REGISTRATION_VERIFY"
        }), 201
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500


@auth_bp.route("/api/auth/verify-otp", methods=["POST"])
def verify_otp():
    """Verify 6-digit numeric OTP via MongoDB. Server-side expiry + one-time-use enforced."""
    try:
        data = request.get_json(silent=True, force=True) or {}
        email = data.get("email", "").strip().lower()
        otp_code = data.get("otp", "").strip()
        purpose = data.get("purpose", "REGISTRATION_VERIFY").strip()
        if purpose not in ("REGISTRATION_VERIFY", "FORGOT_PASSWORD"):
            purpose = "REGISTRATION_VERIFY"

        if not email or not otp_code:
            return jsonify({"error": "Email and OTP code are required."}), 400
        if not OTP_RE.match(otp_code):
            return jsonify({"error": "OTP code must be exactly 6 digits."}), 400

        db = get_mongo_db()

        # Lookup latest valid OTP
        record = db.email_otps.find_one({"email": email, "purpose": purpose}, sort=[("created_at", -1)])

        if not record:
            return jsonify({"error": "No OTP request found for this email. Please request a new code."}), 400

        now_utc = datetime.now(timezone.utc)
        expires_at = _as_aware_utc(record.get("expires_at"))
        if expires_at < now_utc:
            db.email_otps.delete_one({"_id": record["_id"]})
            print(f"[OTP] Verification rejected (expired) purpose={purpose} recipient={safe_log_tag(email)}")
            return jsonify({"error": "OTP code has expired after 2 minutes. Please click Resend Code.",
                            "expired": True}), 400

        if (record.get("attempts_count") or 0) >= OTP_MAX_ATTEMPTS:
            db.email_otps.delete_one({"_id": record["_id"]})
            return jsonify({"error": "Too many invalid attempts. Your verification code has been invalidated. Please request a new code."}), 429

        # Verify hash (HMAC-peppered; plain-SHA256 hashes are rejected)
        if not check_otp_hash(otp_code, record["otp_hash"]):
            db.email_otps.update_one({"_id": record["_id"]}, {"$inc": {"attempts_count": 1}})
            print(f"[OTP] Verification rejected (incorrect) purpose={purpose} recipient={safe_log_tag(email)}")
            return jsonify({"error": "Incorrect OTP code. Please check your email and try again."}), 400

        # OTP Verified Successfully!
        if purpose == "FORGOT_PASSWORD":
            # For password reset: create a tamper-proof reset token (valid for 15 mins)
            # and delete the consumed OTP
            db.email_otps.delete_many({"email": email, "purpose": purpose})
            reset_exp = int(datetime.now(timezone.utc).timestamp()) + 900
            reset_token = jwt.encode({
                "sub": email,
                "email": email,
                "purpose": "password_reset",
                "exp": reset_exp
            }, SWAMI_SECRET_KEY, algorithm="HS256")
            if isinstance(reset_token, bytes):
                reset_token = reset_token.decode("utf-8")

            return jsonify({
                "success": True,
                "message": "OTP verified successfully. You may now set your new password.",
                "email": email,
                "resetToken": reset_token,
                "redirectUrl": f"/forgot-password?step=2&email={email}&token={reset_token}"
            }), 200

        db.email_otps.delete_many({"email": email, "purpose": purpose})

        user_role = "candidate"
        user_doc = None
        credits_granted = 0.0
        if purpose == "REGISTRATION_VERIFY":
            db.users.update_one({"email": email}, {"$set": {"is_email_verified": True, "updated_at": now_utc, "last_login_at": now_utc}})
            user_doc = db.users.find_one({"email": email})
            if user_doc:
                user_role = user_doc.get("role", "candidate")
                resolved_user_id = str(user_doc.get("id") or user_doc["_id"])
                link_candidate_records_by_email(resolved_user_id, email)
                # Admin-configured one-time welcome credits (free plan)
                try:
                    credits_granted = grant_signup_free_credits(user_doc)
                except Exception as grant_err:
                    credits_granted = 0.0
                    print(f"[SIGNUP BONUS] Grant FAILED for {safe_log_tag(email)}: {grant_err}")
                if credits_granted and credits_granted > 0:
                    print(f"[SIGNUP BONUS] Granted {credits_granted} free credits to {safe_log_tag(email)} on first verification")
            else:
                credits_granted = 0.0

        user_role = str(user_role).lower().strip()
        target_dashboard = (
            "/super-admin" if user_role == "super_admin"
            else ("/recruiter/dashboard" if user_role in ("recruiter", "admin", "hr")
            else "/candidate/dashboard")
        )

        token = None
        user_payload = None
        if user_doc and purpose == "REGISTRATION_VERIFY":
            user_id = str(user_doc.get("id") or user_doc["_id"])
            exp_timestamp = int(datetime.now(timezone.utc).timestamp()) + 7 * 24 * 3600
            jwt_payload = {
                "sub": user_id,
                "email": email,
                "role": user_role,
                "type": "access",
                "exp": exp_timestamp,
                "ver": 1
            }
            token = jwt.encode(jwt_payload, SWAMI_SECRET_KEY, algorithm="HS256")
            if isinstance(token, bytes):
                token = token.decode("utf-8")

            user_payload = {
                "id": user_id,
                "orgId": str(user_doc.get("org_id")) if user_doc.get("org_id") else None,
                "email": user_doc["email"],
                "fullName": user_doc.get("full_name", ""),
                "role": user_role,
                "status": user_doc.get("status", "active"),
                "isEmailVerified": True,
                "avatarUrl": user_doc.get("avatar_url"),
            }

        resp_data = {
            "success": True,
            "message": "Email verified successfully!",
            "role": user_role,
            "redirectUrl": target_dashboard,
            "creditsGranted": credits_granted if purpose == "REGISTRATION_VERIFY" else 0.0,
        }
        if token and user_payload:
            resp_data["token"] = token
            resp_data["access_token"] = token
            resp_data["user"] = user_payload

        resp = make_response(jsonify(resp_data), 200)
        if token:
            is_prod = os.environ.get("APP_ENV", "development").strip().lower() in ("production", "prod")
            resp.set_cookie("tp_session", token, max_age=7*24*3600, path="/", samesite="Lax", httponly=True, secure=is_prod)
            resp.set_cookie("tp_role", user_role, max_age=7*24*3600, path="/", samesite="Lax", httponly=True, secure=is_prod)
        return resp
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"OTP verification failed: {str(e)}"}), 500


@auth_bp.route("/api/auth/resend-otp", methods=["POST"])
def resend_otp():
    """Resend OTP with rate limiting; invalidates the previous OTP in MongoDB."""
    try:
        data = request.get_json(silent=True, force=True) or {}
        email = data.get("email", "").strip().lower()
        purpose = data.get("purpose", "REGISTRATION_VERIFY").strip()
        if purpose not in ("REGISTRATION_VERIFY", "FORGOT_PASSWORD"):
            purpose = "REGISTRATION_VERIFY"

        if not email:
            return jsonify({"error": "Email is required."}), 400

        db = get_mongo_db()

        # Resend only for existing accounts (prevents arbitrary email bombing).
        # Return a uniform success response regardless of existence so the
        # endpoint cannot be used to enumerate registered emails.
        user = db.users.find_one({"email": email})
        if not user:
            print(f"[OTP] Resend rejected (unknown email) purpose={purpose} recipient={safe_log_tag(email)}")
            # Uniform response: the UI sees "email sent" either way. Only the
            # mailbox holder can observe nothing happened (they get no mail).
            return jsonify({
                "success": True,
                "message": "If this account exists, a new 6-digit code has been sent to your email.",
                "expiresInSec": OTP_TTL_SEC,
                "cooldownSec": OTP_RESEND_COOLDOWN_SEC
            }), 200

        # Check last OTP creation for cooldown
        last_otp = db.email_otps.find_one({"email": email, "purpose": purpose}, sort=[("created_at", -1)])

        now_utc = datetime.now(timezone.utc)
        if last_otp and last_otp.get("created_at"):
            created_at = _as_aware_utc(last_otp["created_at"])
            elapsed_sec = (now_utc - created_at).total_seconds()
            if elapsed_sec < OTP_RESEND_COOLDOWN_SEC:
                remaining = int(OTP_RESEND_COOLDOWN_SEC - elapsed_sec)
                return jsonify({
                    "error": f"Please wait {remaining} seconds before requesting a new OTP.",
                    "cooldownRemainingSec": remaining
                }), 429

        # Generate new 6-digit OTP (invalidates previous OTP below)
        otp_code = generate_otp_code()
        otp_hash = hash_otp(otp_code)
        expires_at = now_utc + timedelta(seconds=OTP_TTL_SEC)

        db.email_otps.delete_many({"email": email, "purpose": purpose})
        db.email_otps.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "otp_hash": otp_hash,
            "purpose": purpose,
            "expires_at": expires_at,
            "attempts_count": 0,
            "created_at": now_utc,
        })

        email_sent, email_err = send_otp_email_smtp(email, otp_code, purpose)
        if not email_sent:
            print(f"[OTP] Resend email handoff failed recipient={safe_log_tag(email)}: {email_err}")
            return jsonify({
                "error": "Failed to send the email. Please try again in a few moments."
            }), 502

        return jsonify({
            "success": True,
            "message": "A new 6-digit code has been sent to your email.",
            "expiresInSec": OTP_TTL_SEC,
            "cooldownSec": OTP_RESEND_COOLDOWN_SEC
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An unexpected error occurred"}), 500


@auth_bp.route("/api/auth/otp-status", methods=["GET"])
def otp_status():
    """Server-truth OTP timer state so the UI countdown matches backend expiry."""
    try:
        email = (request.args.get("email", "") or "").strip().lower()
        purpose = (request.args.get("purpose", "REGISTRATION_VERIFY") or "").strip()
        if purpose not in ("REGISTRATION_VERIFY", "FORGOT_PASSWORD"):
            purpose = "REGISTRATION_VERIFY"
        if not email:
            return jsonify({"error": "Email is required."}), 400

        db = get_mongo_db()
        record = db.email_otps.find_one({"email": email, "purpose": purpose}, sort=[("created_at", -1)])

        now_utc = datetime.now(timezone.utc)
        if not record:
            # Deliberately opaque: do NOT tell the caller whether this email is
            # registered/has a pending OTP (enumeration oracle). UI treats this
            # exactly like "expired", which is an honest instruction to resend.
            return jsonify({"expired": True,
                            "expiresInSec": 0, "cooldownRemainingSec": 0,
                            "ttlSec": OTP_TTL_SEC,
                            "cooldownSec": OTP_RESEND_COOLDOWN_SEC}), 200

        expires_in = max(0, int((_as_aware_utc(record["expires_at"]) - now_utc).total_seconds()))
        cooldown_left = 0
        if record.get("created_at"):
            elapsed = (now_utc - _as_aware_utc(record["created_at"])).total_seconds()
            cooldown_left = max(0, int(OTP_RESEND_COOLDOWN_SEC - elapsed))

        return jsonify({"expired": expires_in <= 0,
                        "expiresInSec": expires_in,
                        "cooldownRemainingSec": cooldown_left,
                        "ttlSec": OTP_TTL_SEC,
                        "cooldownSec": OTP_RESEND_COOLDOWN_SEC}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An unexpected error occurred"}), 500


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    """Authenticate user with Unverified Account Guard & Last Login Timestamp via MongoDB."""
    try:
        body = request.get_json(silent=True, force=True) or {}
        email = body.get("email", "").strip().lower()
        password = body.get("password", "")

        if not email or not password:
            return jsonify({"error": "Email and password are required."}), 400

        try:
            db = get_mongo_db()
            user = db.users.find_one({"email": email})
        except Exception as db_err:
            print(f"[Login] MongoDB database connection error: {db_err}")
            return jsonify({
                "error": "Database service is temporarily unavailable. Please make sure MongoDB is running."
            }), 503

        if not user:
            return jsonify({"error": "Invalid email or password. Please check your credentials or register."}), 401

        # Cryptographic password verification with transparent Argon2id migration
        stored_hash = user.get("password_hash") or ""
        is_valid, needs_rehash = verify_password(password, stored_hash)
        if not is_valid:
            return jsonify({"error": "Invalid email or password. Please check your credentials."}), 401

        if needs_rehash:
            try:
                upgraded_hash = hash_password(password)
                db.users.update_one({"_id": user["_id"]}, {"$set": {"password_hash": upgraded_hash}})
                print(f"[SECURITY] Transparently upgraded password hash for {safe_log_tag(email)} to Argon2id.")
            except Exception as upg_err:
                print(f"[SECURITY WARNING] Failed to persist upgraded hash for {safe_log_tag(email)}: {upg_err}")

        # Check Unverified Guard
        if not user.get("is_email_verified"):
            return jsonify({
                "isUnverified": True,
                "email": email,
                "redirectUrl": f"/verify-otp?email={email}&purpose=REGISTRATION_VERIFY",
                "message": "Your email address is not verified yet. Please enter the 6-digit OTP code."
            }), 403

        # Update last login timestamp
        now_utc = datetime.now(timezone.utc)
        db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": now_utc}})

        user_role = str(user.get("role") or "candidate").lower().strip()
        target_dashboard = (
            "/super-admin" if user_role == "super_admin"
            else ("/recruiter/dashboard" if user_role in ("recruiter", "admin", "hr")
            else "/candidate/dashboard")
        )
        user_id = str(user.get("id") or user["_id"])
        user_email = user.get("email", "")
        if user_role == "candidate":
            link_candidate_records_by_email(user_id, user_email)

        exp_timestamp = int(datetime.now(timezone.utc).timestamp()) + 7 * 24 * 3600
        jwt_payload = {
            "sub": user_id,
            "email": user_email,
            "role": user_role,
            "type": "access",
            "exp": exp_timestamp,
            "ver": 1,
            "org_id": str(user.get("org_id")) if user.get("org_id") else None
        }
        token = jwt.encode(jwt_payload, SWAMI_SECRET_KEY, algorithm="HS256")
        if isinstance(token, bytes):
            token = token.decode("utf-8")

        user_payload = {
            "id": user_id,
            "orgId": str(user.get("org_id")) if user.get("org_id") else None,
            "email": user["email"],
            "fullName": user.get("full_name", ""),
            "role": user_role,
            "status": user.get("status", "active"),
            "isEmailVerified": True,
            "avatarUrl": user.get("avatar_url"),
        }

        resp = make_response(jsonify({
            "user": user_payload,
            "token": token,
            "access_token": token,
            "redirectUrl": target_dashboard
        }), 200)

        # Set secure session cookies for SSR and authenticated requests
        is_prod = os.environ.get("APP_ENV", "development").strip().lower() in ("production", "prod")
        resp.set_cookie("tp_session", token, max_age=7*24*3600, path="/", samesite="Lax", httponly=True, secure=is_prod)
        resp.set_cookie("tp_role", user_role, max_age=7*24*3600, path="/", samesite="Lax", httponly=True, secure=is_prod)
        return resp
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Login failed: {str(e)}"}), 500


@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    """Clear session authentication."""
    resp = make_response(jsonify({"success": True, "message": "Logged out successfully"}), 200)
    resp.delete_cookie("tp_session", path="/")
    resp.delete_cookie("tp_role", path="/")
    resp.delete_cookie("tp_refresh", path="/")
    return resp


@auth_bp.route("/api/auth/me", methods=["GET"])
@auth_bp.route("/api/auth/profile", methods=["GET"])
@auth_bp.route("/api/v1/auth/me", methods=["GET"])
def get_current_user():
    """Return the authenticated user profile and roles for session validation."""
    try:
        claims, error = _authenticate_request()
        if error:
            return error

        user_id = str(claims.get("sub") or "")
        user_email = str(claims.get("email") or "").strip().lower()
        user = resolve_user(user_id) if user_id else None
        if not user and user_email:
            user = resolve_user(user_email)

        if not user:
            return jsonify({"success": False, "error": "Account not found or has been revoked."}), 401

        if str(user.get("status", "")).lower() not in ("active", "1", "true"):
            return jsonify({"success": False, "error": "Account is suspended"}), 403

        role = str(user.get("role") or claims.get("role") or "candidate").lower().strip()
        uid = str(user.get("id") or user.get("_id") or user_id)
        email = user.get("email") or user_email or ""
        full_name = user.get("full_name") or user.get("fullName") or user.get("name") or ""

        user_payload = {
            "id": uid,
            "email": email,
            "fullName": full_name,
            "name": full_name,
            "role": role,
            "status": user.get("status", "active"),
            "isSuperAdmin": role == "super_admin",
            "isOrgAdmin": role in ("admin", "recruiter", "hr"),
            "isEmailVerified": bool(user.get("is_email_verified", True)),
            "orgId": str(user.get("org_id")) if user.get("org_id") else None,
            "phone": user.get("phone"),
            "avatarUrl": user.get("avatar_url"),
            "createdAt": str(user.get("created_at") or ""),
        }

        return jsonify({
            "success": True,
            "user": user_payload,
            "id": uid,
            "email": email,
            "role": role,
            "fullName": full_name,
            "name": full_name
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Failed to retrieve user: {str(e)}"}), 500


@auth_bp.route("/api/auth/refresh", methods=["POST"])
def refresh_token():
    """Refresh session token when near expiry or requested by edge runtime."""
    try:
        raw_token = request.cookies.get("tp_session") or request.cookies.get("tp_refresh")
        auth_header = request.headers.get("Authorization", "")
        if not raw_token and auth_header.startswith("Bearer "):
            raw_token = auth_header[7:].strip()

        if not raw_token:
            return jsonify({"error": "No token provided to refresh."}), 401

        try:
            payload = jwt.decode(raw_token, SWAMI_SECRET_KEY, algorithms=["HS256"], options={"verify_exp": False})
        except Exception:
            return jsonify({"error": "Invalid token format."}), 401

        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "candidate")

        if not user_id and not email:
            return jsonify({"error": "Malformed token identity."}), 401

        now_utc = datetime.now(timezone.utc)
        now_ts = now_utc.timestamp()
        exp = payload.get("exp")
        # Enforce maximum refresh window: token expired more than 30 days ago cannot be refreshed
        if exp is not None:
            try:
                if (now_ts - float(exp)) > (30 * 86400):
                    return jsonify({"error": "Session expired beyond renewal window. Please log in again."}), 401
            except (ValueError, TypeError):
                pass

        # Authoritatively verify user still exists and is active in MongoDB
        db = get_mongo_db()
        user = None
        if db is not None:
            if user_id:
                user = resolve_user(user_id)
            if not user and email:
                user = db.users.find_one({"email": email.strip().lower()})

        if not user:
            return jsonify({"error": "Account not found or has been revoked."}), 401

        if str(user.get("status", "")).lower() not in ("active", "1", "true"):
            return jsonify({"error": "Account is suspended."}), 403

        role = str(user.get("role") or role).lower().strip()
        user_id = str(user.get("id") or user.get("_id") or user_id)
        email = user.get("email") or email

        exp_timestamp = int(now_ts) + 7 * 24 * 3600
        new_payload = {
            "sub": user_id,
            "email": email,
            "role": role,
            "type": "access",
            "exp": exp_timestamp,
            "ver": 1,
            "org_id": str(user.get("org_id")) if user.get("org_id") else None
        }
        new_token = jwt.encode(new_payload, SWAMI_SECRET_KEY, algorithm="HS256")
        if isinstance(new_token, bytes):
            new_token = new_token.decode("utf-8")

        resp = make_response(jsonify({"success": True, "token": new_token}), 200)
        is_prod = os.environ.get("APP_ENV", "development").strip().lower() in ("production", "prod")
        resp.set_cookie("tp_session", new_token, max_age=7*24*3600, path="/", samesite="Lax", httponly=True, secure=is_prod)
        resp.set_cookie("tp_role", role, max_age=7*24*3600, path="/", samesite="Lax", httponly=True, secure=is_prod)
        return resp
    except Exception as e:
        return jsonify({"error": f"Token refresh failed: {str(e)}"}), 500


@auth_bp.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    """Trigger Forgot Password OTP flow via MongoDB."""
    try:
        data = request.get_json(silent=True, force=True) or {}
        email = data.get("email", "").strip().lower()
        if not email:
            return jsonify({"error": "Email is required."}), 400

        db = get_mongo_db()
        user = db.users.find_one({"email": email})

        if not user:
            return jsonify({"error": "No account found with this email address."}), 404

        # Generate Password Reset OTP
        otp_code = generate_otp_code()
        otp_hash = hash_otp(otp_code)
        now_utc = datetime.now(timezone.utc)
        expires_at = now_utc + timedelta(seconds=OTP_TTL_SEC)

        db.email_otps.delete_many({"email": email, "purpose": "FORGOT_PASSWORD"})
        db.email_otps.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "otp_hash": otp_hash,
            "purpose": "FORGOT_PASSWORD",
            "expires_at": expires_at,
            "attempts_count": 0,
            "created_at": now_utc,
        })

        email_sent, email_err = send_otp_email_smtp(email, otp_code, "FORGOT_PASSWORD")
        if not email_sent:
            print(f"[OTP] Forgot-password email handoff failed recipient={safe_log_tag(email)}: {email_err}")
            return jsonify({
                "error": "Failed to send the reset email. Please try again in a few moments."
            }), 502

        return jsonify({
            "success": True,
            "email": email,
            "expiresInSec": OTP_TTL_SEC,
            "redirectUrl": f"/forgot-password?step=2&email={email}"
        }), 200
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred"}), 500


@auth_bp.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    """Complete Password Reset after OTP or resetToken verification via MongoDB."""
    try:
        data = request.get_json(silent=True, force=True) or {}
        email = data.get("email", "").strip().lower()
        otp_code = data.get("otp", "").strip()
        reset_token = (data.get("resetToken") or data.get("reset_token") or "").strip()
        new_password = data.get("newPassword", "")

        if not email or not new_password:
            return jsonify({"error": "Email and new password are required."}), 400
        if not otp_code and not reset_token:
            return jsonify({"error": "Either a valid 6-digit OTP code or reset token is required."}), 400

        db = get_mongo_db()
        now_utc = datetime.now(timezone.utc)
        verified = False

        # 1. Verify via cryptographic reset token (issued by /verify-otp)
        if reset_token:
            try:
                claims = jwt.decode(reset_token, SWAMI_SECRET_KEY, algorithms=["HS256", JWT_ALGORITHM])
                if str(claims.get("email", "")).lower() == email and claims.get("purpose") == "password_reset":
                    verified = True
            except Exception as token_err:
                print(f"[OTP] Reset-token verification notice: {token_err}")
                verified = False

        # 2. Verify via raw OTP if submitted directly on the reset-password form
        if not verified and otp_code:
            if not OTP_RE.match(otp_code):
                return jsonify({"error": "OTP code must be exactly 6 digits."}), 400

            record = db.email_otps.find_one({"email": email, "purpose": "FORGOT_PASSWORD"}, sort=[("created_at", -1)])
            if not record or _as_aware_utc(record.get("expires_at")) < now_utc:
                if record:
                    db.email_otps.delete_one({"_id": record["_id"]})
                print(f"[OTP] Password-reset rejected (expired/missing) recipient={safe_log_tag(email)}")
                return jsonify({"error": "Invalid or expired OTP code. Please request a new code.",
                                "expired": True}), 400

            if (record.get("attempts_count") or 0) >= OTP_MAX_ATTEMPTS:
                db.email_otps.delete_one({"_id": record["_id"]})
                return jsonify({"error": "Too many invalid attempts. Please request a new code."}), 429

            if not check_otp_hash(otp_code, record["otp_hash"]):
                db.email_otps.update_one({"_id": record["_id"]}, {"$inc": {"attempts_count": 1}})
                print(f"[OTP] Password-reset rejected (incorrect) recipient={safe_log_tag(email)}")
                return jsonify({"error": "Incorrect OTP code."}), 400

            verified = True

        if not verified:
            return jsonify({"error": "Invalid or expired verification. Please request a new code."}), 400

        is_strong, pass_err = validate_password_strength(new_password)
        if not is_strong:
            return jsonify({"error": pass_err}), 400

        # Update Password & Clean OTP
        pwd_hash = hash_password(new_password)
        db.users.update_one({"email": email}, {"$set": {"password_hash": pwd_hash, "is_email_verified": True, "updated_at": now_utc}})
        db.email_otps.delete_many({"email": email, "purpose": "FORGOT_PASSWORD"})

        return jsonify({
            "success": True,
            "message": "Password reset successfully. Please log in with your new password.",
            "redirectUrl": "/login"
        }), 200
    except Exception as e:
        return jsonify({"error": "An unexpected error occurred"}), 500


import os
import logging
from core.http_utils import generic_500, safe_log_tag
from contextlib import contextmanager
import pymongo
from dotenv import load_dotenv

try:
    import certifi
    CERTIFI_CA = certifi.where()
except ImportError:
    CERTIFI_CA = None

# Load root .env file
root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
if os.path.exists(root_env):
    load_dotenv(root_env)
else:
    load_dotenv()

logger = logging.getLogger("progeni_atlas.db")

MONGO_URI = os.environ.get("MONGO_URI") or os.environ.get("MONGODB_URI") or "mongodb://localhost:27017/progeni_atlas"
MONGODB_DB_NAME = os.environ.get("MONGODB_DB_NAME") or "progeni_atlas"
QDRANT_URL = os.environ.get("QDRANT_URL")
QDRANT_API_KEY = os.environ.get("QDRANT_API_KEY")

_mongo_client = None

def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        kwargs = {"serverSelectionTimeoutMS": 5000, "connectTimeoutMS": 2000, "socketTimeoutMS": 15000, "maxPoolSize": 50}
        use_tls = "mongodb+srv://" in MONGO_URI.lower() or "ssl=true" in MONGO_URI.lower() or "tls=true" in MONGO_URI.lower()
        if use_tls and CERTIFI_CA:
            kwargs["tlsCAFile"] = CERTIFI_CA
        _mongo_client = pymongo.MongoClient(MONGO_URI, **kwargs)
        logger.info(f"[MongoDB] Initialized MongoClient connection to {MONGO_URI.split('@')[-1] if '@' in MONGO_URI else MONGO_URI}")
    return _mongo_client

def get_mongo_db(db_name: str = None):
    client = get_mongo_client()
    name = db_name or MONGODB_DB_NAME
    return client[name]

CANONICAL_PACKAGES = [
    {
        "id": "pkg-starter",
        "package_id": "pkg-starter",
        "name": "Free Starter",
        "tier": "starter",
        "target_audience": "individual",
        "billing_period": "on_signup",
        "price": 0,
        "monthlyPrice": 0,
        "annualPrice": 0,
        "price_nanousd": 0,
        "included_interviews": 1,
        "interviewsIncluded": 1,
        "credits": 10,
        "included_recruiter_seats": 0,
        "seatsIncluded": 0,
        "included_candidate_seats": 1,
        "interview_duration_limit_minutes": 20,
        "version": 1,
        "status": "published",
        "active": True,
        "popular": False,
        "description": "Ideal for students and job seekers trying their first complimentary AI technical video interview.",
        "features": [
            "1 Full AI Technical Mock Interview (20 mins free)",
            "Live Spoken Dialogue & Adaptive Follow-ups",
            "Browser Code Execution (Python, C++, JS)",
            "Instant Scorecard & Competency Report",
            "No Credit Card Required",
        ],
    },
    {
        "id": "pkg-candidate-warmup",
        "package_id": "pkg-candidate-warmup",
        "name": "Warm-up Pack",
        "tier": "starter",
        "target_audience": "individual",
        "billing_period": "one_time",
        "price": 49,
        "monthlyPrice": 49,
        "annualPrice": 490,
        "price_nanousd": 49000000000,
        "included_interviews": 3,
        "interviewsIncluded": 3,
        "credits": 50,
        "included_recruiter_seats": 0,
        "seatsIncluded": 0,
        "included_candidate_seats": 1,
        "interview_duration_limit_minutes": 100,
        "version": 1,
        "status": "published",
        "active": True,
        "popular": False,
        "description": "Quick pre-interview brush-up right before your actual technical round.",
        "features": [
            "50 AI Credits (100 mins practice)",
            "3 Full In-Depth DSA or Behavioral Rounds",
            "Turn-by-Turn Audio Transcripts",
            "Code Efficiency & Complexity Analysis",
            "Actionable Improvement Guidance",
        ],
    },
    {
        "id": "pkg-candidate-placement",
        "package_id": "pkg-candidate-placement",
        "name": "Placement Ready",
        "tier": "pro",
        "target_audience": "individual",
        "billing_period": "one_time",
        "price": 99,
        "monthlyPrice": 99,
        "annualPrice": 990,
        "price_nanousd": 99000000000,
        "included_interviews": 6,
        "interviewsIncluded": 6,
        "credits": 100,
        "included_recruiter_seats": 0,
        "seatsIncluded": 0,
        "included_candidate_seats": 1,
        "interview_duration_limit_minutes": 200,
        "version": 1,
        "status": "published",
        "active": True,
        "popular": True,
        "description": "Most chosen by engineering students preparing for placements and product companies.",
        "features": [
            "100 AI Credits (200 mins practice)",
            "6-7 Full Technical & Architecture Rounds",
            "Resume Defense & Target JD Parsing",
            "Company-Specific Question Sets (Google, TCS, Amazon)",
            "Detailed Turn-by-Turn Telemetry & Audio Replays",
        ],
    },
    {
        "id": "pkg-candidate-pro",
        "package_id": "pkg-candidate-pro",
        "name": "Pro Mastery",
        "tier": "pro",
        "target_audience": "individual",
        "billing_period": "one_time",
        "price": 199,
        "monthlyPrice": 199,
        "annualPrice": 1990,
        "price_nanousd": 199000000000,
        "included_interviews": 13,
        "interviewsIncluded": 13,
        "credits": 200,
        "included_recruiter_seats": 0,
        "seatsIncluded": 0,
        "included_candidate_seats": 1,
        "interview_duration_limit_minutes": 400,
        "version": 1,
        "status": "published",
        "active": True,
        "popular": False,
        "description": "Comprehensive preparation for high-stakes FAANG, startup, and campus hiring.",
        "features": [
            "200 AI Credits (400 mins practice)",
            "13+ Full Technical, DSA & HR Mock Rounds",
            "Full Multi-Modal Proctoring Simulation",
            "Priority AI Voice & Video Response Latency",
            "Lifetime Scorecard Dossier History",
        ],
    },
    {
        "id": "pkg-recruiter-trial",
        "package_id": "pkg-recruiter-trial",
        "name": "Recruiter Free Trial",
        "tier": "starter",
        "target_audience": "organization",
        "billing_period": "on_signup",
        "price": 0,
        "monthlyPrice": 0,
        "annualPrice": 0,
        "price_nanousd": 0,
        "included_interviews": 1,
        "interviewsIncluded": 1,
        "credits": 10,
        "included_recruiter_seats": 1,
        "seatsIncluded": 1,
        "included_candidate_seats": 5,
        "interview_duration_limit_minutes": 20,
        "version": 2,
        "status": "published",
        "active": True,
        "popular": False,
        "description": "Free one-time welcome credits on signup to test AI candidate screening with a complimentary technical assessment.",
        "features": [
            "10 Welcome Credits (20 mins, one-time on signup)",
            "1 Full AI Technical Screening Interview",
            "Automated Candidate Dossiers & PDF Reports",
            "Standard Role Rubric Templates",
            "1 Team Member Seat",
        ],
    },
    {
        "id": "pkg-recruiter-starter",
        "package_id": "pkg-recruiter-starter",
        "name": "Starter Pack",
        "tier": "starter",
        "target_audience": "organization",
        "billing_period": "one_time",
        "price": 499,
        "monthlyPrice": 499,
        "annualPrice": 4990,
        "price_nanousd": 499000000000,
        "included_interviews": 30,
        "interviewsIncluded": 30,
        "credits": 500,
        "included_recruiter_seats": 3,
        "seatsIncluded": 3,
        "included_candidate_seats": 30,
        "interview_duration_limit_minutes": 1000,
        "version": 1,
        "status": "published",
        "active": True,
        "popular": False,
        "description": "Screen candidates automatically with AI technical lead interviews.",
        "features": [
            "500 Screening Credits (1,000 mins)",
            "Up to 30-35 Candidate Interview Sessions",
            "Automated Candidate Dossiers & PDF Reports",
            "Standard Role Rubric Templates",
            "3 Team Member Seats",
        ],
    },
    {
        "id": "pkg-growth",
        "package_id": "pkg-growth",
        "name": "Growth Scale",
        "tier": "growth",
        "target_audience": "organization",
        "billing_period": "one_time",
        "price": 999,
        "monthlyPrice": 999,
        "annualPrice": 9990,
        "price_nanousd": 999000000000,
        "included_interviews": 65,
        "interviewsIncluded": 65,
        "credits": 1000,
        "included_recruiter_seats": 5,
        "seatsIncluded": 5,
        "included_candidate_seats": 100,
        "interview_duration_limit_minutes": 2000,
        "version": 1,
        "status": "published",
        "active": True,
        "popular": True,
        "description": "For fast-growing hiring teams scaling their technical screening funnel.",
        "features": [
            "1,000 Screening Credits (2,000 mins)",
            "65-70 Candidate Interview Sessions",
            "Custom Role Rubric Templates & Weights",
            "Full Video Proctoring Telemetry",
            "Bulk CSV Candidate Scheduling",
        ],
    },
    {
        "id": "pkg-enterprise",
        "package_id": "pkg-enterprise",
        "name": "Enterprise Scale",
        "tier": "enterprise",
        "target_audience": "organization",
        "billing_period": "one_time",
        "price": 1999,
        "monthlyPrice": 1999,
        "annualPrice": 19990,
        "price_nanousd": 1999000000000,
        "included_interviews": 160,
        "interviewsIncluded": 160,
        "credits": 2500,
        "included_recruiter_seats": 15,
        "seatsIncluded": 15,
        "included_candidate_seats": 500,
        "interview_duration_limit_minutes": 5000,
        "version": 1,
        "status": "published",
        "active": True,
        "popular": False,
        "description": "High-volume lateral hiring campaigns with custom ATS synchronization and compliance.",
        "features": [
            "2,500 Screening Credits (5,000 mins)",
            "160+ Candidate Screenings",
            "Dedicated AI Persona & Organization Branding",
            "Priority Compute & Zero-Queue Capacity",
            "Full Audit Trail & Compliance Export",
        ],
    },
]

# ---------------------------------------------------------------------------
# Boot strategy (latency-critical):
#   * init_mongo_db() is intentionally LIGHT. Warm boots / serverless cold
#     starts pay a single find_one (schema version) and one find_one for the
#     admin account instead of the old behavior (Argon2 password hash on EVERY
#     import + full-users dedup scan + ~25 index RPCs + 11 package upserts +
#     one unconditional write). That alone was several seconds per cold boot.
#   * One-time / heavy work lives in ensure_indexes(), dedupe_user_emails()
#     and sync_canonical_packages(), driven either by DB_MIGRATE_ON_BOOT=true
#     or by `python scripts/migrate_db.py`.
# ---------------------------------------------------------------------------
# Bump whenever the index set changes; stored in the _meta collection so the
# check is a single document read on subsequent boots.
_SCHEMA_VERSION = 4

def _safe_index(collection, keys, **kwargs):
    try:
        collection.create_index(keys, **kwargs)
    except Exception as idx_err:
        logger.warning(f"[MongoDB] Notice creating index {keys} on {collection.name}: {idx_err}")

def ensure_indexes(db):
    """Create the full index set (idempotent, per-index error isolation)."""
    # users
    _safe_index(db.users, "email", unique=True, sparse=True)
    _safe_index(db.users, "id", unique=True, sparse=True)
    # email_otps
    _safe_index(db.email_otps, [("email", pymongo.ASCENDING), ("purpose", pymongo.ASCENDING)])
    _safe_index(db.email_otps, "created_at")
    # companion_pairings
    _safe_index(db.companion_pairings, "token_hash", unique=True, sparse=True)
    _safe_index(db.companion_pairings, "session_id")
    # companion_rate_limits
    _safe_index(db.companion_rate_limits, "key", unique=True, sparse=True)
    # interview_sessions
    _safe_index(db.interview_sessions, "id", unique=True, sparse=True)
    _safe_index(db.interview_sessions, "candidate_id")
    _safe_index(db.interview_sessions, "candidate_email")
    _safe_index(db.interview_sessions, "recruiter_id")
    _safe_index(db.interview_sessions, "recruiter_email")
    # interview_invitations
    _safe_index(db.interview_invitations, "id", unique=True, sparse=True)
    _safe_index(db.interview_invitations, "session_id")
    _safe_index(db.interview_invitations, "candidate_id")
    _safe_index(db.interview_invitations, "candidate_email")
    # candidate_notifications
    _safe_index(db.candidate_notifications, "candidate_id")
    _safe_index(db.candidate_notifications, "candidate_email")
    _safe_index(db.candidate_notifications, "created_at")
    # recruiter_notifications
    _safe_index(db.recruiter_notifications, "recruiter_id")
    _safe_index(db.recruiter_notifications, "recruiter_email")
    _safe_index(db.recruiter_notifications, "created_at")
    # organizations
    _safe_index(db.organizations, "id", unique=True, sparse=True)
    _safe_index(db.organizations, "slug", unique=True, sparse=True)
    # audit_logs
    _safe_index(db.audit_logs, "created_at")
    _safe_index(db.audit_logs, "action")
    # wallets + ledger (queried on every wallet page load)
    _safe_index(db.wallets, "userId")
    _safe_index(db.wallets, "orgId")
    _safe_index(db.wallet_transactions, [("userId", pymongo.ASCENDING), ("createdAt", pymongo.ASCENDING)])
    _safe_index(db.wallet_transactions, [("orgId", pymongo.ASCENDING), ("createdAt", pymongo.ASCENDING)])
    _safe_index(db.wallet_transactions, [("candidate_id", pymongo.ASCENDING), ("createdAt", pymongo.ASCENDING)])
    # packages catalog (public /api/packages reads)
    _safe_index(db.packages, "id")
    _safe_index(db.packages, "status")
    _safe_index(db.packages, "target_audience")
    # hot-path collections previously unindexed (v4)
    _safe_index(db.candidate_resumes, [("candidate_id", pymongo.ASCENDING), ("is_active", pymongo.ASCENDING), ("uploaded_at", pymongo.DESCENDING)])
    _safe_index(db.candidate_resumes, [("candidate_email", pymongo.ASCENDING), ("uploaded_at", pymongo.DESCENDING)])
    _safe_index(db.practice_sessions, [("userId", pymongo.ASCENDING), ("completedAt", pymongo.DESCENDING)])
    _safe_index(db.job_profiles, "recruiter_id")
    _safe_index(db.job_profiles, "recruiter_email")
    _safe_index(db.job_profiles, [("org_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
    _safe_index(db.job_profiles, "created_at")
    _safe_index(db.aptitude_sessions, "candidateId")
    _safe_index(db.aptitude_sessions, "candidateEmail")
    _safe_index(db.aptitude_sessions, [("candidateId", pymongo.ASCENDING), ("startedAt", pymongo.DESCENDING)])
    # demo_allowances.user_id already has a unique index in production — reuse it
    _safe_index(db.demo_allowances, "org_id")
    _safe_index(db.billing_accounts, "orgId")
    _safe_index(db.billing_accounts, "id")
    _safe_index(db.wallet_transactions, "sessionId")
    _safe_index(db.wallet_transactions, "id", unique=True, sparse=True)
    _safe_index(db.platform_settings, "key")
    _safe_index(db.interview_sessions, [("org_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
    _safe_index(db.evaluation_rubrics, "id")
    _safe_index(db.evaluation_rubrics, "recruiter_id")
    _safe_index(db.evaluation_rubrics, "org_id")
    _safe_index(db.organization_invites, "email")
    _safe_index(db.organization_invites, "token", unique=True, sparse=True)
    _safe_index(db.organization_invites, "org_id")
    _safe_index(db.ats_integrations, "org_id", unique=True, sparse=True)
    _safe_index(db.ats_sync_logs, [("org_id", pymongo.ASCENDING), ("timestamp", pymongo.DESCENDING)])
    _safe_index(db.dossier_webhooks, "org_id", unique=True, sparse=True)
    _safe_index(db.webhook_dispatch_logs, [("org_id", pymongo.ASCENDING), ("timestamp", pymongo.DESCENDING)])
    _safe_index(db.hardware_diagnostics, "sessionId")
    _safe_index(db.lobby_checks, "sessionId")

    from datetime import datetime, timezone
    try:
        db["_meta"].update_one(
            {"_id": "schema_version"},
            {"$set": {"v": _SCHEMA_VERSION, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
    except Exception as meta_err:
        logger.warning(f"[MongoDB] Could not record schema version: {meta_err}")

def dedupe_user_emails(db):
    """One-time cleanup: collapse duplicate accounts sharing a normalized email."""
    from collections import defaultdict

    email_groups = defaultdict(list)
    for doc in db.users.find({}, {"_id": 1, "email": 1, "is_email_verified": 1, "created_at": 1}):
        em = (doc.get("email") or "").strip().lower()
        if em:
            email_groups[em].append(doc)

    for em, docs in email_groups.items():
        if len(docs) > 1:
            # Keep verified user first, then earliest created account
            docs.sort(key=lambda d: (not bool(d.get("is_email_verified")), str(d.get("created_at") or "")))
            keep_doc = docs[0]
            for dup in docs[1:]:
                db.users.delete_one({"_id": dup["_id"]})
                logger.info(f"[MongoDB] Removed duplicate account record for: {em} (kept primary verified: {keep_doc['_id']})")

def sync_canonical_packages(db):
    """One-time / ops sync of the canonical package catalog."""
    db.packages.delete_many({"name": {"$in": ["Starter Placement", "Growth Enterprise", "Global Enterprise Tier"]}})
    for cpkg in CANONICAL_PACKAGES:
        db.packages.update_one(
            {"id": cpkg["id"]},
            {"$set": cpkg},
            upsert=True,
        )
    logger.info("[MongoDB] Synced canonical industry-standard packages.")

def ensure_super_admin(db):
    """Idempotently ensure the platform super-admin exists.

    Steady state: one find_one, no writes, and no password hashing â€” hashing
    only happens when the admin document must actually be inserted.
    """
    admin_email = os.environ.get("ADMIN_DEFAULT_EMAIL", "admin@progeni.live").strip().lower()
    if not admin_email:
        return

    from datetime import datetime, timezone

    existing_admin = db.users.find_one(
        {"email": admin_email},
        {"_id": 1, "role": 1, "status": 1, "is_email_verified": 1},
    )
    now_utc = datetime.now(timezone.utc)

    if not existing_admin:
        import uuid
        from core.security import hash_password

        default_pwd = os.environ.get("SUPER_ADMIN_PASSWORD") or os.environ.get("ADMIN_DEFAULT_PASSWORD")
        if not default_pwd:
            import secrets as _secrets
            default_pwd = _secrets.token_urlsafe(24)
            logger.warning("[MongoDB] SUPER_ADMIN_PASSWORD not set — seeding super_admin with a random one-time password (rotate via env).")
        pwd_hash = hash_password(default_pwd)
        db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": pwd_hash,
            "full_name": "Progeni Atlas Administrator",
            "role": "super_admin",
            "status": "active",
            "is_email_verified": True,
            "created_at": now_utc,
            "updated_at": now_utc,
        })
        logger.info(f"[MongoDB] Seeded default super_admin account: {safe_log_tag(admin_email)}")
        return

    drifted = (
        existing_admin.get("role") != "super_admin"
        or str(existing_admin.get("status", "")).lower() != "active"
        or existing_admin.get("is_email_verified") is not True
    )
    if drifted:
        db.users.update_one(
            {"_id": existing_admin["_id"]},
            {"$set": {
                "role": "super_admin",
                "status": "active",
                "is_email_verified": True,
                "updated_at": now_utc,
            }},
        )

def init_mongo_db():
    """Light boot initializer (safe for serverless cold starts).

    Set DB_MIGRATE_ON_BOOT=true (or run scripts/migrate_db.py) to perform the
    heavy one-time migrations (user dedup + canonical package sync) at boot.
    """
    try:
        db = get_mongo_db()
        if db is None:
            logger.warning("[MongoDB] Database connection unavailable during init_mongo_db.")
            return False

        # 1) Cheap admin ensure (1 read; writes only on drift)
        try:
            ensure_super_admin(db)
        except Exception as admin_err:
            logger.warning(f"[MongoDB] Super-admin ensure note: {admin_err}")

        # 1b) Seed the manual LLM rate card (insert-if-absent; never overwrites admin edits)
        try:
            from core.shadow_metering import ensure_pricing_seeded
            ensure_pricing_seeded(db)
        except Exception as pricing_err:
            logger.warning(f"[MongoDB] Pricing seed note: {pricing_err}")

        # 1c) Seed the infra inventory (insert-if-absent; never overwrites admin edits)
        try:
            from core.cost_model import ensure_infra_seeded
            ensure_infra_seeded(db)
        except Exception as infra_err:
            logger.warning(f"[MongoDB] Infra seed note: {infra_err}")

        # 2) Index creation only when the stored schema version is stale
        try:
            if os.environ.get("DB_CREATE_INDEXES", "true").lower() not in ("0", "false", "no"):
                meta = db["_meta"].find_one({"_id": "schema_version"}, {"v": 1})
                if not meta or meta.get("v") != _SCHEMA_VERSION:
                    ensure_indexes(db)
                    logger.info("[MongoDB] Index set ensured (schema version %s).", _SCHEMA_VERSION)
        except Exception as idx_err:
            logger.warning(f"[MongoDB] Index ensure note: {idx_err}")

        # 3) Heavy one-time migrations â€” opt-in only
        if os.environ.get("DB_MIGRATE_ON_BOOT", "false").lower() in ("1", "true", "yes"):
            try:
                dedupe_user_emails(db)
            except Exception as dedup_err:
                logger.warning(f"[MongoDB] Deduplication check note: {dedup_err}")
            try:
                sync_canonical_packages(db)
            except Exception as pkg_err:
                logger.warning(f"[MongoDB] Package sync note: {pkg_err}")

        logger.info("[MongoDB] Database initialized (light boot).")
        return True
    except Exception as e:
        logger.warning(f"[MongoDB] Warning initializing MongoDB: {e}")
        return False

# Primary database accessor
get_db = get_mongo_db

@contextmanager
def get_db_connection():
    """Context manager yielding the MongoDB database instance for backwards compatibility."""
    yield get_mongo_db()

def check_postgres_connection() -> dict:
    return {"status": "disabled", "message": "PostgreSQL removed completely. Active storage: MongoDB."}

def check_mongo_connection() -> dict:
    if not MONGO_URI:
        return {"status": "disabled", "error": "MONGO_URI environment variable is missing"}
    try:
        client = get_mongo_client()
        info = client.admin.command("ping")
        return {"status": "connected", "ping": info}
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")
        return {"status": "error", "error": generic_500(e)}

def check_qdrant_connection() -> dict:
    try:
        from qdrant_client import QdrantClient
        if QDRANT_URL:
            client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
            colls = client.get_collections()
            return {"status": "connected", "collections": [c.name for c in colls.collections]}
        else:
            client = QdrantClient(host=os.environ.get("QDRANT_HOST", "localhost"), port=int(os.environ.get("QDRANT_PORT", "6333")))
            return {"status": "connected", "collections": []}
    except Exception as e:
        logger.warning(f"Qdrant connection check failed: {e}")
        return {"status": "mock_fallback", "error": generic_500(e)}

# Stubs for obsolete postgres connection pooling
PG_URI = None
def init_db_pool(minconn=1, maxconn=10):
    return None

def get_db_pool():
    return None

def close_db_pool():
    pass

def init_postgres_schema():
    return True
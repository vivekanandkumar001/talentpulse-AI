"""
Progeni Atlas — HTTP Error & PII-Safe Logging Helpers
=====================================================
Shared, framework‑level utilities the routes use to avoid leaking internals
(exception text, filesystem paths, Mongo details) to callers. Any user-facing
"internal error" is replaced by a generic message accompanied by a short
request id; the actual error is logged server-side with the same id so support
can trace it without disclosing it to end users.
"""

import hashlib
import hmac
import logging
import uuid
from typing import Optional

logger = logging.getLogger(__name__)


def new_request_id() -> str:
    return uuid.uuid4().hex[:12]


def safe_log_tag(value: Optional[str]) -> str:
    """Stable 8-char tag for logging PII (email/phone/etc.) without exposing it."""
    if not value:
        return "tag=unknown"
    return "tag=" + hashlib.sha256(str(value).strip().lower().encode("utf-8")).hexdigest()[:8]


def generic_500(exc: Optional[BaseException] = None, hint: str = "An unexpected error occurred") -> str:
    """Generic public-facing message (the server logs the real one)."""
    rid = new_request_id()
    logger.error("[safe_error] rid=%s exception=%s", rid, exc, exc_info=True)
    return f"{hint} (reference {rid})"


def verify_signature(secret: str, payload: str) -> str:
    """HMAC-SHA256 signature for future outbound webhook/email callbacks."""
    return hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()

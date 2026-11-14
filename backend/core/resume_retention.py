"""Resume retention — keep only the last N resumes per candidate."""
import os
import re
from datetime import datetime
from typing import Optional

from core.db import get_mongo_db
from core.constants import UPLOAD_DIR


RETAIN_N = 2

_SAFE_NAME = re.compile(r"^[A-Za-z0-9_\-.]+$")


def _file_paths_from_url(file_url: Optional[str]) -> list[str]:
    if not file_url:
        return []
    path = file_url.split("/")[-1]
    if not _SAFE_NAME.match(path):
        return []
    return [os.path.join(UPLOAD_DIR, "resumes", path)]


def retain_recent_resumes(candidate_id: str, candidate_email: Optional[str],
                          keep: int = RETAIN_N, logger=None) -> dict:
    """
    Keep the `keep` most-recently uploaded resumes for a candidate; delete the
    rest from Mongo + remove their files from uploads/resumes/.
    Returns counts of removed docs/files.
    """
    db = get_mongo_db()
    if db is None:
        return {"removed_docs": 0, "removed_files": 0}

    candidate_id = str(candidate_id or "").strip()
    email = (candidate_email or "").strip().lower()
    if not candidate_id and not email:
        return {"removed_docs": 0, "removed_files": 0}

    query = {"$or": []}
    if candidate_id:
        query["$or"].append({"candidate_id": candidate_id})
    if email:
        query["$or"].append({"candidate_email": email})

    docs = list(db.candidate_resumes.find(query).sort("uploaded_at", -1))
    if len(docs) <= keep:
        return {"removed_docs": 0, "removed_files": 0}

    keep_ids = [str(d.get("id") or d.get("_id")) for d in docs[:keep]]
    drop = docs[keep:]
    removed_files = 0
    for d in drop:
        for path in _file_paths_from_url(d.get("file_url")):
            try:
                if os.path.isfile(path):
                    os.remove(path)
                    removed_files += 1
            except OSError:
                pass

    drop_ids_as_text = [str(d.get("id")) for d in drop if d.get("id")]
    drop_ids_mongo = [d.get("_id") for d in drop if d.get("_id")]
    remove_criteria = {"$or": []}
    if drop_ids_as_text:
        remove_criteria["$or"].append({"id": {"$in": drop_ids_as_text}})
    if drop_ids_mongo:
        remove_criteria["$or"].append({"_id": {"$in": drop_ids_mongo}})
    if not remove_criteria["$or"]:
        return {"removed_docs": 0, "removed_files": removed_files}

    result = db.candidate_resumes.delete_many(remove_criteria)
    return {"removed_docs": int(result.deleted_count or 0), "removed_files": removed_files}

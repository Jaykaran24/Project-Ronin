"""
scanner/storage.py
──────────────────
MongoDB persistence layer for Ronin scans, endpoints, findings, and reports.
"""

from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
import pymongo

from scanner.models.state import ScanState, SeverityLevel

# Load scanner .env
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

DEFAULT_MONGO_URI = "mongodb://ronin_admin:RoninAdmin2435@127.0.0.1:27017/ronin?authSource=admin"


def get_mongo_client() -> pymongo.MongoClient | None:
    """Connect to MongoDB with a short timeout to prevent blocking."""
    uri = os.getenv("MONGO_URI", DEFAULT_MONGO_URI)
    try:
        client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=3000)
        client.server_info()  # triggers connection check
        return client
    except Exception:
        return None


def save_scan_to_db(state: ScanState) -> bool:
    """
    Persists scan metadata, discovered endpoints, confirmed findings,
    and the full generated report directly into MongoDB collections.
    Returns True if successfully saved to MongoDB, False otherwise.
    """
    client = get_mongo_client()
    if not client:
        return False

    try:
        db = client.get_default_database()
        if db is None or db.name == "admin":
            db = client["ronin"]

        # ── 1. Calculate Summary Metrics ──────────────────────────────────────
        crit_count = sum(1 for f in state.findings if f.severity == SeverityLevel.CRITICAL)
        high_count = sum(1 for f in state.findings if f.severity == SeverityLevel.HIGH)
        med_count  = sum(1 for f in state.findings if f.severity == SeverityLevel.MEDIUM)
        low_count  = sum(1 for f in state.findings if f.severity == SeverityLevel.LOW)
        tested_count = sum(1 for ep in state.endpoints if ep.tested)

        now = datetime.utcnow()
        try:
            started_at = datetime.fromisoformat(state.started_at)
        except Exception:
            started_at = now

        try:
            completed_at = datetime.fromisoformat(state.finished_at) if state.finished_at else now
        except Exception:
            completed_at = now

        # ── 2. Upsert Scan Record ─────────────────────────────────────────────
        scan_doc = {
            "scanId": state.scan_id,
            "name": f"Scan {state.config.target_url.replace('https://', '').replace('http://', '').rstrip('/')}",
            "target": state.config.target_url,
            "status": "completed",
            "phase": "Completed",
            "progress": 100,
            "endpointsTested": tested_count,
            "endpointsTotal": len(state.endpoints),
            "criticalCount": crit_count,
            "highCount": high_count,
            "mediumCount": med_count,
            "lowCount": low_count,
            "reportMarkdown": state.report_markdown,
            "reportGeneratedAt": now,
            "startedAt": started_at,
            "completedAt": completed_at,
            "currentActivity": f"Scan completed. Discovered {len(state.endpoints)} endpoints, confirmed {len(state.findings)} findings.",
        }

        db["scans"].update_one(
            {"scanId": state.scan_id},
            {"$set": scan_doc},
            upsert=True,
        )

        # ── 3. Persist Endpoints ──────────────────────────────────────────────
        for ep in state.endpoints:
            endpoint_doc = {
                "endpointId": ep.id,
                "scanId": state.scan_id,
                "method": ep.method.value,
                "path": ep.path,
                "fullUrl": ep.full_url,
                "auth": "Yes" if ep.auth_required else "No",
                "tested": ep.tested,
                "group": "/" + ep.path.strip("/").split("/")[0] if ep.path.strip("/") else "/",
                "riskScore": ep.risk_score,
                "tags": ep.tags,
            }
            db["endpoints"].update_one(
                {"scanId": state.scan_id, "endpointId": ep.id},
                {"$set": endpoint_doc},
                upsert=True,
            )

        # Build endpoint path lookup
        ep_map = {ep.id: ep.path for ep in state.endpoints}

        # ── 4. Persist Findings ───────────────────────────────────────────────
        for f in state.findings:
            ep_path = ep_map.get(f.endpoint_id, "Target API") if f.endpoint_id != "root" else "Target API"
            poc_curl = f.poc.curl_command if f.poc and hasattr(f.poc, "curl_command") else None
            finding_doc = {
                "findingId": f.id,
                "scanId": state.scan_id,
                "title": f.title,
                "owasp": f.category.value,
                "severity": f.severity.value,
                "cvss": f.cvss_score,
                "description": f.description,
                "remediation": f.remediation,
                "endpoint": ep_path,
                "pocCurl": poc_curl,
            }
            db["findings"].update_one(
                {"scanId": state.scan_id, "findingId": f.id},
                {"$set": finding_doc},
                upsert=True,
            )

        return True
    except Exception as e:
        print(f"[STORAGE] Error saving to MongoDB: {e}")
        return False
    finally:
        client.close()


def save_fallback_report(state: ScanState, output_file: str | None = None) -> str:
    """Saves the report to a safe local storage location if Mongo is unavailable or if requested."""
    if output_file:
        out_path = Path(output_file)
    else:
        storage_dir = Path("storage") / "reports"
        storage_dir.mkdir(parents=True, exist_ok=True)
        out_path = storage_dir / f"ronin_report_{state.scan_id}.md"

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(state.report_markdown)
    return str(out_path)

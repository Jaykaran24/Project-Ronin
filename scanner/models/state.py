"""
scanner/models/state.py
────────────────────────
Pydantic v2 models for the full Ronin scan state.
This is the single source of truth shared across all agents.
"""

from __future__ import annotations

from enum import Enum
from typing import Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid


# ── Enums ──────────────────────────────────────────────────────────────────

class ScanPhase(str, Enum):
    INIT        = "init"
    RECON       = "recon"
    EXPLOIT     = "exploit"
    VALIDATION  = "validation"
    REPORT      = "report"
    DONE        = "done"
    ERROR       = "error"


class AgentStatus(str, Enum):
    WAITING  = "waiting"
    ACTIVE   = "active"
    DONE     = "done"
    ERROR    = "error"


class SeverityLevel(str, Enum):
    CRITICAL      = "critical"
    HIGH          = "high"
    MEDIUM        = "medium"
    LOW           = "low"
    INFORMATIONAL = "informational"


class HttpMethod(str, Enum):
    GET     = "GET"
    POST    = "POST"
    PUT     = "PUT"
    PATCH   = "PATCH"
    DELETE  = "DELETE"
    OPTIONS = "OPTIONS"
    HEAD    = "HEAD"


class VulnCategory(str, Enum):
    BOLA                  = "BOLA"
    BROKEN_AUTH           = "broken_auth"
    MASS_ASSIGNMENT       = "mass_assignment"
    SSRF                  = "ssrf"
    RATE_LIMIT_BYPASS     = "rate_limit_bypass"
    METHOD_CONFUSION      = "method_confusion"
    INFO_DISCLOSURE       = "info_disclosure"
    SECURITY_MISCONFIG    = "security_misconfig"
    BROKEN_OBJECT_PROPERTY = "broken_object_property"


# ── Sub-models ─────────────────────────────────────────────────────────────

class Parameter(BaseModel):
    name:     str
    location: str   # "path", "query", "header", "body"
    type:     str = "string"
    required: bool = False
    example:  Any  = None


class Endpoint(BaseModel):
    id:           str         = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    method:       HttpMethod
    path:         str
    full_url:     str
    parameters:   list[Parameter] = []
    auth_required: bool = False
    content_type:  str  = "application/json"
    tags:          list[str] = []
    risk_score:    int  = 0   # 0-10, set by Recon agent
    tested:        bool = False


class HttpEvidence(BaseModel):
    method:      str
    url:         str
    request_headers:  dict[str, str] = {}
    request_body:     str | None = None
    response_status:  int = 0
    response_headers: dict[str, str] = {}
    response_body:    str | None = None
    latency_ms:       float = 0.0


class ProofOfConcept(BaseModel):
    curl_command:   str
    python_script:  str
    description:    str
    baseline:       HttpEvidence | None = None
    exploit:        HttpEvidence | None = None


class SuspectedVuln(BaseModel):
    id:           str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    endpoint_id:  str
    category:     VulnCategory
    description:  str
    confidence:   int = 0     # 0-100
    evidence:     HttpEvidence | None = None


class Finding(BaseModel):
    id:           str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    title:        str
    severity:     SeverityLevel
    category:     VulnCategory
    endpoint_id:  str
    description:  str
    impact:       str
    remediation:  str
    cvss_score:   float = 0.0
    poc:          ProofOfConcept | None = None
    verified:     bool = False
    discovered_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class AgentState(BaseModel):
    name:        str
    status:      AgentStatus = AgentStatus.WAITING
    current_task: str = ""
    started_at:  str | None = None
    finished_at: str | None = None
    error:       str | None = None


class ScanConfig(BaseModel):
    target_url:       str
    target_name:      str = ""
    max_endpoints:    int = 200
    max_requests:     int = 1000
    request_delay_ms: int = 300     # polite delay between requests
    confidence_threshold: int = 65  # min confidence to flag a suspected vuln
    llm_model:        str = "qwen2.5-coder:7b"
    ollama_url:       str = "http://localhost:11434"


# ── Root scan state (shared across all LangGraph nodes) ────────────────────

class ScanState(BaseModel):
    """
    The single shared state dict that flows through every agent node.
    LangGraph requires this to be a TypedDict or dataclass-like structure.
    We use Pydantic for validation, then convert to dict for LangGraph.
    """
    scan_id:    str = Field(default_factory=lambda: f"SCAN-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}")
    config:     ScanConfig

    # Progress
    phase:      ScanPhase = ScanPhase.INIT
    progress:   int = 0    # 0-100

    # Discovered data
    endpoints:         list[Endpoint]      = []
    suspected_vulns:   list[SuspectedVuln] = []
    findings:          list[Finding]       = []

    # Agent status tracking
    agents: dict[str, AgentState] = Field(default_factory=lambda: {
        "orchestrator": AgentState(name="orchestrator"),
        "recon":        AgentState(name="recon"),
        "exploit":      AgentState(name="exploit"),
        "validate":     AgentState(name="validate"),
    })

    # Orchestrator working memory
    endpoints_queue:      list[str] = []   # endpoint IDs yet to be exploited
    current_endpoint_id:  str | None = None
    next_agent:           str = "recon"    # orchestrator's routing decision
    scan_complete:        bool = False

    # Logs / activity feed
    activity_log: list[dict] = []

    # Final report
    report_markdown: str = ""

    started_at:  str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    finished_at: str | None = None

    def log(self, agent: str, message: str, level: str = "info") -> None:
        """Append an activity log entry."""
        self.activity_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "agent":     agent,
            "message":   message,
            "level":     level,
        })

    def to_graph_state(self) -> dict:
        """Convert to a plain dict for LangGraph state."""
        return self.model_dump()

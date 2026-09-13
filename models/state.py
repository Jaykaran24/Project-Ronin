"""
Project Ronin - Global State Schema
===================================
Pydantic v2 models defining the global scan state, endpoint representations,
fuzzing payloads, suspected vulnerabilities, and confirmed security findings.
"""

from __future__ import annotations
from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict


# ============================================================================
# Enums & Type Aliases
# ============================================================================

class ScanPhase(str, Enum):
    """Enumeration of distinct operational phases in the scan lifecycle."""
    INIT = "init"
    RECON = "recon"
    EXPLOIT = "exploit"
    VALIDATE = "validate"
    REPORT = "report"
    COMPLETED = "completed"
    FAILED = "failed"


class ParameterLocation(str, Enum):
    """Specifies where an HTTP parameter resides within a request."""
    PATH = "path"
    QUERY = "query"
    HEADER = "header"
    BODY = "body"


class SeverityLevel(str, Enum):
    """Standardized CVSS-aligned severity rankings."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


# ============================================================================
# Sub-Models: Endpoints and Parameters
# ============================================================================

class Parameter(BaseModel):
    """Represents a single input parameter discovered on an API endpoint."""
    model_config = ConfigDict(extra="ignore")

    name: str = Field(
        ...,
        description="The parameter key or JSON property name.",
        examples=["id", "page", "Authorization", "email"]
    )
    location: ParameterLocation = Field(
        ...,
        description="The location of the parameter within the HTTP request."
    )
    param_type: str = Field(
        default="string",
        description="Data type of the parameter (e.g., 'string', 'integer', 'boolean', 'object', 'array')."
    )
    required: bool = Field(
        default=False,
        description="Whether the parameter is required by the API endpoint."
    )
    sample_value: Optional[str] = Field(
        default=None,
        description="A known valid or default sample value for fuzzing baselines."
    )


class Endpoint(BaseModel):
    """Represents a unique API endpoint and its structural metadata."""
    model_config = ConfigDict(extra="ignore")

    method: str = Field(
        ...,
        description="HTTP method (verb) uppercase.",
        examples=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"]
    )
    path: str = Field(
        ...,
        description="Relative URL path, including any path parameters.",
        examples=["/api/v1/users", "/api/v1/users/{id}"]
    )
    parameters: List[Parameter] = Field(
        default_factory=list,
        description="List of all query, path, header, and body parameters associated with this endpoint."
    )
    content_type: Optional[str] = Field(
        default="application/json",
        description="Expected request body MIME type."
    )
    auth_required: Optional[bool] = Field(
        default=None,
        description="Whether the endpoint returned 401/403 during unauthenticated recon probes."
    )
    sample_response: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Baseline HTTP response snapshot captured during reconnaissance."
    )


# ============================================================================
# Sub-Models: Exploitation & Proof of Concept Evidence
# ============================================================================

class RequestEvidence(BaseModel):
    """Captures HTTP request details used during an exploit or validation test."""
    model_config = ConfigDict(extra="ignore")

    method: str = Field(..., description="HTTP Method used in the probe.")
    url: str = Field(..., description="Target URL invoked.")
    headers: Dict[str, str] = Field(default_factory=dict, description="Headers sent with the request.")
    body: Optional[Any] = Field(default=None, description="Request payload or JSON body.")


class ResponseEvidence(BaseModel):
    """Captures HTTP response details confirming or denying an exploit."""
    model_config = ConfigDict(extra="ignore")

    status_code: int = Field(..., description="HTTP response status code.")
    headers: Dict[str, str] = Field(default_factory=dict, description="HTTP response headers returned.")
    body_snippet: str = Field(default="", description="Snippet or full body of the response demonstrating vulnerability.")
    response_time_ms: Optional[float] = Field(default=None, description="Latency in milliseconds.")


class SuspectedVuln(BaseModel):
    """A potential vulnerability flagged by the Exploitation Agent requiring validation."""
    model_config = ConfigDict(extra="ignore")

    endpoint: Endpoint = Field(
        ...,
        description="The endpoint where the anomaly or vulnerability was flagged."
    )
    vuln_type: str = Field(
        ...,
        description="Classification of vulnerability (e.g., 'BOLA', 'BrokenAuth', 'SecurityMisconfiguration', 'SQLi')."
    )
    evidence: str = Field(
        ...,
        description="LLM reasoning and explanation of why this interaction indicates a vulnerability."
    )
    confidence: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Confidence score (0.0 to 1.0) assigned by the Exploitation Agent."
    )
    raw_request: RequestEvidence = Field(
        ...,
        description="The exact HTTP request that produced the suspicious response."
    )
    raw_response: ResponseEvidence = Field(
        ...,
        description="The HTTP response that triggered the suspicion."
    )


class ProofOfConcept(BaseModel):
    """Structured reproduction artifact confirming exploitability."""
    model_config = ConfigDict(extra="ignore")

    request: RequestEvidence = Field(..., description="Reproduction HTTP request.")
    response: ResponseEvidence = Field(..., description="Vulnerable HTTP response.")


class Finding(BaseModel):
    """A confirmed and validated security vulnerability ready for inclusion in reports."""
    model_config = ConfigDict(extra="ignore")

    id: str = Field(
        ...,
        description="Unique finding identifier (e.g., 'RONIN-001').",
        examples=["RONIN-001", "RONIN-002"]
    )
    title: str = Field(
        ...,
        description="Concise descriptive title of the vulnerability.",
        examples=["BOLA on GET /api/v1/users/{id}"]
    )
    severity: SeverityLevel = Field(
        ...,
        description="Severity level aligned with CVSS scoring."
    )
    cvss_score: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="CVSS v3.1 Base Score."
    )
    category: str = Field(
        ...,
        description="OWASP API Security Top 10 category.",
        examples=["API1:2023 - Broken Object Level Authorization"]
    )
    description: str = Field(
        ...,
        description="Comprehensive technical narrative detailing root cause and impact."
    )
    proof_of_concept: ProofOfConcept = Field(
        ...,
        description="Validated request and response evidence."
    )
    steps_to_reproduce: List[str] = Field(
        default_factory=list,
        description="Ordered steps to manually verify the finding."
    )
    remediation: str = Field(
        ...,
        description="Prescriptive technical instructions to resolve the vulnerability."
    )
    references: List[str] = Field(
        default_factory=list,
        description="External reference links (OWASP, CWE, CVE, advisory docs)."
    )


# ============================================================================
# Root Model: ScanState
# ============================================================================

class ScanState(BaseModel):
    """
    Global state container passed between LangGraph agent nodes.
    Represents the full context, telemetry, and findings of a single scan run.
    """
    model_config = ConfigDict(extra="ignore")

    # 1. Scan Configuration & Inputs
    scan_id: str = Field(
        ...,
        description="Unique scan run identifier (e.g., 'ronin-20260820-001530')."
    )
    target_url: str = Field(
        ...,
        description="Normalized target base URL (e.g., 'https://api.example.com')."
    )
    provided_endpoints: Optional[List[Endpoint]] = Field(
        default=None,
        description="Endpoints loaded from an external file (Postman or text) during initialization."
    )
    include_patterns: List[str] = Field(
        default_factory=list,
        description="Glob patterns restricting testing to matching endpoint paths."
    )
    exclude_patterns: List[str] = Field(
        default_factory=list,
        description="Glob patterns excluding matching endpoint paths from testing."
    )

    # 2. Reconnaissance Artifacts
    discovered_endpoints: List[Endpoint] = Field(
        default_factory=list,
        description="Complete list of filtered endpoints ready for exploitation."
    )

    # 3. Exploitation & Attack Surface
    attack_surface: List[SuspectedVuln] = Field(
        default_factory=list,
        description="Collection of suspected vulnerabilities flagged for verification."
    )

    # 4. Validated Findings
    validated_findings: List[Finding] = Field(
        default_factory=list,
        description="Confirmed vulnerabilities that passed sandbox verification."
    )

    # 5. Execution Flow & State Control
    current_phase: ScanPhase = Field(
        default=ScanPhase.INIT,
        description="Current operational phase of the LangGraph workflow."
    )
    current_endpoint_index: int = Field(
        default=0,
        ge=0,
        description="Pointer to the endpoint currently undergoing exploitation or validation."
    )
    errors: List[str] = Field(
        default_factory=list,
        description="Non-fatal warning or error messages accumulated during execution."
    )

"""
scanner/agents/recon.py
────────────────────────
Recon Agent — discovers the API attack surface.
Phase 1 implementation: Swagger/OpenAPI discovery + basic crawl.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field

from scanner.agents.base import BaseAgent
from scanner.models.state import (
    ScanState, ScanPhase, AgentStatus,
    Endpoint, Parameter, HttpMethod,
)


# ── Structured output: LLM enriches raw endpoints ─────────────────────────────

class EndpointAnalysis(BaseModel):
    """LLM assessment of a single discovered endpoint."""
    endpoint_path:  str  = Field(description="The endpoint path e.g. /api/v1/users/{id}")
    risk_score:     int  = Field(description="Risk score 1-10. 10=highest risk", ge=1, le=10)
    auth_required:  bool = Field(description="Does this endpoint likely require authentication?")
    likely_vulns:   list[str] = Field(
        description="List of likely OWASP API vulnerabilities e.g. ['BOLA', 'broken_auth']"
    )
    reasoning:      str  = Field(description="One sentence explaining risk assessment")


class ReconSummary(BaseModel):
    """LLM summary after recon completes."""
    total_endpoints:    int
    high_risk_count:    int
    attack_surface_summary: str = Field(description="2-3 sentence summary of what was found")
    recommended_focus:  list[str] = Field(description="Top 3 endpoint paths to prioritize")


SYSTEM_PROMPT = """You are the Recon Agent for Ronin — an API security scanner.
Your job is to analyse discovered API endpoints and assess their attack surface.

For each endpoint, assess:
1. Risk score (1-10): Consider how sensitive the data is, whether auth is needed, 
   parameter complexity, and which OWASP API attacks are most likely.
2. Whether authentication is likely required.
3. Which OWASP API Top 10 vulnerabilities are most likely (BOLA, broken_auth, 
   mass_assignment, ssrf, rate_limit_bypass, method_confusion, info_disclosure).

Be precise and concise. Always respond with valid JSON."""


class ReconAgent(BaseAgent):
    name = "recon"

    def run(self, state_dict: dict) -> dict:
        state = ScanState(**state_dict)

        state.agents["recon"].status = AgentStatus.ACTIVE
        state.agents["recon"].current_task = "Discovering endpoints"
        state.agents["recon"].started_at = datetime.utcnow().isoformat()
        self.log(state, "recon", f"Starting recon on {state.config.target_url}")

        # ── Step 1: Discover raw endpoints ────────────────────────────────────
        raw_endpoints = self._discover_endpoints(state)
        self.log(state, "recon", f"Discovered {len(raw_endpoints)} raw endpoints")

        if not raw_endpoints:
            self.log(state, "recon", "No endpoints found. Target may be unreachable.", level="warn")
            state.agents["recon"].status = AgentStatus.DONE
            state.agents["recon"].finished_at = datetime.utcnow().isoformat()
            state.phase = ScanPhase.RECON
            return state.model_dump()

        # ── Step 2: LLM enrichment — risk scoring + vuln prediction ───────────
        enriched = self._enrich_with_llm(state, raw_endpoints)
        state.endpoints = enriched
        self.log(state, "recon", f"LLM enriched {len(enriched)} endpoints")

        state.progress = 15
        state.phase = ScanPhase.RECON
        state.agents["recon"].status = AgentStatus.DONE
        state.agents["recon"].finished_at = datetime.utcnow().isoformat()
        state.agents["recon"].current_task = f"Found {len(enriched)} endpoints"

        return state.model_dump()

    # ── Discovery methods ─────────────────────────────────────────────────────

    def _discover_endpoints(self, state: ScanState) -> list[dict]:
        """
        Try multiple discovery strategies, return raw endpoint dicts.
        Phase 1: Swagger/OpenAPI only. Phases 2+ add crawling, GraphQL, etc.
        """
        base_url = state.config.target_url.rstrip("/")
        endpoints: list[dict] = []

        # Strategy 1: Swagger / OpenAPI spec
        swagger = self._try_swagger(base_url, state)
        if swagger:
            endpoints.extend(swagger)
            self.log(state, "recon", f"Found {len(swagger)} endpoints via OpenAPI spec")
            return endpoints

        # Strategy 2: Common endpoint patterns (fallback)
        self.log(state, "recon", "No OpenAPI spec found — using common path patterns", level="warn")
        endpoints = self._common_paths(base_url)

        return endpoints

    def _try_swagger(self, base_url: str, state: ScanState) -> list[dict] | None:
        """Try common OpenAPI/Swagger spec paths."""
        import httpx

        swagger_paths = [
            "/openapi.json", "/openapi.yaml",
            "/swagger.json", "/swagger.yaml",
            "/api/openapi.json", "/api/swagger.json",
            "/api-docs", "/api-docs.json",
            "/v1/openapi.json", "/v2/openapi.json", "/v3/openapi.json",
            "/docs/openapi.json",
        ]

        for path in swagger_paths:
            url = f"{base_url}{path}"
            try:
                resp = httpx.get(url, timeout=5, follow_redirects=True, verify=False)
                if resp.status_code == 200 and ("paths" in resp.text or "swagger" in resp.text.lower()):
                    self.log(state, "recon", f"Found OpenAPI spec at {url}")
                    return self._parse_openapi(resp.json() if "json" in path else {}, base_url)
            except Exception:
                continue

        return None

    def _parse_openapi(self, spec: dict, base_url: str) -> list[dict]:
        """Parse an OpenAPI 3.x / Swagger 2.x spec into raw endpoint dicts."""
        endpoints = []
        paths = spec.get("paths", {})
        servers = spec.get("servers", [{"url": base_url}])
        server_url = servers[0].get("url", base_url) if servers else base_url

        for path, methods in paths.items():
            for method, operation in methods.items():
                if method.upper() not in [m.value for m in HttpMethod]:
                    continue

                params = []
                for p in operation.get("parameters", []):
                    params.append({
                        "name":     p.get("name", ""),
                        "location": p.get("in", "query"),
                        "type":     p.get("schema", {}).get("type", "string"),
                        "required": p.get("required", False),
                    })

                endpoints.append({
                    "method":   method.upper(),
                    "path":     path,
                    "full_url": f"{server_url.rstrip('/')}{path}",
                    "parameters": params,
                    "tags":     operation.get("tags", []),
                })

        return endpoints

    def _common_paths(self, base_url: str) -> list[dict]:
        """Fallback: probe a set of common REST API paths."""
        import httpx

        COMMON = [
            ("GET",  "/api/users"),
            ("GET",  "/api/v1/users"),
            ("POST", "/api/v1/users"),
            ("GET",  "/api/v1/users/{id}"),
            ("GET",  "/api/auth/me"),
            ("POST", "/api/auth/login"),
            ("POST", "/api/auth/signup"),
            ("GET",  "/api/products"),
            ("GET",  "/api/orders"),
            ("GET",  "/api/admin/users"),
            ("GET",  "/health"),
            ("GET",  "/api/health"),
        ]

        found = []
        for method, path in COMMON:
            url = f"{base_url}{path}"
            try:
                resp = httpx.request(method, url, timeout=3, verify=False)
                # Any non-404 response means the endpoint likely exists
                if resp.status_code != 404:
                    found.append({
                        "method":     method,
                        "path":       path,
                        "full_url":   url,
                        "parameters": [],
                        "tags":       [],
                    })
            except Exception:
                continue

        return found

    # ── LLM enrichment ────────────────────────────────────────────────────────

    def _enrich_with_llm(self, state: ScanState, raw: list[dict]) -> list[Endpoint]:
        """Ask the LLM to risk-score and categorize each endpoint."""
        enriched: list[Endpoint] = []

        for raw_ep in raw:
            try:
                analysis = self.ask_structured(
                    system=SYSTEM_PROMPT,
                    user=f"""Analyse this API endpoint:
Method: {raw_ep['method']}
Path: {raw_ep['path']}
Parameters: {json.dumps(raw_ep.get('parameters', []))}
Tags: {raw_ep.get('tags', [])}

Provide a risk assessment.""",
                    schema=EndpointAnalysis,
                )

                ep = Endpoint(
                    method=HttpMethod(raw_ep["method"]),
                    path=raw_ep["path"],
                    full_url=raw_ep["full_url"],
                    parameters=[
                        Parameter(**p) for p in raw_ep.get("parameters", [])
                    ],
                    auth_required=analysis.auth_required,
                    tags=raw_ep.get("tags", []) + analysis.likely_vulns,
                    risk_score=analysis.risk_score,
                )
                enriched.append(ep)

            except Exception as e:
                # On LLM failure, add endpoint with default risk score
                ep = Endpoint(
                    method=HttpMethod(raw_ep["method"]),
                    path=raw_ep["path"],
                    full_url=raw_ep["full_url"],
                    parameters=[Parameter(**p) for p in raw_ep.get("parameters", [])],
                    risk_score=5,
                )
                enriched.append(ep)
                self.log(state, "recon", f"LLM enrichment failed for {raw_ep['path']}: {e}", level="warn")

        return enriched


# ── LangGraph node wrapper ────────────────────────────────────────────────────

def recon_node(state: dict) -> dict:
    agent = ReconAgent(ScanState(**state))
    return agent.run(state)

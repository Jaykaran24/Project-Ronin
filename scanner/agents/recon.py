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
    Endpoint, Parameter, HttpMethod, SuspectedVuln, VulnCategory, HttpEvidence,
)
from scanner.tools.crawler import crawl_page_and_scripts
from scanner.tools.headers import audit_security_headers



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


class BatchEndpointAnalysis(BaseModel):
    """Batch assessment of multiple discovered endpoints."""
    endpoints: list[EndpointAnalysis] = Field(default=[], description="Assessment for each input endpoint")


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

        # ── Step 2: Audit Security Headers & CORS ─────────────────────────────
        self._audit_headers(state)

        if not raw_endpoints:
            self.log(state, "recon", "No endpoints found. Target may be unreachable.", level="warn")
            state.agents["recon"].status = AgentStatus.DONE
            state.agents["recon"].finished_at = datetime.utcnow().isoformat()
            state.phase = ScanPhase.RECON
            return state.model_dump()

        # ── Step 3: LLM enrichment — risk scoring + vuln prediction ───────────
        enriched = self._enrich_with_llm(state, raw_endpoints)
        state.endpoints = enriched
        self.log(state, "recon", f"LLM enriched {len(enriched)} endpoints")

        state.progress = 20
        state.phase = ScanPhase.RECON
        state.agents["recon"].status = AgentStatus.DONE
        state.agents["recon"].finished_at = datetime.utcnow().isoformat()
        state.agents["recon"].current_task = f"Found {len(enriched)} endpoints"

        return state.model_dump()

    # ── Discovery methods ─────────────────────────────────────────────────────

    def _audit_headers(self, state: ScanState) -> None:
        """Run security headers and CORS audit against target URL."""
        base_url = state.config.target_url.rstrip("/")
        try:
            issues = audit_security_headers(base_url)
            for iss in issues:
                cat_map = {
                    "security_misconfig": VulnCategory.SECURITY_MISCONFIG,
                    "info_disclosure": VulnCategory.INFO_DISCLOSURE,
                }
                category = cat_map.get(iss.get("category", ""), VulnCategory.SECURITY_MISCONFIG)
                suspect = SuspectedVuln(
                    endpoint_id="root",
                    category=category,
                    description=f"{iss['title']}: {iss['description']}",
                    confidence=95,
                    evidence=HttpEvidence(
                        method="GET",
                        url=base_url,
                        response_body=iss.get("remediation", ""),
                    )
                )
                state.suspected_vulns.append(suspect)
                self.log(state, "recon", f"Detected {iss['title']} ({iss['severity']})", level="warn")
        except Exception as e:
            self.log(state, "recon", f"Security header audit error: {e}", level="warn")

    def _discover_endpoints(self, state: ScanState) -> list[dict]:
        """
        Combine multiple discovery strategies:
        1. OpenAPI / Swagger specs
        2. HTML & JavaScript client bundle crawling
        3. Common API path probes
        """
        base_url = state.config.target_url.rstrip("/")
        discovered: dict[tuple[str, str], dict] = {}

        # Strategy 1: Swagger / OpenAPI spec
        swagger = self._try_swagger(base_url, state)
        if swagger:
            for ep in swagger:
                key = (ep.get("method", "GET").upper(), ep.get("path", ""))
                discovered[key] = ep
            self.log(state, "recon", f"Found {len(swagger)} endpoints via OpenAPI spec")

        # Strategy 2: Web & Script Crawler
        try:
            crawled = crawl_page_and_scripts(base_url)
            crawled_count = 0
            for ep in crawled:
                key = (ep.get("method", "GET").upper(), ep.get("path", ""))
                if key not in discovered:
                    discovered[key] = ep
                    crawled_count += 1
            if crawled_count > 0:
                self.log(state, "recon", f"Discovered {crawled_count} additional endpoints via JS/HTML crawl")
        except Exception as e:
            self.log(state, "recon", f"Crawler notice: {e}", level="warn")

        # Strategy 3: Common endpoint patterns (if fewer than 5 endpoints discovered)
        if len(discovered) < 5:
            self.log(state, "recon", "Probing common API path patterns...", level="info")
            common = self._common_paths(base_url)
            for ep in common:
                key = (ep.get("method", "GET").upper(), ep.get("path", ""))
                if key not in discovered:
                    discovered[key] = ep

        return list(discovered.values())


    def _try_swagger(self, base_url: str, state: ScanState) -> list[dict] | None:
        """Try common OpenAPI/Swagger spec paths."""
        import httpx

        swagger_paths = [
            "/api/docs.json", "/openapi.json", "/openapi.yaml",
            "/swagger.json", "/swagger.yaml",
            "/api/openapi.json", "/api/swagger.json",
            "/api/docs", "/api-docs", "/api-docs.json",
            "/v1/openapi.json", "/v2/openapi.json", "/v3/openapi.json",
            "/docs/openapi.json", "/docs",
        ]

        for path in swagger_paths:
            url = f"{base_url}{path}"
            try:
                resp = httpx.get(url, timeout=3, follow_redirects=True, verify=False)
                if resp.status_code == 200 and ("paths" in resp.text or "swagger" in resp.text.lower()):
                    self.log(state, "recon", f"Found OpenAPI spec at {url}")
                    try:
                        spec_json = resp.json()
                    except Exception:
                        spec_json = {}
                    return self._parse_openapi(spec_json, base_url)
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
        """Ask the LLM to risk-score and categorize endpoints in a single batch pass."""
        enriched: list[Endpoint] = []
        if not raw:
            return enriched

        # Format concise list for the LLM
        compact_list = [
            {"method": ep["method"], "path": ep["path"], "tags": ep.get("tags", [])}
            for ep in raw
        ]

        analysis_map: dict[str, EndpointAnalysis] = {}
        try:
            batch = self.ask_structured(
                system=SYSTEM_PROMPT,
                user=f"Analyse and risk-score these discovered API endpoints:\n{json.dumps(compact_list, indent=2)}",
                schema=BatchEndpointAnalysis,
            )
            for item in batch.endpoints:
                analysis_map[item.endpoint_path] = item
            self.log(state, "recon", f"LLM batch-assessed {len(batch.endpoints)} endpoints")
        except Exception as e:
            self.log(state, "recon", f"LLM batch enrichment notice (using heuristic assessment): {e}", level="info")

        for raw_ep in raw:
            path = raw_ep["path"]
            analysis = analysis_map.get(path)

            if analysis:
                auth_req = analysis.auth_required
                score = analysis.risk_score
                extra_tags = analysis.likely_vulns
            else:
                # Intelligent heuristic fallback
                is_auth_route = any(k in path.lower() for k in ["login", "signup", "auth", "token", "register"])
                is_admin_route = "admin" in path.lower()
                is_id_route = any(k in path for k in ["{id}", ":id"]) or any(seg.isdigit() for seg in path.split("/"))

                auth_req = is_admin_route or is_id_route
                score = 8 if is_admin_route else (7 if is_id_route else (6 if is_auth_route else 4))
                extra_tags = ["admin"] if is_admin_route else (["BOLA"] if is_id_route else (["auth"] if is_auth_route else []))

            ep = Endpoint(
                method=HttpMethod(raw_ep["method"]),
                path=raw_ep["path"],
                full_url=raw_ep["full_url"],
                parameters=[Parameter(**p) for p in raw_ep.get("parameters", [])],
                auth_required=auth_req,
                tags=list(set(raw_ep.get("tags", []) + extra_tags)),
                risk_score=score,
            )
            enriched.append(ep)

        return enriched



# ── LangGraph node wrapper ────────────────────────────────────────────────────

def recon_node(state: dict) -> dict:
    agent = ReconAgent(ScanState(**state))
    return agent.run(state)

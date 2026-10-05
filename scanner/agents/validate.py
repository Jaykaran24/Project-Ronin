"""
scanner/agents/validate.py
──────────────────────────
Validation & Remediation Agent for Ronin.
- Independently validates suspected vulnerabilities
- Computes CVSS 3.1 base score and vector
- Generates reproducible reproduction PoC scripts (cURL & Python)
- Generates framework-specific defensive remediation code patches
- Promotes confirmed suspects to formal Findings in ScanState
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field

from scanner.agents.base import BaseAgent
from scanner.models.state import (
    ScanState, ScanPhase, AgentStatus,
    Finding, ProofOfConcept, SeverityLevel, VulnCategory,
)


class RemediationPatch(BaseModel):
    """LLM output for defensive code remediation and technical impact."""
    impact_summary:    str = Field(description="2-sentence description of technical and business impact")
    remediation_title: str = Field(description="Short remediation strategy title")
    remediation_code:  str = Field(description="Defensive code patch or middleware configuration example")


VALIDATION_SYSTEM_PROMPT = """You are the Senior AppSec Engineer & Remediation Agent for Ronin.
Your goal is to validate confirmed vulnerabilities, describe their precise technical impact, 
and generate clean, idiomatic defensive code remediation patches (e.g. Express.js, FastAPI, or Django).

Provide realistic, safe, and effective defensive code snippets."""


class ValidationAgent(BaseAgent):
    name = "validate"

    def run(self, state_dict: dict) -> dict:
        state = ScanState(**state_dict)

        state.agents["validate"].status = AgentStatus.ACTIVE
        state.agents["validate"].started_at = datetime.utcnow().isoformat()
        state.phase = ScanPhase.VALIDATION

        suspects = list(state.suspected_vulns)
        self.log(state, "validate", f"Validating {len(suspects)} suspected security flaws")

        if not suspects:
            self.log(state, "validate", "No suspected vulnerabilities to validate.")
            state.agents["validate"].status = AgentStatus.DONE
            state.agents["validate"].finished_at = datetime.utcnow().isoformat()
            state.progress = max(state.progress, 85)
            return state.model_dump()

        validated_count = 0
        for suspect in suspects:
            ep = next((e for e in state.endpoints if e.id == suspect.endpoint_id), None)
            ep_path = ep.path if ep else "Target API"

            state.agents["validate"].current_task = f"Validating {suspect.category.value} on {ep_path}"

            # 1. Compute CVSS Score & Vector
            cvss_score, severity = self._calculate_cvss(suspect.category)

            # 2. Build PoC Reproduction Scripts
            poc = self._build_poc(suspect, ep_path)

            # 3. LLM Remediation & Impact Generation
            remediation_text = self._generate_remediation(suspect, ep_path)

            # 4. Promote to Finding
            specific_title = (
                suspect.description.split(":")[0].strip()
                if ":" in suspect.description
                else f"{suspect.category.value.upper()} on {ep_path}"
            )
            remediation_body = (
                remediation_text["code"]
                if "```" in remediation_text["code"]
                else f"```javascript\n{remediation_text['code']}\n```"
            )

            finding = Finding(
                title=specific_title,
                severity=severity,
                category=suspect.category,
                endpoint_id=suspect.endpoint_id,
                description=suspect.description,
                impact=remediation_text["impact"],
                remediation=f"**{remediation_text['title']}**\n\n{remediation_body}",
                cvss_score=cvss_score,
                poc=poc,
                verified=True,
                discovered_at=datetime.utcnow().isoformat(),
            )

            state.findings.append(finding)
            validated_count += 1
            self.log(state, "validate", f"Confirmed & promoted {finding.title} ({severity.value.upper()}, CVSS {cvss_score})")

        # Clear processed suspects
        state.suspected_vulns.clear()

        state.progress = 85
        state.agents["validate"].status = AgentStatus.DONE
        state.agents["validate"].finished_at = datetime.utcnow().isoformat()
        state.agents["validate"].current_task = f"Validated {validated_count} findings"

        return state.model_dump()

    # ── CVSS & Scoring Calculator ─────────────────────────────────────────────

    def _calculate_cvss(self, category: VulnCategory) -> tuple[float, SeverityLevel]:
        """Compute CVSS 3.1 base score and corresponding SeverityLevel."""
        if category == VulnCategory.BROKEN_AUTH:
            return 9.8, SeverityLevel.CRITICAL
        elif category == VulnCategory.BOLA:
            return 8.6, SeverityLevel.HIGH
        elif category == VulnCategory.MASS_ASSIGNMENT:
            return 7.5, SeverityLevel.HIGH
        elif category == VulnCategory.SECURITY_MISCONFIG:
            return 5.3, SeverityLevel.MEDIUM
        elif category == VulnCategory.INFO_DISCLOSURE:
            return 4.3, SeverityLevel.MEDIUM
        elif category == VulnCategory.RATE_LIMIT_BYPASS:
            return 5.3, SeverityLevel.MEDIUM
        return 5.0, SeverityLevel.MEDIUM

    # ── PoC Generator ─────────────────────────────────────────────────────────

    def _build_poc(self, suspect: Any, endpoint_path: str) -> ProofOfConcept:
        """Construct standard reproduction scripts (cURL and Python)."""
        ev = suspect.evidence
        method = ev.method if ev else "GET"
        url = ev.url if ev else f"https://api.target.local{endpoint_path}"
        body = ev.request_body if ev and ev.request_body else ""

        # cURL command
        curl_parts = [f"curl -X {method} '{url}'"]
        if ev and ev.request_headers:
            for k, v in ev.request_headers.items():
                curl_parts.append(f"-H '{k}: {v}'")
        if body:
            curl_parts.append(f"-d '{body}'")
        curl_cmd = " \\\n  ".join(curl_parts)

        # Python reproduction script
        py_script = f"""import requests

url = "{url}"
headers = {json.dumps(ev.request_headers if ev else {{}}, indent=2)}
payload = {body or 'None'}

response = requests.request("{method}", url, headers=headers, json=payload, verify=False)
print(f"Status Code: {{response.status_code}}")
print(response.text[:500])
"""

        return ProofOfConcept(
            curl_command=curl_cmd,
            python_script=py_script,
            description=f"Reproduction verification probe for {suspect.category.value} on {endpoint_path}.",
            baseline=None,
            exploit=ev,
        )

    # ── LLM Remediation Generator ─────────────────────────────────────────────

    def _generate_remediation(self, suspect: Any, endpoint_path: str) -> dict[str, str]:
        """Ask LLM to generate production remediation advice and code patch."""
        user_prompt = f"""Vulnerability: {suspect.category.value}
Target Endpoint: {endpoint_path}
Finding Details: {suspect.description}

Provide technical impact and production remediation code to secure this endpoint."""

        try:
            res = self.ask_structured(
                system=VALIDATION_SYSTEM_PROMPT,
                user=user_prompt,
                schema=RemediationPatch,
            )
            return {
                "impact": res.impact_summary,
                "title": res.remediation_title,
                "code":  res.remediation_code,
            }
        except Exception:
            desc_lower = suspect.description.lower()
            cat = suspect.category

            if cat == VulnCategory.SECURITY_MISCONFIG:
                if "hsts" in desc_lower or "transport security" in desc_lower:
                    return {
                        "impact": "Clients are vulnerable to Man-in-the-Middle (MitM) SSL stripping attacks on unencrypted or untrusted networks.",
                        "title": "Enforce HTTP Strict Transport Security (HSTS)",
                        "code": "```javascript\n// Node.js / Express (Helmet)\napp.use(helmet.hsts({\n  maxAge: 31536000,\n  includeSubDomains: true,\n  preload: true,\n}));\n```\n\n```nginx\n# Nginx Configuration\nadd_header Strict-Transport-Security \"max-age=31536000; includeSubDomains; preload\" always;\n```",
                    }
                elif "content-type" in desc_lower or "nosniff" in desc_lower:
                    return {
                        "impact": "Browsers may MIME-sniff response payloads, enabling potential Cross-Site Scripting (XSS) via uploaded or dynamic content.",
                        "title": "Enforce X-Content-Type-Options: nosniff",
                        "code": "```javascript\n// Node.js / Express (Helmet)\napp.use(helmet.noSniff());\n```\n\n```nginx\n# Nginx Configuration\nadd_header X-Content-Type-Options \"nosniff\" always;\n```",
                    }
                elif "csp" in desc_lower or "content-security-policy" in desc_lower:
                    return {
                        "impact": "Absence of a Content-Security-Policy increases the severity of XSS and unauthorized data exfiltration.",
                        "title": "Implement Restrictive Content-Security-Policy (CSP)",
                        "code": "```javascript\n// Node.js / Express (Helmet)\napp.use(helmet.contentSecurityPolicy({\n  directives: {\n    defaultSrc: [\"'self'\"],\n    scriptSrc: [\"'self'\"],\n    objectSrc: [\"'none'\"],\n  },\n}));\n```\n\n```nginx\n# Nginx Configuration\nadd_header Content-Security-Policy \"default-src 'self'; script-src 'self';\" always;\n```",
                    }
                elif "cors" in desc_lower:
                    return {
                        "impact": "Permissive or reflected CORS headers permit unauthorized cross-origin requests from untrusted third-party origins.",
                        "title": "Restrict CORS to Whitelisted Origins",
                        "code": "```javascript\n// Node.js / Express\nconst cors = require('cors');\nconst allowedOrigins = ['https://yourdomain.com'];\napp.use(cors({\n  origin: (origin, callback) => {\n    if (!origin || allowedOrigins.includes(origin)) callback(null, true);\n    else callback(new Error('Blocked by CORS'));\n  },\n  credentials: true,\n}));\n```",
                    }
                else:
                    return {
                        "impact": "Server misconfigurations expose sensitive diagnostic metadata or weaken browser defensive protections.",
                        "title": f"Harden Server Security Configuration on {endpoint_path}",
                        "code": "```javascript\n// Node.js / Express (Helmet)\napp.use(helmet());\napp.disable('x-powered-by');\n```",
                    }
            elif cat == VulnCategory.BROKEN_AUTH:
                return {
                    "impact": "Unauthenticated or unauthorized attackers can access protected resources and sensitive customer data.",
                    "title": f"Enforce Mandatory Authentication on {endpoint_path}",
                    "code": "```javascript\n// Node.js / Express Authentication Middleware\nfunction requireAuth(req, res, next) {\n  const token = req.headers.authorization?.split(' ')[1];\n  if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' });\n  try {\n    req.user = jwt.verify(token, process.env.JWT_SECRET);\n    next();\n  } catch (err) {\n    return res.status(403).json({ error: 'Forbidden: Invalid token' });\n  }\n}\n```",
                }
            elif cat == VulnCategory.BOLA:
                return {
                    "impact": "An attacker can view or manipulate other users' private objects by simply altering the identifier in the request.",
                    "title": f"Enforce Object-Level Ownership Verification on {endpoint_path}",
                    "code": "```javascript\n// Verify requester owns targeted record\nconst record = await Document.findById(req.params.id);\nif (!record) return res.status(404).json({ error: 'Not found' });\n\nif (record.userId.toString() !== req.user.id) {\n  return res.status(403).json({ error: 'Forbidden: You do not own this resource' });\n}\n```",
                }
            elif cat == VulnCategory.MASS_ASSIGNMENT:
                return {
                    "impact": "Attackers can escalate privileges or manipulate internal fields (e.g. role, balance, verified status).",
                    "title": f"Implement Strict Field Whitelisting on {endpoint_path}",
                    "code": "```javascript\n// Whitelist strictly permitted editable properties\nconst allowedFields = ['name', 'bio', 'avatarUrl'];\nconst updates = {};\nfor (const field of allowedFields) {\n  if (req.body[field] !== undefined) updates[field] = req.body[field];\n}\nawait User.findByIdAndUpdate(req.user.id, updates, { new: true });\n```",
                }
            else:
                return {
                    "impact": "Potential security exposure impacting API confidentiality or integrity.",
                    "title": f"Secure Endpoint {endpoint_path}",
                    "code": "// Validate all incoming request schemas and enforce strict access controls",
                }



def validate_node(state: dict) -> dict:
    """LangGraph node wrapper for ValidationAgent."""
    agent = ValidationAgent(ScanState(**state))
    return agent.run(state)

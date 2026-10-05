"""
scanner/tools/headers.py
────────────────────────
Audits API server responses for security headers, CORS misconfigurations, and info leaks.
"""

from __future__ import annotations

from typing import Any
import httpx


def audit_security_headers(base_url: str, timeout: float = 4.0) -> list[dict[str, Any]]:
    """
    Sends baseline probes to the target base URL and analyzes response headers.
    Returns detected security misconfigurations.
    """
    issues: list[dict[str, Any]] = []

    client = httpx.Client(
        verify=False,
        timeout=timeout,
        follow_redirects=True,
        headers={"User-Agent": "RoninSecurityScanner/1.0", "Origin": "https://evil-untrusted-origin.com"}
    )

    try:
        resp = client.get(base_url)
        headers = {k.lower(): v for k, v in resp.headers.items()}

        # 1. HSTS Check
        if base_url.startswith("https://") and "strict-transport-security" not in headers:
            issues.append({
                "type": "missing_hsts",
                "title": "Missing HTTP Strict Transport Security (HSTS)",
                "severity": "medium",
                "category": "security_misconfig",
                "description": "The API does not enforce HTTPS via the Strict-Transport-Security header, leaving clients vulnerable to SSL stripping.",
                "remediation": "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains' to all HTTPS responses."
            })

        # 2. X-Content-Type-Options
        if headers.get("x-content-type-options", "").lower() != "nosniff":
            issues.append({
                "type": "missing_content_type_options",
                "title": "Missing or Weak X-Content-Type-Options Header",
                "severity": "low",
                "category": "security_misconfig",
                "description": "The X-Content-Type-Options header is missing or not set to 'nosniff', allowing browsers to MIME-sniff response content.",
                "remediation": "Add 'X-Content-Type-Options: nosniff' header."
            })

        # 3. Content-Security-Policy
        if "content-security-policy" not in headers:
            issues.append({
                "type": "missing_csp",
                "title": "Missing Content-Security-Policy (CSP) Header",
                "severity": "low",
                "category": "security_misconfig",
                "description": "The server does not specify a Content-Security-Policy, increasing the impact of potential script injection vulnerabilities.",
                "remediation": "Define a restrictive Content-Security-Policy header."
            })

        # 4. Sensitive Server Banner Leakage
        if "x-powered-by" in headers:
            issues.append({
                "type": "banner_leakage",
                "title": f"Technology Fingerprint Disclosure: X-Powered-By ({headers['x-powered-by']})",
                "severity": "low",
                "category": "info_disclosure",
                "description": f"The API exposes underlying server technology via X-Powered-By: {headers['x-powered-by']}.",
                "remediation": "Disable the X-Powered-By header (e.g. app.disable('x-powered-by') in Express)."
            })

        # 5. Overly Permissive CORS Check
        acao = headers.get("access-control-allow-origin", "")
        acac = headers.get("access-control-allow-credentials", "").lower() == "true"
        if acao == "*" and acac:
            issues.append({
                "type": "cors_wildcard_credentials",
                "title": "CORS Misconfiguration: Wildcard Origin With Credentials",
                "severity": "high",
                "category": "security_misconfig",
                "description": "The server allows wildcard Access-Control-Allow-Origin with credentials, allowing untrusted sites to issue authenticated requests.",
                "remediation": "Do not allow wildcard origins when credentials are supported. Whitelist explicit trusted origins."
            })
        elif "evil-untrusted-origin.com" in acao:
            issues.append({
                "type": "cors_origin_reflection",
                "title": "CORS Misconfiguration: Arbitrary Origin Reflection",
                "severity": "high",
                "category": "security_misconfig",
                "description": "The server dynamically reflects the Origin header from untrusted third-party requests into Access-Control-Allow-Origin.",
                "remediation": "Validate incoming Origin against a strict whitelist of known trusted domains before echoing in ACAO."
            })

    except Exception:
        pass
    finally:
        client.close()

    return issues

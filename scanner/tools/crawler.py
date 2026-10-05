"""
scanner/tools/crawler.py
────────────────────────
Extracts API routes and endpoints from web application HTML and client JS bundles.
"""

from __future__ import annotations

import re
import urllib.parse
from typing import Any
import httpx


API_PATH_PATTERNS = [
    # Explicit quotes around paths like "/api/v1/..." or '/v2/...'
    re.compile(r'["\'](/(?:api|v[0-9]|auth|rest|graphql|oauth)[a-zA-Z0-9_\-/{}:]*)["\']', re.IGNORECASE),
    # Template literals or fetch / axios call patterns
    re.compile(r'(?:fetch|axios(?:\.get|\.post|\.put|\.delete)?|http)\s*\(\s*[`"\']([^`"\'\s?#]+)', re.IGNORECASE),
    # Endpoint definitions like url: "/api/..." or path: "/..."
    re.compile(r'(?:url|path|route|endpoint)\s*:\s*["\'](/[a-zA-Z0-9_\-/{}:]+)["\']', re.IGNORECASE),
]

SCRIPT_SRC_PATTERN = re.compile(r'<script[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)

# Ignored static asset extensions
IGNORED_EXTENSIONS = (
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".css",
    ".woff", ".woff2", ".ttf", ".eot", ".map", ".mp4", ".webp"
)


def extract_routes_from_text(content: str) -> set[str]:
    """Scan arbitrary text/code for API path patterns."""
    found: set[str] = set()
    for pattern in API_PATH_PATTERNS:
        for match in pattern.finditer(content):
            path = match.group(1).strip()
            # Clean up template substitutions or query strings
            path = re.sub(r'\$\{.*?\}', '{id}', path)
            path = path.split('?')[0].split('#')[0]

            if not path.startswith('/'):
                continue
            if any(path.lower().endswith(ext) for ext in IGNORED_EXTENSIONS):
                continue
            if len(path) > 1 and len(path) < 150:
                # Basic sanity check
                found.add(path)
    return found


def crawl_page_and_scripts(base_url: str, max_scripts: int = 5, timeout: float = 4.0) -> list[dict[str, Any]]:
    """
    Crawls target HTML root, discovers loaded client script tags on the same origin,
    and inspects them for referenced API endpoints.
    """
    discovered_paths: set[str] = set()
    parsed_base = urllib.parse.urlparse(base_url)
    base_origin = f"{parsed_base.scheme}://{parsed_base.netloc}"

    client = httpx.Client(
        verify=False,
        timeout=timeout,
        follow_redirects=True,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 RoninSecurity/1.0"}
    )

    try:
        resp = client.get(base_url)
        if resp.status_code < 400:
            html = resp.text
            discovered_paths.update(extract_routes_from_text(html))

            # Find script tags
            script_srcs = SCRIPT_SRC_PATTERN.findall(html)
            scripts_to_fetch = []
            for src in script_srcs:
                full_script_url = urllib.parse.urljoin(base_url, src)
                script_parsed = urllib.parse.urlparse(full_script_url)
                # Keep only same-origin or relative scripts
                if script_parsed.netloc == parsed_base.netloc and full_script_url.endswith('.js'):
                    scripts_to_fetch.append(full_script_url)

            # Fetch top internal scripts
            for script_url in scripts_to_fetch[:max_scripts]:
                try:
                    js_resp = client.get(script_url)
                    if js_resp.status_code == 200:
                        discovered_paths.update(extract_routes_from_text(js_resp.text))
                except Exception:
                    continue
    except Exception:
        pass
    finally:
        client.close()

    endpoints: list[dict[str, Any]] = []
    for path in sorted(discovered_paths):
        full_url = f"{base_origin.rstrip('/')}{path}"
        endpoints.append({
            "method": "GET",
            "path": path,
            "full_url": full_url,
            "parameters": [],
            "tags": ["crawled"],
        })

    return endpoints

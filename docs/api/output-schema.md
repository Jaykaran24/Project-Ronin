# Output Schema Specification

> **Project Ronin** — AI-Powered Black-Box API Security Testing CLI Tool  
> **Version:** 1.0.0-spec  
> **Status:** Active

---

## 1. Overview & Report Artifacts

Project Ronin produces machine-readable and human-readable reporting artifacts upon scan completion. Every scan generates an isolated execution directory labeled with a unique `scan_id`.

### 1.1 Directory & File Layout

```
ronin_runs/
└── <scan-id>/
    ├── report.json             # Comprehensive machine-readable JSON output
    ├── report.html             # Standalone interactive HTML report
    ├── scan_state.json         # Serialized LangGraph execution state
    ├── logs/
    │   └── agent_trace.log     # Detailed reasoning steps and tool execution logs
    └── poc_scripts/
        ├── RONIN-001_exploit.py # Standalone Python reproduction scripts
        └── RONIN-002_exploit.py
```

- **Default Base Path:** `./ronin_runs/<scan-id>/`
- **JSON Report Location:** `./ronin_runs/<scan-id>/report.json`
- **HTML Report Location:** `./ronin_runs/<scan-id>/report.html`

---

## 2. JSON Report Schema

The JSON report (`report.json`) follows a strict schema designed for CI/CD integration, SIEM ingestion, and automated ticket creation.

### 2.1 Top-Level Schema Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `scan_id` | `string` | **Yes** | Unique scan identifier (format: `ronin-YYYYMMDD-HHMMSS` or UUIDv4). |
| `target` | `string` (URI) | **Yes** | Target API base URL scanned (e.g., `https://api.example.com`). |
| `scan_started` | `string` (ISO 8601) | **Yes** | UTC timestamp when reconnaissance started. |
| `scan_completed` | `string` (ISO 8601) | **Yes** | UTC timestamp when validation and report generation ended. |
| `duration_seconds` | `number` | **Yes** | Total execution time in seconds. |
| `total_endpoints_tested` | `integer` | **Yes** | Number of unique endpoints evaluated by the exploitation agent. |
| `summary` | `object` | **Yes** | Aggregated finding counts categorized by severity. |
| `findings` | `array[Finding]` | **Yes** | Ordered list of verified vulnerabilities discovered during the scan. |

---

### 2.2 `summary` Object Schema

| Field | Type | Required | Description |
|---|---|---|---|
| `critical` | `integer` | **Yes** | Count of vulnerabilities with `CRITICAL` severity (CVSS 9.0 – 10.0). |
| `high` | `integer` | **Yes** | Count of vulnerabilities with `HIGH` severity (CVSS 7.0 – 8.9). |
| `medium` | `integer` | **Yes** | Count of vulnerabilities with `MEDIUM` severity (CVSS 4.0 – 6.9). |
| `low` | `integer` | **Yes** | Count of vulnerabilities with `LOW` severity (CVSS 0.1 – 3.9). |
| `info` | `integer` | **Yes** | Count of informational findings / security notices (CVSS 0.0). |

---

### 2.3 `findings[]` Array Item Schema (`Finding`)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | **Yes** | Unique finding identifier within the scan (e.g., `RONIN-001`). |
| `title` | `string` | **Yes** | Short, human-readable summary of the vulnerability. |
| `severity` | `string` (Enum) | **Yes** | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, or `INFO`. |
| `cvss_score` | `number` | **Yes** | CVSS v3.1 Base Score (range `0.0` to `10.0`). |
| `category` | `string` | **Yes** | OWASP API Security Top 10 category code and title. |
| `description` | `string` | **Yes** | Detailed technical explanation of the vulnerability and business impact. |
| `proof_of_concept` | `object` | **Yes** | Concrete HTTP request and response evidence verifying exploitability. |
| `steps_to_reproduce`| `array[string]` | **Yes** | Step-by-step instructions to reproduce the issue manually. |
| `remediation` | `string` | **Yes** | Concrete, actionable guidance to fix the vulnerability. |
| `references` | `array[string]` | **Yes** | Authoritative reference URLs (OWASP, CWE, CVE, RFC). |

#### `proof_of_concept` Object Details:
- **`request`**:
  - `method` (`string`): HTTP method used in exploit (`GET`, `POST`, etc.).
  - `url` (`string`): Full absolute URL targeted.
  - `headers` (`object`): Request headers used in the proof of concept.
  - `body` (`string` | `object` | `null`): Request payload if applicable.
- **`response`**:
  - `status_code` (`integer`): HTTP status code returned.
  - `headers` (`object`): Relevant response headers.
  - `body_snippet` (`string`): Truncated or full response body confirming vulnerability.
  - `response_time_ms` (`number`): Response latency in milliseconds.

---

## 3. Example Complete JSON Report

```json
{
  "scan_id": "ronin-20260820-001530",
  "target": "https://api.vulnerable.local",
  "scan_started": "2026-08-20T00:15:30Z",
  "scan_completed": "2026-08-20T00:21:45Z",
  "duration_seconds": 375.2,
  "total_endpoints_tested": 18,
  "summary": {
    "critical": 1,
    "high": 1,
    "medium": 1,
    "low": 1,
    "info": 1
  },
  "findings": [
    {
      "id": "RONIN-001",
      "title": "Broken Object Level Authorization on User Resource",
      "severity": "CRITICAL",
      "cvss_score": 9.1,
      "category": "API1:2023 - Broken Object Level Authorization",
      "description": "The endpoint '/api/v1/users/{id}' does not validate authorization tokens or resource ownership when accessing user profile objects. By substituting arbitrary user IDs into the path parameter, an unauthenticated attacker can dump sensitive personal details of other registered users.",
      "proof_of_concept": {
        "request": {
          "method": "GET",
          "url": "https://api.vulnerable.local/api/v1/users/42",
          "headers": {
            "Accept": "application/json",
            "User-Agent": "Project-Ronin-Scanner/1.0"
          },
          "body": null
        },
        "response": {
          "status_code": 200,
          "headers": {
            "Content-Type": "application/json; charset=utf-8",
            "X-Powered-By": "Express"
          },
          "body_snippet": "{\"id\": 42, \"username\": \"alex_smith\", \"email\": \"alex.smith@example.com\", \"role\": \"administrator\", \"api_key\": \"sec_live_98ab776f\"}",
          "response_time_ms": 42.6
        }
      },
      "steps_to_reproduce": [
        "Issue an HTTP GET request to 'https://api.vulnerable.local/api/v1/users/1' to confirm endpoint availability.",
        "Modify the URL path parameter to another valid user ID, e.g., 'https://api.vulnerable.local/api/v1/users/42'.",
        "Observe that the server returns HTTP 200 OK containing user 42's profile without requesting authentication."
      ],
      "remediation": "Implement robust object-level access control middleware on the user controller. Validate that the requesting subject has explicit permission to view the requested object before fetching from the database.",
      "references": [
        "https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/",
        "https://cwe.mitre.org/data/definitions/284.html"
      ]
    },
    {
      "id": "RONIN-002",
      "title": "Authentication Bypass via Unsigned JWT (alg: none)",
      "severity": "HIGH",
      "cvss_score": 8.6,
      "category": "API2:2023 - Broken Authentication",
      "description": "The authentication verification handler accepts JSON Web Tokens (JWT) specifying the 'none' algorithm header, allowing attackers to forge arbitrary claims including administrative privilege flags.",
      "proof_of_concept": {
        "request": {
          "method": "GET",
          "url": "https://api.vulnerable.local/api/v1/admin/dashboard",
          "headers": {
            "Authorization": "Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMzM3Iiwicm9sZSI6ImFkbWluIn0.",
            "Accept": "application/json"
          },
          "body": null
        },
        "response": {
          "status_code": 200,
          "headers": {
            "Content-Type": "application/json"
          },
          "body_snippet": "{\"status\": \"success\", \"message\": \"Welcome admin\", \"system_health\": \"optimal\"}",
          "response_time_ms": 55.1
        }
      },
      "steps_to_reproduce": [
        "Construct a JWT with header '{\"alg\":\"none\",\"typ\":\"JWT\"}' and claims '{\"sub\":\"1337\",\"role\":\"admin\"}'.",
        "Send GET /api/v1/admin/dashboard with the unsigned token in the Authorization header.",
        "The server returns 200 OK and grants administrative access."
      ],
      "remediation": "Configure JWT validation libraries to strictly reject the 'none' algorithm and enforce an explicit whitelist of acceptable signing algorithms (e.g., RS256 or HS256).",
      "references": [
        "https://owasp.org/API-Security/editions/2023/en/0xa2-broken-authentication/",
        "https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/"
      ]
    },
    {
      "id": "RONIN-003",
      "title": "Overly Permissive Cross-Origin Resource Sharing (CORS) Policy",
      "severity": "MEDIUM",
      "cvss_score": 5.3,
      "category": "API8:2023 - Security Misconfiguration",
      "description": "The API reflects the 'Origin' request header directly into 'Access-Control-Allow-Origin' alongside 'Access-Control-Allow-Credentials: true', enabling malicious origins to perform cross-site data theft.",
      "proof_of_concept": {
        "request": {
          "method": "OPTIONS",
          "url": "https://api.vulnerable.local/api/v1/users/me",
          "headers": {
            "Origin": "https://evil-attacker.site",
            "Access-Control-Request-Method": "GET"
          },
          "body": null
        },
        "response": {
          "status_code": 200,
          "headers": {
            "Access-Control-Allow-Origin": "https://evil-attacker.site",
            "Access-Control-Allow-Credentials": "true"
          },
          "body_snippet": "",
          "response_time_ms": 18.3
        }
      },
      "steps_to_reproduce": [
        "Send an OPTIONS request to /api/v1/users/me with Origin: https://evil-attacker.site.",
        "Inspect response headers for reflection of the malicious origin combined with allow credentials."
      ],
      "remediation": "Replace dynamic origin reflection with a strict whitelist of trusted domain names. Avoid wildcard origins when credentials are supported.",
      "references": [
        "https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/",
        "https://portswigger.net/web-security/cors"
      ]
    },
    {
      "id": "RONIN-004",
      "title": "Missing HTTP Security Headers",
      "severity": "LOW",
      "cvss_score": 3.7,
      "category": "API8:2023 - Security Misconfiguration",
      "description": "API responses lack standard defensive HTTP headers including 'Strict-Transport-Security', 'X-Content-Type-Options', and 'Content-Security-Policy'.",
      "proof_of_concept": {
        "request": {
          "method": "GET",
          "url": "https://api.vulnerable.local/api/v1/health",
          "headers": {},
          "body": null
        },
        "response": {
          "status_code": 200,
          "headers": {
            "Content-Type": "application/json"
          },
          "body_snippet": "{\"status\":\"UP\"}",
          "response_time_ms": 12.0
        }
      },
      "steps_to_reproduce": [
        "Perform a GET request to /api/v1/health.",
        "Observe the absence of X-Content-Type-Options: nosniff and HSTS headers."
      ],
      "remediation": "Configure the reverse proxy or API gateway to inject recommended security headers on all responses.",
      "references": [
        "https://owasp.org/www-project-secure-headers/"
      ]
    },
    {
      "id": "RONIN-005",
      "title": "Exposed Swagger UI Documentation Endpoint",
      "severity": "INFO",
      "cvss_score": 0.0,
      "category": "API8:2023 - Security Misconfiguration",
      "description": "Publicly accessible Swagger UI documentation was discovered at '/docs'. While helpful for developers, unauthenticated API schema exposure assists attacker reconnaissance.",
      "proof_of_concept": {
        "request": {
          "method": "GET",
          "url": "https://api.vulnerable.local/docs",
          "headers": {},
          "body": null
        },
        "response": {
          "status_code": 200,
          "headers": {
            "Content-Type": "text/html"
          },
          "body_snippet": "<title>Swagger UI</title>",
          "response_time_ms": 25.4
        }
      },
      "steps_to_reproduce": [
        "Navigate to https://api.vulnerable.local/docs in a browser.",
        "Interactive Swagger documentation renders without requiring authentication."
      ],
      "remediation": "Restrict interactive documentation endpoints behind corporate VPNs or authentication barriers in production environments.",
      "references": [
        "https://owasp.org/API-Security/editions/2023/en/0xa8-security-misconfiguration/"
      ]
    }
  ]
}
```

---

## 4. HTML Report Specification

The HTML report (`report.html`) is a standalone, single-file document generated via Jinja2 templates. It contains embedded CSS and vanilla JavaScript with zero external CDN dependencies, ensuring full portability and air-gapped viewing.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  RONIN API SECURITY REPORT                               Scan: ronin-2026.. │
│  Target: https://api.vulnerable.local                  Duration: 06m 15s    │
├─────────────────────────────────────────────────────────────────────────────┤
│  EXECUTIVE DASHBOARD                                                        │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  ┌──────────────┐ │
│  │ CRITICAL │   HIGH   │  MEDIUM  │   LOW    │   INFO   │  │ [SEVERITY    │ │
│  │    1     │    1     │    1     │    1     │    1     │  │  CHART       │ │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │  BREAKDOWN]  │ │
│  Endpoints Scanned: 18         Total Findings: 5           └──────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  FILTER FINDINGS                                                            │
│  [All (5)] [Critical (1)] [High (1)] [Medium (1)] [Low (1)] [Info (1)]      │
│  Search: [ Enter keyword or endpoint...                       ]             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ▼ [CRITICAL] RONIN-001: Broken Object Level Authorization      CVSS: 9.1   │
│    Category: API1:2023 - Broken Object Level Authorization                  │
│    Target: GET /api/v1/users/{id}                                           │
│    ┌──────────────────────────────────────────────────────────────────────┐ │
│    │ Description: The endpoint does not validate authorization tokens...  │ │
│    │ Proof of Concept:                                                    │ │
│    │   Request:  GET /api/v1/users/42                                     │ │
│    │   Response: HTTP 200 OK {"id": 42, "email": "alex@..."}             │ │
│    │ Steps to Reproduce:                                                  │ │
│    │   1. Send GET /api/v1/users/1                                        │ │
│    │   2. Send GET /api/v1/users/42                                       │ │
│    │ Remediation: Implement object-level access control middleware...     │ │
│    │ References: https://owasp.org/...                                    │ │
│    └──────────────────────────────────────────────────────────────────────┘ │
│  ▶ [HIGH]     RONIN-002: Authentication Bypass via Unsigned JWT  CVSS: 8.6   │
│  ▶ [MEDIUM]   RONIN-003: Overly Permissive CORS Policy          CVSS: 5.3   │
│  ▶ [LOW]      RONIN-004: Missing HTTP Security Headers          CVSS: 3.7   │
│  ▶ [INFO]     RONIN-005: Exposed Swagger UI Documentation       CVSS: 0.0   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.1 UI Components & Features

1. **Executive Dashboard Summary:**
   - Visual KPIs (Total Endpoints Scanned, Findings Count, Scan Duration).
   - Embedded SVG/CSS severity doughnut and bar distribution charts.
   - Scan metadata pills (Target URL, timestamp, scan engine version).

2. **Interactive Filtering & Search:**
   - Severity pill filters (`All`, `Critical`, `High`, `Medium`, `Low`, `Info`).
   - Real-time client-side text search (filters findings by path, title, or CWE).
   - Expand All / Collapse All card toggles.

3. **Expandable Finding Cards:**
   - **Header:** Color-coded severity badge, finding ID, title, CVSS score pill, and category badge.
   - **Body (Accordion):**
     - Markdown-rendered description and impact analysis.
     - Formatted HTTP Request and Response tabs with one-click "Copy PoC" button.
     - Ordered reproduction steps.
     - Structured remediation recommendations.
     - External reference hyperlinks.

4. **Print / PDF Optimization:**
   - CSS `@media print` styling included to format reports into clean executive PDFs.

---

## 5. CLI Terminal Output Format

During execution, Ronin delivers real-time scan metrics using a clean terminal user interface with progress bars and box-drawn summary tables.

### 5.1 Terminal Progress View (In-Flight)

```text
🔍 Project Ronin v1.0 — API Security Scanner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target:     https://api.vulnerable.local
Mode:       Auto-Discovery (Mode A)
Endpoints:  18 discovered

[Recon]     [■■■■■■■■■■■■■■■■■■■■] 100% (18 endpoints mapped)
[Exploit]   [■■■■■■■■■■■■■■■■■■■■] 100% (5 suspected vulns)
[Validate]  [■■■■■■■■■■■■■■■■■■■■] 100% (5 confirmed / 0 FP)

Status: Scan complete in 6m 15s.
```

### 5.2 Final Terminal Summary Table

```text
┌─────────────────────────────────────────────────────────────┐
│                       RESULTS SUMMARY                       │
├──────────────┬───────┬──────────────────────────────────────┤
│ SEVERITY     │ COUNT │ HIGHEST CVSS                         │
├──────────────┼───────┼──────────────────────────────────────┤
│ 🔴 CRITICAL  │ 1     │ 9.1 (BOLA on /api/v1/users/{id})     │
│ 🟠 HIGH      │ 1     │ 8.6 (JWT alg:none on /admin/dash)    │
│ 🟡 MEDIUM    │ 1     │ 5.3 (CORS Misconfiguration)          │
│ 🔵 LOW       │ 1     │ 3.7 (Missing Security Headers)       │
│ ⚪ INFO      │ 1     │ 0.0 (Exposed Swagger UI)             │
├──────────────┴───────┴──────────────────────────────────────┤
│ Total Endpoints Tested: 18                                  │
│ Total Vulnerabilities Confirmed: 5                          │
└─────────────────────────────────────────────────────────────┘

Reports Generated Successfully:
  → JSON: ./ronin_runs/ronin-20260820-001530/report.json
  → HTML: ./ronin_runs/ronin-20260820-001530/report.html
```

---

## 6. Exit Codes

Project Ronin returns standardized process exit codes to facilitate automated gating in CI/CD pipelines:

| Exit Code | Name | Condition |
|---|---|---|
| `0` | `SUCCESS_NO_ISSUES` | Scan completed successfully with 0 Critical or High findings. |
| `1` | `VULNERABILITIES_FOUND` | Scan completed and discovered 1 or more `CRITICAL` or `HIGH` vulnerabilities. |
| `2` | `CLI_USAGE_ERROR` | Invalid CLI arguments, missing target, or malformed input files. |
| `3` | `TARGET_UNREACHABLE` | Target host could not be reached, DNS resolution failed, or connection timed out. |
| `4` | `INTERNAL_AGENT_ERROR` | Unrecoverable error in agent orchestration or Docker sandbox execution. |

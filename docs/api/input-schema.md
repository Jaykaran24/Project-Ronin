# Input Schema Specification

> **Project Ronin** — AI-Powered Black-Box API Security Testing CLI Tool  
> **Version:** 1.0.0-spec  
> **Status:** Active

---

## 1. Overview

Project Ronin operates as a black-box, CLI-driven API security scanner designed to map attack surfaces, detect critical vulnerabilities (such as BOLA/IDOR, broken authentication, and security misconfigurations), and validate findings via an autonomous multi-agent pipeline.

This document defines the complete input contract for Project Ronin, including CLI invocation formats, supported operation modes, input document schemas, scope filtering rules, and version constraints.

---

## 2. CLI Command Syntax

All scanning operations in Project Ronin are initiated through the `scan` command:

```bash
ronin scan --target <url> [options]
```

### Core Invocations by Mode

```bash
# Mode A: Base URL only (Autonomous reconnaissance & auto-discovery)
ronin scan --target https://api.example.com

# Mode B: With Postman Collection v2.1 file
ronin scan --target https://api.example.com --collection ./postman_collection.json

# Mode C: With Plain Text Endpoints file
ronin scan --target https://api.example.com --endpoints ./endpoints.txt
```

---

## 3. Operational Scanning Modes

Ronin supports three input ingestion modes depending on the level of pre-existing API documentation available.

```
                  ┌─────────────────────────────────────────────────┐
                  │                 Target Selection                │
                  │             (--target https://...)              │
                  └────────────────────────┬────────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
   [ Mode A: Auto ]               [ Mode B: Postman ]               [ Mode C: Plain Text ]
   Base URL Only                  --collection <file>               --endpoints <file>
         │                                 │                                 │
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌───────────────────┐             ┌───────────────────┐
│ • Crawling       │             │ • v2.1 JSON parser│             │ • HTTP Verb + Path│
│ • Common paths   │             │ • Param extraction│             │ • Param inference │
│ • robots/sitemap │             │ • Schema mapping  │             │ • Wordlist merge  │
│ • OpenAPI probing│             │ • Var resolution │             │ • Normalization   │
└────────┬─────────┘             └─────────┬─────────┘             └─────────┬─────────┘
         │                                 │                                 │
         └─────────────────────────────────┼─────────────────────────────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │   Scope Filtering   │
                                │ --include / --exclude│
                                └──────────┬──────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │ Final Attack Surface│
                                └─────────────────────┘
```

### 3.1 Mode A: Base URL Only (Auto-Discovery)

In Mode A, only the target base URL is provided. Ronin's **Recon Agent (Scout)** performs black-box endpoint discovery.

```bash
ronin scan --target https://api.example.com
```

#### Discovery Techniques Applied:
1. **Robots & Sitemap Parsing:** Ingestion of `/robots.txt`, `/sitemap.xml`, and `/sitemap_index.xml`.
2. **API Definition Probing:** Automatic detection of OpenAPI/Swagger specs (`/swagger.json`, `/v2/api-docs`, `/v3/api-docs`, `/openapi.json`, `/api-docs`, `/docs`).
3. **Common Route Fuzzing:** Dictionary-driven probing of standard REST routes (`/api/v1/users`, `/api/v1/auth`, `/api/health`, etc.).
4. **HTML/JS Crawling:** Extraction of endpoint patterns from client-side JavaScript bundles and hypermedia responses.

---

### 3.2 Mode B: Postman Collection v2.1

In Mode B, Ronin parses a Postman Collection v2.1 JSON file to seed the exact endpoint list, HTTP methods, headers, parameters, and request body structures.

```bash
ronin scan --target https://api.example.com --collection ./tests/postman_collection.json
```

#### Ingestion Behavior:
- Recursively parses folder hierarchies and `item` arrays.
- Extracts HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD`).
- Extracts path variables (`:id`), query parameters (`?limit=10`), and JSON body schemas.
- Substitutes environment/collection variables using default values or falls back to smart fuzzer defaults.
- Normalizes paths against the `--target` base URL.

---

### 3.3 Mode C: Plain Text Endpoint List

In Mode C, Ronin ingests a simple newline-delimited text file containing HTTP verbs and paths.

```bash
ronin scan --target https://api.example.com --endpoints ./seed_endpoints.txt
```

#### Ingestion Behavior:
- Parses lines matching `<METHOD> <PATH>` or `<PATH>`.
- Defaults to `GET` if no HTTP method is specified.
- Identifies parameterized segments (e.g., `{id}`, `:id`, `<id>`).
- Normalizes trailing slashes and validates URI formatting.

---

## 4. Scope Filtering

Scope filters allow operators to constrain or expand the attack surface. Filters use standard glob patterns and can be specified multiple times.

### 4.1 CLI Syntax

```bash
# Include only specific API sub-trees
ronin scan --target https://api.example.com \
  --include "/api/v1/users/*" \
  --include "/api/v1/orders/*"

# Exclude static/health routes and docs
ronin scan --target https://api.example.com \
  --exclude "/api/health" \
  --exclude "/api/metrics" \
  --exclude "/docs/*" \
  --exclude "*.swagger"
```

### 4.2 Pattern Matching Rules

| Pattern | Description | Example Match | Example Non-Match |
|---|---|---|---|
| `*` | Matches any characters within a single path segment | `/api/users/*` matches `/api/users/42` | `/api/users/42/profile` |
| `**` | Matches across multiple path segments (recursive) | `/api/**` matches `/api/v1/users/42` | `/admin/login` |
| `?` | Matches a single character | `/api/v?/users` matches `/api/v1/users` | `/api/v10/users` |
| `[abc]` | Matches any character enclosed | `/api/v[12]/users` matches `/api/v1/users` | `/api/v3/users` |

### 4.3 Evaluation Precedence

1. If `--include` patterns are provided, an endpoint **must** match at least one `--include` pattern.
2. If `--exclude` patterns are provided, an endpoint matching any `--exclude` pattern is **immediately dropped**.
3. Exclusions take precedence over inclusions: if a path matches both an `--include` and an `--exclude`, it is **excluded**.

---

## 5. Input File Formats

### 5.1 Plain Text Endpoints Format (`endpoints.txt`)

Plain text files must follow a simple line-based structure:

- Lines starting with `#` or `//` are treated as comments and ignored.
- Blank or whitespace-only lines are ignored.
- Each valid line consists of an optional HTTP method followed by the relative or absolute path.

#### Grammar (EBNF)
```ebnf
Line           ::= [ Method WS ] Path [ QueryString ] ;
Method         ::= "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" ;
Path           ::= "/" { Character } ;
QueryString    ::= "?" { Character } ;
WS             ::= " " | "\t" ;
```

#### Example File (`endpoints.txt`)
```text
# User management endpoints
GET /api/v1/users
POST /api/v1/users
GET /api/v1/users/{id}
PUT /api/v1/users/{id}
DELETE /api/v1/users/{id}
GET /api/v1/users/{id}/profile

# Products and catalog
GET /api/v1/products
GET /api/v1/products?category=electronics&limit=50
POST /api/v1/products

# Orders
GET /api/v1/orders/{order_id}
POST /api/v1/orders/{order_id}/cancel
```

---

### 5.2 Postman Collection v2.1 Schema Expectations

Project Ronin expects standard Postman Collection schema `https://schema.getpostman.com/json/collection/v2.1.0/collection.json`.

#### Schema Mapping Structure

```json
{
  "info": {
    "name": "Target API Collection",
    "_postman_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Users",
      "item": [
        {
          "name": "Get User By ID",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Accept",
                "value": "application/json"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/v1/users/:id",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "users", ":id"],
              "variable": [
                {
                  "key": "id",
                  "value": "1",
                  "description": "User identifier"
                }
              ],
              "query": [
                {
                  "key": "include_details",
                  "value": "true",
                  "disabled": false
                }
              ]
            },
            "description": "Retrieve specific user profile"
          }
        },
        {
          "name": "Create User",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"username\": \"testuser\",\n  \"email\": \"test@example.com\",\n  \"role\": \"user\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/api/v1/users",
              "host": ["{{baseUrl}}"],
              "path": ["api", "v1", "users"]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "https://api.example.com"
    }
  ]
}
```

#### Field Ingestion Rules:
- **`item[]` Hierarchy:** Recursively unpacked to resolve all nested folders and requests.
- **`request.url`:** Supports both string URLs and Postman URL objects (`host`, `path`, `query`, `variable`).
- **`request.body`:** Supports `raw` (JSON/text), `urlencoded`, and `formdata` modes. Raw JSON bodies are parsed into field-level parameter definitions.
- **`request.header`:** Key-value headers are extracted and sanitized.

---

## 6. CLI Argument Reference

The following table documents all CLI arguments supported by `ronin scan`:

| Option | Flag (Short) | Type | Default | Required | Description |
|---|---|---|---|---|---|
| `--target` | `-t` | `URL` (string) | *None* | **Yes** | Target API base URL (e.g., `https://api.example.com`). Scheme (`http://` or `https://`) is mandatory. |
| `--collection` | `-c` | `Path` (file) | `None` | No | Path to Postman Collection v2.1 JSON file. |
| `--endpoints` | `-e` | `Path` (file) | `None` | No | Path to plain text file containing endpoints (one per line). |
| `--include` | `-i` | `List[str]` | `[]` | No | Glob pattern(s) to include in scan scope. Can be specified multiple times. |
| `--exclude` | `-x` | `List[str]` | `[]` | No | Glob pattern(s) to exclude from scan scope. Can be specified multiple times. |
| `--output-dir` | `-o` | `Path` (dir) | `./ronin_runs` | No | Directory where scan artifacts and reports will be saved. |
| `--concurrency` | `-j` | `Integer` | `5` | No | Maximum number of concurrent probe requests sent to target. |
| `--timeout` | *None* | `Integer` | `10` | No | Per-request timeout in seconds. |
| `--rate-limit` | `-r` | `Integer` | `20` | No | Maximum requests per second (RPS) to prevent target denial of service. |
| `--proxy` | `-p` | `URL` (string) | `None` | No | Upstream HTTP/HTTPS proxy (e.g., `http://127.0.0.1:8080` for Burp Suite). |
| `--verbose` | `-v` | `Boolean` | `False` | No | Enable verbose terminal debugging output and agent thought logs. |
| `--no-sandbox` | *None* | `Boolean` | `False` | No | Disable Docker sandbox for validation (runs in local Python environment). |

---

## 7. Example Command Invocations

### Example 1: Full Auto-Discovery on a Production-Like API
```bash
ronin scan \
  --target https://api.vulnerable.local \
  --rate-limit 15 \
  --output-dir ./audit_results
```
*Behavior:* Automatically finds endpoints via wordlists, robots.txt, and OpenAPI autodetection; throttles traffic to 15 RPS.

### Example 2: Postman Collection with Scope Restrictions
```bash
ronin scan \
  --target https://api.staging.example.com \
  --collection ./collections/payment_gateway_v2.json \
  --include "/api/v2/checkout/*" \
  --include "/api/v2/cards/*" \
  --exclude "/api/v2/checkout/health"
```
*Behavior:* Only tests checkout and card endpoints loaded from the Postman collection, ignoring health checks.

### Example 3: Seed Plain Text File with Upstream Burp Proxy
```bash
ronin scan \
  --target http://10.0.0.45:8000 \
  --endpoints ./discovered_routes.txt \
  --proxy http://127.0.0.1:8080 \
  --verbose
```
*Behavior:* Ingests `discovered_routes.txt`, pipes all agent traffic through Burp Suite for manual inspection, and prints real-time reasoning logs.

---

## 8. Authentication Boundaries & Limitations

### 8.1 V1 Scope: Public APIs & Active Auth Probing
Project Ronin V1 is strictly focused on **black-box testing of unauthenticated and public-facing APIs**. 

- **No User-Supplied Auth:** V1 does **not** accept user-supplied API keys, session tokens, or bearer headers as input.
- **Active Auth Probing:** The system actively attempts to:
  1. Bypass authorization mechanisms (e.g., stripping auth headers, forging unverified JWT tokens with `alg: none` or default HMAC secrets).
  2. Discover Broken Object Level Authorization (BOLA/IDOR) where objects are accessible without valid credentials or between unauthenticated contexts.
  3. Detect broken function level access controls on administrative endpoints (`/admin`, `/internal`).
  4. Identify authentication endpoints susceptible to credential stuffing, parameter tampering, or missing rate limiting.

### 8.2 V2 Roadmap: Authenticated Multi-Role Scanning
V2 will introduce multi-persona scanning:
- User-provided JWTs / API keys for multiple role tiers (e.g., `admin_token`, `victim_token`, `attacker_token`).
- Automated vertical and horizontal privilege escalation testing.
- OAuth2 / OpenID Connect flow fuzzing.

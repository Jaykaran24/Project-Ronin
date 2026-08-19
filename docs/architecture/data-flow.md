# Data Flow Documentation

## 1. End-to-End Execution Flow

Project Ronin executes automated API security scans through a multi-stage data transformation pipeline. Data flows systematically from raw user input through discovery, heuristic payload exploitation, isolated sandbox verification, persistence, and reporting.

```mermaid
sequenceDiagram
    autonumber
    actor Engineer as Security Engineer
    participant CLI as Typer CLI
    participant Orch as Orchestrator Agent
    participant Recon as Reconnaissance Agent
    participant Exploit as Exploitation Agent
    participant Validate as Validation Agent
    participant LLM as Local Ollama Engine
    participant Target as Target API
    participant Sandbox as Docker Sandbox
    participant Mongo as MongoDB
    participant Report as Report Generator

    %% 1. Ingestion
    Engineer->>CLI: ronin scan --target https://api.example.com --collection postman.json
    CLI->>Orch: Initialize ScanState
    Orch->>Mongo: Insert Scan Document (status="INITIALIZED")

    %% 2. Recon
    Orch->>Recon: Execute Recon Phase
    alt Collection Provided
        Recon->>Recon: Parse Postman / Text file
    else Auto-Discovery
        Recon->>Target: GET /swagger.json, /openapi.json, common paths
        Target-->>Recon: Schema payload / 404 / 200
        Recon->>LLM: Infer missing parameter structures
        LLM-->>Recon: Normalized Endpoint schemas
    end
    Recon-->>Orch: Return discovered_endpoints[]
    Orch->>Mongo: Update ScanState (discovered_endpoints)

    %% 3. Exploitation Loop
    loop For each endpoint in discovered_endpoints
        Orch->>Exploit: Test Endpoint(method, path, params)
        Exploit->>LLM: Request Attack Plan (BOLA / Auth Bypass / Injection)
        LLM-->>Exploit: Crafted Payload Matrices
        Exploit->>Target: Send HTTP Requests with payloads
        Target-->>Exploit: HTTP Status Codes, Response Headers & Bodies
        Exploit->>LLM: Analyze Response for Anomalies
        LLM-->>Exploit: Return SuspectedVuln | None
        
        %% 4. Validation
        opt SuspectedVuln Found
            Exploit->>Orch: Push SuspectedVuln
            Orch->>Validate: Verify SuspectedVuln
            Validate->>LLM: Generate Standalone PoC Python Script
            LLM-->>Validate: PoC Code (httpx/requests + assertions)
            Validate->>Sandbox: Execute PoC Script in Isolated Container
            Sandbox->>Target: Execute Live Exploit Verification
            Target-->>Sandbox: Response
            Sandbox-->>Validate: Exit Code, stdout, stderr
            Validate->>Validate: Evaluate Assertions
            alt PoC Succeeded (Exit Code 0)
                Validate-->>Orch: Return Validated Finding
                Orch->>Mongo: Push to validated_findings[]
            else PoC Failed (Exit Code != 0)
                Validate-->>Orch: Discard as False Positive
            end
        end
    end

    %% 5. Reporting
    Orch->>Mongo: Update Scan Document (status="COMPLETED")
    Orch->>Report: Render Outputs(ScanState)
    Report->>Report: Generate ronin_report.json
    Report->>Report: Render Jinja2 template -> ronin_report.html
    Report-->>CLI: Report File Paths
    CLI-->>Engineer: Render Summary Dashboard & File Links
```

---

## 2. Input Processing Flow

Ronin accepts three primary input modes and applies deterministic scope filters before initiating discovery.

```mermaid
graph TD
    CLI_INPUT["User CLI Command"] --> PARSE_MODE{"Input Mode"}

    PARSE_MODE -->|"Mode A: Base URL"| AUTO_DISC["Auto-Discovery Mode\nTarget Base URL only"]
    PARSE_MODE -->|"Mode B: Postman"| POSTMAN["Postman Collection Parser\nIngest JSON v2.0/v2.1"]
    PARSE_MODE -->|"Mode C: Text File"| TEXT_LIST["Plaintext Endpoint Parser\nLine-delimited HTTP routes"]

    AUTO_DISC --> SCOPE_FILTER["Scope Filter Engine"]
    POSTMAN --> SCOPE_FILTER
    TEXT_LIST --> SCOPE_FILTER

    SCOPE_FILTER -->|"Apply --include glob/regex"| FILTER_INC["Included Routes Queue"]
    SCOPE_FILTER -->|"Apply --exclude glob/regex"| FILTER_EXC["Excluded Routes Stripped"]

    FILTER_INC --> INIT_STATE["ScanState Initialized in Memory"]
```

### Input Parsing Details

1. **Auto-Discovery Mode (`--target <url>`):**
   - Directs the Recon Agent to query standard documentation endpoints (`/swagger.json`, `/openapi.json`, `/api-docs`) and run wordlist-based endpoint fuzzing via `common_paths.txt`.

2. **Postman Collection Mode (`--collection <path.json>`):**
   - Parses request items, folder hierarchy, URL structures, query parameters, authorization headers, and raw JSON body templates into typed `Endpoint` and `Parameter` models.

3. **Plaintext Endpoint Mode (`--endpoints <path.txt>`):**
   - Parses space-delimited or standard HTTP request lines:
     ```text
     GET /api/v1/users
     POST /api/v1/users
     GET /api/v1/users/{id}
     DELETE /api/v1/users/{id}
     ```

4. **Scope Inclusion / Exclusion Rules:**
   - Filters are evaluated using Unix-style globbing and regular expressions:
     ```bash
     ronin scan --target https://api.target.com \
       --include "/api/v1/*" \
       --exclude "/api/v1/health" \
       --exclude "/api/v1/docs/*"
     ```

---

## 3. Recon Phase Data Flow

The Reconnaissance phase transforms target URLs and input specifications into structured, standardized API endpoint definitions.

```mermaid
graph LR
    subgraph InputSources["Raw Sources"]
        SRC_POSTMAN["Postman JSON"]
        SRC_TEXT["Endpoints TXT"]
        SRC_CRAWL["HTTP Prober"]
    end

    subgraph ReconProcessing["Recon Agent Pipeline"]
        EXTRACTOR["Schema Extractor"]
        NORM["Path Normalizer\n(e.g., :id -> {id})"]
        LLM_INFER["LLM Schema Inferencer\n(Qwen 2.5 7B)"]
    end

    subgraph StateOutput["State Storage"]
        STATE_ENDPOINTS["ScanState.discovered_endpoints\nList[Endpoint]"]
    end

    SRC_POSTMAN --> EXTRACTOR
    SRC_TEXT --> EXTRACTOR
    SRC_CRAWL --> EXTRACTOR

    EXTRACTOR --> NORM
    NORM --> LLM_INFER
    LLM_INFER --> STATE_ENDPOINTS
```

### Endpoint Normalization Process
1. **Path Parameter Standardization:** Replaces `:id`, `<id>`, or `$id` with canonical OpenAPI style `{id}`.
2. **Parameter Typing:** Inferred using static heuristic pattern matching (e.g., UUID regex, integer check) and local LLM body analysis.
3. **Authentication Baselining:** Sends an unauthenticated probe to determine baseline HTTP response codes (`401 Unauthorized`, `403 Forbidden`, vs `200 OK`).

---

## 4. Exploitation Phase Data Flow

The Exploitation Agent iterates over each discovered endpoint to construct targeted attack requests and evaluate responses.

```mermaid
flowchart TD
    EP_QUEUE["Fetch Next Endpoint from ScanState"] --> DISPATCH_TESTS["Generate Attack Vectors"]

    subgraph AttackGenerators["Attack Vector Generators"]
        BOLA_GEN["BOLA / IDOR Generator\n- Parameter ID Swapping\n- Sequential ID Mutation\n- Cross-Tenant UUIDs"]
        AUTH_GEN["Broken Auth Generator\n- Strip Authorization Headers\n- Inject JWT alg:none\n- Default Token Probes"]
        INJ_GEN["Injection Generator\n- SQLi: ' OR '1'='1\n- XSS: <script>alert(1)</script>"]
        HDR_GEN["Header Check Generator\n- CORS Wildcard Reflection\n- Missing HSTS/CSP/XFO"]
    end

    DISPATCH_TESTS --> BOLA_GEN
    DISPATCH_TESTS --> AUTH_GEN
    DISPATCH_TESTS --> INJ_GEN
    DISPATCH_TESTS --> HDR_GEN

    BOLA_GEN --> HTTP_PROBE["Async HTTP Execution (httpx)"]
    AUTH_GEN --> HTTP_PROBE
    INJ_GEN --> HTTP_PROBE
    HDR_GEN --> HTTP_PROBE

    HTTP_PROBE --> TARGET_API[("Target API")]
    TARGET_API --> RESP_ANALYZER["Response Analyzer (LLM + Rules)"]

    RESP_ANALYZER --> EVAL_ANOMALY{"Anomaly Detected?"}
    EVAL_ANOMALY -- Yes --> CREATE_SUSPECT["Construct SuspectedVuln Object"]
    EVAL_ANOMALY -- No --> NEXT_EP["Mark Endpoint Exploit Checked"]

    CREATE_SUSPECT --> QUEUE_VALIDATE["Forward to Validation Agent"]
```

---

## 5. Validation Phase Data Flow

The Validation Agent eliminates false positives by generating and running a standalone Python exploit script inside an isolated Docker sandbox container.

```mermaid
graph TD
    SUSP_IN["SuspectedVuln Object Received"] --> LLM_CODEGEN["LLM Prompt: Generate Python PoC Script"]
    
    LLM_CODEGEN --> PYTHON_SCRIPT["Standalone PoC Script\n- Includes requests/httpx\n- Includes assertion checks\n- Exits with 0 on confirmed vuln\n- Exits with 1 on failure"]
    
    PYTHON_SCRIPT --> DOCKER_DISPATCH["Dispatch to Docker Sandbox Container"]
    
    subgraph SandboxBoundary["Isolated Docker Sandbox Container"]
        SANDBOX_EXEC["python3 -u /tmp/poc.py\nTimeout: 10s | Memory: 256MB"]
        SANDBOX_EXEC --> TARGET_LIVE[("Live Target API")]
        TARGET_LIVE --> SANDBOX_EXEC
    end

    DOCKER_DISPATCH --> SANDBOX_EXEC
    SANDBOX_EXEC --> CAPTURE_OUTPUT["Capture stdout, stderr, exit_code"]

    CAPTURE_OUTPUT --> CHECK_EXIT{"Exit Code == 0?"}
    CHECK_EXIT -- Yes --> BUILD_FINDING["Construct Validated Finding\n- Attach PoC Code & Logs\n- Assign CVSS & Severity"]
    CHECK_EXIT -- No --> DISCARD_FP["Discard / Log to ScanState.errors"]

    BUILD_FINDING --> COMMIT_STATE["Append to ScanState.validated_findings"]
```

---

## 6. Report Generation Flow

At the conclusion of the scan, the Orchestrator passes the completed `ScanState` to the Report Engine to render machine-readable and human-readable artifacts.

```mermaid
graph LR
    SCAN_STATE["ScanState (Completed)"] --> REPORT_ENGINE["Report Engine"]

    subgraph Formats["Output Generators"]
        JSON_BUILDER["JSON Serializer\n(reports/json_report.py)"]
        JINJA_RENDER["Jinja2 Template Engine\n(reports/html_report.py)"]
        HTML_TPL["Template: report.html.j2\n(Self-contained CSS/JS)"]
    end

    REPORT_ENGINE --> JSON_BUILDER
    REPORT_ENGINE --> JINJA_RENDER
    HTML_TPL --> JINJA_RENDER

    JSON_BUILDER --> OUT_JSON["./ronin_runs/<scan_id>/report.json"]
    JINJA_RENDER --> OUT_HTML["./ronin_runs/<scan_id>/report.html"]
```

### Report Deliverables
- **`report.json`:** Standardized machine-readable format containing full scan metadata, tested endpoints, severity breakdown, CVSS scores, and structured PoC request/response bodies.
- **`report.html`:** Self-contained, zero-dependency HTML dashboard with interactive severity filters, collapsible vulnerability cards, and remediation guidance.

---

## 7. Data Persistence Strategy

Ronin maintains a clear separation between transient operational memory and durable database records.

```mermaid
graph TD
    subgraph TransientMemory["Transient In-Memory State (LangGraph Runtime)"]
        MEM_HTTP["Raw HTTP Request/Response Buffers"]
        MEM_TEMP_POUND["Fuzzing Payload Matrices"]
        MEM_PROMPTS["LLM Chat Context & Raw Prompts"]
        MEM_INDEX["Active Endpoint Queue Pointer"]
    end

    subgraph PersistentDB["Persistent Storage (MongoDB)"]
        DB_SCANS["Collection: scans\n- scan_id, target_url, timestamps, status"]
        DB_ENDPOINTS["Collection: endpoints\n- Discovered paths, methods, parameter schemas"]
        DB_FINDINGS["Collection: findings\n- Confirmed vulnerabilities, PoC scripts, CVSS"]
        DB_AUDIT["Collection: audit_logs\n- Phase transitions, execution errors, retry counts"]
    end

    LangGraphRuntime["Agent Graph Execution"] --> TransientMemory
    LangGraphRuntime -->|"State Checkpointing on Phase Transitions"| PersistentDB
```

### Storage Classification

| Data Entity | Storage Location | Retention Policy | Purpose |
|-------------|------------------|------------------|---------|
| **Scan Metadata** | MongoDB (`scans`) | Permanent | Historical scan tracking and CI/CD status auditing. |
| **Endpoint Inventory** | MongoDB (`endpoints`) | Permanent | API surface mapping and diff analysis across runs. |
| **Confirmed Findings** | MongoDB (`findings`) & JSON/HTML | Permanent | Remediation reporting and proof-of-concept verification. |
| **Raw Fuzzing Payloads** | In-Memory (`LangGraph`) | Ephemeral (during endpoint test) | Avoids database bloat from high-volume negative probes. |
| **PoC Container Logs** | MongoDB (`audit_logs`) & Report | Permanent | Verifiable audit trail for compliance and security review. |

# Project Ronin — Frontend Rebuild Checkpoint (`checkpoint.md`)

> **Project Mission:** Autonomous, 100% local, multi-agent black-box API security testing platform (Orchestrator → Recon → Exploit → Validate).
> **UI/UX Vision:** Dark Modern Mac CLI aesthetic (macOS traffic light window controls `#ff5f56`, `#ffbd2e`, `#27c93f`, carbon surfaces `#0a0c10` / `#11141c` / `#151924`, borders `#1e2433`, terminal breadcrumb prompt `ronin@local: ~/api-pentest`, monospace verb badges, electric cyan/emerald telemetry accents).
> **Zero-Friction Guarantee:** No scroll hijacking (eliminated all `scrollIntoView` window-scrolling bugs from previous versions), strict height containers, zero placeholder screens, 100% type-safe, passing `npm run lint` and `npm run build` with 0 errors.

---

## 📅 Roadmap & Execution Phases

- [x] **Phase 0: Clean Slate Scaffold & Foundation**
  - Completely purged broken legacy frontend directory.
  - Initialized clean modern stack: Next.js 16.3.4 (Turbopack + App Router) + React 19.2.8 + Tailwind CSS v4 + PostCSS + Lucide Icons + Sonner Toasts.
  - Built tokenized Dark Modern Mac CLI theme in `globals.css` with traffic light window indicators, thin Mac scrollbars, and dark carbon surface palettes.
  - Implemented `domain.ts` fully matching `docs/api/state-schema.md` and `docs/api/output-schema.md`.

- [x] **Phase 1: Domain Data Layer & Mock Engine**
  - Built complete typed mock data barrel (`src/lib/mock-data/`):
    - `kpi.ts`: 4 key performance metrics with change delta.
    - `findings.ts`: Real OWASP API Top 10 vulnerabilities (BOLA, broken auth alg:none JWT, mass assignment, CORS, missing headers) with request/response evidence and cURL commands.
    - `agents.ts`: 4-agent LangGraph pipeline (Orchestrator, Recon, Exploit, Validate) with model parameters, memory usage, and operational status.
    - `endpoints.ts`: Attack surface inventory with parameter schemas, auth requirements, and risk scores.
    - `scan.ts`: Active scan telemetry session (`SCAN-202609-0824`) and historical execution runs.
    - `activity.ts`: Full audit event stream with timestamps, agent tags, and log levels.
    - `sandbox.ts`: Alpine Docker execution telemetry with Python reproduction scripts, exit codes, and stdout/stderr captures.
    - `targets.ts`: Registered target hosts with environment tags and spec formats (OpenAPI, Postman, Auto-Discovery).
    - `settings.ts`: Local Ollama LLM provider & Alpine Docker sandbox parameters.
    - `report.ts`: Formal security assessment report artifact.

- [x] **Phase 2: Dark Modern Mac CLI Shell Navigation**
  - `MacHeader`: Mac traffic light window controls (red/yellow/green), interactive terminal breadcrumb prompt (`ronin@local: ~/api-pentest`), global target switcher dropdown, live Ollama LLM status badge (`qwen2.5-coder:14b [Connected]`), Docker sandbox indicator, and "+ Launch Scan" trigger button.
  - `MacSidebar`: Mac styled sidebar grouped into Core Platform, Agent Operations, and Telemetry & Audit, with live route badges and daemon health meter.
  - `LaunchScanModal`: Mac CLI window modal supporting Auto-Discovery, OpenAPI 3.0 / Swagger JSON, Postman Collection, aggression profiles (Safe, Standard, Aggressive), and Docker sandbox guarantee notification.

- [x] **Phase 3: Mission Control Dashboard (`/dashboard`)**
  - `MacKPICards`: 4 Mac panel metric cards with cyan/emerald glow accents.
  - `MacActiveScanPanel`: Live execution monitor with progress bar, pause/resume, abort, endpoint/technique telemetry, and request counters.
  - `MacAgentPipeline`: Visual multi-agent cards for Orchestrator, Recon, Exploit, and Validate with execution status and model telemetry.
  - `MacActivityFeed`: **Strictly constrained height (`h-72`) with internal-only auto-scroll**. Solved the root cause of window jumping (removed `scrollIntoView()` completely; container only scrolls its own `scrollTop` to `scrollHeight`). Includes filter by level and auto-scroll pause/play toggle.
  - `FindingsTable`: Interactive high-severity findings table with drawer inspector.

- [x] **Phase 4: Complete Subpages & Workflows (Zero Placeholder Screens)**
  - `/dashboard/findings`: Filterable findings catalog, search, severity badges, and `FindingDetailDrawer` displaying cURL reproduction, HTTP request/response telemetry, and remediation guidance.
  - `/dashboard/endpoints`: Discovered API attack surface catalog, parameter schema inspector drawer, auth gates, and route fuzzer action.
  - `/dashboard/live-scans`: Active scan session monitor + historical runs table with one-click re-run capability.
  - `/dashboard/agent-graph`: Visual LangGraph DAG state transition flow with interactive node inspector.
  - `/dashboard/sandbox`: Alpine Docker sandbox telemetry + interactive Python PoC code editor & terminal executor with simulated stdout/stderr.
  - `/dashboard/targets`: Target inventory management with "Add New Target" modal supporting environments, auth schemes, and spec types.
  - `/dashboard/activity-logs`: Full-fidelity agent audit trace stream with text search, level filtering, agent filtering, and raw `.log` exporter.
  - `/dashboard/reports`: Executive assessment report view with severity distribution breakdown and one-click JSON report download.
  - `/dashboard/settings`: Ollama LLM configuration, Docker socket setting, execution timeouts, memory ceiling slider, and connection test actions.

- [x] **Phase 5: Verification & Quality Assurance**
  - `npm run lint`: **0 errors, 0 warnings** (ESLint 9 flat config compliant).
  - `npm run build`: **0 errors** (all 12 routes compiled and prerendered cleanly with Next.js Turbopack).
  - Browser scroll stability verified: No window scroll hijacking.

---

## 📊 Component & Route Implementation Tracker

| Route / Component | Planned Purpose | Spec Reference | Status |
|---|---|---|---|
| `Shell (MacHeader + MacSidebar)` | Dark Modern Mac CLI navigation + window controls + target switcher | Mac CLI Theme Spec | ✅ Complete |
| `LaunchScanModal` | Terminal modal scan initiator (Auto-Discovery, OpenAPI, Postman) | `project-ronin-v1-spec.md §1` | ✅ Complete |
| `/dashboard` | Mission Control overview + KPIs + Active Scan + Agents + Feed | `design.md §3.2` | ✅ Complete |
| `/dashboard/findings` | OWASP API Top 10 findings + cURL reproduction + PoC drawer | `docs/api/output-schema.md` | ✅ Complete |
| `/dashboard/endpoints` | Discovered attack surface + parameter schema drawer | `docs/api/state-schema.md §2` | ✅ Complete |
| `/dashboard/live-scans` | Active scan telemetry + historical runs table | `project-ronin-v1-spec.md §2.3` | ✅ Complete |
| `/dashboard/agent-graph` | Visual LangGraph DAG state inspector & flow | `design.md §3.2.C`, `agent(1).md` | ✅ Complete |
| `/dashboard/sandbox` | Alpine Docker sandbox telemetry & interactive Python runner | `docs/architecture/system-architecture.md §2.5` | ✅ Complete |
| `/dashboard/targets` | Target inventory + target enrollment modal | `project-ronin-v1-spec.md §1` | ✅ Complete |
| `/dashboard/activity-logs` | Agent trace streaming & `.log` file exporter (no scroll hijacking) | `docs/architecture/system-architecture.md` | ✅ Complete |
| `/dashboard/reports` | Executive audit report & JSON download | `docs/api/output-schema.md` | ✅ Complete |
| `/dashboard/settings` | Ollama LLM + Docker sandbox daemon configuration | `docs/guides/setup-guide.md` | ✅ Complete |

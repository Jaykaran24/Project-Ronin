# ADR-002: CLI-First Architecture

**Status:** Accepted  
**Date:** 2026-08-20  
**Deciders:** Project Ronin Core Team  
**Technical Area:** User Interface & System Interaction  

---

## 1. Context

Project Ronin is designed for security engineers, penetration testers, and backend developers who need to audit APIs quickly, autonomously, and reliably.

To deliver this capability, the team evaluated two foundational interface paradigms:
1. **Web Dashboard First:** A full-stack web application featuring a browser-based UI (e.g., React / Next.js), a backend REST/WebSocket API (FastAPI), database state management, and visual configuration consoles.
2. **CLI First:** A lightweight, terminal-native command-line interface (powered by `typer` and `rich`), accompanied by machine-readable JSON outputs and self-contained static HTML report artifacts.

---

## 2. Decision

We have decided to build a **CLI-first architecture using Python `typer` and `rich` for the V1 release**, deferring a full interactive web dashboard (React/Next.js) to the V2 roadmap.

To satisfy visual reporting requirements without running an active web server, Ronin V1 automatically compiles a standalone, zero-dependency HTML report (`ronin_report.html`) alongside the machine-readable `ronin_report.json` upon scan completion.

```
+------------------------------------------------------------------------------------+
| V1 ARCHITECTURE: CLI-First Workflow                                                |
|                                                                                    |
|   [User Command]                                                                   |
|   $ ronin scan --target https://api.target.com                                     |
|         │                                                                          |
|         ▼                                                                          |
|   ┌────────────────────────────────────────────────────────┐                       |
|   │ Typer CLI + Rich Terminal UI                           │                       |
|   │  • Live progress indicators                            │                       |
|   │  • Multi-agent phase status (Recon → Exploit → Validate)│                       |
|   │  • Formatted terminal summary tables                   │                       |
|   └───────────────────────────┬────────────────────────────┘                       |
|                               │                                                    |
|                               ▼                                                    |
|                      [Scan Artifacts]                                              |
|            ┌──────────────────┴──────────────────┐                                 |
|            ▼                                     ▼                                 |
|   ┌───────────────────────────┐         ┌────────────────────────────┐             |
|   │ ronin_report.json         │         │ ronin_report.html          │             |
|   │ (CI/CD, Automation, SIEM) │         │ (Self-Contained Dashboard) │             |
|   └───────────────────────────┘         └────────────────────────────┘             |
+------------------------------------------------------------------------------------+
```

---

## 3. Rationale & Key Drivers

The decision to prioritize a CLI-first architecture is based on the following key drivers:

### 3.1 Industry Adoption & Competitor Validation
Market analysis of leading security and penetration testing tools (e.g., Strix, Nuclei, Semgrep, Trivy, SQLMap) demonstrates that security professionals overwhelmingly prefer terminal-native tools:
- Developers and security engineers operate primarily in the terminal.
- CLI tools can be installed instantly via package managers (`pip`, `brew`, `docker`) without complex multi-service initialization or browser dependency.

### 3.2 6-Day Development Timeline
Building a secure, polished, and responsive web frontend (including authentication, WebSockets for live agent event streaming, graph visualization, responsive tables, and state synchronization) typically consumes 50–60% of total engineering bandwidth.
- Implementing a robust CLI with `typer` and `rich` requires approximately 1 engineering day.
- This unlocks 5 full days to focus on core scanning intelligence, agent prompt tuning, LangGraph orchestration, AST exploit validation, and sandbox isolation.

### 3.3 CI/CD & Automation Composability
A native CLI seamlessly integrates into modern DevSecOps pipelines, automated bash scripts, cron jobs, and GitHub Actions:
```bash
# Example CI/CD invocation:
ronin scan --target https://staging.internal/api --exit-on-critical
```
- The CLI can return standardized exit codes (`0` for clean, `1` for critical vulnerabilities, `2` for scan errors), making automated pipeline integration trivial.

### 3.4 Hybrid Visual Strategy (Self-Contained HTML Reports)
Users who need visual charts, shareable stakeholder deliverables, and interactive finding breakdowns are served by Ronin's Jinja2-rendered HTML reports:
- Generated as a single, portable HTML file with inline CSS and JavaScript.
- Requires no running web server or open localhost ports to view.
- Provides severity filtering, expandable request/response proof cards, and remediation instructions.

---

## 4. Consequences & Trade-offs

### 4.1 Positive Consequences
- **Rapid Time-to-Ship:** Allows completion of a fully functional product within the 6-day sprint.
- **Minimal Footprint:** No Node.js runtime, npm dependencies, or separate web server processes required.
- **Pipeline Ready:** Native stdout/stderr formatting and JSON export capabilities for seamless tool chaining.
- **High Terminal Ergonomics:** Rich terminal output provides immediate feedback, phase status, and colored severity summaries.

### 4.2 Negative Consequences & Mitigations
- **No Real-Time Browser Dashboard in V1:** Users cannot view live scan graphs in a browser during execution.
  - *Mitigation:* The `rich` CLI displays dynamic terminal spinners, status bars, and formatted tabular summaries.
- **Terminal Familiarity Required:** Users must be comfortable running terminal commands.
  - *Mitigation:* Provide comprehensive CLI help text (`ronin --help`), clear argument validation, and detailed guides.
- **Historical Comparison Limitations:** Multi-scan trend charts across weeks/months are deferred.
  - *Mitigation:* Store all scan runs with structured metadata in MongoDB and `./ronin_runs/` for future V2 web dashboard consumption.

---

## 5. Alternatives Considered

| Alternative | Description | Evaluation & Reason for Rejection |
| :--- | :--- | :--- |
| **Web-First (React / Next.js + FastAPI)** | Full browser-based UI built upfront with WebSocket streaming for agent logs. | **Rejected:** Engineering overhead is prohibitive for a 6-day build. Diverts resources away from scanning accuracy, sandboxing, and agent orchestration. Scheduled for V2. |
| **Embedded Python UI (Streamlit / Gradio)** | Rapid UI built using Python-native dashboard frameworks. | **Rejected:** Introduces heavy runtime dependencies, slow startup times, poor CI/CD composability, and awkward process lifecycle management alongside Docker. |
| **TUI-Only (Textual)** | Full Terminal User Interface with interactive mouse/window navigation in console. | **Rejected for V1:** Adds unnecessary complexity for automated/non-interactive environments compared to straightforward `typer` + `rich` command execution. |

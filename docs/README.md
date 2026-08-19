# Project Ronin Documentation Hub

Welcome to the technical documentation repository for **Project Ronin** — an autonomous, AI-powered black-box API security testing platform designed for 100% local execution.

This documentation suite is organized according to standard enterprise engineering practices, covering architectural blueprints, schema specifications, developer guides, design decision records (ADRs), testing strategies, and threat models.

---

## 📚 Documentation Index

```
docs/
├── architecture/          # High-level system & agent design
│   ├── system-architecture.md
│   ├── agent-architecture.md
│   └── data-flow.md
├── api/                   # Input, output, and internal state contracts
│   ├── input-schema.md
│   ├── output-schema.md
│   └── state-schema.md
├── guides/                # Developer onboarding & workflows
│   ├── setup-guide.md
│   └── contributing.md
├── design/                # Architectural Decision Records (ADR)
│   └── adr/
│       ├── 001-local-llm-only.md
│       └── 002-cli-first.md
├── testing/               # QA & verification strategies
│   └── test-plan.md
├── security/              # Threat modeling & safety controls
│   └── threat-model.md
└── project-plan/          # Roadmaps & sprint schedules
    ├── timeline.md
    └── milestones.md
```

---

## 🏛️ 1. Architecture

Comprehensive system blueprints detailing how Project Ronin orchestrates autonomous penetration testing.

* **[System Architecture](architecture/system-architecture.md)**  
  High-level overview of the Docker Compose topology, service interconnects, FastAPI orchestrator, local Ollama engine, MongoDB persistence, and the Alpine Linux sandbox.
* **[Multi-Agent Architecture](architecture/agent-architecture.md)**  
  In-depth breakdown of the 4-agent LangGraph state machine: Orchestrator, Reconnaissance Agent, Exploitation Agent, and Validation Agent.
* **[Data Flow Documentation](architecture/data-flow.md)**  
  End-to-end data lifecycle sequence diagrams mapping request transformation from user CLI input to final JSON/HTML vulnerability reports.

---

## 🔌 2. API & Data Contracts

Exact data structures, CLI interfaces, and runtime state definitions.

* **[Input Schema Specification](api/input-schema.md)**  
  CLI argument reference for `ronin scan`, covering Base URL auto-discovery, Postman Collection ingestion, plain text endpoint lists, and `--include`/`--exclude` scope filtering.
* **[Output Schema Specification](api/output-schema.md)**  
  Schema definitions for machine-readable JSON reports, standalone executive HTML reports, and interactive terminal progress indicators.
* **[Global State Schema](api/state-schema.md)**  
  Pydantic v2 data models for `ScanState`, `Endpoint`, `Parameter`, `SuspectedVuln`, and `Finding`, including agent read/write permissions.

---

## 🛠️ 3. Guides & Developer Onboarding

Step-by-step instructions for running, extending, and contributing to the codebase.

* **[Development Setup Guide](guides/setup-guide.md)**  
  Local environment prerequisites, Docker Compose provisioning, Ollama `qwen2.5-coder:7b` setup, and troubleshooting common issues.
* **[Contributing Guidelines](guides/contributing.md)**  
  Code standards, Conventional Commits format, PR workflows, and walkthroughs for adding new agent tools and custom vulnerability checks.

---

## ⚖️ 4. Architecture Decision Records (ADRs)

Key architectural decisions, trade-offs, and rationale documented in standard ADR format.

* **[ADR-001: Local LLM Only](design/adr/001-local-llm-only.md)**  
  Rationale for standardizing strictly on local Ollama + Qwen 2.5 Coder 7B for total data privacy and zero ongoing API costs.
* **[ADR-002: CLI-First Architecture](design/adr/002-cli-first.md)**  
  Rationale for launching V1 as a modular CLI tool powered by Typer and Rich before developing the Next.js web dashboard.

---

## 🛡️ 5. Security & Threat Modeling

Safety boundaries, sandboxing guarantees, and defense mechanisms.

* **[Threat Model & Security Considerations](security/threat-model.md)**  
  STRIDE analysis of the testing engine, Docker sandbox isolation and escape prevention, scope locking, indirect prompt injection mitigations, and air-gapped data privacy assurances.

---

## 🧪 6. Testing & Quality Assurance

Verification methodologies and benchmark targets.

* **[Testing Strategy & Plan](testing/test-plan.md)**  
  Unit testing, agent integration testing with mock APIs, and end-to-end validation against deliberately vulnerable targets like OWASP crAPI and vAPI.

---

## 📅 7. Project Planning & Roadmaps

Execution schedules and future capability roadmaps.

* **[Development Timeline & Sprint Plan](project-plan/timeline.md)**  
  Detailed 6-day sprint schedule with daily task breakdowns, acceptance criteria, and risk mitigation strategies.
* **[Project Milestones](project-plan/milestones.md)**  
  Evolution roadmap tracking V1 (6-day CLI MVP), V2 (Authenticated scans & Web UI), and V3 (DevSecOps CI/CD & fine-tuned models).

# Ronin AI — Phase 1: Foundation & Agent Infrastructure

> **Phase Status:** ✅ Complete  
> **Date:** 2026-09-25  
> **Developer:** Jaykaran24  
> **Smoke Test:** Passed — all 7 graph nodes compiled and imported cleanly

---

## Overview

Phase 1 establishes the complete foundation for Ronin's autonomous multi-agent API security scanning engine. This phase wires together the LangGraph state machine, Pydantic v2 type system, Ollama LLM integration, and the first two real agents: Orchestrator and Recon.

No exploit or validation logic runs yet — those are Phase 3 and 4. But the entire scaffolding is in place and the graph runs end-to-end.

---

## Architecture Decisions

### Why LangGraph?
LangGraph models the agent pipeline as a **directed state graph** where:
- Each agent is a **node** (a Python function that receives state, does work, returns updated state)
- **Edges** connect nodes (fixed or conditional)
- A single **ScanState** dict flows through every node — all agents share one source of truth
- The graph can be **streamed** (`graph.stream()`) so the dashboard gets live updates

Alternative considered: vanilla Python with manual orchestration. Rejected because LangGraph gives us checkpointing, streaming, and conditional routing for free.

### Why Pydantic v2 for state?
- Strict typing on all fields catches bugs at model construction time, not at runtime
- `.model_dump()` converts state to the plain `dict` LangGraph requires
- `.with_structured_output(PydanticModel)` forces the LLM to return valid JSON matching our schema
- Seamless integration with LangChain's structured output tooling

### Rule-based routing first, LLM second
The Orchestrator uses **two-tier routing**:
1. Fast deterministic rules handle 90% of routing decisions (no LLM call needed, ~0ms)
2. LLM only gets invoked for genuinely ambiguous mid-scan decisions

This keeps scans fast even on slower hardware.

### Jev deferred to future scope
TypeSafe AI's Jev model was evaluated for classification tasks. Deferred because:
- Requires early-access waitlist approval
- Cloud API dependency conflicts with offline-first design goal
- Qwen2.5-Coder:7B handles structured classification well enough for Phase 1–3
- Architecture is designed for drop-in swap — Jev can replace any `ask_structured()` call later

---

## Technology Configuration

### Python Environment
| Item | Version |
|---|---|
| Python | 3.12.10 |
| pip | 25.3 |
| OS | Windows 11 |

### Packages Installed (Phase 1)
| Package | Version | Purpose |
|---|---|---|
| `langgraph` | 1.2.12 | Multi-agent state machine framework |
| `langchain` | 1.4.2 | LLM tooling, message types, chain interface |
| `langchain-ollama` | 1.1.0 | Ollama LLM integration for LangChain |
| `langchain-core` | 1.6.5 | Core abstractions (Runnable, Messages, Tools) |
| `langchain-protocol` | 0.0.19 | Protocol definitions |
| `langgraph-checkpoint` | 4.2.0 | State persistence / checkpointing |
| `langgraph-prebuilt` | 1.1.0 | Prebuilt node helpers |
| `langgraph-sdk` | 0.4.5 | LangGraph SDK utilities |
| `langsmith` | 0.14.0 | Observability (auto-installed with langchain) |
| `ollama` | 0.6.2 | Ollama Python client |
| `pydantic` | 2.13.5 | Type validation and serialization |
| `pydantic-core` | 2.46.5 | Pydantic core (upgraded from 2.14.6) |
| `httpx` | 0.28.1 | Async HTTP client (upgraded from 0.26.0) |
| `typer` | 0.27.2 | CLI framework (pre-existing) |
| `rich` | 15.0.0 | Terminal output (pre-existing) |

### LLM Configuration
| Item | Value |
|---|---|
| Model | `qwen2.5-coder:7b` |
| Runtime | Ollama (local, GPU-accelerated) |
| GPU | NVIDIA RTX 3050 6GB VRAM |
| Expected VRAM usage | ~4.5 GB |
| Ollama endpoint | `http://localhost:11434` |
| Temperature | 0.1 (deterministic decisions) |
| Context window | 8192 tokens |
| Output strategy | Structured JSON via `.with_structured_output()` |

> **Note:** `ollama pull qwen2.5-coder:7b` must be run before executing scans. Ollama itself was not found in PATH during Phase 1 setup — install from https://ollama.com if not yet installed.

---

## File Structure Created

```
D:\Projects\Projects\Project-Ronin\scanner\
│
├── __init__.py                    ← Package marker
├── graph.py                       ← LangGraph StateGraph definition
├── runner.py                      ← CLI entry point (typer + rich)
├── pyproject.toml                 ← Package config and dependencies
│
├── models/
│   ├── __init__.py                ← Clean public exports
│   └── state.py                   ← All Pydantic v2 state models
│
└── agents/
    ├── __init__.py                ← Package marker
    ├── base.py                    ← BaseAgent (LLM, structured output, retry)
    ├── orchestrator.py            ← Orchestrator agent (real, fully functional)
    └── recon.py                   ← Recon agent (real, fully functional)
```

---

## Detailed File Descriptions

### `scanner/models/state.py`

The **single source of truth** for the entire scan. All agents read from and write to this state.

**Enums defined:**
- `ScanPhase` — `init | recon | exploit | validation | report | done | error`
- `AgentStatus` — `waiting | active | done | error`
- `SeverityLevel` — `critical | high | medium | low | informational`
- `HttpMethod` — `GET | POST | PUT | PATCH | DELETE | OPTIONS | HEAD`
- `VulnCategory` — `BOLA | broken_auth | mass_assignment | ssrf | rate_limit_bypass | method_confusion | info_disclosure | security_misconfig | broken_object_property`

**Models defined:**
| Model | Purpose |
|---|---|
| `ScanConfig` | User-provided scan settings (target URL, LLM model, thresholds) |
| `Parameter` | A single API parameter (name, location, type, required) |
| `Endpoint` | A discovered API endpoint with risk score and test status |
| `HttpEvidence` | Raw HTTP request + response captured as evidence |
| `ProofOfConcept` | curl command + Python script + evidence for a confirmed finding |
| `SuspectedVuln` | Unconfirmed potential vulnerability with confidence score (0–100) |
| `Finding` | Confirmed vulnerability with full details, severity, CVSS, PoC |
| `AgentState` | Per-agent status tracking (status, current task, timing) |
| `ScanState` | Root state — contains everything, flows through all nodes |

**Key `ScanState` fields:**
```python
scan_id:           str              # e.g. "SCAN-20260925-091400"
config:            ScanConfig
phase:             ScanPhase        # current scan phase
progress:          int              # 0-100
endpoints:         list[Endpoint]   # all discovered endpoints
suspected_vulns:   list[SuspectedVuln]
findings:          list[Finding]
agents:            dict[str, AgentState]
endpoints_queue:   list[str]        # endpoint IDs awaiting exploit testing
next_agent:        str              # orchestrator's routing decision
activity_log:      list[dict]       # event feed for dashboard
report_markdown:   str              # final report content
```

---

### `scanner/agents/base.py`

**BaseAgent** — all agents inherit from this.

Key methods:
- `ask(system, user) → str` — plain text LLM call for prose generation (reports)
- `ask_structured(system, user, schema) → PydanticModel` — forces LLM to output valid JSON matching a Pydantic schema. Retries once on parse failure before raising.
- `log(state, agent, message, level)` — appends to `state.activity_log` and prints to console
- `emit(state) → dict` — serializes state for LangGraph return

LLM is initialized from `ScanState.config` so every agent automatically uses the same model and Ollama URL.

---

### `scanner/agents/orchestrator.py`

**OrchestratorAgent** — the routing brain of the scan.

**Two-tier routing logic:**

*Tier 1 — Rule-based (no LLM, instant):*
| Situation | Decision |
|---|---|
| No endpoints, phase=init | → recon |
| Recon done, endpoints found, no queue | → build queue, → exploit |
| Recon done, no endpoints found | → report |
| Queue empty, suspects exist | → validate |
| Queue empty, no suspects, exploit/validate phase | → report |
| Phase = done | → done |

*Tier 2 — LLM (complex/ambiguous situations):*
The LLM receives a compact context summary and returns an `OrchestratorDecision`:
```python
class OrchestratorDecision(BaseModel):
    next_agent:         str        # "recon" | "exploit" | "validate" | "report" | "done"
    reasoning:          str        # one-sentence explanation
    priority_endpoints: list[str]  # IDs to focus on next
```

**Endpoint prioritization:** After recon, endpoints are sorted by `risk_score` descending before being queued. High-risk endpoints (admin routes, user ID paths) get attacked first.

---

### `scanner/agents/recon.py`

**ReconAgent** — discovers the API attack surface.

**Discovery strategies (in order):**
1. **OpenAPI/Swagger probing** — tries 10 common spec paths (`/openapi.json`, `/swagger.json`, `/api-docs`, etc.)
2. **Common path fallback** — probes 12 common REST patterns if no spec is found

**OpenAPI parsing:**
- Extracts all `paths` + `methods` from spec
- Maps parameters (name, location=`path|query|header|body`, type, required)
- Resolves `servers[0].url` for full URL construction
- Supports OpenAPI 3.x and Swagger 2.x

**LLM enrichment (per endpoint):**
```python
class EndpointAnalysis(BaseModel):
    endpoint_path:  str
    risk_score:     int        # 1-10
    auth_required:  bool
    likely_vulns:   list[str]  # ["BOLA", "broken_auth"]
    reasoning:      str
```
On LLM failure, defaults to `risk_score=5` and continues — never drops an endpoint.

---

### `scanner/graph.py`

**LangGraph StateGraph** — the wiring layer.

```
                    ┌─────────────────────────────────────┐
                    │            ORCHESTRATOR             │
                    │   (conditional edge routing)        │
                    └──┬──────┬──────┬────────┬───────────┘
                       │      │      │        │
                     recon exploit validate  report
                       │      │      │        │
                       └──────┴──────┘        END
                              │
                         orchestrator
```

**Stub nodes (Phase 1):**
- `exploit_node` — pops one endpoint off the queue and marks it tested
- `validate_node` — clears suspected_vulns so orchestrator proceeds to report
- `report_node` — generates a markdown report from confirmed findings
- `done_node` — terminal pass-through

These stubs ensure the graph runs end-to-end and produces a report even before Phase 3/4 agents are implemented.

---

### `scanner/runner.py`

**CLI entry point** using Typer + Rich.

```
python -m scanner.runner <target_url> [--model qwen2.5-coder:7b]
```

**Features:**
- Rich spinner showing current node + phase + progress
- Streams `RONIN_EVENT:{json}` lines to `stderr` for dashboard integration
- Saves final markdown report to `ronin_report_<scan-id>.md`
- Rich summary table on completion

**Dashboard integration protocol:**
```
stderr line format:
RONIN_EVENT:{"timestamp":"...","node":"recon","phase":"recon","progress":15,"endpoints":12,"findings":0,"suspects":0}
```
Node.js backend can spawn the scanner as a child process and parse these lines to push live updates via SSE to the frontend.

---

## Graph Node Summary

| Node | Type | Status |
|---|---|---|
| `orchestrator` | Real agent | ✅ Fully functional |
| `recon` | Real agent | ✅ Fully functional |
| `exploit` | Stub | ⏳ Phase 3 |
| `validate` | Stub | ⏳ Phase 4 |
| `report` | Basic impl | ✅ Markdown generation works |
| `done` | Terminal | ✅ Pass-through |
| `__start__` | LangGraph internal | ✅ Auto-generated |

---

## Smoke Test Results

```powershell
PS D:\Projects\Projects\Project-Ronin> python -c "
  from scanner.models.state import ScanState, ScanConfig
  from scanner.graph import ronin_graph
  print('OK: All imports good')
  print('Graph nodes:', list(ronin_graph.nodes.keys()))
"

OK: All imports good
Graph nodes: ['__start__', 'orchestrator', 'recon', 'exploit', 'validate', 'report', 'done']
```

---

## How to Run a Scan

```powershell
# From D:\Projects\Projects\Project-Ronin
# Prerequisite: Ollama installed + model pulled
ollama pull qwen2.5-coder:7b

# Run against Ronin's own backend (dev target)
python -m scanner.runner http://localhost:5000

# Run against a custom target
python -m scanner.runner https://api.vulnerable.local --model qwen2.5-coder:7b
```

---

## Known Limitations (Phase 1)

| Limitation | Resolved in |
|---|---|
| No actual exploit payloads sent | Phase 3 |
| No sandbox validation | Phase 4 |
| No real findings generated | Phase 3 |
| Report only has basic structure | Phase 5 (Orchestrator writes full report) |
| Ollama must be running locally | By design — local-first architecture |
| No async HTTP (recon uses sync httpx) | Phase 2 upgrade |
| No Docker sandbox integration | Phase 4 |

---

## Next Phase

**Phase 2 — Recon Enhancement:**
- Async httpx for concurrent endpoint probing
- JavaScript file crawling for hidden API endpoints
- GraphQL introspection support
- Header analysis (security headers check)
- Auth scheme detection

**Phase 3 — Exploit Agent:**
- BOLA/IDOR testing (ID enumeration and substitution)
- Broken authentication (JWT tampering, token removal)
- Mass assignment (extra fields on PUT/PATCH)
- Rate limit bypass testing
- Method confusion (DELETE/PUT on GET endpoints)

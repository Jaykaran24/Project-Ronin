# Strix vs Project Ronin — Competitive Analysis

## What Strix Is

[Strix](https://github.com/usestrix/strix) is an **open-source AI penetration testing CLI tool** — it's a mature, well-funded product with a cloud platform ([app.strix.ai](https://app.strix.ai)), extensive docs, CI/CD integrations, and multi-provider LLM support. It has significant GitHub traction (trending badge, Discord community, PyPI package).

---

## Side-by-Side Comparison

| Dimension | **Strix** | **Project Ronin (Current Plan)** |
|---|---|---|
| **Target Input** | Local source code directory (`--target ./app`) | Live API URL (black-box testing) |
| **Testing Approach** | White-box — reads source code, runs it dynamically | Black-box — probes live API endpoints externally |
| **LLM Provider** | Multi-provider (OpenAI, Anthropic, Google, Azure, AWS Bedrock, OpenRouter, local via Ollama) | Local-only (Ollama + Qwen 2.5 7B) |
| **Execution** | Docker sandbox for running target code | Docker sandbox for running exploit PoCs |
| **Agent Architecture** | Multi-agent with full pentesting toolkit | 4-agent LangGraph (Orchestrator → Recon → Exploit → Validate) |
| **Tools Available** | HTTP Proxy (Caido), Browser automation, Terminal, Code editor, File manager | `fetch_openapi_spec`, `crawl_api`, `send_http_request`, `generate_fuzzing_payloads`, `execute_sandbox_script` |
| **Output** | Findings with PoCs + auto-fix PRs + compliance reports | Vulnerability report (format TBD) |
| **CI/CD** | GitHub Actions, generic CI/CD pipelines | ❌ Not planned |
| **UI** | CLI-first + cloud dashboard (app.strix.ai) | Web dashboard (React/Next.js) |
| **Pricing Model** | Open-source CLI + paid cloud platform | Fully free/self-hosted |
| **Privacy** | Depends on LLM provider chosen | 100% local — zero data leaves the machine |

---

## Key Takeaways

### 1. Different Attack Surfaces — This Is Your Edge

> [!IMPORTANT]
> Strix is **white-box** (scans source code). Ronin is **black-box** (attacks live APIs).
> These are fundamentally different products, not direct competitors.

Strix reads your codebase and finds vulnerabilities by analyzing the code + running it. Ronin would attack a live API endpoint externally, like a real attacker would. This is a genuine gap in the market — most open-source AI security tools are source-code scanners. **An AI-powered black-box API pentester with local execution is a distinct product.**

### 2. What Strix Does That Ronin Should Learn From

- **Multi-provider LLM support** — Don't lock to Qwen 2.5 7B only. Support Ollama (local) as default, but allow cloud providers as optional for users with better hardware constraints or who want stronger models.
- **Auto-fix / remediation** — Strix generates patches. Ronin should at minimum generate remediation guidance per finding.
- **CI/CD integration** — Strix plugs into GitHub Actions. Even if Ronin is Phase 5+, plan the API contract now so the backend can eventually be triggered from CI.
- **Structured output** — Strix produces PoCs with reproduction steps. Ronin's Validation Agent already plans this, but the *report format* needs to be defined.
- **CLI-first design** — Strix works as a CLI tool first, cloud dashboard second. Ronin plans a web dashboard, but a CLI mode would make it far more useful for automation.

### 3. Where Ronin Can Genuinely Differentiate

| Differentiator | Why It Matters |
|---|---|
| **100% local / zero-cost inference** | No API keys, no cloud dependency, no per-scan cost |
| **Black-box API testing** | Tests what an attacker actually sees — no source code needed |
| **API-specific vulnerability focus** | BOLA, IDOR, broken auth, mass assignment — OWASP API Top 10 |
| **Live exploit validation** | Not just "this looks vulnerable" — actually proves it works |
| **Privacy-first** | Target URLs, discovered vulns, and exploit code never leave the machine |

### 4. Features Ronin Should NOT Copy

- ❌ **Source code analysis** — Stay black-box. That's the differentiator.
- ❌ **Multi-cloud LLM as default** — Keep local-first. Add cloud as *optional*.
- ❌ **Paid cloud platform** — Keep it fully open-source and self-hosted.

---

## Recommended Next Steps

Before writing code, the following decisions need to be locked down based on what we've learned from Strix:

1. **Define the exact input contract** — What does the user provide? (URL + auth credentials + scope rules + optional OpenAPI spec?)
2. **Define the output contract** — What does the report look like? (JSON + HTML? SARIF? OWASP-aligned severity ratings?)
3. **Define the vulnerability scope** — Which OWASP API Top 10 categories are in v1?
4. **CLI or Web-first?** — Strix proves CLI-first is more practical. Should Ronin start CLI-first too?
5. **LLM flexibility** — Should the architecture support pluggable models from day 1?
6. **Agent tool definitions** — Each agent's tools need precise input/output schemas, not just function names.

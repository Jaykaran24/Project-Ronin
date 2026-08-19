# Agent Architecture & Communication Plan
## Project: Localized AI API Security Testing Platform

This document outlines the design and responsibilities of the multi-agent system powering the API testing platform. All agents operate entirely locally using an open-weight LLM via Ollama.

### 1. The Global State (Shared Memory)
Agents do not communicate by simply "chatting." They pass a structured state object (a Python dictionary or Pydantic model) back and forth. This state includes:
*   `target_url`: The base URL of the API.
*   `openapi_spec`: The parsed schema (if available).
*   `discovered_endpoints`: A list of endpoints and accepted methods found during recon.
*   `attack_surface`: Specific parameters or headers identified as potentially vulnerable.
*   `vulnerabilities_found`: A list of validated exploits and PoCs.
*   `current_status`: The phase of the test (Recon, Exploitation, Validation).

---

### 2. The Agent Roster

#### Agent 1: The Orchestrator (Coordinator)
*   **Role:** The manager. It reads the initial user input, initializes the global state, and decides which agent should run next based on the `current_status`.
*   **Capabilities:** State management, task delegation, and final report compilation.
*   **LLM Prompt Focus:** "You are the orchestrator. Review the current state. If recon is needed, route to the Recon Agent. If recon is complete, route the discovered endpoints to the Exploitation Agent. If all endpoints are tested, route to Reporting."

#### Agent 2: The Reconnaissance Agent (Scout)
*   **Role:** Information gathering.
*   **Tools:**
    *   `fetch_openapi_spec(url)`
    *   `crawl_api(url)`
*   **Objective:** Analyze the API structure. If an OpenAPI spec is provided, parse it to extract all routes, expected parameters, and authentication requirements. If no spec is provided, attempt basic crawling/fuzzing to map the API. Update `discovered_endpoints` in the shared state.

#### Agent 3: The Exploitation Agent (Attacker)
*   **Role:** Vulnerability discovery.
*   **Tools:**
    *   `send_http_request(method, url, headers, data)`
    *   `generate_fuzzing_payloads(parameter_type)`
*   **Objective:** Take the `discovered_endpoints` and methodically test them. It focuses on logic flaws (BOLA/IDOR), injection flaws (SQLi/XSS), and misconfigurations. It analyzes the HTTP response codes and body text. If it suspects a vulnerability, it flags it in the `attack_surface` state for validation.

#### Agent 4: The Validation Agent (Verifier)
*   **Role:** False-positive reduction.
*   **Tools:**
    *   `execute_sandbox_script(python_code)`
*   **Objective:** Take suspected vulnerabilities from the Exploitation Agent and attempt to write a standalone, reproducible Python script that exploits it. It sends this script to the locked-down Docker sandbox. If the script successfully triggers the exploit, the vulnerability is added to `vulnerabilities_found`.

---

### 3. Execution Flow (LangGraph Implementation)
The agents will be connected using a directed graph structure (e.g., LangGraph). 

1.  **START** -> Orchestrator
2.  Orchestrator -> Recon Agent
3.  Recon Agent -> Orchestrator (State Updated with Endpoints)
4.  Orchestrator -> Exploitation Agent (Loops per endpoint)
5.  Exploitation Agent -> Validation Agent (If potential flaw found)
6.  Validation Agent -> Exploitation Agent (Returns validation result)
7.  Exploitation Agent -> Orchestrator (When all endpoints tested)
8.  Orchestrator -> **END** (Outputs final report)

### 4. Local Execution Constraints
*   **Context Window:** The local model (e.g., Qwen 2.5 Coder 7B) will have a limited context window. The Orchestrator must prune the global state (e.g., summarizing large API specs) before passing it to specialized agents to avoid memory overflow.
*   **Tool Calling:** The LLM will use specific prompt formatting (like ChatML) to emit JSON-formatted tool calls, which the Python backend will intercept, execute, and return the results as a new system message.

# ADR-001: Local LLM Only (No Cloud Providers)

**Status:** Accepted  
**Date:** 2026-08-20  
**Deciders:** Project Ronin Core Team  
**Technical Area:** AI Inference & LLM Integration  

---

## 1. Context

Project Ronin is an autonomous, AI-driven black-box API security testing CLI designed to identify OWASP API Top 10 vulnerabilities (such as BOLA/IDOR, Broken Authentication, and Security Misconfigurations) in target web services.

The system requires Large Language Model (LLM) capabilities across multiple phases of the scanning lifecycle:
- **Reconnaissance:** Inferring API structure, parameter relationships, and hidden endpoints from partial responses or documentation.
- **Exploitation:** Generating targeted attack payloads (e.g., IDOR permutations, auth header tampering) based on discovered endpoint signatures.
- **Validation:** Synthesizing executable Python Proof-of-Concept (PoC) scripts to verify suspected vulnerabilities inside an isolated sandbox.

To power these agents, two primary architectural pathways were evaluated:
1. **Cloud-Hosted LLM APIs:** Leveraging hosted frontier models such as OpenAI (GPT-4o), Anthropic (Claude 3.5 Sonnet), or Google (Gemini 1.5 Pro).
2. **Local Open-Weights Inference:** Running a locally hosted inference runtime (Ollama) with a code-specialized open-weights model (Qwen 2.5 Coder 7B).

---

## 2. Decision

We have decided to standardise **exclusively on local LLM inference via Ollama running the `qwen2.5-coder:7b` model**, rejecting cloud-based LLM APIs and deferring pluggable multi-provider architectures for the V1 release.

```
+----------------------------------------------------------------------------------+
| V1 DECISION: 100% Local Inference Pipeline                                      |
|                                                                                  |
|   +-------------------+       HTTP (localhost:11434)       +------------------+  |
|   | Ronin Agent Core  | =================================> | Ollama Engine    |  |
|   | (LangGraph Tools) | <================================= | Qwen 2.5 Coder 7B|  |
|   +-------------------+           Local Loopback           +------------------+  |
+----------------------------------------------------------------------------------+
```

---

## 3. Rationale & Key Drivers

The decision is driven by four key constraints and strategic priorities:

### 3.1 Complete Data Privacy & Zero Data Egress
Security testing inherently exposes sensitive enterprise data: private API routes, internal database schemas, customer data snippets returned during BOLA probing, authentication tokens, and zero-day vulnerabilities.
- Transmitting this data to third-party cloud LLM providers creates serious confidentiality, regulatory (GDPR, HIPAA, SOC 2), and security compliance violations.
- Running 100% locally guarantees that zero payload data, API responses, or vulnerability findings ever leave the operator's machine.

### 3.2 Fixed 6-Day Development Timeline
Building a flexible, pluggable multi-provider abstraction layer (supporting OpenAI, Anthropic, Mistral, and Ollama) requires implementing and maintaining provider-specific error handling, rate-limiting retry mechanisms, differing tokenizers, prompt formatting variations, and API key management.
- Standardizing on a single, local Ollama API allows the engineering team to focus 100% of the 6-day build budget on core scanning logic, agent coordination, and exploit accuracy.

### 3.3 Zero Operating Cost
Cloud-based vulnerability scanning incurs unpredictable per-token API costs, especially when agents iterate over dozens of endpoints with extensive response bodies.
- Local inference eliminates ongoing API token costs, subscription tiers, and credit card friction for security engineers and developers.

### 3.4 Model Selection: Why Qwen 2.5 Coder 7B?
Benchmarking against comparable 7B/8B open-weights models (Llama 3.1 8B, DeepSeek Coder 6.7B, Mistral 7B) demonstrated that **Qwen 2.5 Coder 7B** offers:
- Superior Python code generation accuracy (critical for synthesizing executable PoC scripts in the Validation Agent).
- Reliable adherence to rigid JSON schemas and Pydantic-enforced structural outputs.
- Compact memory footprint (~4.7 GB VRAM at 4-bit quantization / Q4_K_M), enabling fluid execution on standard developer workstations (Apple Silicon, NVIDIA RTX, or modern x86 CPUs).

---

## 4. Consequences & Trade-offs

### 4.1 Positive Consequences
- **True Air-Gapped Operation:** Ronin can scan internal, air-gapped, or staging environments without internet connectivity.
- **Architectural Simplicity:** A single, lightweight wrapper client in `core/llm.py` communicates with `http://localhost:11434`.
- **Reproducible Test Environment:** Automated CI and local test fixtures interact with a deterministic local endpoint.

### 4.2 Negative Consequences & Mitigations
- **Hardware Requirements:** Users must have sufficient local resources (minimum 8 GB RAM; dedicated GPU recommended for optimal tokens/sec).
  - *Mitigation:* Document minimal hardware prerequisites; support CPU inference fallback via Ollama.
- **Context Window Constraints:** Local 7B models have practical context limits (optimized for 8k–16k tokens) and may degrade with oversized inputs.
  - *Mitigation:* Implement strict response truncation (capping raw API response bodies at 4 KB before prompting the LLM) and extract only essential structural fields.
- **Model Capability vs. Frontier Cloud Models:** 7B models have less generalized reasoning power than 200B+ cloud models.
  - *Mitigation:* Implement narrow, highly specialized agent prompts, rigid Pydantic schema validation, and deterministic validation via the Docker sandbox.

---

## 5. Alternatives Considered

| Alternative | Description | Evaluation & Reason for Rejection |
| :--- | :--- | :--- |
| **Cloud-Only (OpenAI / Anthropic)** | Direct integration with GPT-4o or Claude 3.5 Sonnet via cloud APIs. | **Rejected:** Direct violation of the zero-telemetry and data privacy requirement. Unacceptable for auditing private internal APIs; exposes users to recurring token costs. |
| **Pluggable Multi-Provider (LiteLLM / Custom Adapter)** | Configurable provider interface allowing users to toggle between Ollama, OpenAI, and Anthropic. | **Rejected for V1:** Too complex for a 6-day build. Provider nuances in function-calling and schema adherence would create broad testing friction. Considered as a candidate for V2 roadmap. |
| **Llama 3.1 8B (Local)** | Running Meta's Llama 3.1 8B Instruct model via Ollama. | **Rejected:** Inferior Python code synthesis for PoC exploit scripts compared to Qwen 2.5 Coder in empirical testing. |

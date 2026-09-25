"""
scanner/agents/orchestrator.py
────────────────────────────────
The Orchestrator agent — the brain of the scan.
Decides what happens next at every step.
"""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field

from scanner.agents.base import BaseAgent
from scanner.models.state import ScanState, ScanPhase, AgentStatus


# ── Structured output schema for Orchestrator decisions ──────────────────────

class OrchestratorDecision(BaseModel):
    """What the Orchestrator LLM decides to do next."""
    next_agent:     str   = Field(description="One of: recon, exploit, validate, report, done")
    reasoning:      str   = Field(description="One sentence explaining the decision")
    priority_endpoints: list[str] = Field(
        default=[],
        description="Endpoint IDs to prioritize in the next exploit run (if next_agent=exploit)"
    )


SYSTEM_PROMPT = """You are the Orchestrator for Ronin — an autonomous API security scanner.
Your job is to coordinate the scan by deciding which agent runs next.

Available agents:
- recon     : Discovers API endpoints and attack surface
- exploit   : Tests endpoints for OWASP API vulnerabilities  
- validate  : Confirms suspected vulnerabilities in an isolated sandbox
- report    : Generates the final security report
- done      : Terminates the scan

Decision rules:
1. Always start with recon if no endpoints have been discovered yet.
2. After recon, move to exploit if endpoints were found.
3. After each exploit result, check if there are suspected vulns that need validation.
4. Move to validate if suspected_vulns exist and none have been validated yet.
5. Move to report when all endpoints are tested and all suspects are validated.
6. Move to done after report is generated.
7. If an error occurs 3 times in a row, move to report early.

Always respond with valid JSON matching the schema."""


class OrchestratorAgent(BaseAgent):
    name = "orchestrator"

    def run(self, state_dict: dict) -> dict:
        """
        LangGraph node function.
        Receives the full scan state as a dict, returns updated dict.
        """
        state = ScanState(**state_dict)

        # Mark orchestrator as active
        state.agents["orchestrator"].status = AgentStatus.ACTIVE
        state.agents["orchestrator"].current_task = "Deciding next step"
        state.agents["orchestrator"].started_at = datetime.utcnow().isoformat()

        self.log(state, "orchestrator", f"Phase: {state.phase.value} | Endpoints: {len(state.endpoints)} | Suspects: {len(state.suspected_vulns)} | Findings: {len(state.findings)}")

        # ── Fast rule-based routing (no LLM needed for obvious cases) ──────────
        decision = self._rule_based_route(state)

        if decision is None:
            # ── Ask the LLM for a nuanced decision ──────────────────────────
            context = self._build_context(state)
            try:
                decision = self.ask_structured(
                    system=SYSTEM_PROMPT,
                    user=context,
                    schema=OrchestratorDecision,
                )
                self.log(state, "orchestrator", f"LLM decision → {decision.next_agent}: {decision.reasoning}")
            except Exception as e:
                self.log(state, "orchestrator", f"LLM error, defaulting to recon: {e}", level="warn")
                decision = OrchestratorDecision(next_agent="recon", reasoning="LLM unavailable, defaulting")

        # ── Apply decision to state ────────────────────────────────────────────
        state.next_agent = decision.next_agent

        # Update phase
        phase_map = {
            "recon":    ScanPhase.RECON,
            "exploit":  ScanPhase.EXPLOIT,
            "validate": ScanPhase.VALIDATION,
            "report":   ScanPhase.REPORT,
            "done":     ScanPhase.DONE,
        }
        if decision.next_agent in phase_map:
            state.phase = phase_map[decision.next_agent]

        # Priority queue from LLM suggestion
        if decision.priority_endpoints:
            state.endpoints_queue = decision.priority_endpoints

        state.agents["orchestrator"].status = AgentStatus.DONE
        state.agents["orchestrator"].finished_at = datetime.utcnow().isoformat()
        state.agents["orchestrator"].current_task = f"Routed to {decision.next_agent}"

        return state.model_dump()

    def _rule_based_route(self, state: ScanState) -> OrchestratorDecision | None:
        """
        Fast deterministic routing — no LLM needed for obvious cases.
        Returns None if the situation is ambiguous and needs LLM reasoning.
        """
        # No endpoints yet → always recon first
        if not state.endpoints and state.phase == ScanPhase.INIT:
            return OrchestratorDecision(
                next_agent="recon",
                reasoning="No endpoints discovered yet. Starting reconnaissance."
            )

        # Recon just finished → build exploit queue and move to exploit
        if state.phase == ScanPhase.RECON and state.endpoints and not state.endpoints_queue:
            # Queue all discovered endpoint IDs, sorted by risk_score descending
            sorted_ids = [
                ep.id for ep in sorted(state.endpoints, key=lambda e: e.risk_score, reverse=True)
            ]
            state.endpoints_queue = sorted_ids
            return OrchestratorDecision(
                next_agent="exploit",
                reasoning=f"Recon complete. Queued {len(sorted_ids)} endpoints for exploit testing."
            )

        # No endpoints found at all → skip to report
        if state.phase == ScanPhase.RECON and not state.endpoints:
            return OrchestratorDecision(
                next_agent="report",
                reasoning="Recon found no endpoints. Generating empty report."
            )

        # Queue exhausted, suspects exist → validate
        if not state.endpoints_queue and state.suspected_vulns:
            unvalidated = [s for s in state.suspected_vulns if s.confidence > 0]
            if unvalidated:
                return OrchestratorDecision(
                    next_agent="validate",
                    reasoning=f"{len(unvalidated)} suspected vulnerabilities need validation."
                )

        # Everything done → report
        if not state.endpoints_queue and not state.suspected_vulns and state.phase in (
            ScanPhase.EXPLOIT, ScanPhase.VALIDATION
        ):
            return OrchestratorDecision(
                next_agent="report",
                reasoning="All endpoints tested, all suspects resolved. Generating report."
            )

        # Scan already done
        if state.phase == ScanPhase.DONE:
            return OrchestratorDecision(next_agent="done", reasoning="Scan complete.")

        return None  # Let the LLM decide

    def _build_context(self, state: ScanState) -> str:
        """Build a compact context summary for the LLM."""
        return f"""Current scan state:
- Target: {state.config.target_url}
- Phase: {state.phase.value}
- Endpoints discovered: {len(state.endpoints)}
- Endpoints in queue: {len(state.endpoints_queue)}
- Suspected vulnerabilities: {len(state.suspected_vulns)}
- Confirmed findings: {len(state.findings)}
- Progress: {state.progress}%

Recent activity:
{self._last_log_lines(state, 5)}

Decide what the next agent should be."""

    @staticmethod
    def _last_log_lines(state: ScanState, n: int) -> str:
        recent = state.activity_log[-n:] if state.activity_log else []
        return "\n".join(f"  [{e['agent']}] {e['message']}" for e in recent) or "  (none)"


# ── LangGraph node wrapper ────────────────────────────────────────────────────

def orchestrator_node(state: dict) -> dict:
    """Thin wrapper so LangGraph can call the agent as a plain function."""
    agent = OrchestratorAgent(ScanState(**state))
    return agent.run(state)

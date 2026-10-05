"""
scanner/graph.py
─────────────────
Builds and returns the compiled LangGraph StateGraph.
This is the wiring that connects all agents.
"""

from __future__ import annotations

from typing import Literal
from langgraph.graph import StateGraph, END

from scanner.agents.orchestrator import orchestrator_node
from scanner.agents.recon        import recon_node
from scanner.agents.exploit      import exploit_node
from scanner.agents.validate     import validate_node
from scanner.models.state        import ScanPhase



# ── Router: reads next_agent from state, returns edge label ──────────────────

def route_from_orchestrator(state: dict) -> Literal["recon", "exploit", "validate", "report", "done"]:
    """
    Conditional edge function — decides which node to go to after
    the Orchestrator runs.
    """
    next_agent = state.get("next_agent", "recon")

    valid = {"recon", "exploit", "validate", "report", "done"}
    if next_agent not in valid:
        return "recon"

    return next_agent  # type: ignore


def route_after_recon(state: dict) -> Literal["orchestrator"]:
    """After recon, always return to orchestrator to decide next step."""
    return "orchestrator"


# ── Report Node ─────────────────────────────────────────────────────────────


def report_node(state: dict) -> dict:
    """Generates a markdown report from confirmed findings."""
    from scanner.models.state import ScanState, ScanPhase
    from datetime import datetime
    s = ScanState(**state)
    print("[REPORT] Generating report...")

    lines = [
        f"# Ronin Security Report",
        f"**Scan ID:** {s.scan_id}",
        f"**Target:** {s.config.target_url}",
        f"**Date:** {s.started_at}",
        "",
        f"## Summary",
        f"- Endpoints discovered: {len(s.endpoints)}",
        f"- Findings: {len(s.findings)}",
        "",
        f"## Discovered Attack Surface ({len(s.endpoints)} Endpoints)",
        "",
    ]

    if not s.endpoints:
        lines.append("*No endpoints discovered.*")
        lines.append("")
    else:
        lines.append("| # | Method | Path | Risk Score | Auth Req | Status | Tags |")
        lines.append("| -: | :--- | :--- | :---: | :---: | :---: | :--- |")
        sorted_endpoints = sorted(s.endpoints, key=lambda ep: (ep.risk_score, ep.path), reverse=True)
        for idx, ep in enumerate(sorted_endpoints, 1):
            auth_str = "Yes" if ep.auth_required else "No"
            status_str = "Audited" if ep.tested else "Discovered"
            tags_str = ", ".join(f"`{t}`" for t in ep.tags) if ep.tags else "—"
            lines.append(f"| {idx} | `{ep.method.value}` | `{ep.path}` | {ep.risk_score}/10 | {auth_str} | {status_str} | {tags_str} |")
        lines.append("")

    lines.append("## Findings")
    if not s.findings:
        lines.append("No vulnerabilities confirmed in this scan.")
    else:
        for f in s.findings:
            lines.append(f"### [{f.severity.value.upper()}] {f.title}")
            lines.append(f"- **Category:** {f.category.value}")
            lines.append(f"- **Description:** {f.description}")
            lines.append(f"- **Remediation:** {f.remediation}")
            lines.append("")

    s.report_markdown = "\n".join(lines)
    s.phase = ScanPhase.DONE
    s.scan_complete = True
    s.progress = 100
    s.finished_at = datetime.utcnow().isoformat()
    print("[REPORT] Done.")
    return s.model_dump()


def done_node(state: dict) -> dict:
    """Terminal node — just passes state through."""
    return state


# ── Conditional routing after orchestrator ────────────────────────────────────

def route_after_exploit(state: dict) -> Literal["orchestrator"]:
    return "orchestrator"


def route_after_validate(state: dict) -> Literal["orchestrator"]:
    return "orchestrator"


# ── Build the graph ───────────────────────────────────────────────────────────

def build_graph():
    """
    Constructs and compiles the Ronin agent graph.

    Flow:
        orchestrator ──(conditional)──► recon ──► orchestrator
                                    ├──► exploit ──► orchestrator
                                    ├──► validate ──► orchestrator
                                    ├──► report ──► END
                                    └──► done ──► END
    """
    # Use a plain dict as state (LangGraph requirement)
    graph = StateGraph(dict)

    # Add all nodes
    graph.add_node("orchestrator", orchestrator_node)
    graph.add_node("recon",        recon_node)
    graph.add_node("exploit",      exploit_node)
    graph.add_node("validate",     validate_node)
    graph.add_node("report",       report_node)
    graph.add_node("done",         done_node)

    # Entry point
    graph.set_entry_point("orchestrator")

    # Conditional routing from orchestrator
    graph.add_conditional_edges(
        "orchestrator",
        route_from_orchestrator,
        {
            "recon":    "recon",
            "exploit":  "exploit",
            "validate": "validate",
            "report":   "report",
            "done":     "done",
        }
    )

    # All agents loop back to orchestrator (except report and done)
    graph.add_edge("recon",     "orchestrator")
    graph.add_edge("exploit",   "orchestrator")
    graph.add_edge("validate",  "orchestrator")

    # Terminal edges
    graph.add_edge("report", END)
    graph.add_edge("done",   END)

    return graph.compile()


# Singleton compiled graph
ronin_graph = build_graph()

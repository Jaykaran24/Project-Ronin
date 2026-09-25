"""
scanner/runner.py
──────────────────
Entry point for a Ronin scan.
Usage: python -m scanner.runner --target https://api.example.com
"""

from __future__ import annotations

import json
import sys
from datetime import datetime

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from scanner.graph import ronin_graph
from scanner.models.state import ScanState, ScanConfig

app     = typer.Typer(help="Ronin AI Scanner — Phase 1")
console = Console()


def run_scan(target: str, model: str = "qwen2.5-coder:7b") -> ScanState:
    """Execute a full scan and return the final state."""

    config = ScanConfig(
        target_url=target,
        target_name=target,
        llm_model=model,
    )
    state = ScanState(config=config)
    initial = state.model_dump()

    console.print(Panel(
        f"[bold cyan]RONIN[/] Autonomous API Scanner\n"
        f"[dim]Target:[/] {target}\n"
        f"[dim]Model:[/]  {model}\n"
        f"[dim]Scan ID:[/] {state.scan_id}",
        border_style="cyan",
    ))

    final_state_dict: dict = {}

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
        transient=True,
    ) as progress:
        task = progress.add_task("Running agents...", total=None)

        # Stream events from the graph
        for event in ronin_graph.stream(initial, stream_mode="updates"):
            for node_name, node_output in event.items():
                phase    = node_output.get("phase", "?")
                prog     = node_output.get("progress", 0)
                progress.update(task, description=f"[cyan]{node_name}[/] | Phase: {phase} | {prog}%")

                # Emit JSON line to stdout for dashboard integration
                emit = {
                    "timestamp":  datetime.utcnow().isoformat(),
                    "node":       node_name,
                    "phase":      phase,
                    "progress":   prog,
                    "endpoints":  len(node_output.get("endpoints", [])),
                    "findings":   len(node_output.get("findings", [])),
                    "suspects":   len(node_output.get("suspected_vulns", [])),
                }
                print(f"RONIN_EVENT:{json.dumps(emit)}", file=sys.stderr)

                final_state_dict = node_output

    return ScanState(**final_state_dict) if final_state_dict else state


def print_report(final: ScanState) -> None:
    """Print a Rich-formatted summary table."""
    console.print()

    # Stats table
    table = Table(title=f"Scan Complete — {final.scan_id}", border_style="cyan")
    table.add_column("Metric",  style="dim")
    table.add_column("Value",   style="bold")
    table.add_row("Target",            final.config.target_url)
    table.add_row("Endpoints found",   str(len(final.endpoints)))
    table.add_row("Findings",          str(len(final.findings)))
    table.add_row("Progress",          f"{final.progress}%")
    console.print(table)

    # Findings
    if final.findings:
        console.print("\n[bold red]Confirmed Findings:[/]")
        for f in final.findings:
            console.print(f"  [{f.severity.value.upper()}] {f.title} — {f.category.value}")
    else:
        console.print("\n[green]No vulnerabilities confirmed.[/]")

    # Save report
    if final.report_markdown:
        out = f"ronin_report_{final.scan_id}.md"
        with open(out, "w", encoding="utf-8") as fh:
            fh.write(final.report_markdown)
        console.print(f"\n[dim]Report saved → {out}[/]")


@app.command()
def scan(
    target: str = typer.Argument(..., help="Target base URL e.g. http://localhost:5000"),
    model:  str = typer.Option("qwen2.5-coder:7b", "--model", "-m", help="Ollama model to use"),
):
    """Run a full Ronin scan against a target API."""
    final = run_scan(target, model)
    print_report(final)


if __name__ == "__main__":
    app()

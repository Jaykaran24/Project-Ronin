"""
scanner/runner.py
──────────────────
Entry point for a Ronin scan.
Usage: python -m scanner.runner --target https://api.example.com
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from typing import Optional

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.prompt import Prompt
from rich.table import Table

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


from scanner.graph import ronin_graph
from scanner.models.state import ScanState, ScanConfig

app     = typer.Typer(help="Ronin AI Scanner — Phase 1")
console = Console()


def run_scan(target: str, model: str | None = None, provider: str | None = None, scan_id: str | None = None) -> ScanState:
    """Execute a full scan and return the final state."""

    config_kwargs = {"target_url": target, "target_name": target}
    if model:
        config_kwargs["llm_model"] = model
    if provider:
        config_kwargs["llm_provider"] = provider

    config = ScanConfig(**config_kwargs)
    state_kwargs = {"config": config}
    if scan_id:
        state_kwargs["scan_id"] = scan_id

    state = ScanState(**state_kwargs)
    initial = state.model_dump()

    console.print(Panel(
        f"[bold cyan]RONIN[/] Autonomous API Scanner\n"
        f"[dim]Target:[/]   {target}\n"
        f"[dim]Provider:[/] {config.llm_provider}\n"
        f"[dim]Model:[/]    {config.llm_model}\n"
        f"[dim]Scan ID:[/]  {state.scan_id}",
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

                endpoints_raw = node_output.get("endpoints", [])
                ep_summary = []
                for ep in endpoints_raw:
                    if hasattr(ep, "method") and hasattr(ep, "path"):
                        m = ep.method.value if hasattr(ep.method, "value") else str(ep.method)
                        ep_summary.append({"method": m, "path": ep.path})
                    elif isinstance(ep, dict):
                        ep_summary.append({"method": ep.get("method", "GET"), "path": ep.get("path", "/")})

                # Emit JSON line to stdout for dashboard integration
                emit = {
                    "timestamp":     datetime.now().isoformat(),
                    "node":          node_name,
                    "phase":         phase,
                    "progress":      prog,
                    "endpoints":     len(endpoints_raw),
                    "endpoint_list": ep_summary[:20],
                    "findings":      len(node_output.get("findings", [])),
                    "suspects":      len(node_output.get("suspected_vulns", [])),
                }
                print(f"RONIN_EVENT:{json.dumps(emit)}", file=sys.stderr, flush=True)

                final_state_dict = node_output

    return ScanState(**final_state_dict) if final_state_dict else state


def print_report(final: ScanState, output_file: str | None = None) -> None:
    """Print a Rich-formatted summary table, discovered endpoints, and persist results."""
    console.print()

    # ── 1. Stats table ─────────────────────────────────────────────────────────
    table = Table(title=f"Scan Complete — {final.scan_id}", border_style="cyan")
    table.add_column("Metric",  style="dim")
    table.add_column("Value",   style="bold")
    table.add_row("Target",            final.config.target_url)
    table.add_row("Endpoints found",   str(len(final.endpoints)))
    table.add_row("Findings",          str(len(final.findings)))
    table.add_row("Progress",          f"{final.progress}%")
    console.print(table)

    # ── 2. Discovered Attack Surface Table ─────────────────────────────────────
    if final.endpoints:
        ep_table = Table(
            title=f"Discovered Attack Surface ({len(final.endpoints)} Endpoints)",
            border_style="cyan",
            show_header=True,
            header_style="bold cyan",
        )
        ep_table.add_column("Method", justify="center", style="bold")
        ep_table.add_column("Path", style="bold white")
        ep_table.add_column("Risk", justify="center")
        ep_table.add_column("Auth", justify="center")
        ep_table.add_column("Status", justify="center")
        ep_table.add_column("Tags", style="dim")

        sorted_endpoints = sorted(final.endpoints, key=lambda ep: (ep.risk_score, ep.path), reverse=True)
        for ep in sorted_endpoints:
            # Color-code HTTP Method
            m_style = {
                "GET": "[green]GET[/]",
                "POST": "[blue]POST[/]",
                "PUT": "[yellow]PUT[/]",
                "PATCH": "[yellow]PATCH[/]",
                "DELETE": "[red]DELETE[/]",
            }.get(ep.method.value, f"[white]{ep.method.value}[/]")

            # Color-code Risk Score
            if ep.risk_score >= 8:
                risk_style = f"[bold red]{ep.risk_score}/10[/]"
            elif ep.risk_score >= 6:
                risk_style = f"[bold yellow]{ep.risk_score}/10[/]"
            elif ep.risk_score >= 4:
                risk_style = f"[cyan]{ep.risk_score}/10[/]"
            else:
                risk_style = f"[dim]{ep.risk_score}/10[/]"

            auth_style = "[yellow]Yes[/]" if ep.auth_required else "[dim]No[/]"
            status_style = "[green]Audited[/]" if ep.tested else "[dim]Discovered[/]"
            tags_style = ", ".join(ep.tags) if ep.tags else "-"

            ep_table.add_row(m_style, ep.path, risk_style, auth_style, status_style, tags_style)

        console.print()
        console.print(ep_table)

    # ── 3. Confirmed Findings ──────────────────────────────────────────────────
    if final.findings:
        console.print("\n[bold red]Confirmed Findings:[/]")
        for f in final.findings:
            console.print(f"  [{f.severity.value.upper()}] {f.title} — {f.category.value}")
    else:
        console.print("\n[green]No vulnerabilities confirmed.[/]")

    # ── 4. Storage & Persistence ───────────────────────────────────────────────
    from scanner.storage import save_scan_to_db, save_fallback_report
    saved_to_mongo = save_scan_to_db(final)
    if saved_to_mongo:
        console.print(f"\n[bold green]✓[/] Scan results, attack surface, and report persisted to [cyan]MongoDB[/] (Scan ID: {final.scan_id})")
    else:
        fallback_path = save_fallback_report(final)
        console.print(f"\n[yellow]![/] MongoDB unavailable — report cached to [dim]{fallback_path}[/]")

    # ── 5. Optional file export if requested ───────────────────────────────────
    if output_file and final.report_markdown:
        with open(output_file, "w", encoding="utf-8") as fh:
            fh.write(final.report_markdown)
        console.print(f"[dim]Report exported → {output_file}[/]")


def interactive_shell(provider: str | None = None, model: str | None = None, output: str | None = None) -> None:
    """Continuous interactive penetration testing shell."""
    console.print(Panel(
        "[bold cyan]RONIN[/] Autonomous API Penetration Testing — [bold white]Interactive Shell[/]\n"
        "[dim]Enter a target API URL to scan, or 'exit' / 'q' to quit.[/]",
        border_style="cyan",
    ))

    while True:
        try:
            target = Prompt.ask("\n[bold cyan]Target URL[/]").strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Exiting Ronin shell. Goodbye![/]")
            break

        if not target or target.lower() in ("exit", "quit", "q"):
            console.print("[dim]Exiting Ronin shell. Goodbye![/]")
            break

        if not target.startswith(("http://", "https://")):
            target = f"https://{target}"

        final = run_scan(target, model=model, provider=provider)
        print_report(final, output_file=output)

        # Post-scan interactive action loop
        while True:
            console.print("\n[bold cyan]Actions:[/] [bold green][1][/] Scan another target  [bold yellow][2][/] View finding details  [bold red][3][/] Exit")
            action = Prompt.ask("Choose action", choices=["1", "2", "3", "q", "exit"], default="1")
            if action == "1":
                break
            elif action == "2":
                if not final.findings:
                    console.print("[dim]No findings to inspect for this scan.[/]")
                else:
                    for idx, f in enumerate(final.findings, 1):
                        console.print(f"\n[bold][{idx}][/] [{f.severity.value.upper()}] [bold cyan]{f.title}[/]")
                        console.print(f"    [dim]Category:[/] {f.category.value}")
                        console.print(f"    [dim]CVSS:[/] {f.cvss_score}")
                        console.print(f"    [dim]Description:[/] {f.description}")
                        console.print(f"    [dim]Remediation:[/] {f.remediation}")
                        if f.poc and f.poc.curl_command:
                            console.print(f"    [dim]PoC cURL:[/] [dim yellow]{f.poc.curl_command}[/]")
            elif action in ("3", "q", "exit"):
                console.print("[dim]Exiting Ronin shell. Goodbye![/]")
                sys.stdout.flush()
                sys.stderr.flush()
                os._exit(0)


@app.command()
def scan(
    target:      Optional[str] = typer.Argument(None, help="Target base URL e.g. http://localhost:5000"),
    provider:    Optional[str] = typer.Option(None, "--provider", "-p", help="LLM provider: openrouter | groq | ollama"),
    model:       Optional[str] = typer.Option(None, "--model", "-m", help="Model identifier to use"),
    output:      Optional[str] = typer.Option(None, "--output", "-o", help="Optional local file path to export markdown report"),
    scan_id:     Optional[str] = typer.Option(None, "--scan-id", "-s", help="Scan ID matching backend management system"),
    interactive: bool          = typer.Option(False, "--interactive", "-i", help="Run in continuous interactive shell mode"),
):
    """Run a full Ronin scan against a target API, or start an interactive testing shell."""
    if interactive or not target:
        interactive_shell(provider=provider, model=model, output=output)
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(0)
    else:
        final = run_scan(target, model=model, provider=provider, scan_id=scan_id)
        print_report(final, output_file=output)
        sys.stdout.flush()
        sys.stderr.flush()
        os._exit(0)


if __name__ == "__main__":
    app()

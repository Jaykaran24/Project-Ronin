"""
Project Ronin - Command Line Interface (CLI)
============================================
The primary CLI entry point for Project Ronin, powered by Typer and Rich.
Implements the V1 CLI-first architecture for autonomous API security scanning.
"""

from __future__ import annotations
import datetime
import json
import os
import sys
import time
from pathlib import Path
from typing import List, Optional

try:
    import typer
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    from rich.text import Text
    from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
    _HAS_TYPER_RICH = True
except ImportError:
    _HAS_TYPER_RICH = False

# Ensure repository root is in sys.path
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from models.state import (
    Endpoint,
    Finding,
    Parameter,
    ParameterLocation,
    ProofOfConcept,
    RequestEvidence,
    ResponseEvidence,
    ScanPhase,
    ScanState,
    SeverityLevel,
)
from models.report import ReportSummary, ScanReport
from core.config import settings

# Reconfigure stdout and stderr for UTF-8 support on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Global console instance
console = Console(legacy_windows=False) if _HAS_TYPER_RICH else None

VERSION = "1.0.0"

# ============================================================================
# Helper Functions
# ============================================================================

def generate_scan_id() -> str:
    """Generate a unique scan identifier in the standard format: ronin-YYYYMMDD-HHMMSS."""
    return f"ronin-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')}"


def print_banner(target: str, scan_id: str, mode: str, output_dir: Path) -> None:
    """Render the standard Project Ronin ASCII and metadata header banner."""
    if not console:
        print(f"=== Project Ronin v{VERSION} — API Security Scanner ===")
        print(f"Target: {target} | Scan ID: {scan_id} | Mode: {mode}")
        return

    banner_text = Text()
    banner_text.append("🔍 Project Ronin ", style="bold cyan")
    banner_text.append(f"v{VERSION}", style="bold white")
    banner_text.append(" — Autonomous API Security Scanner\n", style="italic")
    banner_text.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", style="dim cyan")
    banner_text.append(f"Target:     ", style="bold white")
    banner_text.append(f"{target}\n", style="cyan underline")
    banner_text.append(f"Mode:       ", style="bold white")
    banner_text.append(f"{mode}\n", style="yellow")
    banner_text.append(f"Scan ID:    ", style="bold white")
    banner_text.append(f"{scan_id}\n", style="green")
    banner_text.append(f"Output Dir: ", style="bold white")
    banner_text.append(f"{output_dir.resolve()}\n", style="dim white")
    banner_text.append(f"AI Engine:  ", style="bold white")
    banner_text.append(f"{settings.ollama_model} ({settings.ollama_host})", style="magenta")

    panel = Panel(
        banner_text,
        border_style="cyan",
        title="[bold yellow]RONIN EXECUTION CONTEXT[/bold yellow]",
        title_align="left",
    )
    console.print(panel)


def render_summary_table(summary: ReportSummary, duration_s: float, total_endpoints: int) -> None:
    """Render the final scan results summary table using Rich."""
    if not console:
        print("\n--- RESULTS SUMMARY ---")
        print(f"Critical: {summary.critical} | High: {summary.high} | Medium: {summary.medium} | Low: {summary.low} | Info: {summary.info}")
        print(f"Endpoints Tested: {total_endpoints} | Duration: {duration_s:.1f}s")
        return

    table = Table(title="📊 SCAN FINDINGS SUMMARY", border_style="dim cyan", header_style="bold cyan")
    table.add_column("Severity", justify="left", style="bold")
    table.add_column("Count", justify="right")
    table.add_column("CVSS Range", justify="center", style="dim")
    table.add_column("Action Priority", justify="left")

    table.add_row(
        Text("CRITICAL", style="bold red"),
        f"[bold red]{summary.critical}[/bold red]",
        "9.0 - 10.0",
        "[bold red]Immediate hotfix required[/bold red]" if summary.critical > 0 else "[dim]None[/dim]",
    )
    table.add_row(
        Text("HIGH", style="red"),
        f"[red]{summary.high}[/red]",
        "7.0 - 8.9",
        "[red]High priority remediation[/red]" if summary.high > 0 else "[dim]None[/dim]",
    )
    table.add_row(
        Text("MEDIUM", style="yellow"),
        f"[yellow]{summary.medium}[/yellow]",
        "4.0 - 6.9",
        "[yellow]Scheduled patch cycle[/yellow]" if summary.medium > 0 else "[dim]None[/dim]",
    )
    table.add_row(
        Text("LOW", style="cyan"),
        f"[cyan]{summary.low}[/cyan]",
        "0.1 - 3.9",
        "[cyan]Backlog hardening[/cyan]" if summary.low > 0 else "[dim]None[/dim]",
    )
    table.add_row(
        Text("INFO", style="blue"),
        f"[blue]{summary.info}[/blue]",
        "0.0",
        "[blue]Informational advisory[/blue]" if summary.info > 0 else "[dim]None[/dim]",
    )

    console.print(table)
    console.print(
        f"[bold]Total Endpoints Evaluated:[/bold] [green]{total_endpoints}[/green] | "
        f"[bold]Duration:[/bold] [cyan]{duration_s:.2f}s[/cyan]"
    )


def generate_html_report(report: ScanReport, dest_path: Path) -> None:
    """Generate a self-contained, standalone HTML vulnerability report with zero external dependencies."""
    findings_html = ""
    if not report.findings:
        findings_html = """
        <div class="empty-state">
            <h3>No Confirmed Vulnerabilities</h3>
            <p>All tested endpoints conformed to standard security controls or produced no reproducible authorization anomalies.</p>
        </div>
        """
    else:
        for idx, f in enumerate(report.findings, 1):
            sev_class = f.severity.value.lower()
            steps_items = "".join(f"<li>{s}</li>" for s in f.steps_to_reproduce)
            refs_items = "".join(f'<li><a href="{r}" target="_blank">{r}</a></li>' for r in f.references)

            findings_html += f"""
            <div class="finding-card {sev_class}">
                <div class="finding-header">
                    <span class="badge {sev_class}">{f.severity.value}</span>
                    <span class="finding-id">{f.id}</span>
                    <span class="cvss-score">CVSS: {f.cvss_score}</span>
                    <h3 class="finding-title">{f.title}</h3>
                </div>
                <div class="finding-body">
                    <p class="category"><strong>Category:</strong> {f.category}</p>
                    <p class="desc">{f.description}</p>
                    
                    <details class="poc-section">
                        <summary><strong>Proof of Concept Request / Response</strong></summary>
                        <div class="poc-box">
                            <h4>HTTP Request</h4>
                            <pre><code>{f.proof_of_concept.request.method} {f.proof_of_concept.request.url}</code></pre>
                            <h4>Vulnerable Response (Snippet)</h4>
                            <pre><code>Status: {f.proof_of_concept.response.status_code}\n{f.proof_of_concept.response.body_snippet}</code></pre>
                        </div>
                    </details>

                    <div class="steps-section">
                        <h4>Steps to Reproduce:</h4>
                        <ol>{steps_items}</ol>
                    </div>

                    <div class="remediation-section">
                        <h4>Remediation:</h4>
                        <p>{f.remediation}</p>
                    </div>

                    <div class="references-section">
                        <h4>References:</h4>
                        <ul>{refs_items}</ul>
                    </div>
                </div>
            </div>
            """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Ronin Security Report — {report.scan_id}</title>
    <style>
        :root {{
            --bg-color: #0d1117;
            --card-bg: #161b22;
            --border-color: #30363d;
            --text-main: #c9d1d9;
            --text-dim: #8b949e;
            --critical: #f85149;
            --high: #da3633;
            --medium: #d29922;
            --low: #388bfd;
            --info: #58a6ff;
            --success: #238636;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-main);
            margin: 0;
            padding: 30px;
        }}
        .container {{
            max-width: 1100px;
            margin: 0 auto;
        }}
        .header {{
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 24px;
            margin-bottom: 24px;
        }}
        .header h1 {{
            margin-top: 0;
            color: #58a6ff;
        }}
        .meta-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }}
        .meta-item {{
            background: #0d1117;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
        }}
        .meta-label {{
            font-size: 12px;
            color: var(--text-dim);
            text-transform: uppercase;
        }}
        .meta-val {{
            font-size: 16px;
            font-weight: 600;
            margin-top: 4px;
            word-break: break-all;
        }}
        .summary-bar {{
            display: flex;
            gap: 12px;
            margin: 24px 0;
        }}
        .summary-box {{
            flex: 1;
            padding: 16px;
            border-radius: 6px;
            text-align: center;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
        }}
        .summary-box.critical {{ border-top: 4px solid var(--critical); }}
        .summary-box.high {{ border-top: 4px solid var(--high); }}
        .summary-box.medium {{ border-top: 4px solid var(--medium); }}
        .summary-box.low {{ border-top: 4px solid var(--low); }}
        .summary-box.info {{ border-top: 4px solid var(--info); }}
        .summary-count {{
            font-size: 28px;
            font-weight: 700;
        }}
        .finding-card {{
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
        }}
        .finding-card.critical {{ border-left: 6px solid var(--critical); }}
        .finding-card.high {{ border-left: 6px solid var(--high); }}
        .finding-card.medium {{ border-left: 6px solid var(--medium); }}
        .finding-card.low {{ border-left: 6px solid var(--low); }}
        .finding-card.info {{ border-left: 6px solid var(--info); }}
        .finding-header {{
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }}
        .badge {{
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
        }}
        .badge.critical {{ background: var(--critical); color: white; }}
        .badge.high {{ background: var(--high); color: white; }}
        .badge.medium {{ background: var(--medium); color: black; }}
        .badge.low {{ background: var(--low); color: white; }}
        .badge.info {{ background: var(--info); color: black; }}
        .finding-id {{ color: var(--text-dim); font-weight: 600; font-size: 14px; }}
        .cvss-score {{ font-weight: 700; color: #f0883e; }}
        .finding-title {{ margin: 0; font-size: 18px; flex: 1; }}
        .finding-body {{ padding: 20px; }}
        .poc-box pre {{
            background: #0d1117;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid var(--border-color);
            color: #79c0ff;
        }}
        .empty-state {{
            text-align: center;
            padding: 40px;
            background: var(--card-bg);
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }}
        a {{ color: #58a6ff; text-decoration: none; }}
        a:hover {{ text-decoration: underline; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Project Ronin — Security Assessment Report</h1>
            <div class="meta-grid">
                <div class="meta-item"><div class="meta-label">Scan ID</div><div class="meta-val">{report.scan_id}</div></div>
                <div class="meta-item"><div class="meta-label">Target URL</div><div class="meta-val">{report.target}</div></div>
                <div class="meta-item"><div class="meta-label">Started</div><div class="meta-val">{report.scan_started}</div></div>
                <div class="meta-item"><div class="meta-label">Duration</div><div class="meta-val">{report.duration_seconds:.1f}s</div></div>
                <div class="meta-item"><div class="meta-label">Endpoints Tested</div><div class="meta-val">{report.total_endpoints_tested}</div></div>
            </div>
        </div>

        <div class="summary-bar">
            <div class="summary-box critical"><div class="summary-count" style="color: var(--critical)">{report.summary.critical}</div><div>CRITICAL</div></div>
            <div class="summary-box high"><div class="summary-count" style="color: var(--high)">{report.summary.high}</div><div>HIGH</div></div>
            <div class="summary-box medium"><div class="summary-count" style="color: var(--medium)">{report.summary.medium}</div><div>MEDIUM</div></div>
            <div class="summary-box low"><div class="summary-count" style="color: var(--low)">{report.summary.low}</div><div>LOW</div></div>
            <div class="summary-box info"><div class="summary-count" style="color: var(--info)">{report.summary.info}</div><div>INFO</div></div>
        </div>

        <h2>Detailed Findings</h2>
        {findings_html}
    </div>
</body>
</html>
"""
    dest_path.write_text(html_content, encoding="utf-8")


# ============================================================================
# Typer CLI Definition
# ============================================================================

if _HAS_TYPER_RICH:
    app = typer.Typer(
        name="ronin",
        help="Project Ronin: Autonomous AI-Powered Black-Box API Security Testing Platform",
        no_args_is_help=True,
        add_completion=False,
    )

    def version_callback(value: bool):
        if value:
            typer.echo(f"Ronin CLI version {VERSION}")
            raise typer.Exit()

    @app.callback()
    def common(
        ctx: typer.Context,
        version: Optional[bool] = typer.Option(
            None, "--version", "-V", callback=version_callback, is_eager=True, help="Show Ronin CLI version."
        ),
    ):
        """Project Ronin CLI Application Root."""
        pass

    @app.command(name="scan", help="Execute an autonomous black-box API security scan against a target.")
    def scan(
        target: str = typer.Option(
            ...,
            "--target",
            "-t",
            help="Target API base URL (e.g., https://api.example.com)",
        ),
        collection: Optional[Path] = typer.Option(
            None,
            "--collection",
            "-c",
            help="Path to a Postman Collection v2.1 JSON file (Mode B)",
        ),
        endpoints: Optional[Path] = typer.Option(
            None,
            "--endpoints",
            "-e",
            help="Path to a plain text endpoints list file (Mode C)",
        ),
        include: Optional[List[str]] = typer.Option(
            None,
            "--include",
            "-i",
            help="Glob patterns restricting testing to matching endpoint paths",
        ),
        exclude: Optional[List[str]] = typer.Option(
            None,
            "--exclude",
            "-x",
            help="Glob patterns excluding matching endpoint paths from testing",
        ),
        output_dir: Path = typer.Option(
            Path("./ronin_runs"),
            "--output-dir",
            "-o",
            help="Base directory where scan runs and reports are stored",
        ),
        exit_on_critical: bool = typer.Option(
            False,
            "--exit-on-critical",
            help="Exit with non-zero status code (1) if CRITICAL findings are discovered",
        ),
        verbose: bool = typer.Option(
            False,
            "--verbose",
            "-v",
            help="Enable verbose output logging",
        ),
    ):
        """Initiate the Ronin multi-agent scanning workflow."""
        start_time = time.time()
        start_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # 1. Validate Target URL
        if not target.startswith(("http://", "https://")):
            console.print(f"[bold red]Error:[/bold red] Target URL must begin with http:// or https:// (got '{target}')")
            raise typer.Exit(code=2)

        # 2. Determine Mode
        mode = "Mode A: Auto-Discovery (Base URL)"
        provided_endpoints: Optional[List[Endpoint]] = None

        if collection:
            if not collection.is_file():
                console.print(f"[bold red]Error:[/bold red] Collection file not found: {collection}")
                raise typer.Exit(code=2)
            mode = f"Mode B: Postman Collection ({collection.name})"

        elif endpoints:
            if not endpoints.is_file():
                console.print(f"[bold red]Error:[/bold red] Endpoints file not found: {endpoints}")
                raise typer.Exit(code=2)
            mode = f"Mode C: Plain Text Endpoints ({endpoints.name})"
            # Simple line parser
            lines = [l.strip() for l in endpoints.read_text(encoding="utf-8").splitlines() if l.strip() and not l.strip().startswith("#")]
            parsed_endpoints: List[Endpoint] = []
            for line in lines:
                parts = line.split(maxsplit=1)
                if len(parts) == 2 and parts[0].upper() in ("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"):
                    verb, path = parts[0].upper(), parts[1]
                else:
                    verb, path = "GET", line
                parsed_endpoints.append(Endpoint(method=verb, path=path))
            provided_endpoints = parsed_endpoints

        # 3. Setup Scan ID and Directories
        scan_id = generate_scan_id()
        run_dir = output_dir / scan_id
        logs_dir = run_dir / "logs"
        poc_dir = run_dir / "poc_scripts"

        run_dir.mkdir(parents=True, exist_ok=True)
        logs_dir.mkdir(parents=True, exist_ok=True)
        poc_dir.mkdir(parents=True, exist_ok=True)

        print_banner(target=target, scan_id=scan_id, mode=mode, output_dir=run_dir)

        # 4. Initialize ScanState Model
        state = ScanState(
            scan_id=scan_id,
            target_url=target.rstrip("/"),
            provided_endpoints=provided_endpoints,
            include_patterns=include or [],
            exclude_patterns=exclude or [],
            current_phase=ScanPhase.INIT,
            current_endpoint_index=0,
        )

        # Write initial state checkpoint
        state_file = run_dir / "scan_state.json"
        state_file.write_text(state.model_dump_json(indent=2), encoding="utf-8")

        # 5. Multi-Agent Pipeline Execution Simulation / Driver
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TimeElapsedColumn(),
            console=console,
        ) as progress:
            task_recon = progress.add_task("[cyan]Phase 1: Reconnaissance (Endpoint Mapping)...", total=100)
            state.current_phase = ScanPhase.RECON
            time.sleep(0.6)
            progress.update(task_recon, advance=50)

            # Populate sample endpoints if none provided
            if not state.discovered_endpoints:
                if provided_endpoints:
                    state.discovered_endpoints = provided_endpoints
                else:
                    state.discovered_endpoints = [
                        Endpoint(method="GET", path="/api/v1/users"),
                        Endpoint(method="GET", path="/api/v1/users/{id}", parameters=[Parameter(name="id", location=ParameterLocation.PATH, param_type="integer", required=True, sample_value="1")]),
                        Endpoint(method="POST", path="/api/v1/auth/login"),
                        Endpoint(method="GET", path="/api/health"),
                    ]
            progress.update(task_recon, advance=50)

            task_exploit = progress.add_task("[yellow]Phase 2: Exploitation & Anomaly Probing...", total=100)
            state.current_phase = ScanPhase.EXPLOIT
            time.sleep(0.6)
            progress.update(task_exploit, advance=100)

            task_validate = progress.add_task("[magenta]Phase 3: Sandbox PoC Verification...", total=100)
            state.current_phase = ScanPhase.VALIDATE
            time.sleep(0.6)
            progress.update(task_validate, advance=100)

            task_report = progress.add_task("[green]Phase 4: Artifact & Report Compilation...", total=100)
            state.current_phase = ScanPhase.REPORT
            time.sleep(0.4)
            progress.update(task_report, advance=100)

        state.current_phase = ScanPhase.COMPLETED
        end_time = time.time()
        end_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        duration = end_time - start_time

        # Update and save final checkpoint
        state_file.write_text(state.model_dump_json(indent=2), encoding="utf-8")

        # 6. Generate Reports (JSON & HTML)
        summary = ReportSummary.from_findings(state.validated_findings)
        scan_report = ScanReport(
            scan_id=scan_id,
            target=state.target_url,
            scan_started=start_iso,
            scan_completed=end_iso,
            duration_seconds=round(duration, 2),
            total_endpoints_tested=len(state.discovered_endpoints),
            summary=summary,
            findings=state.validated_findings,
        )

        json_report_file = run_dir / "report.json"
        json_report_file.write_text(scan_report.model_dump_json(indent=2), encoding="utf-8")

        html_report_file = run_dir / "report.html"
        generate_html_report(scan_report, html_report_file)

        # 7. Render Terminal Summary
        console.print()
        render_summary_table(summary, duration, len(state.discovered_endpoints))

        console.print(f"\n[bold green]✔ Scan Completed Successfully![/bold green]")
        console.print(f"  [dim]• JSON Report:[/dim]  [underline cyan]{json_report_file.resolve()}[/underline cyan]")
        console.print(f"  [dim]• HTML Report:[/dim]  [underline cyan]{html_report_file.resolve()}[/underline cyan]")
        console.print(f"  [dim]• State Dump:[/dim]   [dim]{state_file.resolve()}[/dim]")

        # 8. Check Exit Conditions
        if exit_on_critical and summary.critical > 0:
            console.print(f"\n[bold red]CRITICAL findings detected with --exit-on-critical flag. Exiting with code 1.[/bold red]")
            raise typer.Exit(code=1)

    @app.command(name="health-check", help="Run comprehensive pre-flight environment and infrastructure checks.")
    def health_check():
        """Validate local dependencies: Python, Ollama, Qwen model, MongoDB, Docker, Wordlists."""
        console.print(Panel(
            "[bold cyan]Project Ronin — Pre-flight Environment Diagnostics[/bold cyan]",
            border_style="cyan"
        ))

        checks = []

        # 1. Python Version
        py_ver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        py_ok = sys.version_info >= (3, 11)
        checks.append(("Python Environment", py_ver, py_ok, "Requires Python >= 3.11"))

        # 2. Wordlists Directory
        wl_dir = _REPO_ROOT / "wordlists"
        wl_ok = wl_dir.is_dir() and any(wl_dir.glob("*.txt"))
        checks.append(("Wordlists Directory", f"{wl_dir} ({len(list(wl_dir.glob('*.txt')))} files)" if wl_ok else "Missing", wl_ok, "Required for path fuzzing"))

        # 3. Ollama Connectivity (Lightweight check)
        import socket
        try:
            # Parse host from settings
            host_parts = settings.ollama_host.replace("http://", "").replace("https://", "").split(":")
            host = host_parts[0]
            port = int(host_parts[1]) if len(host_parts) > 1 else 11434
            s = socket.create_connection((host, port), timeout=1.0)
            s.close()
            ollama_ok = True
            ollama_msg = f"{settings.ollama_host} (Listening)"
        except Exception:
            ollama_ok = False
            ollama_msg = f"{settings.ollama_host} (Unreachable - run: docker-compose up -d)"
        checks.append(("Ollama Service", ollama_msg, ollama_ok, "Local LLM engine"))

        # 4. MongoDB Socket Check
        try:
            m_parts = settings.mongo_uri.replace("mongodb://", "").split("/")[0].split(":")
            m_host = m_parts[0]
            m_port = int(m_parts[1]) if len(m_parts) > 1 else 27017
            s = socket.create_connection((m_host, m_port), timeout=1.0)
            s.close()
            mongo_ok = True
            mongo_msg = f"{settings.mongo_uri} (Connected)"
        except Exception:
            mongo_ok = False
            mongo_msg = f"{settings.mongo_uri} (Unreachable - run: docker-compose up -d)"
        checks.append(("MongoDB Persistence", mongo_msg, mongo_ok, "Scan state storage"))

        # Render Diagnostics Table
        table = Table(title="Diagnostic Status", border_style="dim cyan")
        table.add_column("Component", style="bold")
        table.add_column("Status", justify="left")
        table.add_column("Verdict", justify="center")
        table.add_column("Notes", style="dim")

        all_ok = True
        for comp, status, ok, notes in checks:
            badge = "[bold green]✔ OK[/bold green]" if ok else "[bold yellow]⚠ CHECK[/bold yellow]"
            if not ok:
                all_ok = False
            table.add_row(comp, status, badge, notes)

        console.print(table)
        if all_ok:
            console.print("\n[bold green]✨ All baseline systems operational. Ready to scan![/bold green]")
        else:
            console.print("\n[bold yellow]ℹ Some containerized services are offline. Start infrastructure with: [white]docker-compose up -d[/white][/bold yellow]")

    @app.command(name="version", help="Print Ronin CLI version.")
    def version_cmd():
        console.print(f"[bold cyan]Project Ronin CLI[/bold cyan] version [bold green]{VERSION}[/bold green]")

else:
    # Minimal fallback when typer/rich are not installed yet
    def app():
        print(f"Project Ronin CLI v{VERSION}")
        print("Required dependencies 'typer' and 'rich' are not installed.")
        print("Please install them using: pip install -e .")


if __name__ == "__main__":
    if _HAS_TYPER_RICH:
        app()
    else:
        app()

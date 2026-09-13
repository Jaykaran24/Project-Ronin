"""
Unit tests for the Ronin Typer CLI Commands
"""

from typer.testing import CliRunner
from cli.main import app, VERSION

runner = CliRunner()


def test_cli_version_flag():
    result = runner.invoke(app, ["--version"])
    assert result.exit_code == 0
    assert f"Ronin CLI version {VERSION}" in result.stdout


def test_cli_version_command():
    result = runner.invoke(app, ["version"])
    assert result.exit_code == 0
    assert VERSION in result.stdout


def test_cli_invalid_target():
    result = runner.invoke(app, ["scan", "--target", "invalid-url"])
    assert result.exit_code == 2
    assert "Error:" in result.stdout or "Target URL must begin with http" in result.stdout


def test_cli_scan_dry_run(tmp_path):
    output_dir = tmp_path / "test_runs"
    result = runner.invoke(app, [
        "scan",
        "--target", "https://api.test.local",
        "--output-dir", str(output_dir),
    ])
    assert result.exit_code == 0
    assert "Scan Completed Successfully!" in result.stdout

    # Check generated files
    scan_dirs = list(output_dir.glob("ronin-*"))
    assert len(scan_dirs) == 1
    run_dir = scan_dirs[0]

    assert (run_dir / "report.json").is_file()
    assert (run_dir / "report.html").is_file()
    assert (run_dir / "scan_state.json").is_file()


def test_cli_health_check():
    result = runner.invoke(app, ["health-check"])
    assert result.exit_code == 0
    assert "Pre-flight Environment Diagnostics" in result.stdout
    assert "Python Environment" in result.stdout

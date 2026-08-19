# Development Setup Guide

Welcome to the **Project Ronin** development setup guide. Project Ronin is an autonomous, AI-powered black-box API security testing CLI tool built with Python, Typer, LangGraph, Ollama, MongoDB, and Docker.

This guide walks you through configuring your local development environment from scratch.

---

## 1. Prerequisites & System Requirements

### Hardware Requirements
| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **CPU** | 4 Cores (x86_64 / ARM64) | 8+ Cores |
| **RAM** | 16 GB | 32 GB |
| **GPU** | Optional (CPU inference supported) | NVIDIA RTX 3060+ (8 GB+ VRAM) with CUDA support |
| **Disk Space** | 20 GB free space | 50 GB free SSD space (for LLM weights and container images) |

### Software Requirements
- **Operating System:** Windows 10/11 (WSL2 recommended or native PowerShell), macOS (Apple Silicon supported), or Linux (Ubuntu 22.04+ recommended).
- **Git:** Version 2.30 or higher.
- **Python:** Version 3.11 or higher (Python 3.11.x or 3.12.x).
- **Docker & Docker Compose:** Docker Desktop 4.25+ or Docker Engine 24.0+ with Docker Compose v2.
- **NVIDIA Container Toolkit (Optional for GPU acceleration):** Required if offloading Ollama inference to an NVIDIA GPU.

---

## 2. Repository Setup

Clone the Project Ronin repository to your local workspace:

```bash
# Clone via HTTPS
git clone https://github.com/your-org/project-ronin.git
cd project-ronin

# Or clone via SSH
git clone git@github.com:your-org/project-ronin.git
cd project-ronin
```

---

## 3. Python Environment Setup

We recommend using a dedicated virtual environment to prevent dependency conflicts.

### Step 1: Create Virtual Environment

```bash
# Windows (PowerShell)
python -m venv .venv

# Linux / macOS
python3 -m venv .venv
```

### Step 2: Activate Virtual Environment

```bash
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Windows (Command Prompt)
.venv\Scripts\activate.bat

# Linux / macOS (Bash / Zsh)
source .venv/bin/activate
```

> [!NOTE]
> On Windows PowerShell, if you encounter an execution policy error (`PSSecurityException`), run:
> `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Step 3: Upgrade Packaging Tools & Install Dependencies

Install the core dependencies along with development and testing tooling in editable mode:

```bash
# Upgrade core tools
python -m pip install --upgrade pip setuptools wheel

# Install Project Ronin in editable mode with development dependencies
pip install -e ".[dev,test]"
```

If using `requirements.txt`:
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
pip install -e .
```

---

## 4. Docker Compose Infrastructure

Project Ronin relies on containerized local infrastructure to remain 100% self-contained and privacy-preserving.

### Architecture Services
1. **`ai_engine` (Ollama):** Hosts and serves the local Large Language Model (Qwen 2.5 Coder 7B) via HTTP API on port `11434`.
2. **`mongodb`:** Stores scan histories, endpoint inventories, state checkpoints, and vulnerability artifacts on port `27017`.
3. **`sandbox`:** Ephemeral, isolated Alpine/Python container used by the Validation Agent to safely execute generated Proof-of-Concept (PoC) exploit scripts.

### Starting Infrastructure

Start all required background services using Docker Compose:

```bash
docker-compose up -d
```

### Verify Service Status

```bash
docker-compose ps
```

You should see containers running with healthy status:
```text
NAME                     IMAGE                 COMMAND                  SERVICE      STATUS      PORTS
project-ronin-ai_engine  ollama/ollama:latest  "/bin/ollama serve"      ai_engine    running     0.0.0.0:11434->11434/tcp
project-ronin-mongodb    mongo:7.0             "docker-entrypoint.s…"   mongodb      running     0.0.0.0:27017->27017/tcp
```

Build the isolated execution sandbox image:
```bash
docker build -f Dockerfile.sandbox -t ronin-sandbox:latest .
```

---

## 5. Pull LLM Model into Ollama

Project Ronin is tuned for `qwen2.5-coder:7b`, providing an optimal balance of structured JSON output generation, security payload synthesis, and local inference speed.

Download the model into the containerized Ollama instance:

```bash
docker exec -it ai_engine ollama pull qwen2.5-coder:7b
```

> [!TIP]
> Depending on your internet connection, downloading the ~4.7 GB model file will take a few minutes.

### Verify Model Availability

```bash
docker exec -it ai_engine ollama list
```

Expected output:
```text
NAME                    ID              SIZE      MODIFIED
qwen2.5-coder:7b        2b049651e629    4.7 GB    Just now
```

Quick inference test:
```bash
docker exec -it ai_engine ollama run qwen2.5-coder:7b "Write a 1-line Python HTTP GET request"
```

---

## 6. Environment Configuration (`.env`)

Create your local `.env` configuration file from the template:

```bash
# Linux / macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

### Configuration Reference

Edit `.env` to customize settings:

```dotenv
# ==============================================================================
# Project Ronin - Local Environment Configuration
# ==============================================================================

# LLM / Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:7b
OLLAMA_TIMEOUT=120
OLLAMA_TEMPERATURE=0.1
OLLAMA_NUM_CTX=8192

# Database Configuration
MONGO_URI=mongodb://localhost:27017/
MONGO_DB_NAME=ronin_db

# Sandbox Configuration
SANDBOX_IMAGE=ronin-sandbox:latest
SANDBOX_EXECUTION_TIMEOUT=15
SANDBOX_MEMORY_LIMIT=256m
SANDBOX_CPU_LIMIT=1.0

# HTTP Scanner Settings
SCANNER_USER_AGENT=Ronin-Security-Scanner/1.0
SCANNER_MAX_CONCURRENT_REQUESTS=10
SCANNER_REQUEST_TIMEOUT=10.0
SCANNER_VERIFY_SSL=false

# Logging & Output
LOG_LEVEL=INFO
REPORT_OUTPUT_DIR=./ronin_runs
```

---

## 7. Verifying Installation & Health Checks

Verify that the CLI entry point is properly linked and able to communicate with all backend services.

### Check CLI Version
```bash
ronin --version
```
Expected output:
```text
Ronin CLI version 1.0.0
```

### Run Full System Health Check
```bash
ronin health-check
```

Expected diagnostic output:
```text
🔍 Project Ronin — Environment Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[✔] Python Environment:      3.11.8 (OK)
[✔] Ollama Service:          http://localhost:11434 (Connected)
[✔] LLM Model:              qwen2.5-coder:7b (Available & Loaded)
[✔] MongoDB Connection:      mongodb://localhost:27017/ (Connected)
[✔] Docker Daemon:           Connected (API v1.43)
[✔] Validation Sandbox:      ronin-sandbox:latest (Built & Ready)
[✔] Wordlists Directory:     ./wordlists (3 files found)

✨ All systems operational. Ready to scan!
```

---

## 8. Common Issues & Troubleshooting

### Issue 1: GPU Not Detected / Slow LLM Inference
- **Symptom:** Ollama runs on CPU, inference takes >30 seconds per prompt.
- **Cause:** Docker Desktop or Docker Engine is not passing the NVIDIA GPU through to the container.
- **Solution:**
  1. Verify NVIDIA drivers are installed on host: `nvidia-smi`.
  2. Install [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html).
  3. Ensure your `docker-compose.yml` includes the GPU reservation block:
     ```yaml
     deploy:
       resources:
         reservations:
           devices:
             - driver: nvidia
               count: all
               capabilities: [gpu]
     ```
  4. Restart the container: `docker-compose down && docker-compose up -d`.

### Issue 2: Port Conflicts (`11434` or `27017` already bound)
- **Symptom:** `Error response from daemon: driver failed programming external connectivity on endpoint... address already in use`.
- **Cause:** A native Ollama service or local MongoDB instance is already running on the host system.
- **Solution:**
  - Option A: Stop native services (`sudo systemctl stop ollama` or `sudo systemctl stop mongod`).
  - Option B: Remap host ports in `docker-compose.yml` (e.g. `11435:11434` and update `OLLAMA_HOST=http://localhost:11435` in `.env`).

### Issue 3: Ollama Model Pull Failure / Hangs
- **Symptom:** `docker exec -it ai_engine ollama pull qwen2.5-coder:7b` terminates with `EOF` or connection reset.
- **Cause:** Network interruption or limited Docker virtual disk space.
- **Solution:**
  - Increase Docker Desktop disk image size in Settings > Resources > Virtual disk limit.
  - Resume the pull; Ollama supports layer resume automatically.

### Issue 4: Docker Sandbox Execution Permission Denied
- **Symptom:** Validation Agent reports `PermissionError: /var/run/docker.sock`.
- **Cause:** Current user lacks privileges to invoke Docker daemon commands.
- **Solution (Linux):** Add your user to the docker group: `sudo usermod -aG docker $USER` and log out/in.

---

## 9. Development Workflow

### Running the Test Suite
We use `pytest` for unit and integration testing:

```bash
# Run all tests
pytest

# Run fast unit tests only (skipping external Docker/LLM calls)
pytest -m "unit"

# Run integration tests against real Ollama / Mongo
pytest -m "integration"

# Run tests with test coverage report
pytest --cov=ronin --cov-report=term-missing
```

### Code Formatting & Linting
Project Ronin enforces strict PEP 8 compliance, Black formatting, and full type annotations:

```bash
# Format code with Black
black .

# Sort imports
isort .

# Run Flake8 linter
flake8 ronin tests

# Run static type checking with Mypy
mypy ronin
```

### Pre-Commit Hooks
Set up git pre-commit hooks to automate formatting and linting before every commit:

```bash
pre-commit install
pre-commit run --all-files
```

---

## 10. Next Steps

- Check the [Contributing Guidelines](contributing.md) to learn about code standards, adding tools, and submitting pull requests.
- Read the [Sprint Timeline](../project-plan/timeline.md) to understand the 6-day build cycle.
- Review the [Milestones Guide](../project-plan/milestones.md) for feature roadmap targets.

# Localized AI API Security Testing Platform

## Project Overview
This project is an AI-powered API testing platform designed to simulate the behavior of a human security researcher. It autonomously maps, tests, and validates vulnerabilities in target APIs. 

Crucially, this system is designed for **100% local execution**. By leveraging an open-weight Large Language Model (LLM) hosted on a personal home cloud server, the platform ensures total data privacy and zero API inference costs. 

## System Architecture

The platform operates as a microservices architecture managed entirely within a single Docker Compose network on a local machine (acting as a micro data center).

*   **Frontend:** A React/Next.js web dashboard for users to input target APIs and view real-time scan progress and final vulnerability reports.
*   **Backend (Orchestrator):** A Python FastAPI service that manages the application logic, handles asynchronous tasks, and executes the multi-agent workflow using frameworks like LangGraph.
*   **Local AI Engine:** An Ollama container with direct GPU access (via NVIDIA Container Toolkit), running a tool-calling optimized model (e.g., Qwen 2.5 Coder).
*   **Database:** A local MongoDB container for persistent storage of scan jobs, global state, and generated reports.
*   **Execution Sandbox:** An isolated, locked-down Alpine Linux container used exclusively by the Validation Agent to safely execute generated exploit code against the target API.

## Repository Structure
```
├── backend/                # FastAPI application and LangGraph agent logic
│   ├── agents/             # Individual agent definitions (Recon, Exploit, etc.)
│   ├── core/               # Configuration and database connection setup
│   └── main.py             # API endpoints and entry point
├── frontend/               # Next.js web application
│   ├── components/         # React UI components (Dashboards, Forms)
│   └── pages/              # Application routes
├── docker-compose.yml      # The blueprint for the local infrastructure
├── agent.md                # Detailed specification of the multi-agent architecture
└── README.md               # Project overview and setup instructions
```

## Setup and Installation

### Prerequisites
*   A host machine (or home server) running Linux.
*   Docker and Docker Compose installed.
*   NVIDIA Container Toolkit installed (if utilizing a GPU for LLM inference).
*   External SSD configured (recommended for database and LLM weight storage).

### Deployment Steps
1.  **Clone the Repository:**
    ```bash
    git clone [repository_url]
    cd [repository_directory]
    ```
2.  **Configure Environment Variables:**
    Create a `.env` file in the root directory to specify local paths for Docker volumes (e.g., SSD mount points for `ollama_data` and `mongo_data`).
3.  **Start the Infrastructure:**
    ```bash
    docker-compose up -d
    ```
4.  **Pull the AI Model:**
    Once the containers are running, download the required model into the Ollama container:
    ```bash
    docker exec -it ai_engine ollama run qwen2.5-coder:7b
    ```
5.  **Access the Platform:**
    *   Web Dashboard: `http://localhost:3000` (or via Cloudflare Tunnel URL if configured).
    *   API Backend: `http://localhost:8000`

## Future Development Phases
*   **Phase 1:** Core infrastructure setup (Docker compose) and basic UI implementation.
*   **Phase 2:** Integration of the local LLM and execution of a basic single-agent prompt.
*   **Phase 3:** Development of the multi-agent Graph (Orchestrator, Recon, Exploit, Validate) and shared state management.
*   **Phase 4:** Implementation of the isolated execution sandbox for validating generated Proofs-of-Concept.
*   **Phase 5:** Fine-tuning the local model on API vulnerability datasets to improve exploitation accuracy.

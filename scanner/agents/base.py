"""
scanner/agents/base.py
───────────────────────
Base class all agents inherit from.
Handles: LLM setup, structured output calls, activity logging.
"""

from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Type, TypeVar
from dotenv import load_dotenv

from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel

from scanner.models.state import ScanState, AgentStatus

T = TypeVar("T", bound=BaseModel)


class BaseAgent:
    """
    All Ronin agents inherit from this.
    Provides a shared LLM handle and helper methods across Cloud and Local providers.
    """

    name: str = "base"

    def __init__(self, config_or_state: ScanState | None = None):
        from pathlib import Path
        for env_path in [
            Path(__file__).resolve().parent.parent / ".env",
            Path.cwd() / "scanner" / ".env",
            Path.cwd() / ".env",
        ]:
            if env_path.exists():
                load_dotenv(env_path, override=True)

        provider = "openrouter"
        model = "qwen/qwen3.8-27b:free"
        api_key = None
        base_url = None
        ollama_url = "http://localhost:11434"

        if config_or_state:
            cfg = config_or_state.config
            provider = cfg.llm_provider or provider
            model = cfg.llm_model or model
            api_key = cfg.llm_api_key
            base_url = cfg.llm_base_url
            ollama_url = cfg.ollama_url or ollama_url

        # Check environment variable overrides
        provider = os.getenv("LLM_PROVIDER", provider).lower()

        if provider == "groq":
            from langchain_openai import ChatOpenAI
            key = api_key or os.getenv("GROQ_API_KEY")
            if not key:
                raise RuntimeError("GROQ_API_KEY is not set. Please add it to scanner/.env")
            url = base_url or os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
            m = os.getenv("LLM_MODEL", model if "llama" in model.lower() or "qwen" in model.lower() else "llama-3.3-70b-versatile")
            self.llm = ChatOpenAI(
                model=m,
                api_key=key,
                base_url=url,
                temperature=0.1,
            )
        elif provider == "ollama":
            from langchain_ollama import ChatOllama
            m = os.getenv("LLM_MODEL", model if "coder" in model.lower() else "qwen2.5-coder:7b")
            u = os.getenv("OLLAMA_URL", ollama_url)
            self.llm = ChatOllama(
                model=m,
                base_url=u,
                temperature=0.1,
                num_ctx=8192,
            )
        else:  # default openrouter or OpenAI-compatible cloud
            from langchain_openai import ChatOpenAI
            key = api_key or os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
            if not key:
                raise RuntimeError("OPENROUTER_API_KEY is not set. Please add it to scanner/.env")
            url = base_url or os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
            m = os.getenv("LLM_MODEL", model)
            self.llm = ChatOpenAI(
                model=m,
                api_key=key,
                base_url=url,
                temperature=0.1,
            )

    # ── LLM helpers ──────────────────────────────────────────────────────────

    def ask(self, system: str, user: str) -> str:
        """Plain text LLM call — use for report writing."""
        messages = [SystemMessage(content=system), HumanMessage(content=user)]
        response = self.llm.invoke(messages)
        return response.content

    def ask_structured(self, system: str, user: str, schema: Type[T]) -> T:
        """
        Structured output call — LLM must respond with valid JSON
        matching the Pydantic schema. Retries once on parse failure.
        """
        structured_llm = self.llm.with_structured_output(schema)
        messages = [SystemMessage(content=system), HumanMessage(content=user)]

        try:
            result = structured_llm.invoke(messages)
            return result
        except Exception as first_error:
            # Retry once with an explicit reminder
            retry_user = (
                f"{user}\n\n"
                f"IMPORTANT: You MUST respond with valid JSON matching this schema exactly:\n"
                f"{json.dumps(schema.model_json_schema(), indent=2)}"
            )
            try:
                result = structured_llm.invoke(
                    [SystemMessage(content=system), HumanMessage(content=retry_user)]
                )
                return result
            except Exception:
                raise RuntimeError(
                    f"[{self.name}] Structured output failed after retry: {first_error}"
                )

    # ── State helpers ─────────────────────────────────────────────────────────

    @staticmethod
    def set_active(state: ScanState, task: str = "") -> None:
        """Mark this agent as active in the shared state."""
        # We modify agent status in the dict — LangGraph will merge it
        pass  # Handled per-agent in run() method

    @staticmethod
    def log(state: ScanState, agent: str, message: str, level: str = "info") -> None:
        state.activity_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "agent":     agent,
            "message":   message,
            "level":     level,
        })
        print(f"[{agent.upper()}] {message}")

    @staticmethod
    def emit(state: ScanState) -> dict:
        """
        Serialize state to a dict for LangGraph.
        This is what every node function must return.
        """
        return state.model_dump()

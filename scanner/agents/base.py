"""
scanner/agents/base.py
───────────────────────
Base class all agents inherit from.
Handles: LLM setup, structured output calls, activity logging.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Type, TypeVar

from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel

from scanner.models.state import ScanState, AgentStatus

T = TypeVar("T", bound=BaseModel)


class BaseAgent:
    """
    All Ronin agents inherit from this.
    Provides a shared LLM handle and helper methods.
    """

    name: str = "base"

    def __init__(self, config_or_state: ScanState | None = None):
        model      = "qwen2.5-coder:7b"
        ollama_url = "http://localhost:11434"

        if config_or_state:
            model      = config_or_state.config.llm_model
            ollama_url = config_or_state.config.ollama_url

        self.llm = ChatOllama(
            model=model,
            base_url=ollama_url,
            temperature=0.1,       # low temp = more deterministic decisions
            num_ctx=8192,          # context window
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

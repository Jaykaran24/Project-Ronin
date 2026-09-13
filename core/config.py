"""
Project Ronin - Core Configuration
==================================
Centralized application settings loaded from environment variables and .env file.
"""

from __future__ import annotations
import os
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
    _HAS_PYDANTIC_SETTINGS = True
except ImportError:
    _HAS_PYDANTIC_SETTINGS = False


def _find_env_file() -> Optional[str]:
    """Search for .env file in root directories."""
    candidates = [
        Path.cwd() / ".env",
        Path(__file__).resolve().parent.parent / ".env",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    return None


if _HAS_PYDANTIC_SETTINGS:
    class Settings(BaseSettings):
        model_config = SettingsConfigDict(
            env_file=_find_env_file() or ".env",
            env_file_encoding="utf-8",
            extra="ignore",
        )

        # LLM / Ollama Configuration
        ollama_host: str = Field(default="http://localhost:11434", alias="OLLAMA_HOST")
        ollama_model: str = Field(default="qwen2.5-coder:7b", alias="OLLAMA_MODEL")
        ollama_timeout: int = Field(default=120, alias="OLLAMA_TIMEOUT")
        ollama_temperature: float = Field(default=0.1, alias="OLLAMA_TEMPERATURE")
        ollama_num_ctx: int = Field(default=8192, alias="OLLAMA_NUM_CTX")

        # Database Configuration
        mongo_uri: str = Field(default="mongodb://localhost:27017/", alias="MONGO_URI")
        mongo_db_name: str = Field(default="ronin_db", alias="MONGO_DB_NAME")

        # Sandbox Configuration
        sandbox_image: str = Field(default="ronin-sandbox:latest", alias="SANDBOX_IMAGE")
        sandbox_execution_timeout: int = Field(default=15, alias="SANDBOX_EXECUTION_TIMEOUT")
        sandbox_memory_limit: str = Field(default="256m", alias="SANDBOX_MEMORY_LIMIT")
        sandbox_cpu_limit: float = Field(default=1.0, alias="SANDBOX_CPU_LIMIT")

        # HTTP Scanner Settings
        scanner_user_agent: str = Field(default="Ronin-Security-Scanner/1.0", alias="SCANNER_USER_AGENT")
        scanner_max_concurrent_requests: int = Field(default=10, alias="SCANNER_MAX_CONCURRENT_REQUESTS")
        scanner_request_timeout: float = Field(default=10.0, alias="SCANNER_REQUEST_TIMEOUT")
        scanner_verify_ssl: bool = Field(default=False, alias="SCANNER_VERIFY_SSL")

        # Logging & Reporting
        log_level: str = Field(default="INFO", alias="LOG_LEVEL")
        report_output_dir: str = Field(default="./ronin_runs", alias="REPORT_OUTPUT_DIR")

else:
    class Settings(BaseModel):
        """Fallback settings implementation when pydantic-settings is not installed."""
        ollama_host: str = Field(default_factory=lambda: os.getenv("OLLAMA_HOST", "http://localhost:11434"))
        ollama_model: str = Field(default_factory=lambda: os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b"))
        ollama_timeout: int = Field(default_factory=lambda: int(os.getenv("OLLAMA_TIMEOUT", "120")))
        ollama_temperature: float = Field(default_factory=lambda: float(os.getenv("OLLAMA_TEMPERATURE", "0.1")))
        ollama_num_ctx: int = Field(default_factory=lambda: int(os.getenv("OLLAMA_NUM_CTX", "8192")))

        mongo_uri: str = Field(default_factory=lambda: os.getenv("MONGO_URI", "mongodb://localhost:27017/"))
        mongo_db_name: str = Field(default_factory=lambda: os.getenv("MONGO_DB_NAME", "ronin_db"))

        sandbox_image: str = Field(default_factory=lambda: os.getenv("SANDBOX_IMAGE", "ronin-sandbox:latest"))
        sandbox_execution_timeout: int = Field(default_factory=lambda: int(os.getenv("SANDBOX_EXECUTION_TIMEOUT", "15")))
        sandbox_memory_limit: str = Field(default_factory=lambda: os.getenv("SANDBOX_MEMORY_LIMIT", "256m"))
        sandbox_cpu_limit: float = Field(default_factory=lambda: float(os.getenv("SANDBOX_CPU_LIMIT", "1.0")))

        scanner_user_agent: str = Field(default_factory=lambda: os.getenv("SCANNER_USER_AGENT", "Ronin-Security-Scanner/1.0"))
        scanner_max_concurrent_requests: int = Field(default_factory=lambda: int(os.getenv("SCANNER_MAX_CONCURRENT_REQUESTS", "10")))
        scanner_request_timeout: float = Field(default_factory=lambda: float(os.getenv("SCANNER_REQUEST_TIMEOUT", "10.0")))
        scanner_verify_ssl: bool = Field(default_factory=lambda: os.getenv("SCANNER_VERIFY_SSL", "false").lower() in ("true", "1", "yes"))

        log_level: str = Field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
        report_output_dir: str = Field(default_factory=lambda: os.getenv("REPORT_OUTPUT_DIR", "./ronin_runs"))


settings = Settings()

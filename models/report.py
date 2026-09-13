"""
Project Ronin - Report Schema Models
====================================
Pydantic v2 models for structured report serialization (JSON report output).
"""

from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from models.state import Finding, SeverityLevel


class ReportSummary(BaseModel):
    """Aggregated finding counts categorized by severity."""
    model_config = ConfigDict(extra="ignore")

    critical: int = Field(default=0, description="Count of CRITICAL severity vulnerabilities (CVSS 9.0–10.0)")
    high: int = Field(default=0, description="Count of HIGH severity vulnerabilities (CVSS 7.0–8.9)")
    medium: int = Field(default=0, description="Count of MEDIUM severity vulnerabilities (CVSS 4.0–6.9)")
    low: int = Field(default=0, description="Count of LOW severity vulnerabilities (CVSS 0.1–3.9)")
    info: int = Field(default=0, description="Count of INFO severity findings (CVSS 0.0)")

    @classmethod
    def from_findings(cls, findings: List[Finding]) -> "ReportSummary":
        """Compute severity distribution summary from a list of findings."""
        counts = {
            SeverityLevel.CRITICAL: 0,
            SeverityLevel.HIGH: 0,
            SeverityLevel.MEDIUM: 0,
            SeverityLevel.LOW: 0,
            SeverityLevel.INFO: 0,
        }
        for finding in findings:
            if finding.severity in counts:
                counts[finding.severity] += 1
            else:
                counts[SeverityLevel.INFO] += 1

        return cls(
            critical=counts[SeverityLevel.CRITICAL],
            high=counts[SeverityLevel.HIGH],
            medium=counts[SeverityLevel.MEDIUM],
            low=counts[SeverityLevel.LOW],
            info=counts[SeverityLevel.INFO],
        )


class ScanReport(BaseModel):
    """Top-level scan report schema adhering to docs/api/output-schema.md."""
    model_config = ConfigDict(extra="ignore")

    scan_id: str = Field(..., description="Unique scan run identifier (e.g., 'ronin-20260820-001530')")
    target: str = Field(..., description="Target API base URL scanned")
    scan_started: str = Field(..., description="UTC ISO 8601 timestamp when reconnaissance started")
    scan_completed: str = Field(..., description="UTC ISO 8601 timestamp when validation and reporting completed")
    duration_seconds: float = Field(..., description="Total execution time in seconds")
    total_endpoints_tested: int = Field(..., description="Number of unique endpoints evaluated by the exploit agent")
    summary: ReportSummary = Field(..., description="Aggregated severity breakdown summary")
    findings: List[Finding] = Field(default_factory=list, description="Ordered list of verified vulnerabilities")

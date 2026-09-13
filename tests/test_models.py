"""
Tests for Project Ronin Data Models and CLI Models
"""

import pytest
from models.state import (
    ScanState,
    ScanPhase,
    Endpoint,
    Parameter,
    ParameterLocation,
    SeverityLevel,
    SuspectedVuln,
    Finding,
    ProofOfConcept,
    RequestEvidence,
    ResponseEvidence,
)
from models.report import ReportSummary, ScanReport


def test_endpoint_and_parameter_model():
    param = Parameter(
        name="user_id",
        location=ParameterLocation.PATH,
        param_type="integer",
        required=True,
        sample_value="42",
    )
    endpoint = Endpoint(
        method="GET",
        path="/api/v1/users/{user_id}",
        parameters=[param],
    )
    assert endpoint.method == "GET"
    assert endpoint.path == "/api/v1/users/{user_id}"
    assert len(endpoint.parameters) == 1
    assert endpoint.parameters[0].name == "user_id"


def test_finding_and_proof_of_concept():
    poc = ProofOfConcept(
        request=RequestEvidence(
            method="GET",
            url="https://api.example.com/api/v1/users/42",
            headers={"Accept": "application/json"},
        ),
        response=ResponseEvidence(
            status_code=200,
            headers={"Content-Type": "application/json"},
            body_snippet='{"id": 42, "email": "victim@example.com"}',
            response_time_ms=45.2,
        ),
    )
    finding = Finding(
        id="RONIN-001",
        title="BOLA on GET /api/v1/users/{id}",
        severity=SeverityLevel.CRITICAL,
        cvss_score=9.1,
        category="API1:2023 - Broken Object Level Authorization",
        description="Changing user ID returns victim data without authentication.",
        proof_of_concept=poc,
        steps_to_reproduce=["Send GET request with user ID 42"],
        remediation="Enforce object-level access control checks.",
        references=["https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/"],
    )
    assert finding.severity == SeverityLevel.CRITICAL
    assert finding.cvss_score == 9.1


def test_scan_state_lifecycle():
    state = ScanState(
        scan_id="ronin-20260913-120000",
        target_url="https://api.example.com",
    )
    assert state.current_phase == ScanPhase.INIT
    assert state.current_endpoint_index == 0
    assert len(state.discovered_endpoints) == 0

    # Advance phase
    state.current_phase = ScanPhase.RECON
    state.discovered_endpoints.append(Endpoint(method="GET", path="/api/v1/users"))
    assert len(state.discovered_endpoints) == 1

    # Verify JSON serialization
    state_json = state.model_dump_json()
    rehydrated = ScanState.model_validate_json(state_json)
    assert rehydrated.scan_id == "ronin-20260913-120000"
    assert rehydrated.current_phase == ScanPhase.RECON


def test_report_summary_computation():
    finding_crit = Finding(
        id="RONIN-001",
        title="BOLA",
        severity=SeverityLevel.CRITICAL,
        cvss_score=9.1,
        category="API1",
        description="desc",
        proof_of_concept=ProofOfConcept(
            request=RequestEvidence(method="GET", url="https://api.example.com/1"),
            response=ResponseEvidence(status_code=200, body_snippet="ok"),
        ),
        remediation="fix",
    )
    finding_med = Finding(
        id="RONIN-002",
        title="Missing Header",
        severity=SeverityLevel.MEDIUM,
        cvss_score=5.0,
        category="API8",
        description="desc",
        proof_of_concept=ProofOfConcept(
            request=RequestEvidence(method="GET", url="https://api.example.com/"),
            response=ResponseEvidence(status_code=200, body_snippet="ok"),
        ),
        remediation="fix",
    )
    summary = ReportSummary.from_findings([finding_crit, finding_med])
    assert summary.critical == 1
    assert summary.high == 0
    assert summary.medium == 1
    assert summary.low == 0
    assert summary.info == 0

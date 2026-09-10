# Project Ronin — UI/UX Design Specification (`design.md`)

> **Inspiration & Benchmark:** [Strix](https://github.com/usestrix/strix) (`strix view` local web dashboard, app.strix.ai) adapted for **Project Ronin**'s autonomous black-box API security testing mission.
> **Target Audience:** Security engineers, DevSecOps practitioners, penetration testers, and backend developers.
> **Design Philosophy:** Cyber-tactical, high information density, terminal-precise aesthetic, zero-friction local workflows.

---

## 1. Executive Summary & Design Principles

Project Ronin requires an interface that matches its identity: **an autonomous, 100% local, multi-agent black-box API penetration testing platform**. 

Taking inspiration from Strix's acclaimed UI/UX:
1. **Dark, Focused, High-Contrast Cyber Palette**: Deep neutral canvas (`#090D16` / `#0D1117`), elevated glassmorphic cards (`#161B22` / `#1F242C`), and vibrant semantic severity accents (Critical crimson, High amber, Medium yellow, Low blue, Success emerald, Recon cyan).
2. **Real-Time Agent Observability**: Instead of standard generic status spinners, users can observe the 4-agent LangGraph execution pipeline (**Orchestrator → Recon → Exploit → Validate**) live, with current agent states, target endpoints being probed, and sandbox executions.
3. **Action-Oriented & Developer-First**: Instant keyboard navigation, one-click PoC reproduction copy, curl snippet previews, filterable logs, and intuitive quick-action buttons.
4. **Resilient UX & State Management**: Zero-layout-shift skeleton loaders, graceful empty states for first-time scans, and contextual error banners with immediate retry triggers.

---

## 2. Information Architecture & Layout Hierarchy

The application follows a persistent shell layout with dynamic sub-views:

```
+-----------------------------------------------------------------------------------------------+
| TOPBAR / HEADER: [Logo: RONIN] | [Target URL / Active Scan Badge] | [Notifications] [User Profile] |
+------------------+----------------------------------------------------------------------------+
| SIDEBAR          | MAIN DASHBOARD CONTENT AREA                                                |
| (Collapsible)    |                                                                            |
|                  | 1. GREETING & STATUS BANNER (Scan in Progress / Idle / System Ready)       |
| • Overview       | 2. KPI METRIC CARDS (Total Scans | Critical Vulns | Endpoints | Sandbox Rate)  |
| • Live Scans     | 3. MULTI-AGENT PIPELINE / AGENT GRAPH (Live agent activity & status)       |
| • Vulnerabilities| 4. TWO-COLUMN SPLIT:                                                       |
| • Targets        |    LEFT: Active & Recent Activity Feed / Scan Runs                         |
| • Sandbox PoCs   |    RIGHT: Quick Actions & Severity Breakdown Chart                         |
| • Settings       | 5. RECENT FINDINGS PREVIEW (With PoC badges & CVSS pill tags)              |
|                  |                                                                            |
| [Collapse]       |                                                                            |
| [Log Out]        |                                                                            |
+------------------+----------------------------------------------------------------------------+
```

---

## 3. Core Component Breakdown (Mapped to User Ticket)

### 3.1. Navigation & Header
* **Top Navigation Bar:**
  * **Brand Mark:** Ronin cyber-katana logo with glowing indicator showing local LLM status (e.g., `Ollama: Qwen 2.5 Coder 7B [Online]`).
  * **Global Target Switcher / Search:** Fast jump to any audited API domain or scan ID.
  * **Notification Bell:** Popover listing real-time security events (e.g., "Critical BOLA validated on `/api/users/42`", "Scan complete").
  * **User Profile & Account Dropdown:** User avatar, role (`Security Engineer`), local session info, and functional **Log Out** button.
* **Collapsible Sidebar:**
  * **Items:**
    * `Overview` (Main Dashboard)
    * `Scans` (Live & historical test runs)
    * `Findings` (OWASP API Top 10 vulnerabilities discovered)
    * `Endpoints` (Discovered API attack surface)
    * `Agent Graph` (Visual LangGraph state inspector inspired by Strix)
    * `Settings` (Ollama connection, Docker sandbox configs)
  * **Behavior:** Expanded width (240px) with icons + labels; collapses to compact icon-only rail (68px); full off-canvas drawer on mobile (`< 768px`) with hamburger trigger.

---

### 3.2. Main Content Area

#### A. Personalized Header & Quick Actions
* **Greeting:** "Welcome back, [User Name] — Local security engine is idle / scanning [target]".
* **Quick-Action Toolbar:**
  * `[+ Launch New Scan]` (Primary high-contrast button triggering target modal).
  * `[Import OpenAPI / Collection]` (Upload `.json` or `.yaml` file).
  * `[Download Report]` (Export `ronin_report.json` or self-contained HTML).
  * `[Agent Steering / Abort]` (Inspired by Strix: pause, steer, or stop live tests).

#### B. Key Metric Summary Cards (KPIs)
Four high-impact metric cards with subtle gradient borders and trend indicators:
1. **Total APIs Scanned:** Count + weekly delta.
2. **Active Vulnerabilities:** Breakdown count with mini color bars (`Critical: 1`, `High: 2`, `Med: 3`, `Low: 1`).
3. **Endpoints Mapped:** Discovered surface area across tested targets.
4. **Exploit Validation Rate:** Percentage of suspected flaws proven in Docker sandbox (zero false-positive verification).

#### C. Live Agent Activity / Multi-Agent Status (Strix-Inspired Innovation)
A dedicated telemetry card showing the 4 Ronin agents in real time:
* **Orchestrator:** Planning next actions, analyzing coverage.
* **Recon Agent:** Crawling `/api/v1/auth`, fuzzing endpoints.
* **Exploit Agent:** Sending BOLA / parameter tampering payloads.
* **Validation Agent:** Executing Python sandbox PoC in Alpine container.

#### D. Recent Activity Feed & Finding Previews
* **Recent Activity Feed:** Timestamped stream of actions (e.g., `10:14:02 - Validation Agent verified PoC for RONIN-001`).
* **Vulnerabilities Table / Cards:** Interactive rows displaying:
  * Severity Tag (`CRITICAL 9.1`, `HIGH 7.5`, etc.)
  * Title & Category (`BOLA on GET /api/users/{id} - OWASP API1:2023`)
  * Target Endpoint (`GET /api/users/42`)
  * PoC Status badge (`PoC Verified in Sandbox`)
  * Quick-copy curl trigger & drawer preview.

---

## 4. Design System & Aesthetics (Tokens)

### 4.1. Color Palette (Cyber Dark Theme)
| Token | Hex Value | Semantic Usage |
|---|---|---|
| `--bg-canvas` | `#080B11` | Root background |
| `--bg-surface` | `#0E131F` | Sidebar & card background |
| `--bg-card-hover`| `#141B2B` | Hover states |
| `--border-subtle`| `#1D263B` | Structural dividers & card borders |
| `--border-focus` | `#38BDF8` | Focus rings & active selections |
| `--accent-cyan`  | `#00E5FF` | Ronin cyber primary accent (Recon/Actions) |
| `--text-primary` | `#F1F5F9` | Headings, titles, vital values |
| `--text-muted`   | `#94A3B8` | Subtitles, labels, descriptions |
| `--severity-crit`| `#FF3366` | Critical severity badge & alerts |
| `--severity-high`| `#FF8C00` | High severity |
| `--severity-med` | `#FFC000` | Medium severity |
| `--severity-low`  | `#38BDF8` | Low severity / Info |
| `--state-success`| `#00E676` | Verified PoC, scan complete, online status |

### 4.2. Typography
* **Font Family:** `Inter`, `Geist Sans`, or system sans-serif for UI elements.
* **Monospace:** `JetBrains Mono` or `Fira Code` for endpoints, HTTP methods (`GET`, `POST`), hashes, and PoC code snippets.

---

## 5. State Handling & UX Requirements

### 5.1. Loading Skeleton State
* Matches the exact card grid and table geometry.
* Animated subtle pulse/shimmer gradient (`#121824` to `#1D263B` to `#121824`).
* Zero Cumulative Layout Shift (CLS) when data hydrates.

### 5.2. Empty State (First-Time User Experience)
* Clean vector cyber illustration / icon.
* Headline: "No target APIs tested yet".
* Subtext: "Point Ronin at a local microservice or upload a Postman collection to start your first autonomous penetration test."
* Primary CTA button: `[+ Start First Scan]` with sample target prefill option.

### 5.3. Error Handling & Banner State
* Persistent top banner or floating toast when API or Ollama model fails to communicate.
* Clear diagnostic: "Failed to connect to local Ollama instance at localhost:11434".
* Actionable buttons: `[Retry Connection]` and `[View Diagnostics]`.

### 5.4. Authentication Flow
* **Protected Routes:** Directing to `/dashboard` while unauthenticated immediately redirects to `/login`.
* **Mock Auth Provider:** Includes simple login/logout toggle for seamless testing and validation of the acceptance criteria.

---

## 6. Implementation Checklist & Acceptance Criteria Mapping

- [x] **Responsive Shell:** Desktop rail + mobile off-canvas hamburger drawer.
- [x] **Top Header:** User profile, notifications, settings, and working sign out.
- [x] **Summary Cards (KPIs):** 4 metric cards with icons, statistics, and subtext.
- [x] **Multi-Agent Inspector:** Real-time Ronin agent status component.
- [x] **Recent Activity & Findings:** Filterable list with severity badges.
- [x] **State Switcher Demo:** Controls to preview **Loaded**, **Loading Skeleton**, **Empty State**, and **Error / Retry Banner**.

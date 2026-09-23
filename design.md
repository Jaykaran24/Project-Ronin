# RONIN — Frontend Design Specification

## Purpose

This document is the **authoritative UI/UX direction for the RONIN web dashboard**.

The current interface should be redesigned rather than incrementally decorated. The existing screenshot is too dense, too terminal-like, and gives equal visual weight to too many things at once. It reads like a monitoring console instead of a professional security product.

RONIN should feel like a serious security operations application: calm, precise, technical, modern, and highly usable. The interface can retain a cyber-security identity without looking like a game HUD, hacker terminal, or sci-fi control panel.

This design is based on the existing RONIN product definition:

- RONIN is a local, multi-agent, black-box API penetration-testing platform.
- The core execution pipeline is **Orchestrator → Recon → Exploit → Validation**.
- The platform discovers API attack surface, identifies suspected vulnerabilities, and validates reproducible PoCs in an isolated sandbox.
- The product is local-first, using Ollama for model inference and Docker/Alpine for isolated validation.
- The dashboard should expose scan state, agent activity, endpoints, findings, reports, and infrastructure health.

The frontend should **communicate this architecture through product UX**, not through excessive terminal decoration.

---

# 1. Design Goals

## 1.1 Primary goals

1. **Strong visual hierarchy**
   Users must immediately understand:
   - What target is being tested.
   - Whether a scan is active.
   - How far the scan has progressed.
   - Whether serious vulnerabilities were verified.
   - What the agents are doing right now.

2. **Professional security-product aesthetic**
   The visual language should feel closer to a modern security platform / observability product than a command-line emulator.

3. **Information density without visual noise**
   Show a lot of data, but group it into clear sections with generous spacing, consistent typography, and controlled emphasis.

4. **Agent observability as the signature feature**
   The multi-agent workflow is one of RONIN's defining product concepts. It should be visually prominent and easy to understand.

5. **Findings-first workflow**
   Users ultimately care about verified vulnerabilities, their severity, affected endpoints, PoCs, reproduction steps, and remediation guidance. The UI must make those outcomes easy to inspect.

6. **Local infrastructure should feel trustworthy**
   Ollama, sandbox, database, and API connection status should be visible, but should not dominate the dashboard.

---

# 2. Problems With the Current Screenshot

The existing UI should **not** be preserved as the visual baseline.

## 2.1 Excessive density

The screenshot places KPI cards, active scan telemetry, agent cards, logs, findings, progress bars, shell decorations, and infrastructure indicators into nearly every available pixel.

Result:

- Nothing feels important.
- Typography becomes too small.
- Users must decode many panels before understanding the state of a scan.
- Large amounts of whitespace are missing where hierarchy would help.

## 2.2 Terminal imitation is overused

A small amount of terminal influence is appropriate for RONIN. The current design uses terminal conventions everywhere: prompt-like labels, pseudo-system paths, window chrome, monospaced headings, terminal status text, and decorative shell language.

Do **not** make the web application look like a terminal emulator.

Use terminal-inspired typography only where technical data benefits from it:

- endpoints
- HTTP methods
- request/response snippets
- scan IDs
- agent logs
- hashes
- technical metadata

Use a modern sans-serif for most product UI.

## 2.3 Too many competing accents

The current screenshot uses cyan, green, yellow, orange, red, blue, purple, and white simultaneously across small labels and borders.

RONIN needs a restrained visual language:

- Neutral UI by default.
- Cyan for product interaction and active technical state.
- Semantic severity colors only for severity.
- Green primarily for verified / healthy / completed state.
- Red/orange only when something actually requires attention.

## 2.4 Card borders are doing too much work

Nearly every element looks like an independent box.

This creates visual fragmentation.

Use three levels of containment:

1. Page background.
2. Major surface/card.
3. Subtle inner divider or row hover.

Avoid putting a border around every label, badge, and sub-section.

## 2.5 The page tries to show the entire application at once

The current dashboard behaves like a complete command center plus scan detail page plus findings table plus log viewer all combined together.

The dashboard should provide a **high-level operational view**. Detailed scan telemetry belongs on the Live Scan page. Detailed vulnerability information belongs on the Finding detail view.

## 2.6 Typography is too small

Do not solve information density by making text tiny.

Minimum guidance:

- Primary body: 14–15px.
- Secondary text: 12–13px.
- Table metadata: 12–13px.
- Small labels: 11–12px.
- Page title: 28–36px.
- KPI value: 28–36px.

Technical data may use a smaller monospace size, but should remain legible.

---

# 3. Product Personality

RONIN should feel:

- precise
- intelligent
- calm
- technical
- trustworthy
- local/private
- observability-driven
- security-focused

RONIN should **not** feel:

- arcade-like
- neon cyberpunk
- hacker movie UI
- crypto dashboard
- terminal emulator
- spaceship cockpit
- generic AI SaaS

The product should look like something a professional penetration tester would leave open all day.

---

# 4. Visual Direction

## 4.1 Core concept

### "Modern Security Operations Console"

Combine:

- dark observability tooling
- restrained cyber accents
- modern SaaS spacing
- technical monospace metadata
- clear severity semantics
- strong data visualization

Think **security platform first, cyber aesthetic second**.

---

# 5. Color System

Use the existing RONIN palette as the foundation, but reduce how frequently accent colors appear.

| Token | Value | Usage |
|---|---|---|
| `--bg-canvas` | `#080B11` | Application background |
| `--bg-surface` | `#0E131F` | Sidebar and elevated surfaces |
| `--bg-card` | `#111827` | Primary cards |
| `--bg-card-hover` | `#141B2B` | Hovered rows/cards |
| `--border-subtle` | `#1D263B` | Dividers and low-emphasis borders |
| `--border-focus` | `#38BDF8` | Keyboard focus / selected controls |
| `--accent-cyan` | `#00E5FF` | Primary RONIN action / active technical state |
| `--text-primary` | `#F1F5F9` | Main text |
| `--text-secondary` | `#CBD5E1` | Supporting text |
| `--text-muted` | `#94A3B8` | Metadata / descriptions |
| `--severity-critical` | `#FF3366` | Critical severity only |
| `--severity-high` | `#FF8C00` | High severity only |
| `--severity-medium` | `#FFC000` | Medium severity only |
| `--severity-low` | `#38BDF8` | Low / informational |
| `--state-success` | `#00E676` | Verified / healthy / complete |

### Color usage rule

**80% of the interface should be neutral.**

Accent colors are for meaning, not decoration.

Do not use cyan borders around every card.
Do not use glowing gradients behind ordinary UI elements.
Do not color entire panels according to agent state.

---

# 6. Typography

## 6.1 UI typography

Primary font:

- Inter
- Geist Sans
- system sans-serif fallback

Use a modern sans-serif for:

- navigation
- headings
- buttons
- cards
- tables
- forms
- descriptions

## 6.2 Technical typography

Use JetBrains Mono or Fira Code for:

- URLs
- API endpoints
- HTTP methods
- scan IDs
- request payloads
- response snippets
- code
- structured logs
- hashes

Do not use monospace for every heading.

---

# 7. Application Shell

The entire dashboard uses a persistent shell.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ RONIN                         Target: demo.api.local       Ollama ●   User   │
├───────────────┬──────────────────────────────────────────────────────────────┤
│               │                                                              │
│ Overview      │  Page content                                                │
│ Scans         │                                                              │
│ Findings      │                                                              │
│ Endpoints     │                                                              │
│ Agent Graph   │                                                              │
│ Sandbox       │                                                              │
│ Reports       │                                                              │
│ Settings      │                                                              │
│               │                                                              │
│               │                                                              │
│ System Status │                                                              │
└───────────────┴──────────────────────────────────────────────────────────────┘
```

## 7.1 Sidebar

Desktop width:

- 240px expanded
- 72px collapsed

The sidebar should be quiet and stable.

### Sidebar structure

**Brand**

- RONIN wordmark
- small local-status indicator
- optional version number

**Primary navigation**

- Overview
- Scans
- Findings
- Endpoints
- Agent Graph
- Sandbox
- Reports
- Settings

**Bottom utility area**

- Ollama status
- Sandbox status
- backend connection status

### Active navigation

Use:

- subtle surface background
- thin cyan indicator
- primary text

Avoid oversized glowing active states.

---

# 8. Top Header

The top header should communicate global state in one line.

### Left

RONIN logo / current section.

### Center

Target switcher:

```text
Target
https://api.vulnerable.local
```

Show a small `LOCAL` badge when the target is explicitly local/demo infrastructure.

### Right

Compact system indicators:

```text
Ollama      ● Online
Sandbox     ● Ready
```

Then:

- notifications
- user menu

### Important

Do not show long technical model strings permanently in the header.

For example, prefer:

`Ollama · Online`

instead of:

`ollama: qwen2.5-coder:14b`

Open the detailed model and runtime information from a popover or Settings.

---

# 9. Overview Dashboard

The Overview page should answer five questions in under five seconds:

1. What am I testing?
2. Is anything running?
3. How much has been tested?
4. Were vulnerabilities found and verified?
5. What needs my attention?

## 9.1 Header area

Example:

```text
Security Overview
Monitor your API attack surface and validated findings.

Target: https://api.vulnerable.local     Scan active

[ Launch Scan ]     [ Import Collection ]
```

Do not use pseudo-terminal breadcrumbs such as:

`RONIN_OS / MISSION_CONTROL / STATUS_OPTIMAL`

Use normal product navigation language.

---

# 10. KPI Section

Use four cards in one row on desktop.

```text
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Endpoints       │ │ Verified        │ │ Critical        │ │ Validation     │
│                 │ │ Findings        │ │ Findings        │ │ Rate           │
│ 1,284           │ │ 5               │ │ 1               │ │ 100%           │
│ +146 this scan  │ │ +2 this scan    │ │ Requires review │ │ 0 false-pos.   │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

The exact metrics may be populated from the existing scan state/report model.

### KPI hierarchy

- label: small and muted
- value: large and bold
- supporting context: compact muted text
- optional microtrend or icon

Avoid huge graphical icons inside KPI cards.

---

# 11. Active Scan Hero Card

When a scan is running, this should become the dominant dashboard element.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ACTIVE SCAN                                                    RUNNING ●      │
│                                                                              │
│ Vulnerable Demo API                                                         │
│ https://api.vulnerable.local                                                │
│                                                                              │
│ Exploitation                                                                │
│ ████████████████████░░░░░░░░░░░  68%                                       │
│                                                                              │
│ 26 / 38 endpoints tested                     Started 14 minutes ago         │
│                                                                              │
│ Current activity                                                            │
│ Testing BOLA / parameter tampering                                          │
│ GET /api/v1/profile                                                         │
│                                                                              │
│ [ Open Live Scan ]                                      [ Pause ] [ Abort ] │
└──────────────────────────────────────────────────────────────────────────────┘
```

This card should have the most visual emphasis on the Overview page.

Only show `Pause` and `Abort` while a scan is actually active.

---

# 12. Agent Pipeline

The four-agent architecture is a signature feature and should be presented as a clean workflow rather than four unrelated cards.

## 12.1 Visual structure

```text
Orchestrator
     │
     ▼
Recon
     │
     ▼
Exploit
     │
     ▼
Validation
```

For desktop, use a horizontal flow:

```text
[ Orchestrator ] ─── [ Recon ] ─── [ Exploit ] ─── [ Validation ]
     ● done            ● done         ● active          ○ waiting
```

Each node should contain:

- agent name
- one-line role
- status
- current task
- optional execution duration

## 12.2 Agent status treatment

### Active

- cyan status dot
- subtle animated pulse
- no large glow

### Completed

- green check
- low-emphasis styling

### Waiting

- neutral gray

### Error

- red indicator
- explicit error text
- retry action when available

## 12.3 Agent details

Clicking an agent opens a side drawer containing:

- current state
- task
- last action
- endpoint being processed
- tool calls
- elapsed time
- relevant recent logs

Do not place every log line directly on the Overview page.

---

# 13. Main Dashboard Lower Grid

After the active scan and agent pipeline, use a balanced two-column layout.

```text
┌────────────────────────────────────┐ ┌──────────────────────────────────────┐
│ Recent Activity                    │ │ Findings Requiring Attention        │
│                                    │ │                                      │
│ 12:42 Recon discovered endpoint    │ │ Critical  BOLA on /users/{id}       │
│ 12:39 Exploit flagged anomaly      │ │ High      Broken Auth               │
│ 12:37 Validation started PoC       │ │ High      Mass Assignment           │
│ ...                                │ │                                      │
│                                    │ │ [ View all findings ]                │
└────────────────────────────────────┘ └──────────────────────────────────────┘
```

The cards should have equal visual importance.

---

# 14. Recent Activity

Use a clean event timeline.

Each item:

```text
● 12:42
  Recon Agent
  Discovered 6 new endpoints
  /api/v1/users/{id}
```

Optional metadata:

- agent
- timestamp
- event type
- endpoint
- severity if applicable

Use icons sparingly.

Do not style every activity event as a separate bordered card.

---

# 15. Findings Preview

The dashboard should show the most important findings, not the entire vulnerability database.

Recommended columns:

| Severity | Finding | Endpoint | Status | CVSS |
|---|---|---|---|---:|
| Critical | Broken Object Level Authorization | `GET /api/users/{id}` | Verified | 9.1 |
| High | Broken Authentication | `POST /api/auth/verify` | Verified | 8.6 |
| High | Mass Assignment | `PUT /api/profile` | Verified | 7.5 |

### Row behavior

Hover:

- subtle background change

Click:

- open finding detail drawer/page

Quick action:

- copy PoC / curl

Do not display long descriptions inside the table.

---

# 16. Findings Page

The Findings page is a dedicated investigation workspace.

## Header

```text
Findings
5 verified vulnerabilities across 3 scan runs.

[ Search findings ] [ Severity ] [ Category ] [ Scan ]
```

## Finding list

Use large, readable table rows.

Each row should show:

- severity
- title
- OWASP category
- endpoint
- HTTP method
- CVSS score
- validation status
- scan ID
- discovered time

## Finding detail

Prefer a full-width detail page or a large right-side drawer.

Sections:

1. Summary
2. Affected endpoint
3. Why it is vulnerable
4. Reproduction steps
5. Proof of concept
6. Request / response
7. Validation evidence
8. Remediation

### PoC presentation

Use a code block with:

- copy button
- language label
- line numbers when useful
- restrained syntax highlighting

Never place a scrolling code block inside a tiny card.

---

# 17. Scans Page

The Scans page is the historical operational record.

Show:

- scan ID
- target
- start time
- duration
- endpoints discovered
- findings
- critical/high count
- validation rate
- status

Use clear states:

- Running
- Completed
- Paused
- Failed
- Aborted

Selecting a scan opens the scan overview.

---

# 18. Live Scan Page

This page can contain more detailed telemetry than the Overview page.

## Recommended layout

### Header

```text
Scan SCAN-202609-0824
Vulnerable Demo API

Status: Running
68% complete
[ Pause ] [ Abort ]
```

### Left / main

Agent pipeline and current task.

### Right

Scan progress / endpoint queue.

### Bottom

Activity/log viewer.

The log viewer may use a monospace font and terminal-inspired presentation because this is an appropriate context for technical logs.

Still, keep it visually clean and searchable.

---

# 19. Endpoints / Attack Surface Page

The Endpoints page represents the discovered API attack surface.

Use a table/tree model:

```text
GET     /api/v1/users
GET     /api/v1/users/{id}
POST    /api/v1/users
PUT     /api/v1/profile
DELETE  /api/v1/users/{id}
```

Columns:

- method
- endpoint
- parameters
- auth scheme
- test status
- findings

Filters:

- method
- tested / untested
- vulnerable / clean
- tag
- path

Selecting an endpoint opens an endpoint detail view with recent requests, discovered parameters, and linked findings.

---

# 20. Agent Graph Page

The Agent Graph is where the workflow can be visualized more deeply.

This page should show the actual conceptual LangGraph flow:

```text
START
  ↓
ORCHESTRATOR
  ↓
RECON
  ↓
ORCHESTRATOR
  ↓
EXPLOIT
  ↓
VALIDATION (when needed)
  ↓
EXPLOIT / ORCHESTRATOR
  ↓
REPORT
```

The graph should be interactive:

- zoom
- pan
- select node
- inspect state
- view transitions

Do not use the graph as a decorative animation on the dashboard.

---

# 21. Sandbox Page

The Sandbox page represents isolated PoC execution.

Show:

- sandbox status
- runtime/container information
- recent PoC executions
- execution result
- duration
- validation outcome

Example:

```text
Sandbox

Status              Ready ●
Runtime             Alpine Linux
Recent validations  12
False positives     0

POC-0192    BOLA /users/{id}     Verified      320 ms
POC-0191    Auth bypass          Rejected      418 ms
POC-0190    Mass assignment      Verified      290 ms
```

Technical runtime details belong in a secondary information area, not in the main navigation/header.

---

# 22. Reports Page

Reports should feel like deliverables.

Show:

- target
- scan date
- scan ID
- finding count
- severity distribution
- available formats

Actions:

- View HTML report
- Download HTML
- Download JSON

Future formats can be added later.

---

# 23. Settings Page

Use grouped settings rather than one giant form.

Sections:

### Runtime

- Backend connection
- Ollama connection
- selected model

### Sandbox

- Docker availability
- sandbox image
- execution status

### Storage

- database connection status

### UI

- theme options if added later
- compact mode if needed

### Session

- user information
- sign out

Avoid exposing infrastructure values everywhere in the application.

---

# 24. Launch Scan Flow

The launch scan experience should be a proper modal or dedicated page, not a small terminal-like popup.

## Step 1 — Target

```text
Target API URL
[ https://api.example.local                         ]
```

## Step 2 — Input mode

```text
● Base URL discovery
○ OpenAPI specification
○ Postman collection
○ Endpoint list
```

## Step 3 — Scope

Include path patterns.
Exclude path patterns.

## Step 4 — Review

```text
Target           https://api.example.local
Input mode       Base URL discovery
Scope            38 endpoints expected
```

Primary CTA:

`Start Scan`

---

# 25. Empty State

The first-time dashboard should look polished, not blank.

Example:

```text
Your security workspace is ready.

No target APIs have been scanned yet.

Connect a target or import an OpenAPI / Postman collection
and start your first autonomous assessment.

[ Start your first scan ]
```

Use a simple abstract Ronin/samurai-inspired technical mark if a visual is needed.

Avoid a giant cyberpunk illustration.

---

# 26. Loading State

Use skeletons that match the final layout.

Rules:

- no layout jumping
- no giant animated loaders
- preserve table/card geometry
- use very subtle motion

The interface should still look like the product while loading.

---

# 27. Error State

Errors should be actionable.

Example:

```text
Ollama connection unavailable

RONIN cannot reach the local inference service.

[ Retry connection ]      [ View diagnostics ]
```

Do not hide errors inside logs only.

---

# 28. Motion & Interaction

Motion should communicate state rather than provide spectacle.

### Use

- 150–250ms hover transitions
- subtle progress animation
- status pulse for active agent
- drawer slide-in
- table row hover
- smooth filter changes

### Avoid

- constant neon glows
- excessive particle effects
- animated borders
- screen-wide scanning animations
- large bouncing icons
- parallax

The UI should feel fast even when the scan itself is slow.

---

# 29. Responsive Design

## Desktop

Primary experience.

Recommended content max width:

- 1440–1600px for large monitors

Content padding:

- 32px desktop
- 24px tablet
- 16px mobile

## Tablet

- collapse sidebar where needed
- reduce KPI columns
- maintain readable table columns

## Mobile

- off-canvas navigation
- stacked KPI cards
- active scan card first
- agent pipeline becomes vertical
- tables become cards or horizontally scrollable where appropriate

Do not shrink desktop layouts until they are unreadable.

---

# 30. Spacing System

Use a consistent 4px or 8px spacing scale.

Suggested values:

- 4px
- 8px
- 12px
- 16px
- 20px
- 24px
- 32px
- 40px
- 48px

Major dashboard sections should usually have 24–32px vertical spacing.

---

# 31. Border Radius

Use restrained rounding.

Suggested:

- cards: 10–12px
- inputs: 8px
- buttons: 8px
- badges: 999px
- dialogs: 14–16px

Do not round every element heavily.

---

# 32. Card Design

Primary card:

- solid dark surface
- 1px subtle border
- 12px radius
- moderate internal padding
- no default shadow

Hover:

- slightly lighter surface
- optional border emphasis

Selected:

- subtle cyan indicator

Avoid glassmorphism across the whole product.

A little transparency is acceptable for overlays, but primary content should remain crisp and opaque.

---

# 33. Buttons

## Primary

Use cyan for the primary action.

Examples:

- Launch Scan
- Start Scan
- Save Settings
- Retry Connection

## Secondary

Neutral outlined or low-contrast surface button.

## Destructive

Red only for destructive actions such as Abort/Delete.

Never use red as a generic accent.

---

# 34. Severity System

Severity must be extremely consistent across the entire application.

### Critical

- red/pink accent
- label: `CRITICAL`

### High

- orange accent
- label: `HIGH`

### Medium

- yellow accent
- label: `MEDIUM`

### Low

- blue accent
- label: `LOW`

Severity color should appear in:

- badges
- small indicators
- chart segments
- left-edge row indicator when useful

Do not tint entire rows or entire cards with severity colors.

---

# 35. Data Visualization

Use charts only when they improve comprehension.

Recommended dashboard chart:

### Severity distribution

A compact horizontal distribution:

```text
Critical  █
High      ████
Medium    ███████
Low       █████████
```

Avoid decorative charts with no operational meaning.

A chart should answer a question such as:

- What severity mix exists?
- How has the finding count changed?
- How much of the attack surface has been tested?

---

# 36. Navigation Labels

Use product language, not theatrical language.

### Use

- Overview
- Scans
- Findings
- Endpoints
- Agent Graph
- Sandbox
- Reports
- Settings

### Avoid

- Mission Control
- Attack Command
- War Room
- Recon Deck
- Mission Center
- Status Optimal

RONIN already has a strong identity. The navigation does not need role-play language.

---

# 37. Dashboard Information Hierarchy

The Overview page should follow this exact priority order:

```text
1. Page title + target + scan state
2. KPI summary
3. Active scan / progress
4. Agent pipeline
5. Recent activity + important findings
6. Secondary statistics
```

Never place dense logs above the most important scan/finding information.

---

# 38. Recommended Dashboard Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ RONIN          Target: api.example.local                     Ollama ●   Sandbox ●   User │
├────────────────┬─────────────────────────────────────────────────────────────────────────┤
│                │                                                                         │
│  Overview      │  Security Overview                                                      │
│  Scans         │  Monitor your API attack surface and validated findings.                │
│  Findings      │                                                                         │
│  Endpoints     │  [ Target selector ]                         [ Launch Scan ]             │
│  Agent Graph   │                                                                         │
│  Sandbox       │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐            │
│  Reports       │  │ Endpoints  │ │ Verified   │ │ Critical   │ │ Validation │            │
│  Settings      │  │ 1,284      │ │ 5          │ │ 1          │ │ 100%       │            │
│                │  └────────────┘ └────────────┘ └────────────┘ └────────────┘            │
│                │                                                                         │
│                │  ┌────────────────────────────────────────────────────────────────┐   │
│                │  │ ACTIVE SCAN                                      RUNNING ●       │   │
│                │  │ Vulnerable Demo API                                             │   │
│                │  │ Exploitation  █████████████████░░░░░  68%                     │   │
│                │  │ 26 / 38 endpoints tested                                      │   │
│                │  │ GET /api/v1/profile                                            │   │
│                │  │                                        [ Open ] [ Pause ]     │   │
│                │  └────────────────────────────────────────────────────────────────┘   │
│                │                                                                         │
│                │  AGENT PIPELINE                                                         │
│                │  [Orchestrator] ── [Recon] ── [Exploit] ── [Validation]                │
│                │        ● done          ● done        ● active        ○ waiting        │
│                │                                                                         │
│                │  ┌────────────────────────────────┐ ┌──────────────────────────────┐   │
│                │  │ Recent Activity                │ │ Findings Requiring Attention │   │
│                │  │ 12:42 Recon ...                │ │ CRITICAL  BOLA /users/{id}   │   │
│                │  │ 12:39 Exploit ...              │ │ HIGH      Broken Auth        │   │
│                │  │ 12:37 Validation ...           │ │ HIGH      Mass Assignment    │   │
│                │  └────────────────────────────────┘ └──────────────────────────────┘   │
│                │                                                                         │
└────────────────┴─────────────────────────────────────────────────────────────────────────┘
```

This is the target visual hierarchy.

---

# 39. Accessibility

The dashboard must remain usable without relying on color alone.

Use:

- text labels for severity
- icons with labels where needed
- visible focus rings
- keyboard navigation
- semantic buttons and links
- sufficient text contrast

Interactive controls must have accessible names.

---

# 40. Keyboard UX

Because RONIN is developer/security oriented, keyboard workflows should be first-class.

Recommended shortcuts:

- `/` → global search
- `g then o` → Overview
- `g then s` → Scans
- `g then f` → Findings
- `g then e` → Endpoints
- `n` → Launch new scan
- `Esc` → close drawer/modal

Display shortcuts unobtrusively in menus/tooltips.

---

# 41. Copy-to-Clipboard UX

Technical values should be easy to copy.

Targets:

- target URL
- endpoint
- scan ID
- finding ID
- curl PoC
- Python PoC
- request body

After copying:

`Copied`

Use a subtle confirmation rather than a disruptive toast for every copy operation.

---

# 42. Security/Product Trust Signals

RONIN's local-first architecture is a product differentiator and should be visible in a calm way.

Example status strip:

```text
Private by default · Local inference · Isolated PoC validation
```

Do not overstate this with large banners on every page.

Detailed runtime state can be opened from the system status menu.

---

# 43. Content Guidelines

Use concise product language.

### Prefer

`5 verified findings`

instead of

`5 VERIFIED CRITICAL & HIGH EXPLOITATIONS DETECTED!!!`

Prefer:

`Testing BOLA authorization behavior`

instead of:

`GENERATING MASS ASSIGNMENT POC PAYLOADS...`

Prefer:

`Validation Agent · running`

instead of:

`AGENT: VALIDATION / EXECUTING...`

RONIN should sound technically confident without shouting.

---

# 44. Mock Data Rules

When building the frontend before backend integration, use realistic but clearly structured mock data.

Mock data should represent the product's actual concepts:

### Scan

- scan ID
- target
- input mode
- phase
- progress
- endpoint counts
- timestamps
- status

### Agent

- name
- role
- status
- task
- endpoint
- start time
- elapsed time

### Endpoint

- method
- path
- parameters
- authentication scheme
- test status
- findings

### Finding

- finding ID
- title
- severity
- CVSS
- category
- endpoint
- PoC status
- reproduction steps
- remediation

Do not invent UI-specific data structures that are unrelated to the existing RONIN architecture.

---

# 45. Frontend Implementation Direction

The frontend is expected to be a React/Next.js web dashboard with a FastAPI backend.

The implementation can use:

- Next.js / React
- TypeScript
- Tailwind CSS
- shadcn/ui or equivalent accessible primitives
- Lucide icons
- Recharts for charts
- React Flow or equivalent for Agent Graph

These libraries should support the design; they must not determine the design.

Do not produce default shadcn dashboards with minor color changes.

---

# 46. Component Architecture

Suggested component hierarchy:

```text
app/
├── layout
├── overview
│   ├── OverviewHeader
│   ├── MetricGrid
│   ├── ActiveScanCard
│   ├── AgentPipeline
│   ├── RecentActivity
│   └── FindingsPreview
├── scans
│   ├── ScanTable
│   ├── ScanFilters
│   └── ScanDetail
├── findings
│   ├── FindingsTable
│   ├── FindingFilters
│   ├── FindingDrawer
│   └── PocViewer
├── endpoints
│   ├── EndpointTable
│   └── EndpointDetail
├── agents
│   ├── AgentGraph
│   └── AgentInspector
├── sandbox
├── reports
└── settings
```

Shared UI:

```text
components/
├── AppShell
├── Sidebar
├── Header
├── StatusDot
├── SeverityBadge
├── StatusBadge
├── CopyButton
├── ProgressBar
├── EmptyState
├── Skeleton
├── ErrorBanner
└── Drawer
```

Keep page-level composition separate from generic UI primitives.

---

# 47. State Management

The frontend should support these major global states:

- no active scan
- active scan
- scan completed
- scan failed
- no findings
- findings available
- Ollama unavailable
- sandbox unavailable

The UI must derive status from structured application state rather than visual-only flags.

---

# 48. Real-Time Updates

The dashboard should be designed to support real-time scan updates.

The frontend should be able to update:

- scan progress
- active phase
- active agent
- active endpoint
- newly discovered endpoints
- suspected findings
- validated findings
- sandbox execution status
- scan completion

Use polling, SSE, or WebSocket based on the backend implementation.

The visual system should remain stable while data changes.

---

# 49. Do / Don't Checklist

## DO

- use strong hierarchy
- use modern typography
- keep technical data monospace
- use restrained cyan accents
- make findings easy to scan
- make the current scan state obvious
- make the four agents understandable
- show detailed telemetry on dedicated pages
- use whitespace intentionally
- make controls obvious
- prioritize verified security outcomes

## DON'T

- do not copy a terminal window into the browser
- do not use giant all-caps system labels everywhere
- do not outline every panel in neon cyan
- do not use glow effects as the primary hierarchy mechanism
- do not make every card a different color
- do not cram logs, findings, agents, KPIs, and endpoint lists into one viewport
- do not reduce font size to fit more content
- do not use cyberpunk decorations that do not communicate information
- do not make the interface look like a game HUD
- do not create generic SaaS cards with arbitrary AI-generated metrics

---

# 50. Final Design Principle

**RONIN should look like a security product, not a security-themed website.**

The frontend should make a security engineer immediately understand:

> **What is being tested, what RONIN is doing, what it discovered, what was verified, and what requires attention.**

The visual identity should come from:

- precise typography
- restrained dark surfaces
- technical data presentation
- subtle cyan interaction states
- consistent severity semantics
- strong spacing and hierarchy
- clear agent visualization
- high-quality interaction design

Not from:

- excessive glow
- terminal role-play
- dense borders
- tiny text
- decorative cyber effects

The goal is a dashboard that looks credible in a security engineering workflow, while still feeling unmistakably like RONIN.

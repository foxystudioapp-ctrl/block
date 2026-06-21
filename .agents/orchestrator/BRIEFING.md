# BRIEFING — 2026-06-20T18:27:00+03:00

## Mission
Coordinate the team to resolve the logic errors, performance/cleanup bugs, and UI/UX/translation issues across all games.

## 🔒 My Identity
- Archetype: team_orchestrator
- Roles: orchestrator, user_liaison, human_reporter, successor
- Working directory: c:\Users\askar\OneDrive\Masaüstü\block\.agents\orchestrator
- Original parent: main agent
- Original parent conversation ID: 6991c023-80fd-4f22-b49a-4356ef317e7e

## 🔒 My Workflow
- **Pattern**: Project
- **Scope document**: c:\Users\askar\OneDrive\Masaüstü\block\PROJECT.md
1. **Decompose**: We split the scope into:
   - Milestone 1: Logic Errors (Phase 2)
   - Milestone 2: Cleanup Standardization (Phase 3)
   - Milestone 3: UI/UX & Translation (Phase 4)
2. **Dispatch & Execute**:
   - **Delegate (sub-orchestrator)**: Spawn a sub-orchestrator for each milestone to manage the Explorer -> Worker -> Reviewer loop.
3. **On failure** (in this order):
   - Retry: nudge stuck agent or re-send task
   - Replace: spawn fresh agent with partial progress
   - Skip: proceed without (only if non-critical)
   - Redistribute: split stuck agent's remaining work
   - Redesign: re-partition decomposition
   - Escalate: report to parent (sub-orchestrators only, last resort)
4. **Succession**: Self-succeed at 16 spawns, write handoff.md, spawn successor.
- **Work items**:
  - M1: Logic Errors (Phase 2) [in-progress]
  - M2: Cleanup Standardization (Phase 3) [pending]
  - M3: UI/UX & Translation (Phase 4) [pending]
- **Current phase**: 1
- **Current focus**: Milestone 1 - Logic Errors (Phase 2)

## 🔒 Key Constraints
- Never write, modify, or create source code files directly (only agents/ metadata).
- Never run build/test commands ourselves.
- Binary veto on Forensic Auditor.
- Hard deadline: 20 minutes from dispatch for subagents.
- Never reuse a subagent after it has delivered its handoff — always spawn fresh.

## Current Parent
- Conversation ID: 6991c023-80fd-4f22-b49a-4356ef317e7e
- Updated: not yet

## Key Decisions Made
- Decomposed the project into 3 milestones matching Phases 2, 3, and 4 from the request.
- Will spawn sub-orchestrators for milestones to maintain clean separation of concerns.

## Team Roster
| Agent | Type | Work Item | Status | Conv ID |
|---|---|---|---|---|
| sub_orch_m1 | self | Milestone 1 sub-orchestrator | in-progress | 099c1d35-eefe-46d4-b26b-7712f2d3c73e |
|-------|------|-----------|--------|---------|

## Succession Status
- Succession required: no
- Spawn count: 1 / 16
- Pending subagents: 099c1d35-eefe-46d4-b26b-7712f2d3c73e
- Predecessor: none
- Successor: not yet spawned

## Active Timers
- Heartbeat cron: 94e02040-bf71-41ca-85ab-250e037c9860/task-39
- Safety timer: 94e02040-bf71-41ca-85ab-250e037c9860/task-77
- On succession: kill all timers before spawning successor
- On context truncation: run `manage_task(Action="list")` — re-create if missing

## Artifact Index
- c:\Users\askar\OneDrive\Masaüstü\block\.agents\orchestrator\plan.md — Detailed execution steps
- c:\Users\askar\OneDrive\Masaüstü\block\.agents\orchestrator\progress.md — Status and iteration tracking
- c:\Users\askar\OneDrive\Masaüstü\block\.agents\orchestrator\ORIGINAL_REQUEST.md — Original request history
- c:\Users\askar\OneDrive\Masaüstü\block\PROJECT.md — Global project plan and milestones

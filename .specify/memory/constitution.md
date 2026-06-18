<!--
SYNC IMPACT REPORT
==================
Version change: 1.0.0 → 1.1.0
Bump type: MINOR — new principle added (VI. Review Discipline), Engineering Standards
  section added, Principle V materially expanded with explicit AI usage obligations.

Modified principles:
  - V. AI-Assisted with Mandatory Self-Review → V. AI Usage Rules
    (expanded: spec-first prompting, build verification, commit message authorship,
    reflection itemization; no semantic removals)

Added:
  - Principle VI: Review Discipline (new — self-review checklist, commit traceability,
    PR standards, advisory-only AI review output)
  - Section: Engineering Standards (TypeScript hygiene, error visibility, code quality)

Removed: none

Templates reviewed:
  - .specify/templates/plan-template.md ✅ aligned (Constitution Check gate present)
  - .specify/templates/spec-template.md ✅ aligned (acceptance criteria structure unchanged)
  - .specify/templates/tasks-template.md ✅ aligned (task traceability model consistent)

Deferred TODOs: none
-->

# Scribble Constitution

## Core Principles

### I. Brownfield Discipline

Before writing any new code, the implementer MUST read and understand the relevant
existing files. Discovery notes documenting at least 3 behavioral gaps and at least
2 explicit assumptions are required before any feature work begins. New code MUST
extend the starter — not replace it. Rewriting starter files wholesale, adding
unjustified top-level dependencies, or performing unrelated refactors are prohibited.

**Rationale**: The starter encodes intentional architectural choices. Ignoring it
leads to drift between spec, plan, tasks, and implementation.

### II. Spec-Driven Development (NON-NEGOTIABLE)

Every implementation slice MUST be preceded by an accepted spec entry with explicit
acceptance criteria. The order is always: Specify → Clarify → Plan → Tasks →
Implement → Validate. Code MUST NOT be written for behavior not yet captured in the
spec. Deviations discovered during implementation MUST be documented in the spec
before proceeding, not after.

**Rationale**: The spec is the contract between the developer and the reviewer.
Undocumented behavior cannot be reviewed, tested, or traced.

### III. Deterministic Game Rules

All game-rule outputs — word selection, drawer assignment, scoring, guess comparison
— MUST be deterministic and exactly match the spec. Specifically:
- Words MUST be selected from the starter seed list only (`rocket`, `pizza`, `castle`,
  `guitar`, `sunflower`); no custom or random word packs.
- Correct guesses are compared case-insensitively after trimming whitespace.
- Correct guesses score exactly 100 points; incorrect guesses score 0.
- The host (room creator) is the drawer for the first round.
- Lobby polling interval MUST be approximately 2 seconds.

**Rationale**: Determinism ensures multi-browser validation is reproducible and
reviewers can verify behavior against the spec without ambiguity.

### IV. Polling-Based Sync Only

State synchronization MUST use periodic HTTP polling against the existing REST
endpoints. WebSockets, Server-Sent Events, long polling, or any other push-based
mechanism are out of scope and MUST NOT be introduced.

**Rationale**: The scope boundary keeps complexity focused on game logic and Spec Kit
workflow skills, not on infrastructure decisions.

### V. AI Usage Rules

AI coding assistance is permitted and encouraged. The following rules are
NON-NEGOTIABLE:

- **Spec-first prompting**: The developer MUST provide the relevant spec section or
  acceptance criteria as context when prompting the AI. Freeform "just build it"
  prompts that bypass the spec are prohibited.
- **Build verification**: Every AI-generated change MUST compile and pass
  `npm run build` in the relevant directory before being committed. The developer
  MUST NOT commit code they have not personally run.
- **Explainability gate**: Any AI-generated code the developer cannot explain line
  by line MUST be rewritten until they can. Unexplained complexity is prohibited.
- **Commit message authorship**: Commit messages MUST be written by the developer,
  not generated verbatim by the AI. The message MUST reflect the developer's own
  understanding of the change.
- **Reflection itemization**: The reflection report MUST list each significant
  AI-assisted decision, what was accepted as-is, what was modified, and why.
- **Scope enforcement**: The developer MUST reject any AI suggestion that introduces
  out-of-scope work (e.g., WebSockets, databases, new libraries) even if the AI
  frames it as an improvement.

**Rationale**: The lab evaluates the developer's ability to direct and critically
assess AI output. Unreviewed AI output does not demonstrate this skill.

### VI. Review Discipline (NON-NEGOTIABLE)

Before every commit, the developer MUST perform a self-review against the spec:

- Confirm the change addresses exactly one task or acceptance criterion.
- Confirm no code exists that is not traceable to a spec entry or this constitution.
- Confirm no out-of-scope behavior has been introduced, even incidentally.
- Confirm the build passes in the affected directory.
- Confirm manually validated behavior matches the spec (two-browser test where applicable).

**Commit standards**:
- Every commit message MUST reference the task ID or scenario (e.g., `T012`, `S1-AC3`).
- "Fix" commits MUST identify the root cause, not just the symptom.
- Commits that bundle unrelated changes are prohibited.

**PR standards**:
- The PR description MUST link to the spec section(s) addressed.
- The PR MUST include evidence of manual validation (screenshots or a written
  walkthrough) for each scenario covered.
- AI reviewer output (e.g., automated review comments) MUST be treated as advisory
  only; the developer remains solely responsible for correctness.

**Rationale**: Review discipline is what separates a verifiable implementation from
an untrustworthy one. Without it, spec traceability is fiction.

## Engineering Standards

**TypeScript hygiene**:
- `strict` mode MUST be enabled in both `frontend/tsconfig.json` and
  `backend/tsconfig.json`. No `@ts-ignore` or `@ts-expect-error` suppressions
  without an inline comment explaining the exact reason.
- `any` is prohibited except at integration boundaries (e.g., untyped third-party
  data) and MUST be annotated with a comment justifying the exception.
- Dead code (unused variables, unreachable branches, commented-out blocks) MUST NOT
  be committed.

**Error visibility**:
- Every user-facing error state (invalid input, failed fetch, room not found) MUST
  render a visible, descriptive message in the UI. Silent failures are prohibited.
- Backend error responses MUST use appropriate HTTP status codes (4xx for client
  errors, 5xx for server faults) and a JSON body with a human-readable `message`
  field.

**Code quality**:
- Functions and React components MUST have a single, clear responsibility. Functions
  exceeding ~40 lines are a signal to decompose, not a hard limit.
- Game-logic functions (guess comparison, scoring, word selection) MUST be pure and
  independently testable with Vitest.
- No inline magic numbers or strings for game constants — extract them as named
  constants at the module level.

## Technology Stack Constraints

**Frontend**: Vite + React + TypeScript. No new state-management or routing libraries
beyond what the starter ships. Components MUST be written in TypeScript with strict
mode enabled.

**Backend**: Node.js + Express + TypeScript. All room state is held in memory only;
no database, persistent storage, or external services are permitted. Restarting the
backend clears all rooms — this is expected behavior, not a bug.

**Testing**: Vitest is available in both `frontend/` and `backend/`. Tests are
encouraged for deterministic game-logic functions (guess comparison, scoring, word
selection). Both `npm run build` invocations MUST pass before any PR submission.

**Out of Scope — do not build, spec, or plan these**:
- WebSockets, real-time sync, or Server-Sent Events
- Databases or persistent storage
- Authentication, accounts, or sessions
- Deployment, hosting, CI, or Docker
- Multiple rounds, drawer rotation, timers, countdowns, or scoring bonuses
- Custom or random word packs, spectator mode, or moderation features
- Room passwords or invite links

## Development Workflow

1. **Discovery** — read relevant starter files; document gaps and assumptions.
2. **Specify** — run `/speckit-specify`; capture acceptance criteria per scenario.
3. **Clarify** — run `/speckit-clarify` to resolve ambiguity before planning.
4. **Plan** — run `/speckit-plan`; produce state model, data flow, and file-level plan.
5. **Tasks** — run `/speckit-tasks`; decompose into ordered, testable slices.
6. **Implement** — complete one meaningful slice at a time and commit it.
7. **Validate** — verify acceptance criteria with two browser tabs; confirm builds pass.
8. **Reflect** — document AI usage, tradeoffs, and deviations before submitting the PR.

Commits MUST be granular and traceable to a specific task or acceptance criterion.
The PR diff is the primary review artifact.

## Governance

This constitution supersedes all other practices and informal conventions in this
repository. Any amendment requires:
1. Updating this file with a new version per semantic versioning:
   - MAJOR: principle removal or backward-incompatible redefinition.
   - MINOR: new principle or materially expanded guidance.
   - PATCH: clarifications, wording fixes, non-semantic refinements.
2. Updating `LAST_AMENDED_DATE` to the date of the change.
3. Propagating changes to dependent templates (plan, spec, tasks) as needed.
4. Noting the change in the Sync Impact Report comment at the top of this file.

All PRs and reviews MUST verify compliance with these principles. Complexity not
justifiable by a spec entry or principle MUST be removed before merge. Use
`AGENTS.md` for runtime AI agent guidance.

**Version**: 1.1.0 | **Ratified**: 2026-06-18 | **Last Amended**: 2026-06-18

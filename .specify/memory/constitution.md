<!--
Sync Impact Report
═══════════════════
Version change: N/A → 1.0.0 (initial ratification)
Modified principles: N/A (first version)
Added sections:
  - Core Principles (8 principles)
  - Implementation Guardrails
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ no update needed (Constitution Check is dynamically filled)
  - .specify/templates/spec-template.md ✅ no update needed (generic structure compatible)
  - .specify/templates/tasks-template.md ✅ no update needed (phase structure accommodates all principle-driven task types)
  - .specify/templates/commands/ ✅ no command files to update
  - README.md ✅ no constitution references to update
Follow-up TODOs: none
-->

# PayMe Constitution

## Core Principles

### I. Financial Integrity

- All money values MUST be stored and processed as integer minor units (e.g., cents). Floating-point representation of monetary amounts is forbidden at every layer.
- Financial data MUST remain internally consistent across balances, transactions, and payment-request records at all times.
- Partial financial updates are forbidden. A write either succeeds completely or has no effect.

### II. Atomic and Fail-Safe Operations

- Every state-changing financial operation MUST be atomic. If any step within the operation fails, the entire operation MUST roll back to the last valid state.
- No user action may leave the system in a partially updated state.
- Atomicity applies across all layers that participate in a mutation (database, cache, external calls).

### III. Auditability

- Critical business actions (payment requests created, fulfilled, declined; balance changes; permission escalations) MUST generate structured audit log entries.
- Audit logs MUST include at minimum: actor, action, target resource, timestamp, and outcome.
- Logs MUST support debugging, traceability, and future investigation without requiring code changes.

### IV. Backend-Enforced Validation and Authorization

- The backend MUST enforce validation, permissions, and business rules for every mutation. No client request is trusted by default.
- Client-side validation exists solely to improve user experience and MUST NOT be treated as a security or correctness boundary.
- Authorization checks MUST occur on every authenticated endpoint before any state change.

### V. User Experience Quality

- The product MUST be mobile-first and fully responsive across common viewport sizes.
- Every critical user flow MUST account for loading, success, error, empty, and disabled states. Omitting any of these states in a critical flow is a defect.
- Duplicate form submissions MUST be prevented through idempotency mechanisms or UI guards.

### VI. Testing Discipline

- Critical user journeys MUST have end-to-end test coverage before a feature is considered complete.
- Financial logic and state-transition regressions are release blockers — they MUST be fixed before any deployment.
- Tests MUST be deterministic; flaky tests MUST be quarantined and fixed promptly.

### VII. Simplicity and Maintainability

- Prefer the simplest architecture that preserves correctness, clarity, and demo quality.
- Avoid unnecessary abstraction layers and speculative infrastructure. Every abstraction MUST justify its existence with a concrete, current need.
- Business rules MUST be centralized — never duplicated across frontend and backend.
- Reuse UI components and utility functions; extract shared logic before copy-pasting.

### VIII. Documentation and AI Discipline

- The constitution, specs, plans, and tasks are the authoritative source of truth for project intent and constraints.
- AI-generated code and documentation MUST be reviewed against this constitution before acceptance.
- Assumptions and trade-offs MUST be documented explicitly. Undocumented assumptions are treated as defects when discovered.

## Implementation Guardrails

- Use TypeScript across the entire codebase (frontend and backend).
- Build PayMe as a responsive web application (no native mobile targets).
- Store all monetary values as integer minor units — no exceptions.
- Use database transactions for every financial mutation.
- Centralize domain rules and validations in shared modules; never scatter business logic across route handlers or UI components.
- Prefer reusable, composable UI components over one-off implementations.
- Cover every critical user journey with at least one end-to-end test.
- Document assumptions before implementing any ambiguous behavior; when in doubt, ask rather than guess.

## Governance

- This constitution supersedes all other project guidance. In case of conflict between the constitution and any spec, plan, or task, the constitution wins.
- Amendments require: (1) a written proposal describing the change and rationale, (2) review and approval, and (3) a version bump following semantic versioning (MAJOR for principle removals or incompatible redefinitions, MINOR for new principles or material expansions, PATCH for clarifications and wording fixes).
- Every spec and plan MUST include a Constitution Check gate that verifies alignment with these principles before implementation begins.
- Complexity that violates the Simplicity principle MUST be justified in writing and tracked in the plan's Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-04-08 | **Last Amended**: 2026-04-08

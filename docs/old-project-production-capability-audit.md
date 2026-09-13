# Removal Work: Old-to-New Production Capability Audit

## Scope and rule

The old repository is a backend, feature, workflow, and integration reference only. The current Removal Work interface, branding, navigation, layout, components, and user journey remain authoritative. No old visual code should be migrated.

## End-to-end architecture comparison

| Layer | Old project | Current project | Decision | Priority |
|---|---|---|---|---|
| URL ingestion | Google URL list, structured review imports, persisted batches | Single and 25-link client bulk input | Adapt persisted batch mechanics; retain current interface | P0 |
| Platform detection | Google-only validation | Google live; other hosts recognized honestly | Build adapter registry; do not claim unsupported actions | P1 |
| Business discovery | Places lookup and GBP account/location discovery | Connector-backed Places lookup | Keep current public lookup; adapt official GBP discovery | P0 |
| Review identity | GBP review resource IDs; weaker synthetic fallback for imports | External ID plus content fingerprint | Keep current fingerprint; add identity provenance and verification state | P0 |
| Review persistence | Separate reviews and cases | Normalized review_records plus review_cases foundation | Keep current additive model | P0 |
| AI analysis | One-pass batch classification; multi-provider routing | Stronger two-pass adversarial analysis | Keep current analysis; adapt error classification and audit metadata | P0 |
| Evidence | AI evidence strings and uploaded files | AI evidence/counter-evidence/missing evidence | Keep current structured evidence; later adapt secure attachments | P1 |
| Reports | Case notes/status plus SQL analytics | Versioned report_drafts foundation | Build current-native report workflow; do not copy old case UI | P0 |
| Appeals | Appeal rounds, references, events | case_appeals foundation only | Adapt server workflow and transition guards | P1 |
| Outcomes | GBP re-sync and observed absence | Manual status; observed_absent_at foundation | Adapt only as observed absence; never call it verified Google removal | P0 |
| Bulk jobs | Persisted batches, per-item state, retry/resume/cancel | Browser-only two-worker fan-out | Rewrite as durable server queue with proper leases/circuit breaker | P0 |
| Analytics | Database aggregate RPC | Client aggregation over capped rows | Adapt user-scoped SQL aggregation | P2 |
| Notifications | In-app operational notifications | None | Adapt after durable jobs exist | P2 |
| Team workspaces | Businesses/members/roles | User-owned records and separate admin roles | Ignore unless product explicitly adds teams | P3 |

## Useful old capabilities to carry forward

### P0 — core production path

1. Official Google Business Profile authorization with `business.manage`, consent, token exchange, refresh, revocation, account discovery, location discovery, and paginated review retrieval.
2. Strict OAuth state signing with expiry, rewritten without the old hardcoded fallback and with an allowlisted callback origin.
3. Stable GBP resource identifiers and full managed-location review pagination.
4. Durable review normalization and deduplication, combining GBP external IDs with the current content fingerprint and canonical URL.
5. Server-side eligibility and truthfulness guards: a negative review alone is not reportable; weak evidence stays human-review or not-reportable.
6. Bounded, persistent processing jobs and per-item progress that survive navigation and browser closure.
7. Database-backed single-flight leases, atomic item claiming, idempotency keys, retry counters, retry-after timestamps, cancellation, resume, and stale-work recovery.
8. AI circuit breakers: terminal 400/401/402/403 failures stop the run; 429/5xx use bounded backoff; background 402/403 pauses persist until an owner action or one later probe succeeds.
9. Versioned report drafts, evidence mapping, legitimate route selection, immutable report/status events, and explicit prepared/submitted/reviewing/outcome distinctions.
10. Outcome reconciliation based on authoritative managed-profile data. A missing review is stored as observed absence, not proof of why it disappeared or proof Google accepted a report.

### P1 — important workflow capabilities

1. Appeal rounds with sequencing guards, supporting evidence, external references, and immutable events.
2. Human-review routing for uncertain identity, weak evidence, contradictory analysis, or platform limitations.
3. Platform adapter capability declarations for discovery, review retrieval, report preparation, submission/handoff, status, and appeal support.
4. Prompt, policy, and model audit records: prompt version, policy version, model, input hash, output, duration, confidence, and decision.
5. Secure evidence attachments with user-scoped paths, private storage, signed reads, type/size validation, and event logging.
6. Strong Google error mapping for disabled APIs, missing GBP approval, expired authorization, access denial, quota, and rate limits.

### P2 — operational improvements

1. Database-side analytics aggregates and indexed filtered lists.
2. Notifications for completed jobs, blocked jobs, report state changes, appeal changes, and observed outcomes.
3. Controlled cache of verified business/location identity and canonical URL resolution.
4. Public response drafting for legitimate negative reviews, only if retained as a product capability.
5. Search indexes for review text/reviewer fields when data volume justifies them.

### P3 — defer or ignore

1. Old workspace/team architecture unless a team product is explicitly required.
2. Old UI components, pages, routes, sidebar, colors, cards, typography, and animations.
3. Old broad settings and CRM-style management surfaces.
4. Old provider defaults and hardcoded/deprecated model names.

## Old implementation risks that must not be copied

- Hardcoded OAuth state fallback secret.
- Plaintext OAuth tokens without application-level encryption/key rotation.
- Callback URL construction that trusts arbitrary forwarded hosts.
- Direct Places API key calls where the authorized connector is the supported infrastructure.
- Treating a review missing from a five-review Places sample as removed.
- Treating observed absence from GBP as proof a specific report caused removal.
- Cron routes outside the public scheduler prefix.
- Unbounded loops over every connection or every running job in one invocation.
- Leases that are only timestamps without atomic claiming or a unique active-job constraint.
- Client polling as the worker and client-only batch limits.
- Generic retry of malformed output or terminal AI failures.
- Automatically classifying omitted model results as a completed no-violation decision.
- Reading large review sets into the browser for analytics.
- Broad profile/role read policies from the old multi-tenant model.
- Synthetic IDs containing list position, which change between fetches.

## Current project strengths to preserve

- Current Removal Work interface and product journey.
- Connector-backed real Google Places lookup with honest sample limitations.
- Two-pass adversarial AI analysis with evidence, counter-evidence, missing evidence, confidence, severity, rejection risk, and explicit non-reportable outcomes.
- User-owned RLS model and separate protected role table.
- Normalized review_records, content fingerprints, canonical source URLs, case events, report drafts, and appeal schema added additively.
- No fake submission, no fake removal, and no unsupported platform claim.

## Verified gaps before the next implementation phase

- No configured Google Business Profile OAuth credentials are currently available in the new project, so official managed-profile sync cannot be activated yet.
- The old repository contains code for GBP authorization, but code alone does not prove that Google's Business Profile API access/quota is approved for production.
- The current Google connector is configured for public Places data; it does not provide full review pagination or reporting/removal APIs.
- No durable queue, worker route, scheduler, notification system, AI-run audit table, policy registry, report-event model, evidence storage, or appeal server workflow is active yet.
- The existing bulk screen is not durable and its limit is client-side.
- Current reports are derived from a capped case list rather than a database aggregate.
- Public Places snippets cannot prove an individual pasted review permalink was found unless a stable review identifier matches.

## Safe implementation order

1. Finish P0 review identity and one-review transaction, including identity confidence/provenance and server-side reportability guards.
2. Add AI/prompt/policy audit records and versioned evidence/report decisions.
3. Add explicit report and report-event state machines plus appeal functions.
4. Add durable bounded queues and migrate the current bulk experience onto them.
5. Add the official Google Business Profile connection only after credentials and API approval are verified.
6. Add scheduled managed-profile sync and honest observed-outcome reconciliation.
7. Add notifications and database analytics.
8. Add more platform adapters only when each platform's legitimate capabilities are verified.

## Production acceptance gate

A capability is complete only when it passes migration/RLS/grant review, two-user isolation, real authorized API calls, real AI structured output, idempotent retry testing, terminal-error testing, status-history verification, and desktop/mobile regression checks without changing the current visual system.

# Roadmap

## Done
- Added the secure Google Business Profile consent foundation: encrypted token storage, expiring one-time OAuth state, PKCE, owner-scoped connection controls, and a Locations connection panel
- Added a durable owner-scoped bulk queue with deduplication, leases, bounded three-item passes, persisted queued/discovering/identified/analyzing/report-ready counts, and exact-identity gating
- Hardened the Google report handoff so only reportable analyses with an exact verified review identity can open the real Google review
- Chose a safe portability path: keep the current Lovable backend operational while preserving additive SQL migrations for a later controlled move to the user's own database/VPS; never use credentials exposed in chat
- Completed a second exhaustive old-versus-new production capability audit with a P0–P3 migration matrix, security/reliability rejection list, dependency blockers, and safe implementation order; no old UI was copied
- Complete UI finishing pass with unified spacing, containers, grids, cards, controls, typography rhythm, and responsive structure
- Confirmed Removal Work superadmin account with private profile, server-protected role, and verified password login
- Video-matched navy palette, spotlight card depth, complete light/dark contrast, and split animated login experience
- Exact compact reference landing structure from navigation through footer, with matching icon artwork and motion
- Paste link → real Google lookup → AI policy check (two-pass, real gateway)
- Sign in (email + Google), saved cases in the database
- Reviews, Reports, Locations dashboards with real status tracking
- Bulk scan screen with per-link status
- Quality pass: homepage workflow strip (Review → AI check → Evidence → Report → Track → Outcome)
- Removal Work branding with animated V-star mark and matching favicon
- Premium violet, cyan and magenta visual system with glow, float, shimmer and scan motion
- Desktop and mobile homepage validation with no overflow or console errors

## Open
- Case pipeline dashboard with pending/identified/reported/resolved counts, category and business filters, and a bulk action queue — done
- Enable Connect Google by saving the approved Google Business Profile client ID and secret (secure form; user must supply)
- Sync the user's own Google Business Profile reviews into review records and show them in Reviews with AI analysis and a report button (code ready; needs the approved Google OAuth client saved)
- Submit one real report from the user's own listing and track its status updates in Reports (needs live consent plus explicit user confirmation before the irreversible submission)
- Put the Google Business Profile consent callback live on the Hostinger VPS with the user's approved OAuth client, sync owner-authorized reviews, then submit and record one real report from the user's own listing; blocked by safe VPS access, an HTTPS hostname, approved Google OAuth credentials, and the user's final confirmation before the irreversible report submission
- Deploy the Removal Work application backend to the Hostinger VPS and verify its live URL; blocked until a fresh non-root SSH private key is securely available and the matching public key is installed on the server
- Activate owner-authorized Google Business Profile OAuth after its client ID/secret are saved, then add paginated account/location/review sync; preserve the current sampled public lookup as a limited fallback
- Use the saved `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` only if an explicitly selected production integration needs them; keep the current tested Lovable AI analysis path unchanged
- Prepare a controlled external-database/VPS migration when the destination is ready: rotate exposed credentials, provision fresh restricted credentials, back up and verify data, apply repository migrations, test RLS/auth/storage, then switch configuration with rollback available
- Production mission: continue from the verified one-review flow with platform adapters, scheduled queue execution, immutable outcomes/appeals, analytics and admin configuration without importing old UI
- Integrate the strongest production backend capabilities from the audited old repository without importing its UI: secure Google Business Profile connection/sync, durable review records and case history, reliable bulk jobs, reporting/status workflows, and hardened AI analysis
- Facebook / Instagram / YouTube scanning — blocked until a Meta/YouTube connection exists
- Verified removal outcome — Google gives no API for report status; user marks the real outcome
- Verify end-to-end in Pipeline: mark a case Reported, use Report on Google, and confirm the handoff status appears in Reports

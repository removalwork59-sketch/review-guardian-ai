# Production richness and end-to-end readiness pass

## Goal
Keep Removal Work’s current colors and layout, but make them richer, denser, and softly luminous. Verify every dashboard against the real active database and identify or fix safe production blockers without fabricating integrations or outcomes.

## Changes
- Deepen the existing navy/green/cyan/violet palette while preserving its hue families, structure, copy, and workflows.
- Add restrained filled glow, stronger card depth, clearer borders, and better text contrast across public and signed-in screens.
- Open and test Reviews, Pipeline, Reports, Locations, and Bulk scan using the authorized test account.
- Verify that dashboard data and writes come from the active owner-scoped database with server-side authorization.
- Fix safe issues found in navigation, loading/error states, case updates, and data consistency.
- Keep unavailable Google owner sync and VPS deployment explicitly blocked until approved credentials and secure server access exist.

## Technical details
- Keep all visual values in semantic tokens and existing shared CSS classes.
- Preserve RLS-backed server functions and do not move privileged access into the browser.
- Harden case updates with owner scoping and concurrency protection if validation confirms the current race.
- Do not submit Google reports, create evidence, or claim outcomes during QA.

## Validation
- Test public and authenticated pages on desktop and mobile.
- Confirm real reads/writes in the active database, including status changes and rollback-safe verification.
- Check build, runtime, console, failed requests, overflow, contrast, and auth redirects.
- Report any external blocker separately from completed app work.

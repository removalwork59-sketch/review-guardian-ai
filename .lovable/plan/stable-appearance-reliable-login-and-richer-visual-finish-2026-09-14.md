# Stable appearance, reliable login, and richer visual finish

## Goal
Keep the current Removal Work UI and existing colors, while stopping unwanted appearance switching, fixing the login flow, and increasing visual richness without redesigning anything.

## Changes
- Make appearance selection deterministic: default to the current dark appearance, change only when the user presses the appearance button, persist that choice, and prevent system/browser preference changes from overriding it.
- Keep the appearance icon and page state synchronized across reloads and navigation, without flashes or automatic switching.
- Harden email/password login: normalize the email, prevent duplicate submissions, wait for the authenticated session to be confirmed, initialize the user workspace safely, then navigate to the dashboard.
- Improve login error handling so expired sessions, invalid credentials, slow requests, and workspace-loading failures produce clear recoverable states instead of silent failure or redirect loops.
- Increase density, contrast, edge clarity, filled glow, shadows, input focus, cards, and buttons using the same existing navy/cyan/teal palette only; do not alter layout, copy, section positions, or brand colors.

## Technical details
- Store the explicit appearance preference under one stable browser key and apply it before the landing page becomes interactive.
- Preserve the current secure authentication and protected dashboard checks; no credentials will be stored or exposed.
- Keep all quality changes in semantic design tokens and existing selectors.

## Validation
- Test appearance persistence through repeated reloads and navigation, including a browser whose system preference is light.
- Test login and dashboard access with an authorized session, plus invalid-login and signed-out behavior.
- Compare Home and Login on desktop and mobile for unchanged layout, richer rendering, no overflow, no console errors, and successful build status.

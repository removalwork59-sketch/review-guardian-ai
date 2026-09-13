# Fix the top five UI audit blockers

## Goal
Improve production quality without changing Removal Work’s current layout, visual identity, navigation, or core workflow.

## Changes
1. Correct weak light-mode contrast across homepage text, cards, controls, and highlighted sections while keeping the same palette.
2. Replace unsupported platform, press, testimonial, timing, submission, and outcome claims with accurate wording; preserve each section’s structure.
3. Rename visible case/report states so they describe locally recorded user actions rather than unverified Google submission or decisions.
4. Keep account creation available but clearly label it as approved-access registration, matching the restricted signup policy without redesigning Login.
5. Add password recovery inside the existing Login card, with loading, success, and error states matching the current styling.

## Quality and validation
- Increase small control hit areas and restore meaningful image descriptions where this can be done without altering layout.
- Test Home and Login in dark/light mode on desktop and mobile.
- Test scanner opening, menus, appearance toggle, sign-in/sign-up switching, password recovery, and report status wording.
- Confirm no overflow, console errors, failed interactions, or build errors.

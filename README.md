# Review Guardian AI

MASTER PRODUCT REDESIGN + AUTOMATION PROMPT

You are now responsible for turning this existing project into an ultra-premium,

extremely simple, AI-first Review Intelligence + Policy Reporting platform.

DO NOT redesign it as a generic SaaS dashboard.

The product must immediately communicate:

“Paste a review URL → AI understands it → AI checks policy → AI prepares the strongest legitimate action → track the real outcome.”

==================================================

1. ABSOLUTE PRODUCT PRINCIPLE

==================================================

The user should have to do as little as possible.

PRIMARY USER ACTION:

Paste URL

→ Scan

After that, the system should automatically handle everything that is legitimately possible:

URL detection

→ Platform detection

→ Business/profile detection

→ Review identification

→ Review data retrieval

→ Rating extraction

→ Reviewer/date/text extraction

→ AI policy analysis

→ Evidence extraction

→ Counter-evidence analysis

→ Confidence scoring

→ Removal/reporting eligibility

→ Risk assessment

→ Recommended action

→ Case creation

→ Report preparation

→ Legitimate submission/handoff

→ Status tracking

→ Outcome verification

→ User notification

Do NOT make the user manually perform unnecessary intermediate steps.

If the system can determine something automatically, do it automatically.

==================================================

2. IMPORTANT — REAL DATA ONLY

==================================================

No mock data.

No fake reviews.

No fake AI results.

No simulated Google responses.

No fake “Removed” status.

No hardcoded demo success.

Every result must originate from real APIs, real platform data, real database records,

or clearly labelled system observations.

If an external platform prevents an action, show the exact real limitation.

Never pretend an action succeeded.

Google/platform moderation remains the final authority.

==================================================

3. MULTI-PLATFORM ARCHITECTURE

==================================================

Design the architecture so the product can support:

- Google Reviews

- Facebook Reviews/Recommendations

- Instagram URLs/content where legally/API-accessibly supported

- Other major review/social platforms later

IMPORTANT:

Do not blindly assume every platform exposes the same data or removal API.

Create a PLATFORM ADAPTER architecture.

Each platform should have its own:

- URL parser

- identity resolver

- content/review fetcher

- rating extractor

- policy rules

- AI analysis context

- evidence model

- reporting capability

- status/outcome capability

The UI should still feel like ONE simple product.

==================================================

4. PLATFORM APIs / SERVICES

==================================================

Research the current official APIs and supported integrations before implementing.

Potential integration stack:

GOOGLE:

- Google Business Profile APIs

- Google Business Profile OAuth

- Google Places API

- Google Maps/Business Profile supported reporting workflows

- Google OAuth 2.0

META:

- Meta Graph API

- Facebook Page/Reviews capabilities where currently supported

- Instagram Graph API where applicable

- Meta OAuth

- Only use officially supported permissions/endpoints

AI:

- OpenAI API

- Anthropic Claude API

- Keep provider abstraction so either provider can be used

- Use the existing OpenAI/Claude credentials supplied separately by me

- Never expose API keys client-side

DATABASE/BACKEND:

- Existing Supabase

- PostgreSQL

- Supabase Auth

- RLS

- server-side privileged operations where required

INFRASTRUCTURE:

- Existing production VPS

- Existing production domain

- Existing application architecture

IMPORTANT:

Before adding any new API, verify:

1. Is it officially available?

2. Is the required permission/scopes available?

3. Does it actually provide the required data?

4. Is reporting/removal actually supported?

5. Is the API currently active?

6. Are billing/approval requirements involved?

7. Is there a legitimate fallback?

Do NOT implement imaginary APIs.

==================================================

5. AI ENGINE — MAKE IT STRONG

==================================================

Build a serious multi-stage AI review analysis pipeline.

For every real review, AI should analyze:

- policy violation likelihood

- violation category

- exact policy reasoning

- evidence from review text

- evidence from available metadata

- counter-evidence

- missing evidence

- confidence

- severity

- reportability

- rejection risk

- recommended reporting reason

- recommended evidence

- recommended next action

Use structured JSON outputs with strict validation.

Do NOT classify every negative review as removable.

AI must distinguish:

Negative but legitimate

vs

Potential policy violation.

Use adversarial/self-checking analysis:

PASS 1:

Initial policy analysis.

PASS 2:

Challenge the conclusion:

“Could this actually be a legitimate review?”

PASS 3:

Final decision:

- Strong candidate

- Possible candidate

- Needs human review

- Not reportable

Only recommend reporting when evidence supports it.

==================================================

6. AI AUTOMATION

==================================================

The AI should automatically:

- understand pasted URLs

- identify platform

- identify business/profile

- extract review

- normalize review data

- analyze policy

- summarize evidence

- generate recommendation

- assign confidence

- prepare case

- prepare report

- explain result in plain language

- monitor outcome where supported

The user should NOT need to understand technical terminology.

==================================================

7. ULTRA-PREMIUM UI/UX

==================================================

This is the MOST IMPORTANT visual requirement.

Do NOT copy the current GitHub UI.

Use existing repository functionality/backend as the source of truth,

but create a completely new original visual experience.

Take inspiration from the polish of premium products such as:

- Birdeye

- Reppoo

- Apple-level simplicity

- modern fintech-grade clarity

- premium AI products

But do NOT clone any competitor.

The final UI must feel:

LUXURY

CLEAN

SIMPLE

FAST

TRUSTWORTHY

MODERN

AI-POWERED

REVIEW-CENTRIC

==================================================

8. “ANYONE CAN UNDERSTAND IT”

==================================================

Design for a user who has ZERO technical knowledge.

Never make the user understand:

API

OAuth

RLS

SKU

webhook

backend

AI provider

database

token

quota

unless absolutely necessary.

Instead say:

“Paste your review link.”

“Checking the review…”

“We found the business.”

“Checking Google’s policies…”

“We found a possible policy violation.”

“This review is ready to report.”

“Waiting for Google’s decision.”

Simple language everywhere.

==================================================

9. HOME SCREEN

==================================================

The first screen should be extremely focused.

Hero:

“Find problematic reviews. Fast.”

Subtext:

“Paste a review link and let AI analyze it for policy violations.”

CENTER:

[ Paste Google / Facebook / supported Review URL ]

[ Scan Review ]

Below it:

Google

Facebook

Instagram

+ More

Do not overwhelm the user with menus.

The URL input must visually dominate the entire experience.

==================================================

10. VISUAL BRAND LANGUAGE

==================================================

The UI must visually communicate:

REVIEW

+

STAR RATING

+

POLICY CHECK

+

REPORT

+

PROTECTION

+

REMOVAL WORKFLOW

Use a consistent icon system around:

⭐ Rating

💬 Review

🔎 Scan

🤖 AI Analysis

🛡 Policy

⚠ Violation

📋 Evidence

🚩 Report

⏳ Pending

✓ Resolved

👁 Still Live

Do not use random generic SaaS icons.

Every icon should reinforce the product concept.

==================================================

11. GOOGLE-INSPIRED BUT NOT GOOGLE-OWNED

==================================================

Use a visual language that naturally reminds users of Google Reviews:

- clean white surfaces

- subtle blue

- red

- yellow

- green status accents

- star-rating visuals

- map/location concepts

- review cards

BUT:

DO NOT impersonate Google.

DO NOT use Google branding as if this is an official Google product.

Do not make the user believe Google owns this software.

Create an independent premium brand identity.

==================================================

12. FAVICON / APP ICON

==================================================

Create a custom favicon that immediately communicates:

Review

+

Rating

+

Protection/Reporting

It must remain recognizable at 16x16 and 32x32.

Use the same symbol system in:

- favicon

- login

- sidebar

- app icon

- loading states

- empty states

==================================================

13. ANIMATION SYSTEM

==================================================

Animations must communicate what the system is doing.

URL scanning:

subtle scanning animation

Review identification:

review card assembling

AI analysis:

intelligent analysis/progress animation

Violation:

controlled warning reveal

Evidence:

evidence items appearing progressively

Report:

submission/progress animation

Removed:

clean success animation

Still live:

neutral status animation

Do NOT use flashy or childish animations.

Everything should feel premium and fast.

Respect prefers-reduced-motion.

==================================================

14. GIF / MOTION

==================================================

If GIF/video/Lottie-style visual assets genuinely improve understanding,

use them selectively.

Good uses:

URL scan

AI review analysis

policy detection

report preparation

status tracking

Never add animation just because there is empty space.

Performance is more important than decoration.

==================================================

15. REVIEW RESULT SCREEN

==================================================

The review should be the hero.

Show:

Business

Business rating

Review rating

Reviewer

Date

Review text

Original URL

Platform

Then:

AI Policy Result

Examples:

✓ No clear policy violation

or

⚠ Potential policy violation

Then:

Violation category

Confidence

Evidence

Counter-evidence

Rejection risk

Recommended action

Use plain English.

==================================================

16. ONE PRIMARY ACTION

==================================================

If reportable:

[ Report Review ]

That should be the dominant CTA.

Do not give the user 10 competing buttons.

If not reportable:

“No clear policy violation found.”

Explain why in simple language.

==================================================

17. AUTOMATED REPORT WORKFLOW

==================================================

Where an official API/action exists and authorization permits it:

automate it.

Where official API does NOT allow direct review removal:

use the legitimate supported reporting workflow.

Do not bypass:

- authentication

- CAPTCHA

- platform security

- access controls

- rate limits

- moderation controls

If user authorization is required:

make it one clean OAuth authorization step.

Never ask for the user's Google password.

==================================================

18. STATUS TRACKING

==================================================

Create a simple visual timeline:

Found

↓

Analyzed

↓

Evidence Ready

↓

Reported

↓

Platform Review

↓

Decision

↓

Removed / Still Live

Use authoritative platform status whenever available.

If status is inferred from observation:

label it clearly:

“Observed Removal”

NOT:

“Officially Removed by Google”

==================================================

19. DASHBOARD

==================================================

Do NOT build a complicated analytics dashboard.

Show only:

Reviews Scanned

Potential Violations

Reports

Pending

Removed

And:

Recent Reviews

That's enough.

==================================================

20. NAVIGATION

==================================================

Keep navigation minimal:

Home

Reviews

Reports

Locations

Settings

No unnecessary menu items.

==================================================

21. UPLOAD URLs

==================================================

Support:

Paste one URL

Upload multiple URLs

But keep bulk upload secondary.

The primary experience must always be:

Paste URL → Scan.

Bulk processing should automatically:

parse

validate

deduplicate

identify platform

scan

analyze

classify

create cases

prepare reports

track results

with per-URL failure isolation.

==================================================

22. ERROR HANDLING

==================================================

Errors must be human-readable.

Never show:

500

403

429

RLS

JSON errors

stack traces

to normal users.

Instead:

“We couldn't access this review right now.”

Then provide the smallest useful next action.

==================================================

23. MOBILE-FIRST

==================================================

The application must be excellent on mobile.

The core flow should require almost no navigation.

Large URL input.

Large Scan button.

Clear rating.

Clear policy result.

Clear evidence.

One primary action.

==================================================

24. DATABASE / BACKEND AUDIT

==================================================

Before considering the work complete, inspect the ENTIRE existing backend/database.

Verify:

Auth

Users

Workspaces

Business

Locations

Reviews

Scan jobs

AI analysis

Cases

Reports

Notifications

Bulk URL batches

Google connections

OAuth tokens

RLS

Migrations

Indexes

Constraints

Cron/jobs

Error handling

Remove broken/dead paths where safe.

Do not destroy existing real data.

==================================================

25. REAL END-TO-END TEST

==================================================

Do not stop after coding.

Run the real production flow.

TEST #1:

One real Google Review URL.

Verify:

URL accepted

→ real business identified

→ real rating obtained

→ real review obtained

→ AI analyzes real review

→ evidence generated

→ recommendation generated

→ case created

→ legitimate report workflow

→ status tracking

→ real outcome verification

Then TEST #2:

A second real URL.

Do not claim success if only frontend navigation works.

==================================================

26. API AVAILABILITY CHECK

==================================================

For every required integration, report:

AVAILABLE

or

BLOCKED

And explain the exact reason.

Example:

Google review retrieval:

BLOCKED — required Google API access/quota not approved.

Do NOT replace that with fake data.

==================================================

27. PRODUCTION

==================================================

Use the existing production environment.

Do NOT switch Supabase projects.

Production Supabase:

mzjmbgudqpjvpyfgubgp

Production:

https://removalwork.online

Application:

port 3000

Preserve existing real integrations.

==================================================

28. FINAL QUALITY BAR

==================================================

The final product must feel like a product that could be launched globally.

A non-technical person should understand the entire product within seconds.

The UI should communicate:

⭐ Reviews

🔎 Scan

🤖 AI

🛡 Policy

🚩 Report

⏳ Track

✓ Outcome

WITHOUT needing a tutorial.

==================================================

29. EXECUTION RULE

==================================================

Do NOT just give me recommendations.

Actually inspect the existing project.

Actually implement the UI.

Actually implement the automation.

Actually connect the real APIs.

Actually test the real flow.

Actually fix bugs.

Actually build.

Actually typecheck.

Actually test.

Actually deploy when stable.

Actually retest production.

Do not stop at “the code looks correct”.

The final result must be:

ULTRA-PREMIUM UI

+

EXTREMELY SIMPLE UX

+

MAXIMUM LEGITIMATE AUTOMATION

+

REAL DATA

+

REAL AI

+

REAL REPORTING WORKFLOW

+

REAL STATUS

+

NO FAKE SUCCESS

If an external platform limitation prevents 100% automation,

automate everything that is legitimately possible and clearly surface

only the unavoidable user/platform action.

Do not add unnecessary features.

SIMPLE + PREMIUM + AUTOMATIC is the goal.
MASTER PRODUCT REDESIGN + AUTOMATION PROMPT

You are now responsible for turning this existing project into an ultra-premium,

extremely simple, AI-first Review Intelligence + Policy Reporting platform.

DO NOT redesign it as a generic SaaS dashboard.

The product must immediately communicate:

“Paste a review URL → AI understands it → AI checks policy → AI prepares the strongest legitimate action → track the real outcome.”

==================================================

1. ABSOLUTE PRODUCT PRINCIPLE

==================================================

The user should have to do as little as possible.

PRIMARY USER ACTION:

Paste URL

→ Scan

After that, the system should automatically handle everything that is legitimately possible:

URL detection

→ Platform detection

→ Business/profile detection

→ Review identification

→ Review data retrieval

→ Rating extraction

→ Reviewer/date/text extraction

→ AI policy analysis

→ Evidence extraction

→ Counter-evidence analysis

→ Confidence scoring

→ Removal/reporting eligibility

→ Risk assessment

→ Recommended action

→ Case creation

→ Report preparation

→ Legitimate submission/handoff

→ Status tracking

→ Outcome verification

→ User notification

Do NOT make the user manually perform unnecessary intermediate steps.

If the system can determine something automatically, do it automatically.

==================================================

2. IMPORTANT — REAL DATA ONLY

==================================================

No mock data.

No fake reviews.

No fake AI results.

No simulated Google responses.

No fake “Removed” status.

No hardcoded demo success.

Every result must originate from real APIs, real platform data, real database records,

or clearly labelled system observations.

If an external platform prevents an action, show the exact real limitation.

Never pretend an action succeeded.

Google/platform moderation remains the final authority.

==================================================

3. MULTI-PLATFORM ARCHITECTURE

==================================================

Design the architecture so the product can support:

- Google Reviews

- Facebook Reviews/Recommendations

- Instagram URLs/content where legally/API-accessibly supported

- Other major review/social platforms later

IMPORTANT:

Do not blindly assume every platform exposes the same data or removal API.

Create a PLATFORM ADAPTER architecture.

Each platform should have its own:

- URL parser

- identity resolver

- content/review fetcher

- rating extractor

- policy rules

- AI analysis context

- evidence model

- reporting capability

- status/outcome capability

The UI should still feel like ONE simple product.

==================================================

4. PLATFORM APIs / SERVICES

==================================================

Research the current official APIs and supported integrations before implementing.

Potential integration stack:

GOOGLE:

- Google Business Profile APIs

- Google Business Profile OAuth

- Google Places API

- Google Maps/Business Profile supported reporting workflows

- Google OAuth 2.0

META:

- Meta Graph API

- Facebook Page/Reviews capabilities where currently supported

- Instagram Graph API where applicable

- Meta OAuth

- Only use officially supported permissions/endpoints

AI:

- OpenAI API

- Anthropic Claude API

- Keep provider abstraction so either provider can be used

- Use the existing OpenAI/Claude credentials supplied separately by me

- Never expose API keys client-side

DATABASE/BACKEND:

- Existing Supabase

- PostgreSQL

- Supabase Auth

- RLS

- server-side privileged operations where required

INFRASTRUCTURE:

- Existing production VPS

- Existing production domain

- Existing application architecture

IMPORTANT:

Before adding any new API, verify:

1. Is it officially available?

2. Is the required permission/scopes available?

3. Does it actually provide the required data?

4. Is reporting/removal actually supported?

5. Is the API currently active?

6. Are billing/approval requirements involved?

7. Is there a legitimate fallback?

Do NOT implement imaginary APIs.

==================================================

5. AI ENGINE — MAKE IT STRONG

==================================================

Build a serious multi-stage AI review analysis pipeline.

For every real review, AI should analyze:

- policy violation likelihood

- violation category

- exact policy reasoning

- evidence from review text

- evidence from available metadata

- counter-evidence

- missing evidence

- confidence

- severity

- reportability

- rejection risk

- recommended reporting reason

- recommended evidence

- recommended next action

Use structured JSON outputs with strict validation.

Do NOT classify every negative review as removable.

AI must distinguish:

Negative but legitimate

vs

Potential policy violation.

Use adversarial/self-checking analysis:

PASS 1:

Initial policy analysis.

PASS 2:

Challenge the conclusion:

“Could this actually be a legitimate review?”

PASS 3:

Final decision:

- Strong candidate

- Possible candidate

- Needs human review

- Not reportable

Only recommend reporting when evidence supports it.

==================================================

6. AI AUTOMATION

==================================================

The AI should automatically:

- understand pasted URLs

- identify platform

- identify business/profile

- extract review

- normalize review data

- analyze policy

- summarize evidence

- generate recommendation

- assign confidence

- prepare case

- prepare report

- explain result in plain language

- monitor outcome where supported

The user should NOT need to understand technical terminology.

==================================================

7. ULTRA-PREMIUM UI/UX

==================================================

This is the MOST IMPORTANT visual requirement.

Do NOT copy the current GitHub UI.

Use existing repository functionality/backend as the source of truth,

but create a completely new original visual experience.

Take inspiration from the polish of premium products such as:

- Birdeye

- Reppoo

- Apple-level simplicity

- modern fintech-grade clarity

- premium AI products

But do NOT clone any competitor.

The final UI must feel:

LUXURY

CLEAN

SIMPLE

FAST

TRUSTWORTHY

MODERN

AI-POWERED

REVIEW-CENTRIC

==================================================

8. “ANYONE CAN UNDERSTAND IT”

==================================================

Design for a user who has ZERO technical knowledge.

Never make the user understand:

API

OAuth

RLS

SKU

webhook

backend

AI provider

database

token

quota

unless absolutely necessary.

Instead say:

“Paste your review link.”

“Checking the review…”

“We found the business.”

“Checking Google’s policies…”

“We found a possible policy violation.”

“This review is ready to report.”

“Waiting for Google’s decision.”

Simple language everywhere.

==================================================

9. HOME SCREEN

==================================================

The first screen should be extremely focused.

Hero:

“Find problematic reviews. Fast.”

Subtext:

“Paste a review link and let AI analyze it for policy violations.”

CENTER:

[ Paste Google / Facebook / supported Review URL ]

[ Scan Review ]

Below it:

Google

Facebook

Instagram

+ More

Do not overwhelm the user with menus.

The URL input must visually dominate the entire experience.

==================================================

10. VISUAL BRAND LANGUAGE

==================================================

The UI must visually communicate:

REVIEW

+

STAR RATING

+

POLICY CHECK

+

REPORT

+

PROTECTION

+

REMOVAL WORKFLOW

Use a consistent icon system around:

⭐ Rating

💬 Review

🔎 Scan

🤖 AI Analysis

🛡 Policy

⚠ Violation

📋 Evidence

🚩 Report

⏳ Pending

✓ Resolved

👁 Still Live

Do not use random generic SaaS icons.

Every icon should reinforce the product concept.

==================================================

11. GOOGLE-INSPIRED BUT NOT GOOGLE-OWNED

==================================================

Use a visual language that naturally reminds users of Google Reviews:

- clean white surfaces

- subtle blue

- red

- yellow

- green status accents

- star-rating visuals

- map/location concepts

- review cards

BUT:

DO NOT impersonate Google.

DO NOT use Google branding as if this is an official Google product.

Do not make the user believe Google owns this software.

Create an independent premium brand identity.

==================================================

12. FAVICON / APP ICON

==================================================

Create a custom favicon that immediately communicates:

Review

+

Rating

+

Protection/Reporting

It must remain recognizable at 16x16 and 32x32.

Use the same symbol system in:

- favicon

- login

- sidebar

- app icon

- loading states

- empty states

==================================================

13. ANIMATION SYSTEM

==================================================

Animations must communicate what the system is doing.

URL scanning:

subtle scanning animation

Review identification:

review card assembling

AI analysis:

intelligent analysis/progress animation

Violation:

controlled warning reveal

Evidence:

evidence items appearing progressively

Report:

submission/progress animation

Removed:

clean success animation

Still live:

neutral status animation

Do NOT use flashy or childish animations.

Everything should feel premium and fast.

Respect prefers-reduced-motion.

==================================================

14. GIF / MOTION

==================================================

If GIF/video/Lottie-style visual assets genuinely improve understanding,

use them selectively.

Good uses:

URL scan

AI review analysis

policy detection

report preparation

status tracking

Never add animation just because there is empty space.

Performance is more important than decoration.

==================================================

15. REVIEW RESULT SCREEN

==================================================

The review should be the hero.

Show:

Business

Business rating

Review rating

Reviewer

Date

Review text

Original URL

Platform

Then:

AI Policy Result

Examples:

✓ No clear policy violation

or

⚠ Potential policy violation

Then:

Violation category

Confidence

Evidence

Counter-evidence

Rejection risk

Recommended action

Use plain English.

==================================================

16. ONE PRIMARY ACTION

==================================================

If reportable:

[ Report Review ]

That should be the dominant CTA.

Do not give the user 10 competing buttons.

If not reportable:

“No clear policy violation found.”

Explain why in simple language.

==================================================

17. AUTOMATED REPORT WORKFLOW

==================================================

Where an official API/action exists and authorization permits it:

automate it.

Where official API does NOT allow direct review removal:

use the legitimate supported reporting workflow.

Do not bypass:

- authentication

- CAPTCHA

- platform security

- access controls

- rate limits

- moderation controls

If user authorization is required:

make it one clean OAuth authorization step.

Never ask for the user's Google password.

==================================================

18. STATUS TRACKING

==================================================

Create a simple visual timeline:

Found

↓

Analyzed

↓

Evidence Ready

↓

Reported

↓

Platform Review

↓

Decision

↓

Removed / Still Live

Use authoritative platform status whenever available.

If status is inferred from observation:

label it clearly:

“Observed Removal”

NOT:

“Officially Removed by Google”

==================================================

19. DASHBOARD

==================================================

Do NOT build a complicated analytics dashboard.

Show only:

Reviews Scanned

Potential Violations

Reports

Pending

Removed

And:

Recent Reviews

That's enough.

==================================================

20. NAVIGATION

==================================================

Keep navigation minimal:

Home

Reviews

Reports

Locations

Settings

No unnecessary menu items.

==================================================

21. UPLOAD URLs

==================================================

Support:

Paste one URL

Upload multiple URLs

But keep bulk upload secondary.

The primary experience must always be:

Paste URL → Scan.

Bulk processing should automatically:

parse

validate

deduplicate

identify platform

scan

analyze

classify

create cases

prepare reports

track results

with per-URL failure isolation.

==================================================

22. ERROR HANDLING

==================================================

Errors must be human-readable.

Never show:

500

403

429

RLS

JSON errors

stack traces

to normal users.

Instead:

“We couldn't access this review right now.”

Then provide the smallest useful next action.

==================================================

23. MOBILE-FIRST

==================================================

The application must be excellent on mobile.

The core flow should require almost no navigation.

Large URL input.

Large Scan button.

Clear rating.

Clear policy result.

Clear evidence.

One primary action.

==================================================

24. DATABASE / BACKEND AUDIT

==================================================

Before considering the work complete, inspect the ENTIRE existing backend/database.

Verify:

Auth

Users

Workspaces

Business

Locations

Reviews

Scan jobs

AI analysis

Cases

Reports

Notifications

Bulk URL batches

Google connections

OAuth tokens

RLS

Migrations

Indexes

Constraints

Cron/jobs

Error handling

Remove broken/dead paths where safe.

Do not destroy existing real data.

==================================================

25. REAL END-TO-END TEST

==================================================

Do not stop after coding.

Run the real production flow.

TEST #1:

One real Google Review URL.

Verify:

URL accepted

→ real business identified

→ real rating obtained

→ real review obtained

→ AI analyzes real review

→ evidence generated

→ recommendation generated

→ case created

→ legitimate report workflow

→ status tracking

→ real outcome verification

Then TEST #2:

A second real URL.

Do not claim success if only frontend navigation works.

==================================================

26. API AVAILABILITY CHECK

==================================================

For every required integration, report:

AVAILABLE

or

BLOCKED

And explain the exact reason.

Example:

Google review retrieval:

BLOCKED — required Google API access/quota not approved.

Do NOT replace that with fake data.

==================================================

27. PRODUCTION

==================================================

Use the existing production environment.

Do NOT switch Supabase projects.

Production Supabase:

mzjmbgudqpjvpyfgubgp

Production:

https://removalwork.online

Application:

port 3000

Preserve existing real integrations.

==================================================

28. FINAL QUALITY BAR

==================================================

The final product must feel like a product that could be launched globally.

A non-technical person should understand the entire product within seconds.

The UI should communicate:

⭐ Reviews

🔎 Scan

🤖 AI

🛡 Policy

🚩 Report

⏳ Track

✓ Outcome

WITHOUT needing a tutorial.

==================================================

29. EXECUTION RULE

==================================================

Do NOT just give me recommendations.

Actually inspect the existing project.

Actually implement the UI.

Actually implement the automation.

Actually connect the real APIs.

Actually test the real flow.

Actually fix bugs.

Actually build.

Actually typecheck.

Actually test.

Actually deploy when stable.

Actually retest production.

Do not stop at “the code looks correct”.

The final result must be:

ULTRA-PREMIUM UI

+

EXTREMELY SIMPLE UX

+

MAXIMUM LEGITIMATE AUTOMATION

+

REAL DATA

+

REAL AI

+

REAL REPORTING WORKFLOW

+

REAL STATUS

+

NO FAKE SUCCESS

If an external platform limitation prevents 100% automation,

automate everything that is legitimately possible and clearly surface

only the unavoidable user/platform action.

Do not add unnecessary features.

SIMPLE + PREMIUM + AUTOMATIC is the goal.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/79b76408-64bf-4705-9e7e-8ea6d89480be).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

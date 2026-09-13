# Secure Superadmin Account

## Goal
Create the supplied Removal Work account as a confirmed superadmin with a private profile and verify that normal login reaches the existing workspace smoothly.

## Changes
- Add a private `profiles` table for display name and preferences, created automatically for new accounts.
- Add a separate `user_roles` table with a server-validated `superadmin` role; roles will never be stored in the profile or browser storage.
- Keep profile and role access protected so users can only read their own rows; privileged role changes remain server-only.
- Enable email/password login and leaked-password checks.
- Create the supplied account as confirmed, assign the Removal Work superadmin profile and role, and verify sign-in plus dashboard access.

## Technical details
- Database access uses explicit grants and row-level security.
- Role checks use a security-definer database function to avoid recursive access rules.
- Existing review scanning, reports, locations, and design remain unchanged.

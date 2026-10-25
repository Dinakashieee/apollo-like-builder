# Company signals
- [x] Generate and save evidence-based company and division signals.
- [x] Connect manual creation, lead imports, and SignalHire claims.
- [x] Add company import and CSV export with signals.
- [x] Verify saved signals and downloads.

# Landing page themes
- [x] Show and verify an immediate side preview on the Landing Pages screen.
- [x] Add Ocean & Teal theme collection and visual selection.
- [x] Share themed rendering between preview and public pages.
- [x] Verify theme selection, saving, and public rendering.

# Campaign landing-page customization
- [x] Add campaign-matched starter themes and branding.
- [x] Enable paid-plan colors and drag-and-drop with enforced access; image/logo uploads now available on all plans.
- [x] Verify free-plan saving, public output, and rejected unauthorized colors and ordering.
- [ ] Verify paid campaign import, custom-color save, drag-and-drop, and successful upload end-to-end — blocked: current account has no paid subscription.

# Landing-page images for all users

# AI brand color matching
- [x] Match landing-page colors to a company URL with AI, alongside the four-palette picker.
- [x] Allow free-user uploads and saved cover images while retaining paid color/order restrictions.
- [x] Add OpenAI image creation with workspace access and AI allowance checks.
- [x] Verify free-user upload, generation, saving, and public image output.

# Send pace coach
- [x] Persist per-user sending breaks, enforce across delivery paths, and provide Resume controls.
- [x] Verify pause/resume persistence through the UI and server send gate; test per-user isolation and fail-closed checks. Queue deferral reviewed without delivering test emails.
- [x] Auto-log real sends from the database into Email Health (50/day highlighted).
- [x] Pop up a break reminder on bursts or approaching the daily ceiling.
- [x] Fix delivery bugs found during verification: composer payload not reaching templates, and From address not matching the verified sending domain.
- [x] Verify end-to-end: real sends counted, popup fires, break syncs to the page.
- [x] Turn the daily bar red at 50 sends (amber from 40, blue below); add the missing amber status color.
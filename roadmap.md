# Daily updates reflected in dashboard and tasks
- [ ] Show each user's saved updates in their selected dashboard period.
- [ ] Automatically synchronize next-step lines into private tasks without duplicate tasks on edits.
- [ ] Test and verify chat save, dashboard readback, task completion, editing and deletion.

# SignalHire credit display
- [x] Show verified API account credits separately from workspace reveal credits; replace browser-only connection status. Three tests pass; signed-in API read and refresh show 286 provider credits and a separate zero workspace wallet. Personal-key linking and provider contact claiming were not changed.

# SignalHire waiting-state repair
- [x] Ensure completed/empty searches clear loading and recover saved results without relying on live notifications; seven tests pass and signed-in Stuart Crawford search clears loading with no matches in 8.5 seconds. Actual contact claim remains unverified because no provider match returned and the account has no reveal credits.

# SignalHire ICP search repair
- [x] Correct provider search filters and synchronous result handling; tests pass and real signed-in Phil Jones search completes without empty-parameters error (provider returned no match; no contact claim performed).

# Temporary paid-feature access
- [x] Unlock subscription-gated features for all signed-in workspace members without changing AI or SignalHire credit checks.
- [x] Test feature access and preserved usage checks; verify signed-in custom-color saving, reload, reordering, and unrelated-workspace denial; restore original page.

# Daily work updates through chat
- [x] Add private per-user daily work updates with completed work, next steps and blockers.
- [x] Add daily-update chat view with editing and saved history.
- [x] Test validation and verify signed-in saving, reload, editing, deletion and ownership isolation; delete temporary verification update.

# Sourced recommendations and decision-makers
- [x] Scrape public evidence, retain source dates and distinguish checked sources from unsupported claims.
- [x] Show decision-maker reasons, LinkedIn verification reminders, and SignalHire preview/claim controls.
- [x] Test evidence rules and verify signed-in contact handoff and fail-closed research.
- [ ] Verify populated research results and a real SignalHire claim end-to-end — blocked: research returned no checkable sources/rate limiting; current account has zero SignalHire credits.

# Company signals
- [x] Generate and save evidence-based company and division signals.
- [x] Connect manual creation, lead imports, and SignalHire claims.
- [x] Add company import and CSV export with signals.
- [x] Verify saved signals and downloads.

# Personal dashboard summary
- [x] Add personal Today, Week, Month, and Quarter summaries using saved activity.
- [x] Test calendar date boundaries; verify signed-in period switching, saved personal page count, owner-filtered lead count, and denial of unrelated workspace access.

# Company email defaults and personal signatures
- [x] Save meeting and credential defaults on Company; apply them automatically in both email composers.
- [x] Add multiple per-user signatures with default selection, editing, deletion, and composer selection.
- [x] Verify saved defaults and personal signature selection, editing, deletion, stored current-user ownership, and rejected alternative ownership through signed-in requests; remove temporary test values.

# Landing page themes
- [x] Show and verify an immediate side preview on the Landing Pages screen.
- [x] Add Ocean & Teal theme collection and visual selection.
- [x] Share themed rendering between preview and public pages.
- [x] Verify theme selection, saving, and public rendering.

# Campaign landing-page customization
- [x] Add campaign-matched starter themes and branding.
- [x] Enable paid-plan colors and drag-and-drop with enforced access; image/logo uploads now available on all plans.
- [x] Verify free-plan saving, public output, and rejected unauthorized colors and ordering.
- [x] Verify custom-color saving and drag-and-drop end-to-end during temporary all-user access; uploads were verified separately. Campaign import remains covered by text-preservation tests.

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
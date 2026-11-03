# Prevent paused senders from blocking scheduled emails

## Verified findings
- **Scheduler starvation is confirmed:** selection takes 20 pending due rows before checking sender pauses. Paused rows remain unchanged and can repeatedly occupy the batch. Lookup failures and downstream 409/503 responses can repeat the same behavior.
- **The AI-credit finding is not a policy defect:** daily updates do consume the existing AI allowance, but the saved temporary-access requirement explicitly preserves AI and SignalHire credit checks. Keep this behavior unchanged. A separate daily-update allowance would require a separate product decision.

## Proposed change
1. Select eligible scheduled emails **before** applying the batch limit, excluding paused senders through a database query rather than filtering an already-limited batch.
2. Keep paused messages pending with their original scheduled time. Resuming makes them eligible on the next scheduler run.
3. Add a separate retry-after time for transient sending failures so 409/503 responses cannot continually monopolize the batch. Do not overwrite the user's scheduled time or label deferred messages sent/failed.
4. Fail closed if sending-state selection fails; retain the per-message pause recheck for a pause taken after batch selection.
5. Surface selection/deferral persistence errors instead of silently proceeding.

## Technical implementation
- Add a nullable retry-after timestamp to scheduled emails and an indexed, service-role-only selection RPC using a NOT EXISTS check against paused user state, deterministic ordering, and a 20-row limit after eligibility filtering.
- Update only the scheduled dispatcher and a small helper needed to test its deferral behavior; preserve sender authentication, existing transport behavior, and per-user Resume controls.
- Deploy the dispatcher only after local tests pass. No actual email sends during verification.

## Verification
- With 20+ due messages from a paused sender and a due message from an active sender, the active sender remains selectable on repeated runs.
- Paused messages stay pending and become selectable after Resume.
- A transiently deferred sender does not block another sender while its retry-after time is in the future.
- Sending-state lookup errors invoke no sending provider; authorization denies non-service callers.
- Verify the selection RPC against controlled temporary records with no delivery, then remove those records.

## Scope and approval
This requires a database addition and a deployed scheduler change, so implementation awaits approval. No app code or database settings have been changed.

Separate pre-launch email-transport and payment findings are not included. This fix prevents batch starvation; it does not certify existing email delivery or authorize promotional sending through built-in app emails.

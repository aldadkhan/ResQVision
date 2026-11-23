# ResQVision — Upgrade notes, known problems and solutions

## Upgrades included in this build

| Earlier limitation / problem | Change in this build | Verification |
|---|---|---|
| Reports depended on gallery/file upload only | Web report supports direct device camera capture plus gallery; Flutter uses phone camera | Submit a JPG/PNG/WEBP image and confirm `imageUrl` is returned |
| Reports could be hard to locate | GPS capture stores latitude/longitude; case map opens Google Maps and map view embeds a selected report location | Grant browser/device location permission and open the map view |
| No actionable immediate-care information | Added authenticated `/api/reports/first-aid` and report-time first-aid response; Gemini optional, conservative fallback always available | POST description with words such as `bleeding`, `hit by car`, `burn`, or `unconscious` |
| Emergency reports were not distinguished | Added emergency flag, `rescueRequested`, emergency priority and dashboard badges | Submit a test report with emergency enabled |
| No direct rescue call action | Save a verified phone number in Settings; emergency submission prompts/open dialler | Test with a non-emergency account and a safe test number first |
| Dashboard was a basic report list | Added responsive sidebar, KPIs, status bars, recent cases, search, map, care and settings pages | Test desktop and narrow mobile browser widths |
| Settings were absent | Added theme, local alert preference, GPS preference, compact-list preference, language preference, hotline and reset | Change settings, reload and confirm local preferences persist |
| No image-screening service path | Added optional Flask + Gemini Vision endpoint and Node integration; failure falls back to human review | Start Flask, configure key, upload an image; then stop Flask and confirm fallback |
| Web/mobile data could diverge | Both clients continue using the same REST API and MongoDB | Submit on web, refresh mobile, and vice versa |

## Important distinction: AI versus diagnosis

The image service calls Gemini Vision only when `GEMINI_API_KEY` is configured. It can summarise visible image content and suggest a human review priority, but it is not a trained veterinary injury detector, it does not return validated bounding boxes, and its observations may be wrong. The first-aid service similarly gives conservative informational guidance, not treatment. Never present AI severity as clinical certainty.

## Emergency workflow and operational caveat

An emergency report is persisted with `emergency=true`, `rescueRequested=true` and `priority=emergency`. The user can then place a call using a phone number they have verified and configured. The app does not know which local organisation is available, does not automatically contact an external service, and does not dispatch responders. A production version needs a maintained rescue-provider directory, explicit dispatch integration, delivery acknowledgements, escalation and audit trails.

## Test checklist

- [ ] `GET /api/health` returns `status: ok`.
- [ ] Register/login works and JWT-protected routes reject missing/invalid tokens.
- [ ] Web camera capture and gallery upload both accept a supported image under 5 MB.
- [ ] Invalid file type and oversized image are rejected.
- [ ] GPS permission denial is handled without crashing report submission.
- [ ] Coordinates are saved and Google Maps opens the same location.
- [ ] First-aid endpoint returns a title, urgency, steps and disclaimer.
- [ ] AI service with no key clearly returns human-review fallback.
- [ ] AI service with a valid key returns a visual summary; human review is still required.
- [ ] Emergency flag is visible in dashboard and stored in MongoDB.
- [ ] Hotline dialler opens only after user action/confirmation.
- [ ] Web-created reports appear in Flutter using the same account.
- [ ] Staff-only status changes reject ordinary users.
- [ ] Dark/light theme and local settings persist after refresh.

## Recommended next engineering sprint

1. Build a consent-based rescue-provider registry and server-side dispatch workflow with provider acceptance/rejection.
2. Add Firebase Cloud Messaging and verified SMS/email notifications with delivery receipts.
3. Add a trained, annotated animal-injury dataset and evaluate per-class precision/recall, false negatives and species bias before enabling automated severity suggestions.
4. Implement explainable object detection with validated bounding boxes and confidence thresholds; force human review for low confidence.
5. Add secure cloud object storage, signed image URLs, file scanning, API rate limits, audit trails, retention controls and automated backups.
6. Add full localization for English, Kannada and Malayalam rather than only saving a language preference.
7. Add admin-managed roles, responder profiles, assignment history, SLA timers and case analytics.

## Privacy and safety

Use synthetic test reports during the expo. Obtain consent before collecting identifiable location or personal information. Do not publish private phone numbers or API keys in source control. Configure only rescue numbers verified for the deployment region. A user should never be instructed to approach a dangerous animal, administer medicine or attempt a procedure outside their training.

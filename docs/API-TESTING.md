# API smoke tests

1. Start MongoDB and the API.
2. Health check: `GET http://localhost:5000/api/health`
3. Register: `POST /api/auth/register` JSON `{ "name":"Demo User", "email":"demo@example.com", "password":"demoPass123" }`
4. Login: `POST /api/auth/login` with email/password.
5. Copy the returned token into `Authorization: Bearer <token>`.
6. Create report: `POST /api/reports` multipart fields `animalType`, `description`, `location`; optional `image` file.
7. List reports: `GET /api/reports`.
8. Admin status update: change a user's role to `admin` or `rescuer` in MongoDB, sign in again, then `PATCH /api/reports/:id/status` JSON `{ "status":"reviewing" }`.

Expected behavior: users see only their own reports; rescue/admin roles see all reports and can update status. Image uploads are limited to JPG/PNG/WEBP and 5 MB.

9. First-response guidance: authenticated `POST /api/reports/first-aid` JSON `{ "description":"A dog was hit by a car and is limping", "emergency":true }`. Response includes `guidance.title`, `urgency`, `steps` and `disclaimer`.
10. Emergency report: include multipart field `emergency=true` (and optional `priority=emergency`) when creating a report. Confirm the saved record has `emergency=true`, `rescueRequested=true` and `priority=emergency`.
11. Image screening: start the optional Flask service on port 8000 and configure `GEMINI_API_KEY` in that Python process. Upload an image; inspect `aiScreening`. If the key/service is absent, the response must clearly say human review is required.
12. Google Maps: create a report with `lat` and `lng`; open the dashboard map or case navigation action.

Never use a real emergency call as a demo test. Configure a test contact or demonstrate the dialler link without placing the call.

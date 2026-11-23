# ResQVision — Animal Rescue & Care Coordination Platform

**Tagline:** Detect. Rescue. Protect. Every Life Matters.

ResQVision is a connected rescue-reporting starter for a React web dashboard and Flutter mobile app. Both clients use one Node.js/Express REST API and one MongoDB database. The upgraded build adds camera capture, GPS coordinates, Google Maps navigation, emergency case flags, AI-assisted visual screening (optional Gemini key), a first-response guidance assistant, rescue-contact calling and expanded workspace settings.

> **Safety note:** AI screening and first-response guidance are decision-support only. They are not veterinary diagnosis or treatment. Never approach a dangerous animal or delay professional care. An emergency report is stored and flagged; the application does not automatically dispatch a rescue vehicle or guarantee that a phone call is answered.

## 1. Technology stack

| Layer | Technology |
|---|---|
| Web client | React 18, Vite, React Router, Axios, Lucide icons |
| Mobile client | Flutter / Dart, image_picker, geolocator, url_launcher |
| API | Node.js 20+, Express, JWT, bcrypt, Multer |
| Database | MongoDB Community / MongoDB Atlas |
| AI text guidance | Gemini 2.5 Flash (optional; safe fallback works without a key) |
| AI image screening | Python Flask + Pillow + Gemini Vision (optional; human-review fallback without a key) |
| Maps | Google Maps links and map embed; no Maps API key needed for this basic implementation |

## 2. Main features

### Reporting and rescue operations
- Capture an animal photo directly from the web device camera, or select an existing image.
- Flutter mobile report flow captures a photo using the phone camera.
- JPG, PNG and WEBP uploads, 5 MB maximum.
- GPS coordinate capture and landmark/location text.
- Google Maps preview, case navigation and route opening.
- Animal type, observed condition, priority, emergency flag and report history.
- Staff case status workflow: submitted → reviewing → pending rescue / assigned → rescued / closed.
- The Hope & Paws NGO workspace shows sample tasks plus all reports the signed-in, approved coordinator is authorized to read. New and updated reports are pushed to the workspace through the authenticated live event stream. Approved rescue staff can persist team assignments, status changes and progress reports; demo cases remain local to the browser.
- Cross-platform report storage: a report submitted from web is visible to mobile and vice versa after refresh.
- Reports are saved before optional AI enrichment finishes, so rescue teams can start reviewing cases immediately. Approved rescue-team dashboards receive new and updated reports over an authenticated live event stream.
- Rescue teams can update case status, including marking a case pending rescue or rescued.

### AI and first-response support
- Optional Gemini Vision screening of uploaded images. It returns a cautious summary, possible visible signs, severity estimate and human-review recommendation. It does not draw validated injury bounding boxes or diagnose an animal.
- Optional Gemini-powered first-response text guidance. If the key is missing or the AI service fails, a deterministic conservative safety checklist is returned.
- Clear disclaimers, uncertainty and escalation to a veterinarian/rescue professional.

### Emergency support
- Mark a report as an emergency. Emergency cases are stored with `priority=emergency`, `emergency=true` and `rescueRequested=true`.
- Save a locally verified rescue/veterinary phone number in web Settings or mobile Settings.
- After emergency report submission, the web app asks whether to open the phone dialler; the mobile app opens the dialler if a number is saved.
- This is a phone-call handoff, not an automatic dispatch integration. No rescue service is contacted unless the user completes the call.

### Professional dashboard and settings
- Sidebar workspace: Overview, Rescue Cases, Rescue Map, AI & First Aid, Settings.
- Case metrics, status distribution, recent cases, search, emergency badges and staff status updates.
- Settings: emergency hotline, theme, preferred-language setting, local alert preference, location-sharing preference, compact-list preference and restore defaults.
- Settings are currently browser/device-local. Notification toggles are preferences only; push/email delivery requires a later notification provider integration. The language preference is stored but does not yet translate all interface strings.

### Accounts and rescue-team access
- Account names accept letters and spaces; email addresses are syntax-validated. Passwords must be at least 8 characters and contain a letter, a number and a special character.
- Rescue-team registrations start as pending applications. An administrator reviews them in **Team applications** before granting access to all incoming reports or case-status updates.
- The NGO workspace is available only to an authenticated `ali@gmail.com` account with an approved `rescuer` or `admin` role. That account is redirected to the NGO workspace after sign-in. Email alone does not grant rescue-team permissions; approve the account through **Team applications** or promote it using the administrator setup process.
- Community members and pending applicants can only read their own reports. To initialize the first administrator, run `cd server` followed by `npm run make-admin -- your-registered-email@example.com`; then sign in again and approve rescue-team applications in **Team applications**.
- Email ownership is not verified and no verification email is sent. Configure an email provider and verification flow before relying on account email identity in production.

## 3. Project structure

```text
ResQVision/
├── client/                 # React web dashboard
├── server/                 # Express API + MongoDB models
│   └── src/services/       # First-aid and image-screening integration
├── mobile/                 # Flutter app
├── ai-service/             # Optional Flask/Gemini image screening
└── docs/                   # API testing and implementation notes
```

## 4. Windows setup

Install Node.js 20+, MongoDB Community Server (or create an Atlas database), Python 3.10+, Flutter SDK and Android Studio. Open the extracted `ResQVision` folder in VS Code.

### A. Start MongoDB

Start the MongoDB Windows service, then verify the local connection in MongoDB Compass:

```text
mongodb://127.0.0.1:27017
```

### B. Start the API

Open Terminal 1:

```powershell
cd server
copy .env.example .env
npm install
npm run dev
```

Edit `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/resqvision
JWT_SECRET=replace_with_a_long_random_secret
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=uploads
AI_SERVICE_URL=http://127.0.0.1:8000
GEMINI_API_KEY=
RESCUE_HOTLINE=
```

Set `GEMINI_API_KEY` to your own Google AI Studio key if you want Gemini-powered text guidance. Keep it only in `.env`; never put it in React or Flutter source code. `RESCUE_HOTLINE` is reserved for server integrations; users set their one-tap call number in app Settings.

API health check: `http://localhost:5000/api/health`.

### C. Start the React web app

Open Terminal 2:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.

### D. Enable optional image AI service

Open Terminal 3:

```powershell
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Set the same Gemini API key in the Python process environment before starting the service:

```powershell
$env:GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
python app.py
```

AI service health check: `http://localhost:8000/health`. Without a key, image uploads still work but visual AI analysis is explicitly marked as unavailable and human review is required.

### E. Start the Flutter app

Open Terminal 4:

```powershell
cd mobile
flutter doctor
flutter create --platforms=android,ios .   # run once to generate native platform folders
flutter pub get
flutter run
```

Set `apiBaseUrl` in `mobile/lib/config.dart`:
- Android emulator: `http://10.0.2.2:5000/api`
- Physical Android phone: `http://YOUR_PC_LAN_IP:5000/api` (same Wi-Fi; allow port 5000 through Windows Firewall)

Add the following permissions inside `android/app/src/main/AndroidManifest.xml`, within `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

For local development over HTTP only, add `android:usesCleartextTraffic="true"` to the `<application>` element. Remove this setting for production and use HTTPS.

## 5. Suggested demo sequence

1. Register and sign in on the web client.
2. Create a report, capture/upload an image, use GPS, select a condition and submit.
3. Review the first-response checklist and AI screening result or human-review fallback.
4. Open Rescue Map and navigate to the report in Google Maps.
5. Configure a verified rescue contact in Settings and test the call link.
6. Mark a separate test case as an emergency and demonstrate the call prompt.
7. Sign in with the same account on Flutter and refresh to verify the shared report.
8. For staff demonstration, create a test account and change its `role` to `rescuer` or `admin` in MongoDB Compass. Do not expose this role-edit process in a public deployment.

## 6. Important implementation limits before production

- No production-grade trained animal injury detector, verified localization/bounding boxes, or veterinary diagnostic model is included. Gemini visual screening is an optional general multimodal assistant and must be human-verified.
- No automatic dispatch, verified rescue-partner directory, live responder tracking, SMS/WhatsApp/FCM push notifications, email delivery or call-centre integration is included.
- Settings toggles are local preferences, not connected to a notification backend or account profile API.
- Add HTTPS, secure cloud image storage, rate limiting, request validation, audit logs, malware scanning, role administration, backup/retention policies and privacy consent before public launch.
- Add verified local rescue contacts and test emergency call behaviour on actual devices before any field pilot.

See `docs/UPGRADE-AND-OPERATIONS.md` and `docs/API-TESTING.md` for issue resolutions and API checks.

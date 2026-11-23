# ResQVision Flutter app

## Setup
1. Install Flutter SDK and Chrome; run `flutter doctor`.
2. From this folder run `flutter create --platforms=web,android,ios .` once to generate platform folders, then run `flutter pub get`.
3. To run the Flutter app in Chrome, start the API and run `flutter run -d chrome --web-port 5173`. Web builds use `http://localhost:5000/api`; the API must allow `http://localhost:5173` in `CLIENT_URL`.
4. For Android, set `apiBaseUrl` in `lib/config.dart` if needed:
   - Android emulator: `http://10.0.2.2:5000/api`
   - Physical Android phone: `http://YOUR_PC_LAN_IP:5000/api` (same Wi-Fi; allow port 5000 through Windows Firewall).
5. Add Android permissions to `android/app/src/main/AndroidManifest.xml` inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

6. For development over local HTTP, add `android:usesCleartextTraffic="true"` to the `<application ...>` element. Remove this for production and use HTTPS.
7. Run `flutter run` on an Android device/emulator. Grant camera and location permissions when prompted.

## Mobile features
- Shared Node/Express + MongoDB authentication and report list.
- Camera capture during case submission (`image_picker` camera source).
- Flutter web support for Chrome, including browser-compatible image uploads.
- GPS location capture (`geolocator`) and Google Maps deep links (`url_launcher`).
- Emergency case flag and first-response checklist returned by the API.
- Locally saved verified rescue phone number in Settings; emergency call opens the phone dialler. The app does not automatically dispatch rescue teams.

# Digital DocuFolio — Android Studio / GitHub Ready

This package is prepared as a Capacitor Android project for **Digital DocuFolio**.

## What was fixed

- Android application ID: `com.docufolio.app`
- Launcher/MainActivity is configured.
- Android Google login no longer relies on the browser Google Identity Services button inside the APK.
- Android uses a native Google credential picker and passes the Google ID token to Firebase Authentication.
- Web login continues to use the existing Google Identity Services flow.
- Firebase project/client configuration remains aligned with the existing app:
  - Firebase project: `gen-lang-client-0457821531`
  - Web OAuth client: `393681011941-m5r8dpkm1cu82gs34kdvigbofmtet92e.apps.googleusercontent.com`
- Existing AI functionality has been retained. The Android app sends AI requests to the configured HTTPS backend in `api.ts`; it does **not** use `localhost` for AI requests.
- Existing document scan, receipt parsing, financial analysis, journal analysis, wallet voice AI, and social discovery API routes remain in `server.ts`.
- Android camera, microphone, media, biometric, filesystem and network permissions are retained.
- GitHub-friendly source structure is retained.

## Important Google Cloud step — required for Google login

The APK cannot create Google Cloud credentials by itself. In Google Cloud Console, create/verify an **Android OAuth client in the same Google Cloud project as the web client**.

Use:

- Package name: `com.docufolio.app`
- SHA-1: the SHA-1 of the certificate that signs the APK.

For a debug build, in Android Studio open the Gradle tool window and run `app > Tasks > android > signingReport`, then copy the **debug SHA1** into the Android OAuth credential.

For a release/Play Store build, also add the release/Play App Signing SHA-1.

The web OAuth client remains the client ID used by the native Google credential request. The Android OAuth client must still exist and match the package + signing certificate.

## Open in Android Studio

1. Extract this ZIP.
2. Open **Android Studio**.
3. Choose **Open** and select the `android` folder inside this project.
4. Allow Gradle sync to finish.
5. If Android Studio asks for a JDK, use the bundled JDK / JDK 21 compatible with the installed Android Studio.
6. Connect an Android phone with USB debugging enabled, or start an emulator.
7. Select the `app` run configuration.
8. Press **Run** to create/install the debug APK.

## Build APK manually

From Windows Command Prompt, inside the `android` folder:

```bat
gradlew.bat assembleDebug
```

The APK will be under:

`android\app\build\outputs\apk\debug\app-debug.apk`

## If source files are changed later

From the project root:

```bat
npm ci
npm run build
npx cap sync android
```

Then reopen/sync the `android` project in Android Studio.

The included `BUILD_ANDROID.bat` automates the source build, Capacitor sync and debug APK build.

## AI backend

The APK uses the HTTPS backend URL configured in `api.ts`. AI requests are not sent to `http://localhost:3000` from the Android app.

The backend must have its `GEMINI_API_KEY` configured on the server (for example, Cloud Run Secret Manager). Do **not** put a Gemini API key into the APK, Vite build variables, or commit one to GitHub.

## GitHub

This ZIP is structured for an existing GitHub repository. Recommended repository root is the project root (the folder containing `package.json` and `android`).

Typical update workflow:

```bat
git add .
git commit -m "Prepare Android Studio build"
git push
```

If the repository is not already configured locally, add its GitHub remote first. The ZIP does not contain a GitHub personal access token or account credentials.

## Security note

Firebase web configuration values are normally safe to ship in a client application. Gemini server credentials are not. Keep `GEMINI_API_KEY` only on the backend.

## Current validation limitation

The source and Android project have been checked and the bundled Android web assets were updated. A full Gradle compilation could not be executed in this build environment because Gradle 8.13 must be downloaded from `services.gradle.org`, and outbound network access is unavailable here. Android Studio on a normal Windows development machine can download the Gradle/dependency artifacts during the first sync.

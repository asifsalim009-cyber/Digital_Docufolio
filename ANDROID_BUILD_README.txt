DIGITAL DOCUFOLIO - ANDROID STUDIO BUILD

This package is prepared for the Capacitor Android project.
Package ID: com.docufolio.app
App name: Digital DocuFolio

IMPORTANT FIXES IN THIS VERSION
1. Fixed Android WebView startup crash caused by direct use of the browser Notification API when Notification is unavailable.
2. Android native build no longer registers the PWA service worker from the bundled app. This prevents stale/cached web assets from producing a blank screen.
3. Google sign-in remains native on Android through GoogleAuthPlugin and Firebase signInWithCredential.
4. Web Google sign-in remains available for normal browser builds.
5. AI/Gemini dependencies and application source have NOT been removed.

RECOMMENDED BUILD
1. Extract this ZIP to a normal Windows folder.
2. Open the extracted project folder in Android Studio by selecting the 'android' folder when importing/opening an Android project, OR open the root folder if Android Studio prompts for the Gradle project.
3. If Android Studio asks to sync Gradle, allow it.
4. For a reproducible rebuild from source, close Android Studio and run BUILD_ANDROID.bat once. It installs package-lock dependencies, rebuilds the web app, syncs Capacitor, and builds app-debug.apk.
5. The debug APK is created at:
   android\app\build\outputs\apk\debug\app-debug.apk

GOOGLE LOGIN
Android uses the native Google credential flow. The web-only Google Identity Services button is not used on native Android, so the Android app should not redirect to a localhost web login page.

IF ANDROID STUDIO SHOWS A WHITE SCREEN
This package already contains the patched Android web assets. Uninstall the old Digital DocuFolio APK from the phone first, then install the new debug APK. Do not reuse an older installed APK.

SOURCE OF THE ANDROID WEB ASSETS
The android/app/src/main/assets/public folder contains the bundled web app used by Capacitor. Running 'npm run build' and 'npx cap sync android' regenerates this folder from the source project.

AI FUNCTIONALITY
The project retains @google/genai and the existing Gemini configuration/build definitions. Do not delete GEMINI_API_KEY configuration or AI-related source files.

NOTE
A completely reproducible clean build requires internet access so npm/Gradle can download dependencies. This ZIP intentionally does not include node_modules.

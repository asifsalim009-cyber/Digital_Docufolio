# Digital DocuFolio — Android Studio Clean Package

This archive is a valid ZIP and contains the Android Studio project.

## Build
1. Open a terminal in this project root.
2. Run `npm install`.
3. Run `npm run build`.
4. Run `npx cap sync android`.
5. Open the `android` folder in Android Studio.
6. Sync Gradle and Run on the device.

The Android web assets use relative paths so the Capacitor WebView can load the bundled Vite output without depending on a web server.

The Kotlin duplicate-class resolution and Google Credential Manager callback fixes from the previous package are retained.

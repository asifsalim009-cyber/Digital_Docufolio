@echo off
setlocal
cd /d "%~dp0"

echo ================================================
echo Digital DocuFolio - Android Build
echo ================================================

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Install Node.js LTS, restart Windows, and run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm is not available.
  pause
  exit /b 1
)

if not exist package-lock.json (
  echo ERROR: package-lock.json is missing.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [1/4] Installing locked dependencies...
  call npm ci --no-audit --no-fund
  if errorlevel 1 (
    echo ERROR: npm ci failed.
    echo Try: npm cache verify
    echo Then run BUILD_ANDROID.bat again.
    pause
    exit /b 1
  )
) else (
  echo [1/4] node_modules already exists - skipping npm ci.
)

echo [2/4] Building web application...
call npm run build
if errorlevel 1 (
  echo ERROR: npm run build failed.
  pause
  exit /b 1
)

echo [3/4] Synchronizing Capacitor Android project...
call npx cap sync android
if errorlevel 1 (
  echo ERROR: Capacitor sync failed.
  pause
  exit /b 1
)

echo [4/4] Building debug APK...
call android\gradlew.bat assembleDebug
if errorlevel 1 (
  echo ERROR: Gradle APK build failed.
  echo Open Android Studio and inspect the first red error in Build Output.
  pause
  exit /b 1
)

echo.
echo ================================================
echo BUILD SUCCESSFUL
echo APK:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo ================================================
pause
endlocal

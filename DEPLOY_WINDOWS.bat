@echo off
setlocal

echo DocuFolio Cloud Run deployment

echo.
where gcloud >nul 2>nul
if errorlevel 1 (
  echo Google Cloud CLI is not installed or not on PATH.
  echo Install the Google Cloud CLI, sign in, and run this file again.
  pause
  exit /b 1
)

gcloud config set project 393681011941
if errorlevel 1 exit /b 1

gcloud run deploy digital-docufolio-backend --source . --region europe-west1 --port 8080 --allow-unauthenticated --set-secrets GEMINI_API_KEY=Docufolio_API_Key:latest
if errorlevel 1 exit /b 1

echo.
echo Deployment completed. Test /api/health on the Cloud Run URL shown above.
pause

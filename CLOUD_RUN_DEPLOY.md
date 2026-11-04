# DocuFolio Cloud Run deployment

This project is prepared to run the Node/Express AI backend on Google Cloud Run.

## Important

- The backend listens on `process.env.PORT` and defaults to `8080`, which matches the Cloud Run container contract.
- The Gemini credential is read only from the server-side `GEMINI_API_KEY` environment variable.
- Do **not** put the Gemini key in the Android project or in a `.env` file committed to source control.
- The expected Secret Manager secret is `Docufolio_API_Key`, version `latest`.

## Deploy from Google Cloud Shell

From the directory containing this project, run:

```bash
gcloud config set project 393681011941

gcloud run deploy digital-docufolio-backend \
  --source . \
  --region europe-west1 \
  --port 8080 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=Docufolio_API_Key:latest
```

If Google Cloud asks to enable APIs or create the source Artifact Registry repository, accept the prompts.

The expected service URL is:

`https://digital-docufolio-backend-393681011941.europe-west1.run.app`

After deployment, test:

`https://digital-docufolio-backend-393681011941.europe-west1.run.app/api/health`

It should return JSON containing `{"status":"ok"}`.

## Cloud Console

The Cloud Run console's GitHub/Cloud Build flow is for repository-based deployment. This project can instead be deployed directly from source with `gcloud run deploy --source .`. Google documents that source deployments use a Dockerfile when one is present, and otherwise use buildpacks. This project includes a Dockerfile for a deterministic Node build.

## Android build

The native app uses the Cloud Run endpoint in `api.ts` and still supports `VITE_BACKEND_URL` as an override. If the service name or region changes, update that value before building the APK.

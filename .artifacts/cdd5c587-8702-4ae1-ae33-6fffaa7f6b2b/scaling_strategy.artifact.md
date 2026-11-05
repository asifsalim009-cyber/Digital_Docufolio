# Handling Spikes in Demand for Digital DocuFolio Cloud Run Backend

When experiencing sudden traffic spikes (e.g., promotional launches, heavy AI document analysis bursts, or multi-device sync waves), the backend service deployed on Google Cloud Run needs proper configuration to autoscale smoothly, prevent cold starts, and avoid request timeouts.

## Recommended Cloud Run Configuration for High Demand

Update your Cloud Run service using `gcloud` to handle high concurrency and traffic spikes:

```bash
gcloud run services update digital-docufolio-backend \
  --region europe-west1 \
  --min-instances 2 \
  --max-instances 100 \
  --concurrency 80 \
  --cpu 2 \
  --memory 2Gi \
  --cpu-boost \
  --timeout 300s
```

### Key Scaling Parameters Explained

| Parameter | Recommended Value | Purpose during Spikes |
| :--- | :--- | :--- |
| `--min-instances` | `1` or `2` | Keeps warm instances running to eliminate cold-start latency when traffic surges unexpectedly. |
| `--max-instances` | `50` to `100+` | Allows Cloud Run to scale out horizontally to handle large traffic waves without throttling. |
| `--concurrency` | `80` to `150` | Defines how many concurrent requests a single container instance can handle before scaling up another instance. |
| `--cpu` & `--memory` | `2 CPU`, `2Gi` | Ensures sufficient resources for heavy operations like Gemini AI requests, PDF generation (`jspdf`), and bulk document parsing. |
| `--cpu-boost` | Enabled | Temporarily allocates extra CPU during container startup to speed up cold starts when scaling from 0 to 1 instance. |
| `--timeout` | `300s` (5 min) | Prevents long-running document exports or AI generation tasks from timing out prematurely. |

---

## Architectural Best Practices

1. **Firestore & Database Scalability**
   - Firestore automatically scales to handle virtually unlimited read/write operations during demand spikes. Ensure composite indexes are properly created for complex queries (e.g., expenditures, documents by user).
2. **Client-Side Offline-First Caching**
   - The app uses IndexedDB (`idbSync.ts`) and Service Workers (`workbox`) to queue sync operations locally when offline or during transient server load, preventing request flooding.
3. **AI Request Rate Limiting & Queueing**
   - For Gemini API calls (`@google/genai`), ensure proper error handling and retry exponential backoff (`patch_retry.cjs`) to gracefully manage upstream API rate limits during peak usage.

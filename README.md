# Clark Site Report Builder

A mobile web app (installable PWA) for site visits: capture photos, dictate notes, and export a paginated PDF report. Dictation is cleaned up by Google Gemini via the app's own server, so the API key never reaches the browser.

## Run locally

**Prerequisites:** Node.js 20+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY` (get a key at https://aistudio.google.com/apikey)
3. Start the dev server: `npm run dev`, then open http://localhost:3000

To test the production build locally: `npm run build && npm start`.

## Publish (Google Cloud Run)

The repo already contains a `Dockerfile` and `cloudbuild.yaml` for Cloud Run. Cloud Run gives you an HTTPS URL, which the app needs for the camera, microphone and "Add to Home Screen" to work.

One-time setup (in [Cloud Shell](https://shell.cloud.google.com) or with the `gcloud` CLI installed):

```bash
# 1. Pick your project and turn on the services
gcloud config set project YOUR_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  containerregistry.googleapis.com secretmanager.googleapis.com

# 2. Store the Gemini key as a secret
printf '%s' 'YOUR_GEMINI_API_KEY' | gcloud secrets create gemini-api-key --data-file=-

# 3. Let Cloud Run read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Deploy (run from the repo folder, and again whenever you want to publish changes):

```bash
gcloud builds submit --config cloudbuild.yaml
```

The command prints the service URL (e.g. `https://clark-qc-builder-xxxxx-uc.a.run.app`). Open it on a phone and use the menu's **Add to Home Screen** (Android/Chrome) or Safari's **Share → Add to Home Screen** (iPhone).

Notes:
- If Cloud Build reports a permission error deploying to Cloud Run, grant the Cloud Build service account the **Cloud Run Admin** and **Service Account User** roles (Cloud Build → Settings page has toggles for both).
- `cloudbuild.yaml` deploys with `--allow-unauthenticated`, so anyone with the URL can use the app (and your Gemini quota). To restrict it, remove that flag and put the service behind [Identity-Aware Proxy](https://cloud.google.com/iap/docs/enabling-cloud-run).
- To change the region, edit `us-central1` in `cloudbuild.yaml`.

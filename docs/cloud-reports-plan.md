# Cloud reports: saved and shared reports (plan)

Status: planned, not built. This branch (`claude/cloud-reports`) holds this work
so it stays separate from `main` until it has been tried and approved.

## Goal

- The app keeps working exactly as today without signing in.
- Signing in (optional) adds a side menu with **My reports** and **Shared with me**,
  saving reports to the cloud, reopening them on any device, and sharing them by email
  as **Can edit** or **View only**.
- Normal sharing stays: Download PDF and Share / Print work for everyone,
  including on view-only reports.

Mockup: https://claude.ai/artifact/5SLhnS7HkHcmnxBqBhu8Jy

## Decisions so far

- Email only, no usernames.
- `@clarkconstruction.com` addresses only, verified.
- Sign-in: email + password with email verification, forgot-password by email.
  (Email links and Google sign-in open in Safari rather than the iPhone Home Screen app,
  which keeps separate storage, so they don't sign people in to the app reliably.)
- No share notification emails in the first version.
- Security: basic but real rules (owner and share list only, verified Clark emails).
  Never "test mode".
- Staying signed in: until the person signs out (Firebase keeps a refresh token on the
  phone). Changing the password or disabling the account signs them out everywhere.
- Photos: two copies in the cloud, 2560 px "full" and ~1280 px "report", plus a small
  thumbnail for lists. Not full camera resolution.
- Save all photos saves the unmarked full-size photos.

## Services (same Google Cloud project as Cloud Run)

| Need | Service |
|---|---|
| Sign-in | Firebase Authentication (Email/Password) |
| Reports, items, share lists | Firestore, us-central1 |
| Photos | Cloud Storage for Firebase, us-central1 |
| App + AI dictation | Cloud Run (unchanged) |

## Working together

- Each item is its own database record, so people editing different items never
  overwrite each other.
- Live updates: changes appear on everyone's screen within a second or two.
- "Alex is editing this item" indicator, and "Updated by Alex · 2 min ago".
- Same field saved by two people at the same moment: the latest save wins, per field.
- Offline edits are kept on the phone and sent when signal returns
  (status chip: Saved / Saving… / Waiting for signal).

## Data layout

Today (on the phone, IndexedDB via idb-keyval, one report):
- `constructReport_entries`: array of items; each item holds its photos inline as
  base64 text, plus markup (original photo + shapes) and pending audio.
- `constructReport_projectInfo`, `constructReport_template`, `constructReport_details`.
- Every edit rewrites the whole array, photos included. Fine for one report, not for many.

New layout (same shape on the phone and in the cloud, so features added later only
need new fields):

```
reports/{reportId}
  schemaVersion: 1
  name, template, project {name, date, author}, details {include, weather, ...}
  ownerUid, ownerEmail
  access { "alee@clarkconstruction.com": "edit" | "view" }
  accessEmails [ ... ]            // for the "Shared with me" query
  itemCount, coverPhoto           // so menu lists never load items
  createdAt, updatedAt, updatedBy

reports/{reportId}/items/{itemId}
  order                           // fractional, so reordering edits one item
  title, observation, action, transcription
  photos [ { id, w, h, markup: shapes[] | null } ]   // markup is small vector data
  pendingAI, updatedAt, updatedBy, editingBy, editingAt

Storage: reports/{reportId}/photos/{photoId}/
  full.jpg (2560 px), report.jpg (~1280 px), thumb.jpg (~400 px)
  marked.jpg (report size, only when marked up; redrawn from shapes)
```

On the phone the same records go in separate IndexedDB stores (reports, items,
photos as binary blobs instead of base64 text), so an edit writes one small record.
`schemaVersion` lets a later version upgrade old records safely.

Efficiency notes:
- Menu lists read only report records (small); items load when a report opens.
- Photos download only at the size needed (thumb for lists, report size for the
  item screen and PDF, full only when saving/zooming), and are cached on the phone.
- Item-level records mean live updates send only the item that changed.
- Markup stays as shapes (a few hundred bytes), not a second full image.

## Also planned

- **Save all photos**: report menu and item screen, one share sheet for all photos
  (batches of ~20). Saves unmarked photos: full-size (2560 px) when signed in,
  the phone's copy when signed out.

## Rolling back

- Until this branch is merged, `main` is unaffected.
- After merging: revert the merge on GitHub (the pull request's **Revert** button)
  and redeploy, or redeploy from the last commit before the merge. Reports people
  made while signed out stay on their phones either way; cloud data stays in Firestore.

## Owner to-do (console)

1. Firebase console: Add project, pick the existing Cloud Run project.
2. Upgrade to Blaze (same billing account).
3. Authentication: enable Email/Password only; set sender name in Templates;
   add the run.app domain under Settings > Authorized domains.
4. Firestore: Production mode, us-central1.
5. Storage: Get started, us-central1.
6. Project settings > Your apps > Web app: send the settings block.
7. Billing > Budgets & alerts: e.g. $10/month.

## Open questions

None at the moment. Waiting on the console setup (step 6 settings).

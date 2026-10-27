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
- Clark email addresses only (domain list to confirm).
- Sign-in: email + password with email verification, forgot-password by email.
  (Email links and Google sign-in open in Safari rather than the iPhone Home Screen app,
  which keeps separate storage, so they don't sign people in to the app reliably.)
- No share notification emails in the first version.
- Security: basic but real rules (owner and share list only, verified Clark emails).
  Never "test mode".

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

- `reports/{reportId}`: name, template, project info, report details,
  owner email, share list (email -> edit | view), updated at / by.
- `reports/{reportId}/items/{itemId}`: order, name, observation, action,
  transcription, photos (file path + markup), updated at / by, editing by.
- Storage `reports/{reportId}/photos/{photoId}.jpg` (+ original when marked up).

## Also planned

- **Save all photos**: report menu and item screen, one share sheet for all photos
  (batches of ~20). Photos are the app's 1024 px copies, not full camera resolution.

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

1. Allowed email domain(s)?
2. Save all photos: unmarked, marked-up, or both?
3. OK with email + password sign-in?

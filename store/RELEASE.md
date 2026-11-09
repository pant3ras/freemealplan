# Releasing WeekPlate on Google Play

## What is ready

| Item | Where |
|---|---|
| Signed release bundle (v1.1, versionCode 2, target API 36) | `store/releases/weekplate-1.1-code2.aab` (same as `android/app/build/outputs/bundle/release/app-release.aab`) |
| Upload key | `C:\Users\pant3\.android\weekplate-upload.jks`, alias `weekplate`, passwords in `C:\Users\pant3\.gradle\gradle.properties` |
| Store texts in English and Romanian, release notes, form answers | `store/listing.md` (check limits: `node store/check-listing.mjs`) |
| App icon 512×512, feature graphic 1024×500 | `store/icon-512.png`, `store/feature-graphic-1024x500.png` |
| 8 phone screenshots per language, 1080×1920 | `store/screenshots/en/`, `store/screenshots/ro/` |
| Privacy policy page (git repo, 2 commits) | `store/pages/` (markdown copy: `store/privacy-policy.md`) |

The release bundle has no internet permission (checked in the merged manifest), contains all 196 photos and is signed with the upload key.

## 1. Back up the upload key (do this first)

Copy `weekplate-upload.jks` and the four `WEEKPLATE_*` lines from `C:\Users\pant3\.gradle\gradle.properties` into your password manager (Vaultwarden). Without them you cannot publish updates; Google can reset an upload key only through a support request.

## 2. Publish the privacy policy

1. On github.com create a **public** repository `weekplate-privacy` (no README).
2. In `C:\Users\pant3\weekplate\store\pages`:
   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/weekplate-privacy.git
   git push -u origin main
   ```
3. Repository → Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
4. After a minute the page is at `https://YOUR-USERNAME.github.io/weekplate-privacy/`. Open it once to check.

## 3. Developer account

Sign up at https://play.google.com/console (one-time US$25, identity verification with an ID document). A **personal** account created recently must run a closed test with at least 12 testers for 14 days before it can publish to production; an **organization** account (needs a D-U-N-S number) does not. Check the current rule on the sign-up page, as Google changes it.

## 4. Create the app

Play Console → Create app:
- App name: `WeekPlate: Meal Planner` · Default language: English (United States) · App · Free
- Accept the declarations.

## 5. App content (Policy → App content)

Fill every section with the answers in `store/listing.md` → "App content answers" and "Data safety form". Privacy policy URL: the address from step 2.

## 6. Store listing (Grow → Store presence → Main store listing)

- English: name, short and full description from `listing.md`; icon; feature graphic; the 8 screenshots in `screenshots/en/` in order.
- Add translation → Romanian (ro): Romanian texts and `screenshots/ro/`.
- Store settings: category Food & Drink, contact email `pant3ras+weekplan@gmail.com`.

## 7. Closed test

Testing → Closed testing → Create track:
1. Countries: Romania (add others if you like).
2. Testers: an email list (Google accounts of friends and family; 12 or more if your account needs it).
3. Create release → let Google manage the app signing key (Play App Signing) → upload `app-release.aab` → paste the release notes (English and Romanian) → Review → Start rollout.
4. Send testers the opt-in link from the track page. They must stay opted in for the 14 days.

## 8. Production

When the test period is done, Dashboard → Apply for production access, answer the short questionnaire, then Production → Create release with the same bundle (or a newer one). First reviews usually take a few days.

## Updating the app later

1. Raise `versionCode` (2, 3, …) and `versionName` in `android/app/build.gradle`.
2. Optional: refresh prices with `node scripts/prices-sync.mjs` (the app only knows the prices bundled at build time).
3. `npm run apk -- bundleRelease`
4. Upload the new `app-release.aab` to the track, with release notes.

If the store screenshots need redoing, the scripts that made them took about two minutes and only need the dev server (`npm run dev`); ask Claude to recapture them.

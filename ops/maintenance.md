# Maintenance

Adding records and changing store settings needs only the admin panel or the sheet; see [README](README.md). This page covers everything else.

| When | Task |
|---|---|
| The sheet or the Web app URL changes | [Update config.json](#update-configjson) |
| `google-sheet/Code.gs` changes | [Update the Apps Script](#update-the-apps-script) |
| A password may have leaked, or someone should lose access | [Change the admin password](#change-the-admin-password) |
| The site address changes | [Change the site address](#change-the-site-address) |
| A website code change | [Change the website code](#change-the-website-code) |

## Update config.json

`docs/config.json` tells the site which sheet to read and which Apps Script to save through. Update it when you use a different sheet, or make a **New deployment** of the Apps Script (a new Web app URL).

1. In your repository on github.com, open `docs/config.json`. Click the pencil icon.
2. Set `"sheetId"` (the part of the sheet's address between `/d/` and `/edit`) and `"appsScriptUrl"` (the Web app URL, ending in `/exec`). Change only the text inside the quotes.
3. Click **Commit changes**. The site updates in 1–3 minutes.
4. In the admin panel: **Connection → Save & test**. It should say **Connected to** and your sheet's name.

Tip: if **Save & test** shows a yellow box, it contains the correct file content. Click **Copy** and paste it in place of the whole file.

## Update the Apps Script

Do this after `google-sheet/Code.gs` changes, or when the admin says the Apps Script is an older version or needs a permission.

1. On github.com, open `google-sheet/Code.gs`, click **Raw**, copy all.
2. In the sheet: **Extensions → Apps Script**. Select all the code, replace it with the copy. Click **Save**.
3. Choose the function **setup**, click **Run**. If Google asks: **Review permissions** → your account → **Advanced** → **Go to Backwash admin (unsafe)** → **Allow**.
4. **Deploy → Manage deployments** → pencil icon → **Version: New version** → **Deploy**.

The Web app URL, password and data stay the same. Do **not** use **New deployment**: it creates a new URL, and then you must [update config.json](#update-configjson).

## Change the admin password

1. In the sheet: **Extensions → Apps Script → Project Settings** (gear icon) **→ Script Properties**.
2. Change the value of `ADMIN_PASSWORD`. Click **Save script properties**. No redeploy needed.
3. Log in again with the new password on each device.
4. In the sheet, **Share**: remove editors who should not have access. Editors can see the password.

## Change the site address

Renaming the repository or adding a custom domain (see [Initial setup](initial_setup.md#1-github-fork-and-publish)) changes the address. Every sticker then needs rewriting: open each record's **Sticker** panel and write it again. Locked stickers must be replaced.

## Change the website code

Edit files in the repository on github.com and commit to `main`. GitHub Pages republishes in 1–3 minutes. To check progress, open the **Actions** tab (**pages build and deployment**). To undo, revert the commit. Technical details: [AGENT.md](../AGENT.md).

## Undo record or settings changes

In the sheet: **File → Version history**, pick an older version, **Restore**.

## Housekeeping

- An `ODESLI_API_KEY` script property from older versions is unused. You can delete it.
- Google's free limits for sheets and scripts are far above what a record store uses.

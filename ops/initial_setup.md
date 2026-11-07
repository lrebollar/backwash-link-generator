# Initial setup

Do once, in order. About 45 minutes. You need a free GitHub account and a free Google account.

**Choose the final site address before writing any sticker.** Stickers hold the full link. A new address means rewriting every sticker.

## 1. GitHub: fork and publish

1. The repository must be **public** when you fork it: GitHub Pages is free only for public repositories, and a fork keeps the visibility of the original. If it is private, its current owner makes it public first (**Settings → General → Danger Zone → Change visibility**). The repository holds no secrets.
2. Open the repository on github.com. Click **Fork**, then **Create fork**.
3. In your fork: **Settings → Pages**. Under **Build and deployment**, set **Source** to **Deploy from a branch**, branch `main`, folder `/docs`. Click **Save**.
4. After 1–2 minutes, reload the page. The site address shows at the top, for example `https://<github-user>.github.io/backwash-link-generator/`. Until step 3, the site still shows the previous owner's records.

Optional, before writing stickers:

- Rename the repository (**Settings → General**) to change the address.
- Use your own domain (for example `links.backwash.com`, about US$10/year). It keeps the address if the site ever moves. **Settings → Pages → Custom domain**, type the domain, **Save**. Add the DNS records GitHub shows at your domain seller. When verified, tick **Enforce HTTPS**.

## 2. Google Sheet and Apps Script

1. In your fork, open `google-sheet/backwash-records-template.xlsx`. Click **Download raw file**.
2. On drive.google.com: **New → File upload**, pick the file. Open it, then **File → Save as Google Sheets**. Use this copy from now on.
3. **Share** → **General access**: **Anyone with the link**, role **Viewer** → **Done**.
4. **Extensions → Apps Script**. Delete the code there. In your fork, open `google-sheet/Code.gs`, click **Raw**, copy all, paste it into the editor. Click **Save** (disk icon). If asked for a name, type `Backwash admin`.
5. **Project Settings** (gear icon) → **Script Properties** → **Add script property**. Property: `ADMIN_PASSWORD`. Value: a password you choose. Click **Save script properties**.
6. Click **Editor** (`<>` icon). In the toolbar, choose the function **setup**, click **Run**. When Google asks: **Review permissions** → your account → **Advanced** → **Go to Backwash admin (unsafe)** → **Allow**. It is your own script. The log shows what it did.
7. **Deploy → New deployment**. Click the gear next to **Select type** → **Web app**. **Execute as**: Me. **Who has access**: Anyone (the password still protects changes). Click **Deploy**. Copy the **Web app URL** (ends in `/exec`).

**Keeping existing records:** instead of items 1–2, open the existing sheet and click **File → Make a copy**. The copy includes its Apps Script. Continue from item 3. Covers uploaded by the previous owner stay in their Google Drive and disappear if they delete them; re-upload them to keep them.

## 3. Connect the site to the sheet

In your fork, open `docs/config.json`, click the pencil icon, replace both values, then **Commit changes**:

```json
{
  "sheetId": "the part of the sheet's web address between /d/ and /edit",
  "appsScriptUrl": "the Web app URL from step 2, item 7"
}
```

The site updates in 1–3 minutes.

## 4. Admin panel

Do on each phone or computer you use.

1. Open `<site>/admin/`. Log in with the `ADMIN_PASSWORD` value.
2. Open **Connection**. **Public site URL** fills in by itself. Set **Country for link lookup** (2 letters, for example `US`). Click **Save & test**. It should say **Connected to** and your sheet's name.
3. If a yellow box shows text for `docs/config.json`, the file does not match this sheet. Click **Copy** and put that text in the file (step 3).

## 5. Store settings

1. **Site settings**: fill in store name, tagline, catalog link, social links and design. Click **Save site settings**.
2. **Albums**: open **Backwash Sampler Vol. 1** (the demo record), click **Edit**, then **Delete album**.

Setup is done. To add records and write stickers, see [README](README.md#add-a-record).

## If something goes wrong

| Problem | Fix |
|---|---|
| The site address shows 404 | Wait a few minutes. Check **Settings → Pages** is set to `main` and `/docs`. If the **Actions** tab asks to enable workflows, enable them. |
| The site shows the demo store or someone else's records | `docs/config.json` is not updated (step 3). |
| "Wrong admin password." | Type the `ADMIN_PASSWORD` value exactly. |
| "The web app answered with a web page instead of data." | Deploy again with **Who has access: Anyone** (step 2, item 7). |
| "Couldn't reach the Google Apps Script web app." | Check `appsScriptUrl` in `docs/config.json`. |

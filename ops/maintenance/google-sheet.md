# Google Sheet and Apps Script

## Edit the sheet by hand

You can also change records and store settings directly in the Google Sheet. Open the sheet on drive.google.com. Changes appear on the website within about a minute.

**The Albums tab: one row for each record**

- Each row is one record. To remove a record, delete its whole row.
- Do not rename the tabs or the column headers. Do not move or swap columns. Column A must stay **slug**.
- **slug** is the short name of the record page, for example `nevermind`. It is what the sticker link points to. Use only lowercase letters (a to z), numbers, and single dashes between words, for example `blue-album-2026`. Do not use spaces, capital letters or other symbols. Use at most 60 characters.
- Do not change a slug after you write its sticker. The sticker would stop working.
- **title** is required.
- Links must start with `https://`. This includes the cover, the **shopUrl** and the streaming links. Copy the full address from your browser. The demo record is the only exception, and you will delete it.
- **updatedAt**: leave it empty or as it is. The admin panel fills it in when it saves.
- All cells are plain text. A year like 1991 stays as it is.
- A row with an empty **slug** is ignored.

**The Site tab: store settings**

- Change only the **value** column (column B). Do not change the **key** column (column A).
- The **notes** column (column C) explains each setting. The site ignores it.
- An empty value hides that item on the site. For button words, an empty value means the normal wording is used.
- Social links must point to your own profile, for example `https://www.instagram.com/backwashrecords`. A link to a network's home page (like `https://www.instagram.com/`) or an `example.com` address is treated as empty and hidden.
- **theme**: type one of these words: `ink`, `paper`, `fire`, `sun` or `cover`. See [Design](design.md).
- **themeSwitcher**: type `TRUE` to show the **Change design** button. Type `FALSE` to hide it.
- The **How to use** tab has short notes. The site ignores it.

## Undo a change

For records and store settings, open the Google Sheet. Click **File**, then **Version history**. Choose an older version and restore it.

## Update the Apps Script

When `google-sheet/Code.gs` changes (for example, the update that made **Auto-fill** fill in the artist, year and label), copy the new version into your sheet once:

1. On github.com, open `google-sheet/Code.gs` and copy all of it.
2. In your Google Sheet, click **Extensions**, then **Apps Script**. Select all the code there, delete it, and paste the new code. Click **Save** (disk icon).
3. Choose the function **setup** in the toolbar and click **Run**. If Google asks for permission, click **Review permissions**, choose your account, then **Advanced** → **Go to Backwash admin (unsafe)** → **Allow**. (Auto-fill needs permission to contact Spotify, Apple and Deezer.)
4. Click **Deploy**, then **Manage deployments**. Click the pencil icon. Set **Version** to **New version**. Click **Deploy**.

The Web app URL stays the same, so nothing else changes. Your password and data are kept.

**Do not** choose **New deployment** here. That makes a new Web app URL, and `docs/config.json` would then need the new one.

## Change the admin password

Do this if you think the password leaked, or when someone should no longer have access.

1. Open the Google Sheet. Click **Extensions**, then **Apps Script**.
2. Click **Project Settings** (gear icon), then **Script Properties**.
3. Change the value of **ADMIN_PASSWORD**. Click **Save script properties**. You do not need to deploy again.
4. Type the new password in the **Connection** tab of the admin panel, on each device you use.

Anyone who can **edit** the sheet can also see the script properties, including the password. Give edit access only to people you trust.

## Auto-fill limit

If Auto-fill says "Too many lookups", wait a minute and try again.

An `ODESLI_API_KEY` script property from older versions is no longer used. You can delete it: **Project Settings** (gear icon) → **Script Properties** → **Edit script properties** → the trash icon next to it → **Save script properties**.

## Google's limits

Google sets limits on free sheets and scripts. A record store uses far less than those limits.

## If something goes wrong

- The admin says the Apps Script is an older version: do [Update the Apps Script](#update-the-apps-script).
- The admin says the Apps Script needs one more permission: do items 3 and 4 of [Update the Apps Script](#update-the-apps-script).
- For other problems, see "If something goes wrong" in [Setup 2: Google Sheet](../one-time-setup/2-google-sheet.md#if-something-goes-wrong).

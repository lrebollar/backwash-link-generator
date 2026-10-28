# Setup 2: Google Sheet — create the sheet and its Apps Script

Do this once.

The sheet holds your records and store settings. You need a free Google account.

## Steps

1. On github.com, open the file `google-sheet/backwash-records-template.xlsx`. Click **Download raw file**. The file saves to your computer.
2. Go to drive.google.com. Click **New**, then **File upload**, then pick the file you downloaded. When it has uploaded, double-click it. Then click **File**, then **Save as Google Sheets**. Use this new Google Sheets copy from now on.
3. Click **Share**. Under **General access**, choose **Anyone with the link**. Make sure the role is **Viewer**. Click **Done**. This is needed, because the public pages read the sheet. Nothing secret is in it.
4. Click **Extensions**, then **Apps Script**. Delete the code shown there. On github.com, open the file `google-sheet/Code.gs`. Click **Raw**. Select all the text (**Ctrl + A**, or **Command + A** on a Mac) and copy it (**Ctrl + C**, or **Command + C**). Go back to the Apps Script editor and paste it (**Ctrl + V**, or **Command + V**). Click **Save** (the disk icon). If asked for a name, type `Backwash admin`.
5. Click **Project Settings** (gear icon). Find **Script Properties**, then click **Add script property**. In **Property**, type `ADMIN_PASSWORD`. In **Value**, type a password you choose. Click **Save script properties**. Write this password down. You will type it in the admin panel.
6. Click the **Editor** icon (it looks like `<>`) to go back to the code. In the toolbar, open the function menu and choose **setup**. Click **Run**. If asked, click **Review permissions**, then choose your Google account. If you see "Google hasn't verified this app", click **Advanced**, then **Go to Backwash admin (unsafe)**, then **Allow**. This is safe, because it is your own script. The **Execution log** at the bottom says what **setup** did.
7. Click **Deploy**, then **New deployment**. Click the gear icon next to **Select type**, then choose **Web app**. Set **Execute as** to **Me**. Set **Who has access** to **Anyone**. The password still protects the admin actions. Click **Deploy**. If asked, authorize again. Then copy the **Web app URL**. It ends in `/exec`.
8. Tell the website where the sheet is. On github.com, open the file `docs/config.json`. Click the pencil icon (**Edit**). Put the sheet ID in `"sheetId"`. The sheet ID is the long part of the sheet's web address, between `/d/` and `/edit`. Put the Web app URL in `"appsScriptUrl"`. Only replace the text inside the quote marks. Click **Commit changes**. (Or send both to whoever helps you.) The site updates in 1–3 minutes after this one-time change.

Optional: for more **Auto-fill** lookups per minute, add an `ODESLI_API_KEY` script property. See [Auto-fill limit](../maintenance/google-sheet.md#auto-fill-limit).

## If something goes wrong

- The admin says "Wrong admin password." Check the password. It must match the **Value** you typed in item 5 exactly.
- The admin says "The web app answered with a web page instead of data." Deploy again (item 7) and set **Who has access** to **Anyone**.
- The public page shows the demo store or old data. Check that item 8 is done (`docs/config.json` is filled in). Check that item 3 is done (the sheet is shared with **Anyone with the link**).
- You changed `Code.gs` later. See [Update the Apps Script](../maintenance/google-sheet.md#update-the-apps-script).

**Next:** [Setup 3: Admin panel](3-admin-panel.md)

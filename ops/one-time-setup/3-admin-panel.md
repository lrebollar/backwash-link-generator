# Setup 3: Admin panel — connect it to the sheet

Do this once on each phone or computer you use for the admin panel.

## Steps

1. Open the admin panel on your phone or computer: `<your GitLab Pages address>/admin/`. For example: `https://backwash-link-generator-xxxxxx.gitlab.io/admin/`
2. Until you log in, the page shows only a password box. Type the password you chose in [Setup 2](2-google-sheet.md), item 5, then click **Log in**. Logging in needs `docs/config.json` to be filled in ([Setup 2](2-google-sheet.md), item 8).
3. Tap or click the **Connection** tab. Check these boxes:
   - **Apps Script web app URL**: this is filled in for you from `docs/config.json`.
   - **Admin password**: the password you just typed.
   - **Public site URL**: this is filled in for you.
   - **Country for link lookup**: choose your country. It is used when Auto-fill looks up streaming links.
4. Click **Save & test**. You should see a message that says **Connected to** and the name of your sheet.
5. If a yellow box asks you to update `docs/config.json`, the box shows the text to put in that file. Click **Copy**, then do [Setup 2](2-google-sheet.md), item 8 with that text.

The connection details are saved only in that browser on that device. On a new phone or computer, log in again. To log out, click **Forget password** in the **Connection** tab.

**Next:** [Setup 4: Store](4-store.md)

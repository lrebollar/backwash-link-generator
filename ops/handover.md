# Hand the project over to the store owner

The project runs on accounts that may belong to the person who built it. Move each one to the store owner, so the store does not depend on anyone else.

| Part | Where it lives | What moves |
|---|---|---|
| Code and the **Mirror to GitLab** action | GitHub repository | The repository and its 2 secrets |
| The website and its address | GitLab project | A new project on the owner's GitLab account |
| Records, settings, admin password | Google Sheet and its Apps Script | Sheet ownership, a new Web app deployment |
| Uploaded cover pictures | Google Drive folder **Backwash Records covers** | Folder and file ownership |

## Before you start: the site address

Stickers hold the site address. A new GitLab project on the owner's account gets a **new address**.

- **No stickers written yet:** do the handover first. Write stickers only with the final address.
- **Stickers already written:** keep the old GitLab project online until every sticker is rewritten. It keeps showing records from the same Google Sheet. Locked stickers cannot be rewritten.
- **Best:** use a custom domain the store owns. See [Add a custom domain](maintenance/github-gitlab.md#add-a-custom-domain). The address then survives any later move.

## 1. GitHub: transfer the repository

The current owner:

1. On github.com, open the repository. Click **Settings**, then **General**.
2. Scroll to **Danger Zone**. Click **Transfer**. Type the store owner's GitHub username and confirm.

The store owner:

3. Accept the transfer from the email GitHub sends. The invitation expires after 1 day.
4. Open the **Actions** tab. If GitHub asks to enable workflows, enable them.

## 2. GitLab: make the owner's project

The store owner:

1. Do [Setup 1: GitHub and GitLab](one-time-setup/1-github-gitlab.md) with their own GitLab account. Item 4 replaces the 2 GitHub secrets (`GITLAB_TOKEN` and `GITLAB_PROJECT`) with their own.
2. Note the new site address (item 6).

The current owner, once the new site works and no sticker needs the old address:

3. On gitlab.com, open the old project. Click **Settings**, then **General**, then **Advanced**, then **Delete project**.
4. Delete (revoke) the old GitLab token: avatar, then **Edit profile**, then **Personal access tokens**.

## 3. Google Sheet: transfer ownership

The current owner:

1. Open the sheet. Click **Share**. Add the store owner's Google email as **Editor**. Click **Send**.
2. Click **Share** again. Next to the store owner's name, open the role menu and choose **Transfer ownership**. Send the invitation.

The store owner:

3. Accept the invitation from the email Google sends.

The sheet keeps the same ID, so `"sheetId"` in `docs/config.json` stays the same. The Apps Script moves with the sheet. Its password (`ADMIN_PASSWORD`) and the other script properties move too.

If Google does not offer **Transfer ownership** (common with work or school accounts), the store owner makes a copy instead: **File**, then **Make a copy**. Then they do all of [Setup 2: Google Sheet](one-time-setup/2-google-sheet.md) on the copy, items 3 to 8.

## 4. Apps Script: deploy it as the owner

The Web app runs as the person who deployed it. The store owner makes their own deployment:

1. Open the sheet. Click **Extensions**, then **Apps Script**.
2. Choose the function **setup** and click **Run**. Allow the permissions, as in [Setup 2](one-time-setup/2-google-sheet.md), item 6.
3. Click **Deploy**, then **New deployment**. Choose **Web app**. Set **Execute as** to **Me** and **Who has access** to **Anyone**. Click **Deploy**. Copy the new **Web app URL**.
4. On github.com, edit `docs/config.json`. Replace `"appsScriptUrl"` with the new Web app URL. Click **Commit changes**.
5. When the site has updated (1–3 minutes), log in to the admin panel. In the **Connection** tab, check that the **Apps Script web app URL** is the new one. If not, paste it. Click **Save & test**.
6. Turn off the old deployment: **Deploy**, then **Manage deployments**. Select the old deployment. Click **Archive**.

## 5. Lock out the old access

The store owner:

1. Change the admin password. See [Change the admin password](maintenance/google-sheet.md#change-the-admin-password).
2. Open the sheet. Click **Share**. Remove anyone who no longer needs to edit. Editors can see the admin password.
3. If an `ODESLI_API_KEY` script property exists, delete it. It is no longer used.

## 6. Cover pictures

Covers uploaded so far are in the current owner's Google Drive, in the folder **Backwash Records covers**. Covers that came from Auto-fill are links to the streaming service and need nothing.

The current owner:

1. On drive.google.com, open the folder **Backwash Records covers**.
2. Transfer ownership of the folder and of every file in it to the store owner (**Share**, then the role menu, then **Transfer ownership**).

Until this is done, the current owner must not delete these files. A deleted file disappears from its record page.

## Check that it worked

- The **Mirror to GitLab** run on GitHub is green.
- The public page of a record opens at the new address.
- The admin panel logs in with the new password and **Save & test** says **Connected to** your sheet.
- Saving a test change in the admin panel shows on the public page within about a minute.

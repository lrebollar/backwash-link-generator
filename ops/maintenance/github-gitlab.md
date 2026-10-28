# GitHub and GitLab

Saving records and store settings does not use GitHub or GitLab. You only need this guide when the website code changes, or once a year for the token.

## Renew the GitLab token

The GitLab token lasts at most 1 year. When it expires, code changes stop reaching the website. Make a new one before that date.

1. On gitlab.com, click your avatar, then **Edit profile**, then **Personal access tokens**.
2. Make a new token with the same settings as before. See item 3 of [Setup 1](../one-time-setup/1-github-gitlab.md#steps).
3. On github.com, open this repository. Click **Settings**, then **Secrets and variables**, then **Actions**, then **GITLAB_TOKEN**, then **Update secret**. Paste the new token. Click **Update secret**.
4. Test it: **Actions** → **Mirror to GitLab** → **Run workflow** → tick **Only check the secrets and access** → **Run workflow**. The run should turn green.
5. Back on gitlab.com, delete (revoke) the old token.

Do the same if you think the token leaked.

## A code change does not appear

1. Wait a few minutes.
2. On github.com, open the **Actions** tab. A red **Mirror to GitLab** run means the copy to GitLab failed. Click the run. The log explains the problem in plain words.
3. If the run is green, open the project on gitlab.com. Click **Build**, then **Pipelines**. Check that the **pages** job passed.

GitHub can also email you about failed runs, depending on your notification settings.

For each error message, see "If something goes wrong" in [Setup 1](../one-time-setup/1-github-gitlab.md#if-something-goes-wrong).

## Undo a code change

Code changes are kept in GitHub's history. Ask someone who knows Git to revert the change. The **Mirror to GitLab** run then publishes the older version.

## Add a custom domain

A custom domain (like `links.backwash.com`) keeps the site address the same, even if the site moves to another GitLab account later. A domain name costs about US$10 a year.

1. On gitlab.com, open the project. Click **Deploy**, then **Pages**, then **New domain**.
2. Type the domain. GitLab shows the DNS records to add.
3. Add those records where you bought the domain. Wait until GitLab shows the domain as verified.

Stickers written with the old address keep pointing to the old address. Add the domain before you write stickers.

## Preview the site on your computer (optional)

You can preview the site on your own computer before it goes online.

You need Python 3 installed.

1. On github.com, open this repository. Click the green **Code** button, then **Download ZIP**. Unzip it.
2. Open Terminal (Mac) or Command Prompt (Windows). Go to the unzipped folder.
3. Type this and press Enter: `python3 -m http.server 8000 -d docs` (on Windows, type `python` instead of `python3`).
4. Open http://localhost:8000/?a=demo in your web browser. If you deleted the demo record, use the slug of one of your own records instead, for example `?a=nevermind`.
5. To stop the preview, go back to the Terminal and press `Ctrl + C`.

# Setup 1: GitHub and GitLab — put the site online

Do this once.

The website is published with **GitLab Pages**. Your GitHub repository keeps the website code. A GitHub Action copies code changes to GitLab for you.

The code must be on the `main` branch first. If there is an open pull request, merge it.

**Warning:** Choose your final address before you write any stickers. The stickers hold this address. A custom domain (like `links.backwash.com`) can be added later in GitLab. A domain name costs about US$10 a year.

## Steps

1. Create a free account at gitlab.com. GitLab may ask you to verify your account with a phone number or card before it runs the publishing job. It is free, and the card is not charged.
2. Create the project. Click **+** (Create new), then **New project/repository**, then **Create blank project**.
   - Project name: `backwash-link-generator`
   - Visibility Level: **Private**
   - Untick **Initialize repository with a README** (if you forget, it still works: the copy keeps GitHub's files)
   - Click **Create project**.
   - Write down the project path shown in its address after `gitlab.com/`. It looks like `your-username/backwash-link-generator`.
3. Create a GitLab token. This lets GitHub copy your changes to GitLab. Treat it like a password.
   GitLab offers two kinds of token. Use the **fine-grained** one if you see it: it can only push to this one project.
   - Click your avatar, then **Edit profile**, then **Personal access tokens**.
   - Click the arrow on the **Generate token** button and choose **Fine-grained token**.
   - Name: `GitHub mirror`
   - Expiration date: choose the latest date allowed (usually 1 year). Set a reminder to make a new token before it expires (see [Renew the GitLab token](../maintenance/github-gitlab.md#renew-the-gitlab-token)).
   - Access: choose only the project `backwash-link-generator` (not all your groups and projects).
   - Permissions: find the **Code** resource and tick **Push** (you may also tick **Download**). Leave every other permission empty.
   - Create the token. Copy it now. It starts with `glpat-`. GitLab shows it only once.
   - You may not be able to change the permissions later. If you made a mistake, delete the token and make a new one.

   **If there is no "Fine-grained token" option**, or the copy in item 5 fails with an authentication error: make a classic token instead. Click **Generate token** (or **Add new token**), give it the same name and expiration date, tick only **write_repository**, leave every other box empty, and create it. It works the same way, but it can write to every GitLab project on your account.
4. Give GitHub the secrets.
   - On github.com, open this repository. Click **Settings**, then **Secrets and variables**, then **Actions**.
   - Click **New repository secret**.
   - Name: `GITLAB_TOKEN`. Secret: paste the `glpat-` token. Click **Add secret**.
   - Click **New repository secret** again.
   - Name: `GITLAB_PROJECT`. Secret: the project path from item 2 above, for example `your-username/backwash-link-generator`. Pasting the project's whole web address also works. Click **Add secret**.
5. Start the first copy. On github.com, open this repository. Click the **Actions** tab. Click **Mirror to GitLab**. Click **Run workflow**. Check that the branch box says `main`, then click **Run workflow** again. The run turns green in under a minute. After this, it runs by itself every time the code changes.
6. Find your site address. On gitlab.com, open the project. Click **Build**, then **Pipelines**. Wait until the **pages** job shows that it has passed. Then click **Deploy**, then **Pages**. Your site address is shown there.
   - Optional: untick **Use unique domain** on that page. Your address then becomes `https://<your-username>.gitlab.io/backwash-link-generator/`.
   - Choose your final address before you write any stickers.
7. Make the site public. A private project hides its site by default. On gitlab.com, open the project. Click **Settings**, then **General**. Click **Visibility, project features, permissions** to open it. Find **Pages**, and choose **Everyone**. Click **Save changes**. Only the website becomes public. The code stays private.
   - If **Everyone** is not offered, change **Project visibility** at the top of the same section to **Public** instead. Nothing secret is stored in the project.

## If something goes wrong

- The **Mirror to GitLab** run is red and says a `GITLAB_PROJECT` or `GITLAB_TOKEN` secret is missing: do item 4 above again.
- The run is red and mentions an authentication error: the token is wrong or expired, or it lacks push access (**Code → Push** on a fine-grained token, or the **write_repository** scope on a classic token). Make a new token (item 3 above), then update the **GITLAB_TOKEN** secret (item 4 above).
- To test the secrets without changing anything on GitLab: **Actions** → **Mirror to GitLab** → **Run workflow** → tick **Only check the secrets and access** → **Run workflow**. The log explains any problem in plain words.
- GitLab asks you to verify your account before the **pages** job runs: verify it (item 1 above).
- The run is red and says GitLab cannot find the project: check the `GITLAB_PROJECT` secret (item 4 above) and, for a fine-grained token, that its access includes this project.
- No **pages** job appears under **Build**, then **Pipelines**: in GitLab open **Settings**, then **Repository**, then **Branch defaults** and check that the default branch is `main`.
- The site address shows Not Found after the **pages** job passed: finish item 7 (**Pages** set to **Everyone**) and wait a few minutes.

**Next:** [Setup 2: Google Sheet](2-google-sheet.md)

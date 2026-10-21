# Backwash Records — NFC record pages

Tap an NFC sticker on a record and a page opens for that album. The page lets people play the album on Spotify, Apple Music and other services, buy it, and follow the store.

Everything here is free to run. You do not need to know how to code to use it.

## How it works

- The files live in this GitHub repository. The website is the `docs/` folder. It is a set of plain files.
- The admin panel saves your changes to this GitHub repository for you.
- A GitHub Action copies every change to GitLab automatically.
- GitLab Pages publishes the website for free. There is no server to pay for or maintain.
- Every save goes live in about 1–3 minutes.
- Each record is one small file in `docs/data/albums/`. Its cover picture is in `docs/data/covers/`.
- The admin panel is at `<your site>/admin/`. You use it to add and edit records and store settings.
- The sticker only holds a link, like `https://backwash-link-generator-xxxxxx.gitlab.io/?a=nevermind`. Your real address is shown in GitLab (see Step 1). You can change a record's page at any time without touching its sticker. Only a change of the site address would need new stickers, so pick the final address first (see Step 1).

## One-time setup

Do these steps once. Ask someone to help you if a step is unclear.

### Step 1: Put the site online

The website is published with **GitLab Pages**. Your GitHub repository stays the place where you save changes. A GitHub Action copies it to GitLab for you.

The code must be on the `main` branch first. If there is an open pull request, merge it.

**Warning:** Choose your final address before you write any stickers. The stickers hold this address. A custom domain (like `links.backwash.com`) can be added later in GitLab. A domain name costs about US$10 a year.

1. Create a free account at gitlab.com. GitLab may ask you to verify your account with a phone number or card before it runs the publishing job. It is free, and the card is not charged.
2. Create the project. Click **+** (Create new), then **New project/repository**, then **Create blank project**.
   - Project name: `backwash-link-generator`
   - Visibility Level: **Private**
   - Untick **Initialize repository with a README**
   - Click **Create project**.
   - Write down the project path shown in its address after `gitlab.com/`. It looks like `your-username/backwash-link-generator`.
3. Create a GitLab token. This lets GitHub copy your changes to GitLab. Treat it like a password.
   - Click your avatar (top right), then **Edit profile**, then **Access tokens**, then **Add new token**.
   - Name: `GitHub mirror`
   - Expiration date: choose the latest date allowed. It can be at most 1 year away. Set a reminder to make a new token before it expires.
   - Select scope: **write_repository**
   - Click **Create token**. Copy it now. It starts with `glpat-`. GitLab shows it only once.
4. Give GitHub the secrets.
   - On github.com, open this repository. Click **Settings**, then **Secrets and variables**, then **Actions**.
   - Click **New repository secret**.
   - Name: `GITLAB_TOKEN`. Secret: paste the `glpat-` token. Click **Add secret**.
   - Click **New repository secret** again.
   - Name: `GITLAB_PROJECT`. Secret: the project path from item 2 above, for example `your-username/backwash-link-generator`. Type only the path, not the web address that starts with `https://gitlab.com/`. Click **Add secret**.
5. Start the first copy. On github.com, open this repository. Click the **Actions** tab. Click **Mirror to GitLab**. Click **Run workflow**. Check that the branch box says `main`, then click **Run workflow** again. The run turns green in under a minute. After this, it runs by itself on every change.
6. Find your site address. On gitlab.com, open the project. Click **Build**, then **Pipelines**. Wait until the **pages** job shows that it has passed. Then click **Deploy**, then **Pages**. Your site address is shown there.
   - Optional: untick **Use unique domain** on that page. Your address then becomes `https://<your-username>.gitlab.io/backwash-link-generator/`.
   - Choose your final address before you write any stickers.
7. Make the site public. A private project hides its site by default. On gitlab.com, open the project. Click **Settings**, then **General**. Click **Visibility, project features, permissions** to open it. Find **Pages**, and choose **Everyone**. Click **Save changes**. Only the website becomes public. The code stays private.
   - If **Everyone** is not offered, change **Project visibility** at the top of the same section to **Public** instead. Nothing secret is stored in the project.

**If something goes wrong:**

- The **Mirror to GitLab** run is red and says "Add the GITLAB_PROJECT and GITLAB_TOKEN secrets": do item 4 above again.
- The run is red and mentions an authentication error: the token is wrong, expired, or does not have the **write_repository** scope. Make a new token (item 3 above), then update the **GITLAB_TOKEN** secret (item 4 above).
- The run says the push was rejected: the GitLab project was created with a README. Delete the project in GitLab, then create it again without the README (item 2 above). Or ask for help.
- GitLab asks you to verify your account before the **pages** job runs: verify it (item 1 above).
- The run is red and says the project or repository was not found: GITLAB_PROJECT must be only the project path from item 2 above, for example your-username/backwash-link-generator. Update the GITLAB_PROJECT secret (item 4 above).
- No **pages** job appears under **Build**, then **Pipelines**: in GitLab open **Settings**, then **Repository**, then **Branch defaults** and check that the default branch is `main`.
- The site address shows Not Found after the **pages** job passed: finish item 7 (**Pages** set to **Everyone**) and wait a few minutes.

### Step 2: Create a GitHub access token

The token lets the admin panel save changes to this repository. Treat it like a password. Anyone with it can change your site.

1. Go to github.com. Click your profile picture. Click **Settings**.
2. In the left menu, scroll down. Click **Developer settings**.
3. Click **Personal access tokens**. Then click **Fine-grained tokens**.
4. Click **Generate new token**.
5. Type `Backwash admin` in the name box.
6. Set **Expiration** to the longest option you can pick. When it expires, make a new token and paste it into the admin panel.
7. Under **Repository access**, choose **Only select repositories**. Pick `backwash-link-generator`.
8. Under **Permissions**, open **Repository permissions**. Find **Contents** and set it to **Read and write**. The **Metadata** permission is added for you as read-only.
9. Click **Generate token**.
10. Copy the token. It starts with `github_pat_`. GitHub shows it only once.

### Step 3: Connect the admin panel

1. Open the admin panel on your phone or computer: `<your GitLab Pages address>/admin/`. For example: `https://backwash-link-generator-xxxxxx.gitlab.io/admin/`
2. Tap or click the **Connection** tab.
3. Paste your token into the **GitHub token** box.
4. Check these values: **GitHub owner** `jadm333`, **Repository** `backwash-link-generator`, **Branch** `main`, **Site folder in the repository** `docs`, and **Public site URL** (your GitLab Pages address).
5. Click **Save & test**.

The token is saved only in that browser on that device. On a new phone or computer, paste the token again.

### Step 4: Set up your store

1. In the admin panel, tap the **Site settings** tab.
2. Fill in the store name, tagline, **Catalog URL**, and social links. Empty boxes are hidden on the site.
3. Choose a **Default design** (what new visitors see). To compare the designs, open `<your site>/themes.html`.
4. Click **Save site settings**.

### Step 5: Delete the demo record

The site comes with a demo record so you can see how a page looks. After you have looked at it:

1. In the admin panel, tap **Albums**.
2. Find the row that ends with (demo). Tap **Edit**. Then click **Delete album**.
3. Click **OK** in the box that asks you to confirm.

## Add a record and program a sticker

Do this for each record. It takes about 5 minutes per record.

### Part 1: Add the record

1. In the admin panel, tap **Albums**. Then tap **New album**.
2. Paste a Spotify link to the album. Apple Music, YouTube, Deezer and Tidal links also work.
3. Click **Auto-fill**. It fills in the title, artist, cover and links to the other streaming services. It uses the free song.link service.
4. Check every field. Fix anything that is wrong.
5. Paste the link to this record in your catalog or online shop into the **Shop URL** box.
6. Click **Save**.

### Part 2: Write the sticker

The Sticker panel opens by itself after you save. For an older record, tap **Albums**, then **Sticker** next to it. Turn on NFC in your phone settings first.

**Android phone with Chrome:**

1. Click **Write to NFC sticker**.
2. Hold the sticker against the back of the phone until the page says it is done.

**iPhone (or any other phone):**

1. Install the free **NFC Tools** app from the App Store or Google Play.
2. Copy the sticker link shown in the Sticker panel.
3. Open NFC Tools. Tap **Write**. Tap **Add a record**. Tap **URL/URI**.
4. Paste the copied link. Tap **Write**.
5. Hold the sticker near the top of the iPhone until the app says it worked.

**Optional: lock the sticker.** In NFC Tools, tap **Other**, then **Lock tag**. This stops anyone from changing what the sticker says. The lock cannot be undone. You can still edit the record page, because only the link is locked.

**Printed labels:** The Sticker panel also shows a QR code. You can download it (**Download QR (PNG)**) and print it on labels. Customers can scan it with a phone camera.

### Part 3: Test it

Tap the sticker with your phone. The record page should open. If it does not, write the sticker again.

## Which NFC stickers to buy

- **NTAG213** (144 bytes) holds these links easily. It is the usual choice.
- **NTAG215** and **NTAG216** also work. They hold more data and cost a bit more.
- For records in plastic sleeves, any of these types works.
- Avoid placing stickers on metal. Metal blocks NFC signals. For metal surfaces, buy **on-metal** (anti-metal) tags.

## Change the design

The design sets the colors, fonts and logo style. The layout stays the same. There are 5 designs:

- **Ink**: black & white, line-art logo
- **Paper**: off-white, black ink
- **Fire**: brand red & yellow, sticker style
- **Sun**: brand yellow, black type
- **Cover**: blurred album art backdrop

### Try a design on your phone

1. Open any record page on your phone.
2. Tap the round **Change design** button (when it is turned on). It has a palette icon and sits at the bottom right of the page.
3. Tap a design name. The page changes at once.
4. Your pick is saved on that device only. To go back to the store's design, open the **Change design** button again and tap **Use store default**.

If you do not see the button, it is turned off. See **Lock the design** below.

### Choose the default design

1. In the admin panel, tap **Site settings**.
2. Choose a **Default design**.
3. Click **Save site settings**.

New visitors, and phones that have not picked a design, see this design. Visitors who already picked one keep their pick. To make everyone see the store design, lock it (see below).

### Lock the design

1. In the admin panel, tap **Site settings**.
2. Untick **Show the 'Change design' button on the public pages**.
3. Click **Save site settings**.

The button disappears. Every page then uses the store's default design, even on phones that picked another one. To show the button again, tick the box and click **Save site settings**.

### Preview a record in another design

To preview a record in another design, add `&theme=fire` to the end of its link. For example:

`https://backwash-link-generator-xxxxxx.gitlab.io/?a=nevermind&theme=fire`

Use `&theme=ink`, `&theme=paper`, `&theme=sun` or `&theme=cover` to try the others. The preview does not change the sticker or your store design.

## Good to know

- **Changes go live in about 1–3 minutes.** Some phones keep an old copy of a page for up to about 10 minutes. Wait a little, or reload the page.
- **GitLab's free plan includes 400 CI minutes a month.** CI minutes are the publishing time. Each save uses roughly 1 minute or less.
- **The GitLab token expires.** A token lasts at most 1 year. When the **Mirror to GitLab** run fails, make a new token (Step 1, item 3). Then update the **GITLAB_TOKEN** secret on github.com: **Settings**, then **Secrets and variables**, then **Actions**, then **GITLAB_TOKEN**, then **Update secret**.
- **If a change does not appear after a few minutes,** open the **Actions** tab on github.com. A red **Mirror to GitLab** run means the copy to GitLab failed (the admin panel still says Saved, because the save to GitHub worked). GitHub can also email you about failed runs, depending on your notification settings.
- **Auto-fill has a limit.** It allows about 10 lookups per minute. If you see "Too many lookups", wait a minute and try again.
- **If Auto-fill fails,** paste the streaming links into the link boxes by hand.
- **Every save is kept.** Each save is a commit in GitHub's history. If you need an older version of a file, you can find it there.
- **Covers are square.** They are saved at up to 800 × 800 pixels (smaller if the original picture is smaller) in `docs/data/covers/`.
- **Keep your tokens private.** Each token works like a password. If you think one leaked, delete it and make a new one. The GitHub token is on github.com under **Settings**, then **Developer settings**, then **Personal access tokens**. The GitLab token is on gitlab.com under your avatar, then **Edit profile**, then **Access tokens**.

## Files

You only need to change records and store settings, and you do that in the admin panel. Leave the other files alone unless you know how to code.

```
docs/index.html                          the public record page (what customers see)
docs/assets/js/page.js                   builds the record page
docs/assets/css/base.css                 layout and structure
docs/assets/css/themes/                  one file for each design
docs/data/site.json                      store name, links and design
docs/data/albums/                        one file for each record
docs/data/covers/                        cover pictures (square, up to 800 x 800)
docs/admin/                              the admin panel
docs/themes.html                         compare the designs
brand/                                   original logo files
tools/                                   scripts that made the logos and icons
.gitlab-ci.yml                           tells GitLab how to publish the site
.github/workflows/mirror-to-gitlab.yml   copies every change from GitHub to GitLab
```

## Run it on your computer (optional)

You can preview the site on your own computer before it goes online.

You need Python 3 installed.

1. On github.com, open this repository. Click the green **Code** button, then **Download ZIP**. Unzip it.
2. Open Terminal (Mac) or Command Prompt (Windows). Go to the unzipped folder.
3. Type this and press Enter: `python3 -m http.server 8000 -d docs` (on Windows, type `python` instead of `python3`).
4. Open http://localhost:8000/?a=demo in your web browser.
5. To stop the preview, go back to the Terminal and press `Ctrl + C`.

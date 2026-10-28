# Backwash Records — NFC record pages

Tap an NFC sticker on a record and a page opens for that album. The page lets people play the album on Spotify, Apple Music and other services, buy it, and follow the store.

Everything here is free to run. You do not need to know how to code to use it.

## How it works

- Your records and store settings live in a **Google Sheet**. The sheet has one row for each record. It also has a tab for your store settings.
- The sheet is shared so that **anyone with the link can view it**. The public pages read it directly. The sheet holds nothing secret. Only you can change it.
- The admin panel saves your changes to the sheet. It does this through a small Google Apps Script attached to the sheet. The admin panel is protected by a password.
- You can also edit the sheet by hand. See **Edit the sheet by hand** below.
- Changes to records and store settings show on the website within about a minute.
- The website is the `docs/` folder in this GitHub repository. It is a set of plain files. A GitHub Action copies code changes to GitLab automatically. GitLab Pages publishes the website for free. There is no server to pay for or maintain.
- The website code only changes when the code changes. Saving records or store settings does not touch GitHub or GitLab, so it uses no publishing minutes.
- The admin panel is at `<your site>/admin/`. You use it to add and edit records and store settings.
- The sticker only holds a link, like `https://backwash-link-generator-xxxxxx.gitlab.io/?a=nevermind`. Your real address is shown in GitLab (see Step 1). You can change a record's page at any time without touching its sticker. Only a change of the site address would need new stickers, so pick the final address first (see Step 1).

## One-time setup

Do these steps once. Ask someone to help you if a step is unclear.

### Step 1: Put the site online

The website is published with **GitLab Pages**. Your GitHub repository keeps the website code. A GitHub Action copies code changes to GitLab for you.

The code must be on the `main` branch first. If there is an open pull request, merge it.

**Warning:** Choose your final address before you write any stickers. The stickers hold this address. A custom domain (like `links.backwash.com`) can be added later in GitLab. A domain name costs about US$10 a year.

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
   - Expiration date: choose the latest date allowed (usually 1 year). Set a reminder to make a new token before it expires.
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

**If something goes wrong:**

- The **Mirror to GitLab** run is red and says "Add the GITLAB_PROJECT and GITLAB_TOKEN secrets": do item 4 above again.
- The run is red and mentions an authentication error: the token is wrong or expired, or it lacks push access (**Code → Push** on a fine-grained token, or the **write_repository** scope on a classic token). Make a new token (item 3 above), then update the **GITLAB_TOKEN** secret (item 4 above).
- To test the secrets without changing anything on GitLab: **Actions** → **Mirror to GitLab** → **Run workflow** → tick **Only check the secrets and access** → **Run workflow**. The log explains any problem in plain words.
- GitLab asks you to verify your account before the **pages** job runs: verify it (item 1 above).
- The run is red and says GitLab cannot find the project: check the GITLAB_PROJECT secret (item 4 above) and, for a fine-grained token, that its access includes this project.
- No **pages** job appears under **Build**, then **Pipelines**: in GitLab open **Settings**, then **Repository**, then **Branch defaults** and check that the default branch is `main`.
- The site address shows Not Found after the **pages** job passed: finish item 7 (**Pages** set to **Everyone**) and wait a few minutes.

### Step 2: Create the Google Sheet

The sheet holds your records and store settings. You need a free Google account.

1. On github.com, open the file `google-sheet/backwash-records-template.xlsx`. Click **Download raw file**. The file saves to your computer.
2. Go to drive.google.com. Click **New**, then **File upload**, then pick the file you downloaded. When it has uploaded, double-click it. Then click **File**, then **Save as Google Sheets**. Use this new Google Sheets copy from now on.
3. Click **Share**. Under **General access**, choose **Anyone with the link**. Make sure the role is **Viewer**. Click **Done**. This is needed, because the public pages read the sheet. Nothing secret is in it.
4. Click **Extensions**, then **Apps Script**. Delete the code shown there. On github.com, open the file `google-sheet/Code.gs`. Click **Raw**. Select all the text (**Ctrl + A**, or **Command + A** on a Mac) and copy it (**Ctrl + C**, or **Command + C**). Go back to the Apps Script editor and paste it (**Ctrl + V**, or **Command + V**). Click **Save** (the disk icon). If asked for a name, type `Backwash admin`.
5. Click **Project Settings** (gear icon). Find **Script Properties**, then click **Add script property**. In **Property**, type `ADMIN_PASSWORD`. In **Value**, type a password you choose. Click **Save script properties**. Write this password down. You will type it in the admin panel.
6. Click the **Editor** icon (it looks like `<>`) to go back to the code. In the toolbar, open the function menu and choose **setup**. Click **Run**. If asked, click **Review permissions**, then choose your Google account. If you see "Google hasn't verified this app", click **Advanced**, then **Go to Backwash admin (unsafe)**, then **Allow**. This is safe, because it is your own script. The **Execution log** at the bottom says what **setup** did.
7. Click **Deploy**, then **New deployment**. Click the gear icon next to **Select type**, then choose **Web app**. Set **Execute as** to **Me**. Set **Who has access** to **Anyone**. The password still protects the admin actions. Click **Deploy**. If asked, authorize again. Then copy the **Web app URL**. It ends in `/exec`.
8. Tell the website where the sheet is. On github.com, open the file `docs/config.json`. Click the pencil icon (**Edit**). Put the sheet ID in `"sheetId"`. The sheet ID is the long part of the sheet's web address, between `/d/` and `/edit`. Put the Web app URL in `"appsScriptUrl"`. Only replace the text inside the quote marks. Click **Commit changes**. (Or send both to whoever helps you.) The site updates in 1–3 minutes after this one-time change.

**If something goes wrong:**

- The admin says "Wrong admin password." Check the password. It must match the **Value** you typed in item 5 exactly.
- The admin says "The web app answered with a web page instead of data." Deploy again (item 7) and set **Who has access** to **Anyone**.
- The public page shows the demo store or old data. Check that item 8 is done (`docs/config.json` is filled in). Check that item 3 is done (the sheet is shared with **Anyone with the link**).
- You changed `Code.gs` later. Click **Deploy**, then **Manage deployments**. Click the pencil icon. Set **Version** to **New version**. Click **Deploy**. The Web app URL stays the same.

### Step 3: Connect the admin panel

1. Open the admin panel on your phone or computer: `<your GitLab Pages address>/admin/`. For example: `https://backwash-link-generator-xxxxxx.gitlab.io/admin/`
2. Until you log in, the page shows only a password box. Type the password you chose in Step 2, item 5, then click **Log in**. Logging in needs `docs/config.json` to be filled in (Step 2, item 8).
3. Tap or click the **Connection** tab. Check these boxes:
   - **Apps Script web app URL**: this is filled in for you from `docs/config.json`.
   - **Admin password**: the password you just typed.
   - **Public site URL**: this is filled in for you.
   - **Country for link lookup**: choose your country. It is used when Auto-fill looks up streaming links.
4. Click **Save & test**. You should see a message that says **Connected to** and the name of your sheet.
5. If a yellow box asks you to update `docs/config.json`, the box shows the text to put in that file. Click **Copy**, then do Step 2, item 8 with that text.

The connection details are saved only in that browser on that device. On a new phone or computer, log in again. To log out, click **Forget password** in the **Connection** tab.

### Step 4: Set up your store

1. In the admin panel, tap the **Site settings** tab.
2. Fill in the store name, tagline, **Catalog URL**, and social links. Empty boxes are hidden on the site.
3. Choose a **Default design** (what new visitors see). To compare the designs, open `<your site>/themes.html`.
4. Click **Save site settings**. The settings are saved in the **Site** tab of your Google Sheet.

### Step 5: Delete the demo record

The sheet comes with a demo record so you can see how a page looks. After you have looked at it:

1. In the admin panel, tap **Albums**.
2. Find the record called **Backwash Sampler Vol. 1**. Its note says **Demo record — delete me**. Tap **Edit**. Then click **Delete album**.
3. Click **OK** in the box that asks you to confirm.

You can also delete the demo row in the **Albums** tab of the Google Sheet. Delete the whole row.

## Add a record and program a sticker

Do this for each record. It takes about 5 minutes per record.

### Part 1: Add the record

1. In the admin panel, tap **Albums**. Then tap **New album**.
2. Paste a Spotify link to the album. Apple Music, YouTube, Deezer and Tidal links also work.
3. Click **Auto-fill**. It fills in the title, artist, cover and links to the other streaming services. It uses the free song.link service, through your Apps Script.
4. Check every field. Fix anything that is wrong.
5. Paste the link to this record in your catalog or online shop into the **Shop URL** box.
6. Click **Save**. The record is saved to your Google Sheet. The public page shows it within about a minute.

**About cover pictures.** Auto-fill uses a link to the streaming service's picture. You can also upload your own picture. Uploaded pictures are saved in your Google Drive, in a folder called **Backwash Records covers**. Each picture is shared as a view-only link. The first upload may ask you to allow access to Google Drive. Allow it.

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

## Update the Apps Script

When `google-sheet/Code.gs` changes (for example, the update that made **Auto-fill** work), copy the new version into your sheet once:

1. On github.com, open `google-sheet/Code.gs` and copy all of it.
2. In your Google Sheet, click **Extensions**, then **Apps Script**. Select all the code there, delete it, and paste the new code. Click **Save** (disk icon).
3. Choose the function **setup** in the toolbar and click **Run**. If Google asks for permission, click **Review permissions**, choose your account, then **Advanced** → **Go to Backwash admin (unsafe)** → **Allow**. (The Auto-fill update needs permission to contact song.link.)
4. Click **Deploy**, then **Manage deployments**. Click the pencil icon. Set **Version** to **New version**. Click **Deploy**.

The Web app URL stays the same, so nothing else changes. Your password and data are kept.

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
- **theme**: type one of these words: `ink`, `paper`, `fire`, `sun` or `cover`. See **Change the design**.
- **themeSwitcher**: type `TRUE` to show the **Change design** button. Type `FALSE` to hide it.
- The **How to use** tab has short notes. The site ignores it.

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

New visitors, and phones that have not picked a design, see this design. Visitors who already picked one keep their pick. To make everyone see the store design, lock it (see below). The choice is saved in the **Site** tab of the Google Sheet, in the row called `theme`.

### Lock the design

1. In the admin panel, tap **Site settings**.
2. Untick **Show the 'Change design' button on the public pages**.
3. Click **Save site settings**.

The button disappears. Every page then uses the store's default design, even on phones that picked another one. To show the button again, tick the box and click **Save site settings**. The setting is saved in the **Site** tab of the Google Sheet, in the row called `themeSwitcher`.

### Preview a record in another design

To preview a record in another design, add `&theme=fire` to the end of its link. For example:

`https://backwash-link-generator-xxxxxx.gitlab.io/?a=nevermind&theme=fire`

Use `&theme=ink`, `&theme=paper`, `&theme=sun` or `&theme=cover` to try the others. The preview does not change the sticker or your store design.

## Good to know

- **Changes to records and store settings show within about a minute.** Some phones keep an old copy of a page for up to about 10 minutes. Wait a little, or reload the page.
- **Auto-fill has a limit.** It allows about 10 lookups per minute. If you see "Too many lookups", wait a minute and try again. For a higher limit, ask song.link for a free API key (email developers@song.link) and add it in Apps Script → Project Settings → Script properties as `ODESLI_API_KEY`.
- **If Auto-fill fails,** paste the streaming links into the link boxes by hand.
- **Every change can be undone.** For records and store settings, open the Google Sheet. Click **File**, then **Version history**. Choose an older version and restore it. Code changes are kept in GitHub's history.
- **Google's limits are far above a record store's needs.** Google sets limits on free sheets and scripts. A record store uses far less than those limits.
- **Covers are square.** Uploaded covers are saved at up to 800 × 800 pixels (smaller if the original picture is smaller).
- **If a code change does not appear after a few minutes,** open the **Actions** tab on github.com. A red **Mirror to GitLab** run means the copy to GitLab failed. GitHub can also email you about failed runs, depending on your notification settings.
- **The GitLab token expires.** A token lasts at most 1 year. When the **Mirror to GitLab** run fails, make a new token (Step 1, item 3). Then update the **GITLAB_TOKEN** secret on github.com: **Settings**, then **Secrets and variables**, then **Actions**, then **GITLAB_TOKEN**, then **Update secret**.
- **Keep your passwords and tokens private.** Each one works like a password. If you think one leaked, delete it and make a new one.
  - To change the admin password, open the Google Sheet, click **Extensions**, then **Apps Script**. Click **Project Settings** (gear icon), then **Script Properties**. Change the value of **ADMIN_PASSWORD**, then click **Save script properties**. You do not need to deploy again. Then type the new password in the **Connection** tab of the admin panel.
  - The GitLab token is on gitlab.com under your avatar, then **Edit profile**, then **Access tokens**.

## Files

You only need to change records and store settings. You do that in the admin panel or in the Google Sheet. Leave the other files alone unless you know how to code.

```
docs/index.html                              the public record page (what customers see)
docs/assets/js/page.js                       builds the record page
docs/assets/js/data.js                       reads the Google Sheet for the public pages
docs/assets/css/base.css                     layout and structure
docs/assets/css/themes/                      one file for each design
docs/config.json                             where the site finds your Google Sheet
docs/data/                                   sample data used until a Google Sheet is connected
docs/admin/                                  the admin panel
docs/themes.html                             compare the designs
google-sheet/Code.gs                         the Apps Script that the admin panel saves through
google-sheet/backwash-records-template.xlsx  the Google Sheet template (Step 2)
brand/                                       original logo files
tools/                                       scripts that made the logos and icons
.gitlab-ci.yml                               tells GitLab how to publish the site
.github/workflows/mirror-to-gitlab.yml       copies code changes from GitHub to GitLab
```

## Run it on your computer (optional)

You can preview the site on your own computer before it goes online.

You need Python 3 installed.

1. On github.com, open this repository. Click the green **Code** button, then **Download ZIP**. Unzip it.
2. Open Terminal (Mac) or Command Prompt (Windows). Go to the unzipped folder.
3. Type this and press Enter: `python3 -m http.server 8000 -d docs` (on Windows, type `python` instead of `python3`).
4. Open http://localhost:8000/?a=demo in your web browser. If you deleted the demo record in Step 5, use the slug of one of your own records instead, for example `?a=nevermind`.
5. To stop the preview, go back to the Terminal and press `Ctrl + C`.

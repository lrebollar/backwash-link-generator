# Backwash Records — NFC record pages

Tap an NFC sticker on a record and a page opens for that album. The page lets people play the album on Spotify, Apple Music and other services, buy it, and follow the store.

Everything here is free to run. You do not need to know how to code to use it.

## How it works

- The website is the `docs/` folder. It is a set of plain files, hosted for free on GitHub Pages or Cloudflare Pages. There is no server to pay for or maintain.
- Each record is one small file in `docs/data/albums/`. Its cover picture is in `docs/data/covers/`.
- The admin panel is at `<your site>/admin/`. You use it to add and edit records. It saves those files to this GitHub repository for you.
- Every save updates the live site in about 1 minute.
- The sticker only holds a link, like `https://jadm333.github.io/backwash-link-generator/?a=nevermind`. You can change a record's page at any time. You never need to rewrite the sticker.

## One-time setup

Do these steps once. Ask someone to help you if a step is unclear.

### Step 1: Put the site online

Pick ONE option. Both are free.

The repository is **private** right now. GitHub Pages on a free account only works for **public** repositories. Option A makes the repository public. Option B keeps it private.

**Warning:** Choose your final address before you write any stickers. The stickers hold this address. A custom domain (like `links.backwash.com`) can be added later in either service. A domain name costs about US$10 a year.

The code must be on the `main` branch first. If there is an open pull request, merge it.

**Option A: GitHub Pages (simplest)**

Nothing secret is stored in the repository. The access token from Step 2 is never saved in it.

1. Open this repository on github.com. Click **Settings**.
2. Click **General**. Scroll down to **Danger Zone**.
3. Click **Change visibility**. Choose **Public**. Follow the prompts.
4. Click **Settings** again. Then click **Pages** in the left menu.
5. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
6. Set **Branch** to `main`. Set the folder to `/docs`. Click **Save**.

Your site address: `https://jadm333.github.io/backwash-link-generator/`

**Option B: Cloudflare Pages (keeps the repository private)**

1. Create a free account at dash.cloudflare.com.
2. Click **Workers & Pages**. Click **Create**. Click **Pages**.
3. Click **Connect to Git**. Authorize GitHub. Pick this repository.
4. Set **Production branch** to `main`.
5. Set **Framework preset** to **None**.
6. Leave **Build command** empty.
7. Set **Build output directory** to `docs`.
8. Click **Save and Deploy**.

Your site address: `https://<project-name>.pages.dev/`. Replace `<project-name>` with the name of your project.

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

1. Open the admin panel on your phone or computer:
   - GitHub Pages: `https://jadm333.github.io/backwash-link-generator/admin/`
   - Cloudflare Pages: `https://<project-name>.pages.dev/admin/`
2. Tap or click the **Connection** tab.
3. Paste your token into the token box.
4. Check these values: owner `jadm333`, repo `backwash-link-generator`, branch `main`, folder `docs`, and your public site address.
5. Click **Save & test**.

The token is saved only in that browser on that device. On a new phone or computer, paste the token again.

### Step 4: Set up your store

1. In the admin panel, tap the **Site settings** tab.
2. Fill in the store name, tagline, catalog link, and social links. Empty boxes are hidden on the site.
3. Choose a **Theme** (the design). To compare the designs, open `<your site>/themes.html`.
4. Click **Save**.

### Step 5: Delete the demo record

The site comes with a demo record so you can see how a page looks. After you have looked at it:

1. In the admin panel, tap **Albums**.
2. Tap **demo**. Click **Delete**.

## Add a record and program a sticker

Do this for each record. It takes about 5 minutes per record.

### Part 1: Add the record

1. In the admin panel, tap **Albums**. Then tap **New album**.
2. Paste a Spotify link to the album. Apple Music, YouTube, Deezer and Tidal links also work.
3. Click **Auto-fill**. It fills in the title, artist, cover and links to the other streaming services. It uses the free song.link service.
4. Check every field. Fix anything that is wrong.
5. Paste the link to this record in your catalog or online shop into the shop link box.
6. Click **Save**.

### Part 2: Write the sticker

Open the Sticker panel for this record. Turn on NFC in your phone settings first.

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

**Printed labels:** The Sticker panel also shows a QR code. You can download it and print it on labels. Customers can scan it with a phone camera.

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

To change the design for the whole store:

1. In the admin panel, tap **Site settings**.
2. Choose a **Theme**. Click **Save**.

To preview a record in another design, add `&theme=fire` to the end of its link. For example:

`https://jadm333.github.io/backwash-link-generator/?a=nevermind&theme=fire`

Use `&theme=ink`, `&theme=paper`, `&theme=sun` or `&theme=cover` to try the others. The preview does not change the sticker or your store design.

## Good to know

- **Changes go live in about 1 minute.** Some phones keep an old copy of a page for up to about 10 minutes. Wait a little, or reload the page.
- **Auto-fill has a limit.** It allows about 10 lookups per minute. If you see "Too many lookups", wait a minute and try again.
- **If Auto-fill fails,** paste the streaming links into the link boxes by hand.
- **Every save is kept.** Each save is a commit in GitHub's history. If you need an older version of a file, you can find it there.
- **Covers are square.** They are saved at 800 × 800 pixels in `docs/data/covers/`.
- **Keep your token private.** If you think it leaked, delete it on github.com (Settings, then Developer settings, then Personal access tokens). Then make a new one.

## Files

You only need to change records and store settings, and you do that in the admin panel. Leave the other files alone unless you know how to code.

```
docs/index.html            the public record page (what customers see)
docs/assets/js/page.js     builds the record page
docs/assets/css/base.css   layout and structure
docs/assets/css/themes/    one file for each design
docs/data/site.json        store name, links and design
docs/data/albums/          one file for each record
docs/data/covers/          cover pictures, 800 x 800
docs/admin/                the admin panel
docs/themes.html           compare the designs
brand/                     original logo files
tools/                     scripts that made the logos and icons
```

## Run it on your computer (optional)

You can preview the site on your own computer before it goes online.

1. Open Terminal (Mac) or Command Prompt (Windows). Go to this repository's folder.
2. Type this and press Enter: `python3 -m http.server 8000 -d docs`
3. Open http://localhost:8000/?a=demo in your web browser.
4. To stop the preview, go back to the Terminal and press `Ctrl + C`.

You need Python 3 installed. On Windows, use `python` instead of `python3`.

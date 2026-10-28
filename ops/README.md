# Operations

An NFC sticker on a record opens a page for that album: streaming links, shop link and store socials.

| Part | Where it lives | What it does |
|---|---|---|
| Website | `docs/` in this repository, published by GitHub Pages | Public record pages and the admin panel |
| Google Sheet | Your Google Drive | Holds all records and store settings |
| Apps Script | Inside the sheet (copy of `google-sheet/Code.gs`) | Saves admin changes to the sheet, Auto-fill, cover uploads |

Running cost: free.

## Files

| File | Contents |
|---|---|
| [README.md](README.md) | This page: using the admin panel and the Google Sheet |
| [initial_setup.md](initial_setup.md) | One-time setup of every part |
| [maintenance.md](maintenance.md) | Ongoing tasks and fixes |
| [../AGENT.md](../AGENT.md) | Technical reference for developers and coding agents |

`<site>` below means your site address, for example `https://<github-user>.github.io/backwash-link-generator`.

## Admin panel

Open `<site>/admin/` and log in with the admin password. The browser remembers it. To log out: **Connection → Forget password**.

| Tab | Use |
|---|---|
| **Albums** | Add, edit, delete and search records. **Sticker** opens a record's sticker panel. |
| **Site settings** | Store name, tagline, design, catalog link, social links, button texts |
| **Connection** | Password, public site address, country for link lookups, **Save & test** |

### Add a record

1. **Albums → New album**.
2. Paste the album's Spotify link (in Spotify: **Share → Copy album link**). Click **Auto-fill**. It fills title, artist, year, label, cover and the Spotify link, plus Apple Music and Deezer when found. An Apple Music or Deezer album link also works.
3. Check every field.
4. For each empty streaming link, click **Look up on …**. In the new tab, open the album, copy its link, paste it in the box. Empty links are hidden on the page.
5. Paste the record's page in your online shop into **Shop URL**.
6. Click **Save**. The public page updates within about a minute. The sticker panel opens.

Notes:

- **Slug** is the page address (`<site>/?a=<slug>`). Lowercase letters, digits and single dashes, at most 60 characters. Never change it after writing the sticker.
- **Preview** shows the page without saving.
- **Cover**: Auto-fill links to the streaming service's image. **Upload a cover** saves the image (max 800 × 800 px) to the Google Drive folder **Backwash Records covers**. The first upload asks for Drive permission.
- Auto-fill says "Too many lookups": wait a minute. Says "older version": [update the Apps Script](maintenance.md#update-the-apps-script). Other failure: type the fields and use **Look up**.

### Write the sticker

The panel opens after saving, or from **Albums → Sticker**. Turn on NFC in the phone settings.

- **Android with Chrome**: click **Write to NFC sticker**. Hold the sticker to the back of the phone until it says done.
- **iPhone or other phones**: install the free **NFC Tools** app. Click **Copy** next to the sticker link. In NFC Tools: **Write → Add a record → URL/URI**, paste, **Write**. Hold the sticker near the top of the phone.
- **Lock** (optional, permanent): NFC Tools → **Other → Lock tag**. The page stays editable; only the link is locked.
- **QR code**: **Download QR (PNG)** for printed labels.

Test by tapping the sticker. Phones may show an old copy of a page for up to 10 minutes.

Stickers to buy: **NTAG213** is enough; NTAG215 and NTAG216 also work. Metal blocks NFC; use **on-metal** tags on metal surfaces.

### Store settings and design

**Site settings** → change fields → **Save site settings**. Empty fields are hidden on the site.

- **Default design**: `ink`, `paper`, `fire`, `sun` or `cover`. Compare them at `<site>/themes.html`.
- **Show the 'Change design' button**: visitors can pick a design (saved on their device). Untick to show everyone the default design.
- To preview one record in another design, add `&theme=fire` (or another design) to its link. Nothing is saved.

## Google Sheet

The admin panel writes to the sheet. You can also edit it by hand. Changes show on the site within about a minute. To undo: **File → Version history**.

- Keep the sharing as **Anyone with the link → Viewer**. The site reads the sheet this way.
- Give **Editor** access only to people you trust. Editors can see the admin password.

**Albums** tab, one row per record:

- Do not rename tabs or headers. Do not move or insert columns. Column A is `slug`.
- `slug`: same rules as above. Rows with an empty slug are ignored.
- `title` is required.
- Links must start with `https://`.
- `updatedAt`: leave as is. The admin panel fills it.
- To delete a record, delete its whole row.

**Site** tab, one setting per row:

- Edit only column B (`value`). Column C (`notes`) explains each setting.
- `theme`: `ink`, `paper`, `fire`, `sun` or `cover`.
- `themeSwitcher`: `TRUE` shows the **Change design** button, `FALSE` hides it.
- Social links must be full profile links (`https://www.instagram.com/backwashrecords`). A bare home page or an `example.com` link is hidden.
- Empty button text uses the default wording.

**How to use** tab: notes only. The site ignores it.

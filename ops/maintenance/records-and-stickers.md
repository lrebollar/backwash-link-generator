# Records and NFC stickers

Do this for each record. It takes about 5 minutes per record.

## 1. Add the record

1. In the admin panel, tap **Albums**. Then tap **New album**.
2. Paste a Spotify link to the album. Apple Music, YouTube, Deezer and Tidal links also work.
3. Click **Auto-fill**. It fills in the title, artist, cover and links to the other streaming services. It uses the free song.link service, through your Apps Script.
4. Check every field. Fix anything that is wrong.
5. Paste the link to this record in your catalog or online shop into the **Shop URL** box.
6. Click **Save**. The record is saved to your Google Sheet. The public page shows it within about a minute.

**About cover pictures.** Auto-fill uses a link to the streaming service's picture. You can also upload your own picture. Uploaded pictures are saved in your Google Drive, in a folder called **Backwash Records covers**. Each picture is shared as a view-only link. The first upload may ask you to allow access to Google Drive. Allow it. Covers are square. Uploaded covers are saved at up to 800 × 800 pixels (smaller if the original picture is smaller).

**If Auto-fill fails,** paste the streaming links into the link boxes by hand. If it says "Too many lookups", see [Auto-fill limit](google-sheet.md#auto-fill-limit).

## 2. Write the sticker

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

## 3. Test it

Tap the sticker with your phone. The record page should open. If it does not, write the sticker again.

Some phones keep an old copy of a page for up to about 10 minutes. If a change does not show, wait a little, or reload the page.

## Which NFC stickers to buy

- **NTAG213** (144 bytes) holds these links easily. It is the usual choice.
- **NTAG215** and **NTAG216** also work. They hold more data and cost a bit more.
- For records in plastic sleeves, any of these types works.
- Avoid placing stickers on metal. Metal blocks NFC signals. For metal surfaces, buy **on-metal** (anti-metal) tags.

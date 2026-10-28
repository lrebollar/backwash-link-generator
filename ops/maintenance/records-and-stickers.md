# Records and NFC stickers

Do this for each record. It takes about 5 minutes per record.

## 1. Add the record

1. In the admin panel, tap **Albums**. Then tap **New album**.
2. Paste the album's Spotify link. To copy it in Spotify, open the album, then **Share** → **Copy album link**.
3. Click **Auto-fill**. It fills in the title, artist, year, label and cover, and the Spotify link. When it finds the album on Apple Music and Deezer, it fills in those links too.
4. Check every field. Fix anything that is wrong.
5. Under **Streaming links**, each empty link box has a **Look up on …** button, for example **Look up on YouTube Music ↗**. Click it. A new tab opens with a search for the album on that service. Open the album there, copy its link (usually **Share** → **Copy link**), and paste it into the box. The button goes away once the album's link is in the box. Leave a box empty to hide that service on the record page.
6. Optional: do the same for YouTube, Deezer, TIDAL, SoundCloud or Bandcamp under **More streaming links**.
7. Paste the link to this record in your catalog or online shop into the **Shop URL** box.
8. Click **Save**. The record is saved to your Google Sheet. The public page shows it within about a minute.

**No Spotify link?** Paste an Apple Music or Deezer album link into the Auto-fill box instead. Spotify has no free search, so then use **Look up on Spotify** for the Spotify link. Also, when you paste a Spotify, Apple Music or Deezer album link into its link box, the editor reads that album and fills in any fields that are still empty. It never changes what is already filled in.

**Older records** may have search links that an older Auto-fill saved (links that open a search instead of the album). They still work for listeners. Their **Look up** button stays, so you can swap in the album's own link.

**About cover pictures.** Auto-fill uses a link to the streaming service's picture. You can also upload your own picture. Uploaded pictures are saved in your Google Drive, in a folder called **Backwash Records covers**. Each picture is shared as a view-only link. The first upload may ask you to allow access to Google Drive. Allow it. Covers are square. Uploaded covers are saved at up to 800 × 800 pixels (smaller if the original picture is smaller).

**If Auto-fill fails,** type the title and artist, then use the **Look up** buttons to find each link. If it says "Too many lookups", wait a minute and try again. If it says the Apps Script is an older version, see [Update the Apps Script](google-sheet.md#update-the-apps-script).

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

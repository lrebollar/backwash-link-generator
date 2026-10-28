# Backwash Records — NFC record pages

Tap an NFC sticker on a record and a page opens for that album. The page lets people play the album on Spotify, Apple Music and other services, buy it, and follow the store.

- Records and store settings live in a Google Sheet.
- A password-protected admin panel (`<your site>/admin/`) adds and edits records and writes the stickers.
- The website is published for free with GitLab Pages. There is no server to pay for or maintain.

## Documentation

All setup and maintenance guides are in [`ops/`](ops/README.md).

- [One-time setup](ops/README.md#one-time-setup)
- [Ongoing maintenance](ops/README.md#ongoing-maintenance)
- [Hand the project over](ops/handover.md)

## Project layout

```
docs/          the website (public record pages and admin panel)
google-sheet/  the Apps Script and the Google Sheet template
ops/           setup and maintenance guides
brand/         original logo files
tools/         scripts that made the logos, icons and sheet template
```

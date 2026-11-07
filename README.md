# Backwash Records — NFC record pages

Tap an NFC sticker on a record to open its album page: streaming links, shop link, store socials.

- Records and store settings live in a Google Sheet.
- A password-protected admin panel (`<site>/admin/`) edits records and writes stickers.
- The site is static and published free with GitHub Pages.

## Docs

- [ops/README.md](ops/README.md) — using the admin panel and the sheet
- [ops/initial_setup.md](ops/initial_setup.md) — one-time setup (fork, GitHub Pages, Google Sheet)
- [ops/maintenance.md](ops/maintenance.md) — ongoing tasks
- [AGENT.md](AGENT.md) — technical reference

## Layout

```
docs/          the website (public pages and admin panel)
google-sheet/  Apps Script and Google Sheet template
ops/           operator guides
brand/         original logo files
tools/         generators for logos, icons and the sheet template
```

#!/usr/bin/env python3
"""Build the Google Sheets template: google-sheet/backwash-records-template.xlsx.

Run from anywhere:  python3 tools/make_sheet_template.py   (needs openpyxl)

The output is deterministic (fixed document properties, fixed zip timestamps,
fixed demo updatedAt), so re-running the script gives the same bytes.

Layout is the contract from the round-3 spec ("Sheet layout"):
  Albums      row 1 = the 18 album headers (slug in column A), demo row, text format
  Site        key | value | notes, the 20 settings in spec order
  How to use  plain instructions for whoever edits the sheet by hand

Keep the headers and keys in step with docs/assets/js/platforms.js and google-sheet/Code.gs.
"""
import datetime as dt
import math
import re
import zipfile
from pathlib import Path

from openpyxl import Workbook
from openpyxl.comments import Comment
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "google-sheet" / "backwash-records-template.xlsx"

AUTHOR = "Backwash Records"
TEXT_FORMAT = "@"          # Google Sheets "Plain text"
MAX_ROW = 1000             # rows that are pre-formatted as text
FIXED_TIME = dt.datetime(2026, 10, 27, 0, 0, 0)
HEADER_FONT = Font(bold=True)
HEADER_FILL = PatternFill("solid", fgColor="E0E0E0")

ALBUM_HEADERS = [
    ("slug", 22), ("title", 30), ("artist", 24), ("year", 8), ("label", 20),
    ("note", 24), ("cover", 40), ("shopUrl", 40),
    ("spotify", 36), ("appleMusic", 36), ("youtubeMusic", 36), ("youtube", 36),
    ("amazonMusic", 36), ("deezer", 36), ("tidal", 36), ("soundcloud", 36),
    ("bandcamp", 36),
    ("updatedAt", 26),
]

DEMO_ALBUM = {
    "slug": "demo",
    "title": "Backwash Sampler Vol. 1",
    "artist": "Various Artists",
    "year": "2026",
    "label": "Backwash Records",
    "note": "Demo record — delete me",
    "cover": "assets/img/demo-cover.jpg",
    "shopUrl": "",
    "spotify": "https://open.spotify.com/search/backwash%20records",
    "appleMusic": "https://music.apple.com/us/search?term=backwash%20records",
    "youtubeMusic": "https://music.youtube.com/search?q=backwash%20records",
    "deezer": "https://www.deezer.com/search/backwash%20records",
    "tidal": "https://listen.tidal.com/search?q=backwash%20records",
    "bandcamp": "https://bandcamp.com/search?q=backwash%20records",
    "updatedAt": "2026-10-27T00:00:00.000Z",
}

ALBUM_COMMENTS = {
    "slug": "Lowercase letters, digits and single hyphens — it becomes part of the "
            "sticker link, don't change it later.",
    "updatedAt": "Set by the admin panel. Leave it alone.",
}

# (key, default value, note). Keys and order are fixed by the spec; the texts.*
# defaults mirror DEFAULT_TEXTS in docs/assets/js/platforms.js.
SITE_SETTINGS = [
    ("name", "Backwash Records",
     "Your store or label name, shown on the site."),
    ("tagline", "Record store",
     "Short line under the name. Leave empty to show none."),
    ("theme", "ink",
     "Starting design: ink, paper, fire, sun or cover. Pick from the drop-down."),
    ("themeSwitcher", "TRUE",
     "TRUE shows the Change design button; FALSE locks the design. Pick from the drop-down."),
    ("catalogUrl", "",
     "Link to your full catalog. Must start with https://"),
    ("socials.instagram", "",
     "Full profile link, starts with https://. Leave empty to hide it."),
    ("socials.facebook", "",
     "Full profile link, starts with https://. Leave empty to hide it."),
    ("socials.tiktok", "",
     "Full profile link, starts with https://. Leave empty to hide it."),
    ("socials.x", "",
     "Full profile link, starts with https://. Leave empty to hide it."),
    ("socials.youtube", "",
     "Full channel link, starts with https://. Leave empty to hide it."),
    ("socials.whatsapp", "",
     "https://wa.me/<country code + number>, digits only, e.g. https://wa.me/15551234567"),
    ("socials.email", "",
     "Plain address, e.g. hello@yourstore.com. Leave empty to hide it."),
    ("socials.maps", "",
     "Link to your place on Google Maps, starts with https://. Leave empty to hide it."),
    ("socials.website", "",
     "Your own website, starts with https://. Leave empty to hide it."),
    ("texts.listen", "Listen on",
     'Button text. Leave empty to use the default ("Listen on").'),
    ("texts.play", "Play",
     'Button text. Leave empty to use the default ("Play").'),
    ("texts.shop", "Buy this record",
     'Button text. Leave empty to use the default ("Buy this record").'),
    ("texts.catalog", "Browse our catalog",
     'Button text. Leave empty to use the default ("Browse our catalog").'),
    ("texts.follow", "Follow us",
     'Button text. Leave empty to use the default ("Follow us").'),
    ("texts.notFound", "We couldn't find that record.",
     'Message text. Leave empty to use the default ("We couldn\'t find that record.").'),
]

HOW_TO_USE = [
    "How to use this sheet",
    "This spreadsheet is the database for the record store website. The public pages "
    "read it directly, and the admin panel saves its changes here.",
    "The Albums tab has one row per album or release, and each row becomes one album page "
    "on the site. To add an album, type it in the first empty row under the list.",
    "The Site tab holds the settings for the whole site: the store name, the starting design, "
    "the social links and the button text. Change only the value column (column B). The notes "
    "column (column C) is a reminder for you and is not read by the site. Use the drop-downs "
    "for theme and themeSwitcher.",
    "Do not rename the tabs (Albums, Site, How to use), do not change the header row (row 1) "
    "or the keys in column A of the Site tab, and do not move or insert columns. The site finds "
    "everything by these exact names and positions. The slug must stay in column A.",
    "The slug (column A on Albums) is the short name of an album and is used in its web "
    "address. Use only lowercase letters a to z, digits 0 to 9 and single hyphens between words, "
    "for example backwash-sampler-vol-1. No spaces, capitals, accents or double hyphens. The slug "
    "is part of the sticker link, so do not change it after the stickers are printed.",
    "Every link (shop, streaming, cover image and social links) must start with https://, for "
    "example https://example.com/catalog. If you have nothing for a field, leave the cell empty.",
    "Leave the updatedAt column alone. The admin panel sets it every time an album is saved, "
    "and it stops two people from overwriting each other's changes.",
    "The sheet must stay shared as Anyone with the link, role Viewer. That is how the public "
    "pages read it. The admin password is NOT in this sheet; it is kept in the Apps Script "
    "project settings.",
    "Edits made here show on the site within about a minute.",
    "The admin panel writes to this same sheet, so you can use either one. Avoid editing the "
    "same album in both at the same time.",
    "The demo row (slug demo) is sample data. Delete it once you have real albums.",
    "The cells are already set to plain text, so values such as 2026 stay exactly as you type "
    "them.",
]


def style_header(cell):
    cell.font = HEADER_FONT
    cell.fill = HEADER_FILL


def build_albums(ws):
    for col, (name, width) in enumerate(ALBUM_HEADERS, start=1):
        ws.column_dimensions[get_column_letter(col)].width = width
        style_header(ws.cell(row=1, column=col, value=name))
        if name in ALBUM_COMMENTS:
            ws.cell(row=1, column=col).comment = Comment(
                ALBUM_COMMENTS[name], AUTHOR, width=260, height=90)

    for col, (name, _) in enumerate(ALBUM_HEADERS, start=1):
        ws.cell(row=2, column=col, value=DEMO_ALBUM.get(name) or None)

    for row in ws.iter_rows(min_row=1, max_row=MAX_ROW,
                            min_col=1, max_col=len(ALBUM_HEADERS)):
        for cell in row:
            cell.number_format = TEXT_FORMAT

    ws.freeze_panes = "A2"


def build_site(ws):
    for col, (name, width) in enumerate([("key", 22), ("value", 50), ("notes", 60)], start=1):
        ws.column_dimensions[get_column_letter(col)].width = width
        style_header(ws.cell(row=1, column=col, value=name))

    row_of = {}
    for row_idx, (key, value, note) in enumerate(SITE_SETTINGS, start=2):
        row_of[key] = row_idx
        ws.cell(row=row_idx, column=1, value=key)
        ws.cell(row=row_idx, column=2, value=value or None)
        ws.cell(row=row_idx, column=3, value=note)

    for row in ws.iter_rows(min_row=1, max_row=MAX_ROW, min_col=2, max_col=2):
        for cell in row:
            cell.number_format = TEXT_FORMAT

    theme_dv = DataValidation(
        type="list", formula1='"ink,paper,fire,sun,cover"', allow_blank=True,
        showErrorMessage=True, errorTitle="Unknown theme",
        error="Choose ink, paper, fire, sun or cover.")
    theme_dv.add(f"B{row_of['theme']}")

    switcher_dv = DataValidation(
        type="list", formula1='"TRUE,FALSE"', allow_blank=True,
        showErrorMessage=True, errorTitle="TRUE or FALSE",
        error="Choose TRUE or FALSE.")
    switcher_dv.add(f"B{row_of['themeSwitcher']}")

    ws.add_data_validation(theme_dv)
    ws.add_data_validation(switcher_dv)
    ws.freeze_panes = "A2"


def build_how_to(ws):
    ws.column_dimensions["A"].width = 110
    title = ws.cell(row=1, column=1, value=HOW_TO_USE[0])
    title.font = Font(bold=True, size=14)
    ws.row_dimensions[1].height = 22

    for row_idx, text in enumerate(HOW_TO_USE[1:], start=2):
        cell = ws.cell(row=row_idx, column=1, value=text)
        cell.alignment = Alignment(wrap_text=True, vertical="top")
        # Explicit heights so wrapped lines show in Google Sheets too.
        ws.row_dimensions[row_idx].height = 15 * max(1, math.ceil(len(text) / 100)) + 4


def normalise_zip(path):
    """Pin the volatile bits of the xlsx (save time in docProps, zip entry times)
    so the same script always writes the same bytes."""
    fixed_iso = FIXED_TIME.strftime("%Y-%m-%dT%H:%M:%SZ")
    with zipfile.ZipFile(path) as zin:
        entries = [(info.filename, zin.read(info.filename)) for info in zin.infolist()]
    tmp = path.with_name(path.name + ".tmp")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, data in entries:
            if name == "docProps/core.xml":
                # openpyxl writes the save time into dcterms:modified on every save.
                text = data.decode("utf-8")
                text = re.sub(r"(<dcterms:modified[^>]*>)[^<]*(</dcterms:modified>)",
                              lambda m: m.group(1) + fixed_iso + m.group(2), text)
                data = text.encode("utf-8")
            info = zipfile.ZipInfo(name, date_time=FIXED_TIME.timetuple()[:6])
            info.compress_type = zipfile.ZIP_DEFLATED
            zout.writestr(info, data)
    tmp.replace(path)


def main():
    wb = Workbook()
    albums = wb.active
    albums.title = "Albums"
    site = wb.create_sheet("Site")
    how_to = wb.create_sheet("How to use")

    build_albums(albums)
    build_site(site)
    build_how_to(how_to)

    wb.properties.creator = AUTHOR
    wb.properties.title = "Backwash Records sheet template"
    wb.properties.created = FIXED_TIME
    wb.properties.modified = FIXED_TIME

    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)
    normalise_zip(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()

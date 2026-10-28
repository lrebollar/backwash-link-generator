# Operations guide

These guides explain how to set up and run the Backwash Records NFC record pages. You do not need to know how to code.

Everything here is free to run.

## How it works

- Your records and store settings live in a **Google Sheet**. The sheet has one row for each record. It also has a tab for your store settings.
- The sheet is shared so that **anyone with the link can view it**. The public pages read it directly. The sheet holds nothing secret. Only you can change it.
- The admin panel saves your changes to the sheet. It does this through a small Google Apps Script attached to the sheet. The admin panel is protected by a password.
- You can also edit the sheet by hand. See [Google Sheet maintenance](maintenance/google-sheet.md).
- Changes to records and store settings show on the website within about a minute.
- The website is the `docs/` folder in the GitHub repository. It is a set of plain files. A GitHub Action copies code changes to GitLab automatically. GitLab Pages publishes the website for free. There is no server to pay for or maintain.
- The website code only changes when the code changes. Saving records or store settings does not touch GitHub or GitLab, so it uses no publishing minutes.
- The admin panel is at `<your site>/admin/`. You use it to add and edit records and store settings.
- The sticker only holds a link, like `https://backwash-link-generator-xxxxxx.gitlab.io/?a=nevermind`. You can change a record's page at any time without touching its sticker. Only a change of the site address would need new stickers, so pick the final address first.

## Accounts you need

| Account | Used for | Cost |
|---|---|---|
| GitHub | Keeps the website code | Free |
| GitLab | Publishes the website | Free |
| Google | The Google Sheet, the Apps Script and the cover pictures | Free |

## One-time setup

Do these once, in this order. Ask someone to help you if a step is unclear.

1. [GitHub and GitLab: put the site online](one-time-setup/1-github-gitlab.md)
2. [Google Sheet: create the sheet and its Apps Script](one-time-setup/2-google-sheet.md)
3. [Admin panel: connect it to the sheet](one-time-setup/3-admin-panel.md)
4. [Store: settings and the demo record](one-time-setup/4-store.md)

## Ongoing maintenance

| Guide | When you need it |
|---|---|
| [Records and NFC stickers](maintenance/records-and-stickers.md) | Every new record. Buying stickers. |
| [Google Sheet and Apps Script](maintenance/google-sheet.md) | Editing the sheet by hand. Updating the Apps Script. Changing the admin password. Undoing a change. |
| [GitHub and GitLab](maintenance/github-gitlab.md) | Renewing the GitLab token (once a year). A failed **Mirror to GitLab** run. Previewing the site on your computer. |
| [Design](maintenance/design.md) | Changing or locking the look of the pages. |

### Calendar

| How often | Task | Guide |
|---|---|---|
| Each new record | Add the record and write its sticker | [Records and NFC stickers](maintenance/records-and-stickers.md) |
| Once a year | Make a new GitLab token before the old one expires | [GitHub and GitLab](maintenance/github-gitlab.md#renew-the-gitlab-token) |
| When `google-sheet/Code.gs` changes | Copy the new script into the sheet | [Google Sheet and Apps Script](maintenance/google-sheet.md#update-the-apps-script) |
| When a password or token may have leaked | Replace it | [Google Sheet](maintenance/google-sheet.md#change-the-admin-password), [GitHub and GitLab](maintenance/github-gitlab.md#renew-the-gitlab-token) |

## Hand the project over

To move the project to the store owner's own accounts, see [Hand the project over](handover.md).

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
google-sheet/backwash-records-template.xlsx  the Google Sheet template
brand/                                       original logo files
tools/                                       scripts that made the logos and icons
.gitlab-ci.yml                               tells GitLab how to publish the site
.github/workflows/mirror-to-gitlab.yml       copies code changes from GitHub to GitLab
ops/                                         these guides
```

# Design

The design sets the colors, fonts and logo style. The layout stays the same. There are 5 designs:

- **Ink**: black & white, line-art logo
- **Paper**: off-white, black ink
- **Fire**: brand red & yellow, sticker style
- **Sun**: brand yellow, black type
- **Cover**: blurred album art backdrop

To compare them side by side, open `<your site>/themes.html`.

## Try a design on your phone

1. Open any record page on your phone.
2. Tap the round **Change design** button (when it is turned on). It has a palette icon and sits at the bottom right of the page.
3. Tap a design name. The page changes at once.
4. Your pick is saved on that device only. To go back to the store's design, open the **Change design** button again and tap **Use store default**.

If you do not see the button, it is turned off. See [Lock the design](#lock-the-design) below.

## Choose the default design

1. In the admin panel, tap **Site settings**.
2. Choose a **Default design**.
3. Click **Save site settings**.

New visitors, and phones that have not picked a design, see this design. Visitors who already picked one keep their pick. To make everyone see the store design, lock it (see below). The choice is saved in the **Site** tab of the Google Sheet, in the row called `theme`.

## Lock the design

1. In the admin panel, tap **Site settings**.
2. Untick **Show the 'Change design' button on the public pages**.
3. Click **Save site settings**.

The button disappears. Every page then uses the store's default design, even on phones that picked another one. To show the button again, tick the box and click **Save site settings**. The setting is saved in the **Site** tab of the Google Sheet, in the row called `themeSwitcher`.

## Preview a record in another design

To preview a record in another design, add `&theme=fire` to the end of its link. For example:

`https://backwash-link-generator-xxxxxx.gitlab.io/?a=nevermind&theme=fire`

Use `&theme=ink`, `&theme=paper`, `&theme=sun` or `&theme=cover` to try the others. The preview does not change the sticker or your store design.

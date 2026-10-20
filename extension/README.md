# MBA Recruiting Tool – Chrome extension

Saves the LinkedIn profile you're viewing as a contact in the web app.

## Install (unpacked)
1. Download or clone the repo and find the `extension` folder.
2. In Chrome, open `chrome://extensions` and switch on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `extension` folder.
4. Pin the extension from the puzzle-piece menu so the icon stays visible.

## Use
1. Sign in to the web app in the same Chrome profile.
2. Open someone's LinkedIn profile (`linkedin.com/in/...`) and click the extension icon.
3. Check the prefilled name, title, and company (LinkedIn's layout changes, so fix anything that's off).
4. Optionally add how you met, a first note, and an action item, then click **Save contact**.

It only reads the profile page you are on, when you click the icon. It does not scrape in the background or in bulk.

## Local development
Set `APP_URL` in `config.js` to `http://localhost:3000`, then click the reload icon for the extension on `chrome://extensions`.
If the app moves to a custom domain, update `APP_URL` and `host_permissions` in `manifest.json`.

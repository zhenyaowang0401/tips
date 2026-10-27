# carrot

A tiny desktop for your thoughts. Orange, retro computer chrome, and fewer words. Built for phones first.

## Develop

Node.js 20.19+ or 22.12+ is required (validated on Node.js 24).

```sh
npm ci
npm run dev -- --port 5173
```

Build with `npm run build`. Preview the production build with `npm run preview -- --port 4173`.

## Use

- Type a thought and press **Add** or Enter. Shift+Enter adds a new line.
- Use **New goal** to give a goal optional completion steps.
- Click the square to complete a task. Goals with unfinished steps open their editor first.
- Completion triggers a pixel burst, a synthesized coin chime, and vibration where supported.
- **Done** holds completed tasks; click a checkmark to reopen one. Use **···** to edit or delete.
- **End day** saves today's wins to **Daily log**. Saving again on the same day updates that entry. Unfinished tasks stay until completed or removed.

## Storage and feedback

Tasks, saved days, and the sound preference stay in this browser's localStorage. The original `carrot-pocket-v1` storage key is preserved, so the redesign keeps existing records. No account, API key, server, external font, or database is required. Data does not sync between devices; clearing browser storage deletes it. There are no scheduled background notifications.

Sound plays after interaction, subject to browser audio policy. Vibration requires browser support and is unavailable on iOS Safari. Reduced-motion preferences disable particle and crush animations. Hardware sound and haptics should be checked on a real phone.

## Validation

The production build and Chromium browser flows were verified: migration of existing local data, quick capture, reload persistence, draft retention when switching views or sound, goal conditions, completion, daily review, unfinished tasks, reopening and editing. Layouts were checked at widths of 320, 375, 390, 430, 768, and 1440 pixels, including the GitHub Pages `/tips/` path.

## GitHub Pages

The `main` branch holds source. The `gh-pages` branch holds the contents of `dist` plus an empty `.nojekyll` file. In repository **Settings → Pages**, select **Deploy from a branch → gh-pages → / (root)**.

The site URL is https://zhenyaowang0401.github.io/tips/ once GitHub's deployment succeeds. `vite.config.js` uses relative asset URLs for subpath hosting. After source changes, rebuild and update the contents of `gh-pages`; committing only to `main` does not update the published site.

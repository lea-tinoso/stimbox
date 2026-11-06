# stimbox

A music player for brains that play the same song 47 times. It looks like a messy early Mac OS X desktop:
draggable windows, a dock, sticky notes and an iPod you can drag around.

This is the MVP with **fake data**. Nothing talks to Spotify yet: songs, charts and stats are made up, the
lyrics are placeholder text, and playback is a fake clock. Likes, loves, dislikes and window positions are
saved in your browser.

## Try it

```sh
git clone --recurse-submodules https://github.com/lea-tinoso/stimbox.git
cd stimbox
npm install
npm run dev
```

- Click a playlist in **listen again** or any song to play it.
- Click the iPod screen, the iPod in the dock, the song in the menu bar, or press ⌘L / Ctrl+L to open **now playing**.
- Space plays and pauses. Option+arrow keys skip.
- ♥ saves to **loved** (and likes it), 👍 saves to **liked**, 👎 hides and skips the song. See them in **library**.
- Drag windows and the iPod by their title bar or body. **tidy desktop** in the menu bar puts everything back.

## Release on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import `lea-tinoso/stimbox`.
2. Keep the detected settings (Vite, `npm run build`, output `dist`) and deploy.

## What's next

- Connect Spotify (needs Spotify Premium and a Spotify developer app).
- Suggestions and trending from Last.fm, synced lyrics from LRCLIB.
- Phone layout: the whole app as an iPod.

## Credits

- Look: Mac OS X Aqua as seen in [ryOS](https://github.com/ryokun6/ryos); dock icons are from ryOS's
  `public/icons/macosx` set. ryOS is AGPL-3.0, and these icons appear to be Apple's own artwork, so swap them
  for original icons before any public or commercial release.
- Wallpaper and stickers: after heyclicky.com, via `lea-tinoso/which-abbott-are-you`.
- Caveat font: SIL Open Font License.

The UI kit setup from ui-starter still applies: see [CLAUDE.md](CLAUDE.md) and [DESIGN.md](DESIGN.md).

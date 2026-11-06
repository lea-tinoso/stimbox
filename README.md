# stimbox

A music player for brains that play the same song 47 times. It looks like a messy early Mac OS X desktop:
draggable windows, a dock, sticky notes and an iPod you can drag around. On a phone the whole app is one
iPod.

Live at [stimbox.vercel.app](https://stimbox.vercel.app). It shows lea's own Spotify music; visitors don't
log in.

## What it does

- **Listen again, for you, your algorithm:** lea's recent playlists and albums, her playlists, top artists,
  songs on repeat and listening hours, from her Spotify account.
- **Trending:** top songs in the Philippines, Asia and the world, from Last.fm's charts. The ▲▼ arrows
  compare with the last day your browser saw the chart.
- **Search:** songs, playlists, albums and artists, with recent searches.
- **Radio:** a song started from search, trending or a song page keeps going with similar songs (Last.fm),
  like YouTube Music.
- **Now playing:** synced lyrics from LRCLIB (tap a line to jump there), up next, shuffle, repeat, sound on
  or off, 👎 👍 ♥ and add to playlist.
- **Song and artist pages:** click any song or artist name. Artist pages show listeners, popular songs,
  albums, an about section, similar artists and a follow button.
- **Library:** loved, liked and disliked songs, lea's Spotify playlists and playlists made in stimbox.
- **nerdstats:** press the `` ` `` key for a terminal with stats for nerds.
- **Phone:** an iPod with the lyrics on its screen. MENU opens a list to pick music; the click wheel scrolls.

Keys: Space plays and pauses, Option+arrow keys skip, ⌘L / Ctrl+L opens now playing. Likes, loves,
dislikes, the queue and window positions are saved in your browser. Without the env vars below, the app
runs on demo data with chiptune stand-ins for the songs.

## Run it

```sh
git clone --recurse-submodules https://github.com/lea-tinoso/stimbox.git
cd stimbox
npm install
npm run dev
```

`npm run dev` has no `/api`, so it shows demo data. Use `vercel dev` to run the functions locally.

## Setup on Vercel

Vercel deploys `main` automatically. Set these under Settings → Environment Variables (all server only),
then redeploy:

| Variable                                   | What it's for                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | From the Spotify developer dashboard.                                                                                                      |
| `SPOTIFY_REFRESH_TOKEN`                    | Open `https://stimbox.vercel.app/api/spotify/login`, approve, and copy the token shown. Redo this whenever the app asks for new permissions. |
| `LASTFM_API_KEY`                           | Radio, trending, artist listeners and bios.                                                                                                |
| `STIMBOX_OWNER_KEY`                        | Any secret of 12+ characters. Open `https://stimbox.vercel.app/#owner=<key>` once in your browser to add songs to and delete your Spotify playlists from stimbox. |

## How it works

- Spotify closed recommendations, related artists, charts and lyrics to new apps, so stimbox reads lea's
  music on the server with her refresh token (`api/spotify/`), asks Last.fm what's similar or trending and
  finds those songs with Spotify search, and gets lyrics from [LRCLIB](https://lrclib.net) in the browser.
- Songs play through Spotify's embed player: full songs when the visitor is logged into Spotify in that
  browser, 30-second previews otherwise. The embed has no volume control, so sound off pauses Spotify songs.
- Anyone can follow an artist (it follows on lea's account). Only lea's browser, with the owner key, can
  unfollow or change her playlists.

Stack: Vite, React 19, TypeScript, Tailwind CSS v4, Vercel functions. The UI kit setup from ui-starter still
applies: see [CLAUDE.md](CLAUDE.md) and [DESIGN.md](DESIGN.md).

## Credits

- Look: Mac OS X Aqua as seen in [ryOS](https://github.com/ryokun6/ryos); dock icons are from ryOS's
  `public/icons/macosx` set. ryOS is AGPL-3.0, and these icons appear to be Apple's own artwork, so swap them
  for original icons before any commercial release.
- Wallpaper and stickers: after heyclicky.com, via `lea-tinoso/which-abbott-are-you`.
- Data: Spotify Web API, Last.fm API, LRCLIB.
- Caveat font: SIL Open Font License.

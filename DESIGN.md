# stimbox design

A music player that looks like a messy early Mac OS X desktop. Approved from the mockups in this project
(`/mnt/project-files/mockups/`). Three sources, each for one layer:

| Layer                         | Source                                                                  |
| ----------------------------- | ----------------------------------------------------------------------- |
| Windows, buttons, lists, iPod | Mac OS X "Aqua" as seen in [ryOS](https://os.ryo.lu)                    |
| Dock icons                    | ryOS `public/icons/macosx` icon set                                     |
| Wallpaper, stickers, clutter  | heyclicky.com via Lea's Abbott site (`lea-tinoso/which-abbott-are-you`) |

## Colors

| Token          | Value     | Use                                 |
| -------------- | --------- | ----------------------------------- |
| `desk`         | `#f4f4f4` | Desktop wallpaper base              |
| `window`       | `#ffffff` | Window body                         |
| `ink`          | `#111111` | Main text, outlines                 |
| `body`         | `#333333` | Secondary text                      |
| `mute`         | `#6b6b6b` | Meta text                           |
| `faint`        | `#b5b5bd` | Past and future lyric lines         |
| `hairline`     | `#8d8d8d` | Window and button borders           |
| `chrome-hi`    | `#ececec` | Title bar top                       |
| `chrome-lo`    | `#c9c9c9` | Title bar bottom                    |
| `stripe`       | `#edf3fe` | Alternate list rows (iTunes stripe) |
| `aqua-hi`      | `#cfe6ff` | Aqua gel highlight                  |
| `aqua`         | `#3d8cf0` | Aqua gel body, selected pill, bars  |
| `aqua-deep`    | `#2a73e6` | Aqua gel shade                      |
| `aqua-edge`    | `#3567a8` | Aqua gel border                     |
| `selection`    | `#3875d7` | Current lyric, text selection       |
| `pink`         | `#f24fd0` | Love, brand accent, top genre       |
| `pink-soft`    | `#ffd1f0` | Loved folder, pink stickers         |
| `yellow`       | `#ffe45c` | Sticky notes                        |
| `red`          | `#e5484d` | Name tag, dislike                   |
| `green`        | `#0a8a3a` | Chart rising                        |
| `light-red`    | `#ff5f57` | Close button                        |
| `light-yellow` | `#febc2e` | Minimize button                     |
| `light-green`  | `#28c840` | Zoom button                         |
| `lcd`          | `#c9d9e8` | iPod screen                         |
| `lcd-ink`      | `#1b2a3a` | iPod screen text                    |
| `ipod-hi`      | `#fbfbfb` | iPod body light                     |
| `ipod-lo`      | `#d4d4da` | iPod body shade                     |

## Type

- Interface: `"Lucida Grande", "Lucida Sans Unicode", "DejaVu Sans", Verdana, sans-serif`, 11 to 13px, lowercase copy.
- Handwriting (sticky notes, name tag): Caveat Bold, self-hosted.
- Big numbers (stats): interface font, bold, tight tracking.

## Shape

- Windows: 7px top corners, 1px `hairline` border, large soft shadow, striped title bar with traffic lights.
- Buttons: Aqua pills (fully rounded), glossy two-tone gradient; selected pill is blue gel.
- Album art: 3px corners.
- Dock: glass shelf at the bottom edge, 64px icons, running dot under open apps.

## Voice

All lowercase, short, a bit playful (kaomoji welcome on the desktop, never inside data).

# Why?
This is a remake/clone of AnimRefNewControl, a program that allows you to view images on top of other windows. This is useful for artists who want to reference images while drawing, or for people who want to view images while playing games. Where AnimRef differs is it adds gif, video, and youtube support. The movement of a video for a reference offers a lot of information like depth and scale that a still image can't. This is one of the key parts of what make in person figure drawing so important. It also seems like AnimRefNewControl has no intention of ever adding this feature. 

🚀 You should still support AnimRefNewControl if you can! 🚀

# Example Previews
![First preview](github_page/1.gif)
### Youtube video trimming to loop only a specific portion
![second preview](github_page/2.gif)

# Features
- **Images, GIFs, videos and YouTube** on one infinite canvas. Supported files: `png`, `jpg`/`jpeg`, `gif`, `webp`, `bmp`, `svg`, `avif`, `mp4`, `webm`, `mov`, `m4v`, `ogv`, `mkv`.
- **Video loop editor**: select a video or YouTube item and press `Enter` (or right-click → *Edit Video*) to trim it to just the part you want to loop.
- **Video playback controls**: play/pause, frame stepping, seeking, speed and volume, for the selected videos or for all of them at once.
- **Stays on top of other windows**, with adjustable window opacity, a click-through mode, and a lock that stops the window from moving.
- **Arrange tools**: align, distribute, normalize, pack, stack, and sort by name, path, order added, type, or randomly.
- **Per-item tools**: flip, grayscale, smooth/pixelated sampling, opacity, rotate, scale and lock.
- **Shortcuts you can change** (see [Shortcuts](#shortcuts)).

## Adding references
- **Drag and drop** files onto the window.
- **Open images / videos** (`Ctrl+I`) to pick files.
- **Paste** (`Ctrl+V`) a copied file, an image, an image URL, or a YouTube link (`youtube.com/watch?v=…` or `youtu.be/…`). Any other pasted text becomes a text note on the canvas.
- **Copy/paste between scenes**: items copied in AnimRef keep their size, position and settings when you paste them.

## Scenes
- Scenes are saved as `.purgif` files (JSON). They save file paths and URLs, not the media itself, so keep your files where they are.
- When it starts, AnimRef opens your most recent scene, opens maximized, and is set to always stay on top.
- Right-click → *Recent* lists the scenes you've opened before.
- You can export a copy of a scene, export only the selected items as a new scene, or copy the source images of all or selected items into a folder (`Ctrl+Alt+I` / `Ctrl+Shift+I`).

The window has no title bar. Right-drag moves it, and right-click opens the menu with most commands.

# How to use
## Install on Windows
1. Install [Node.js](https://nodejs.org) (LTS) and [Git](https://git-scm.com).
2. In a terminal, run:
   ```
   git clone https://github.com/XXXMrStingerXXX/AnimRefNewControl.git
   cd AnimRefNewControl
   npm install
   npm run make
   ```
3. Open `out\make\squirrel.windows\x64` and run **`animref-1.1.0 Setup.exe`**. AnimRef installs and opens, and gets a Start menu entry and a desktop shortcut.

To update later: `git pull`, `npm run make`, and run the new Setup.exe. Your saved shortcuts and recent scenes are kept.
To uninstall: Windows Settings → Apps → animref → Uninstall.

## macOS and Linux
`npm run make` builds a `.dmg` on macOS and `.deb`, `.rpm` and Flatpak packages on Linux, all in `out/make`. The GitHub Actions workflow (`.github/workflows/main.yml`) builds all of these on every push and creates a draft release. These platforms need testing, so if you use one, please tell us how it works in the issues.

## Shortcuts
Keys follow AnimRefNewControl's layout (Cmd instead of Ctrl on macOS). Press **Ctrl+H** in the app to see this list.

**You can change any key:** in the Ctrl+H panel, click a key and press the new one, use **+** to add another key and **×** to remove one, and use **↺** or **Reset all** to go back to the defaults. Changes are saved automatically. Giving a key to one action takes it away from any other action that used it. For example, bind Space to *Play / pause* to start and stop videos with the space bar. Holding Space and dragging still pans. The right-click menu always shows the default keys.

> Changed from earlier AnimRef versions: New Scene is now **Ctrl+K** (was Ctrl+N), Close is **Ctrl+Q** (Ctrl+W now locks the window), developer tools moved to **F12**, and the Up/Down arrows control video volume (send to front/back is **Page Up / Page Down**).

### Scene & files
| Action | Default keys |
|---|---|
| New scene | `Ctrl+K` |
| Open scene | `Ctrl+L` |
| Open most recent | `Ctrl+Shift+L` |
| Open scene location | `Ctrl+Alt+L` |
| Open images / videos | `Ctrl+I` |
| Open source of selected | `Ctrl+Shift+O` |
| Save | `Ctrl+S` |
| Save as | `Ctrl+Shift+S` |
| Export scene (copy) | `Ctrl+E` |
| Export selected as scene | `Ctrl+Shift+E` |
| Export all images | `Ctrl+Alt+I` |
| Export selected images | `Ctrl+Shift+I` |

### Edit
| Action | Default keys |
|---|---|
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Shift+Z` |
| Copy | `Ctrl+C` |
| Cut | `Ctrl+X` |
| Paste | `Ctrl+V` |
| Duplicate | `Ctrl+D` |
| Delete | `Del` or `Backspace` |
| Select all | `Ctrl+A` |
| Clear selection / cancel | `Esc` |
| Edit item (video loop editor) | `Enter` |

### Arrange
| Action | Default keys |
|---|---|
| Align left | `Ctrl+Left` |
| Align right | `Ctrl+Right` |
| Align top | `Ctrl+Up` |
| Align bottom | `Ctrl+Down` |
| Distribute horizontally | `Ctrl+Alt+Shift+Up` |
| Distribute vertically | `Ctrl+Alt+Shift+Down` |
| Arrange optimal | `Ctrl+P` |
| Arrange by addition | `Ctrl+Alt+A` |
| Arrange by name | `Ctrl+Alt+N` |
| Arrange by order | `Ctrl+Alt+O` |
| Arrange by path | `Ctrl+Alt+D` |
| Arrange: videos on top, pictures below | `Ctrl+Alt+V` |
| Arrange randomly | `Ctrl+Alt+R` |
| Pack all and optimize | `Ctrl+Alt+P` |
| Optimize canvas | `Ctrl+O` |
| Normalize height | `Ctrl+Alt+Left` |
| Normalize width | `Ctrl+Alt+Right` |
| Normalize size | `Ctrl+Alt+Up` |
| Normalize scale | `Ctrl+Alt+Down` |
| Overlay selection | `Ctrl+Y` |
| Stack | `Ctrl+Alt+S` |
| Send to front | `PgUp` |
| Send to back | `PgDn` |

### Image
| Action | Default keys |
|---|---|
| Flip horizontally | `Alt+Shift+H` |
| Flip vertically | `Alt+Shift+V` |
| Toggle grayscale | `Alt+G` |
| Toggle smooth / pixelated sampling | `Alt+T` |
| Toggle locked | `Alt+L` |
| Reset transform | `Ctrl+Shift+T` |

### View
| Action | Default keys |
|---|---|
| Focus selected image (tap) | `Space` |
| Focus whole canvas (tap) | `Ctrl+Space` |
| Focus next image | `Right` |
| Focus previous image | `Left` |
| Zoom in | `Ctrl+=` or `Ctrl+Num+` |
| Zoom out | `Ctrl+-` or `Ctrl+Num-` |
| Reset camera zoom | `Ctrl+0` or `Ctrl+Num0` |
| Toggle grid | `G` |
| Grayscale canvas | `Ctrl+Alt+G` |
| Slideshow selection | `Alt+S` |
| Lock canvas | `Ctrl+R` |
| Help (this list) | `Ctrl+H` |

### Window
| Action | Default keys |
|---|---|
| Always on top | `Ctrl+Shift+A` |
| Lock window | `Ctrl+W` |
| Transparent to mouse (Ctrl+T anywhere turns it off) | `Ctrl+T` |
| Increase window opacity | `Ctrl+Shift+=` or `Ctrl+Shift+Num+` |
| Decrease window opacity | `Ctrl+Shift+-` or `Ctrl+Shift+Num-` |
| Resize window to selection | `Ctrl+Shift+R` |
| Maximize | `Ctrl+F` |
| Minimize | `Ctrl+M` |
| Close | `Ctrl+Q` |
| Developer tools | `F12` |

### Video playback
| Action | Default keys |
|---|---|
| Play / pause | `K` |
| Select all videos and pause | `Shift+K` |
| Select all videos and play | `Ctrl+Shift+K` |
| Step one frame back | `,` |
| Step one frame forward | `.` |
| Jump back 5 seconds | `J` |
| Jump forward 5 seconds | `L` |
| Volume up | `Up` |
| Volume down | `Down` |
| Mute / unmute | `M` |
| Slower | `[` |
| Faster | `]` |
| Normal speed | `\` |

### Mouse
| Action | Default keys |
|---|---|
| Select / move item | `Left drag` |
| Add to / remove from selection | `Shift+Click` |
| Box select (Shift adds) | `Left drag on empty canvas` |
| Move along one axis | `Shift+Left drag` |
| Rotate (Shift snaps to 15°) | `Ctrl+Left drag` |
| Scale | `Ctrl+Alt+Left drag` |
| Change item opacity | `Ctrl+Alt+Shift+Left drag` |
| Pan | `Middle drag` or `Alt+Left drag` or `Space+Left drag` |
| Zoom | `Scroll` or `Z+Left drag` or `Ctrl+Space+Left drag` |
| Step video frames | `Alt+Scroll over a video` |
| Move window / context menu | `Right drag / Right click` |

Playback and volume keys act on the selected videos, or on every video when none are selected. Videos start muted; Up turns the sound on. In the loop editor (Enter on a video), plain scrolling steps frames too.

Not supported by Electron: *Always on bottom*. Window opacity and *Lock window* moving are Windows/macOS only.
## Want to add/suggest more shortcuts?
Use the contribution guide below and check out the issue here: https://github.com/lettucegoblin/AnimRef/issues/9
# Contributing
I've added a bunch of [issues](https://github.com/lettucegoblin/AnimRef/issues) that are good starters. 
If you want to contribute i recommend [this guide](https://www.dataschool.io/how-to-contribute-on-github/) if you're unfamiliar with the process. Feel free to contribute however you'd like!

## List of contributors so far!
- [Curtrell-Trott](https://github.com/Curtrell-Trott) https://github.com/lettucegoblin/AnimRef/pull/10

## Building guide
- if you're looking to contribute prob fork the repo and then clone that locally. use guide above if unfamiliar.
- Install Node.js. CI uses Node 19; newer LTS versions also work.
- In the local repo, run `npm install`.
- Run: `npm start`
- Package: `npm run package` builds an unpacked app you can run, without an installer, in `out/animref-<platform>-<arch>/`.
- Make: `npm run make` builds the installers and packages in `out/make` (Squirrel `Setup.exe` on Windows, `.dmg` on macOS, `.deb`/`.rpm`/Flatpak on Linux).
- Debugging: press F12 to toggle developer tools, or run `npx electron . debug` to open them in their own window at startup.

### Code layout
| File | What it does |
|---|---|
| `main.js` | Electron main process: the window, right-click menu, clipboard, file dialogs, saving and loading scenes, recent scenes, window settings |
| `preload.js` | Canvas logic: adding media, selection, transforms, arrange tools, camera, video playback, loop editor, undo/redo, keyboard handling |
| `renderer.js` | YouTube player setup and the loop editor slider (noUiSlider) |
| `shortcuts.js` | The one place shortcuts are defined: default keys, help list, and turning keys into Electron accelerators |
| `index.html` / `index.css` | Page markup and styles |

Changed shortcuts and recent scenes are stored with `electron-store`.

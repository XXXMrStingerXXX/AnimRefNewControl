# Why?
This is a remake/clone of AnimRefNewControl, a program that allows you to view images on top of other windows. This is useful for artists who want to reference images while drawing, or for people who want to view images while playing games. Where AnimRef differs is it adds gif, video, and youtube support. The movement of a video for a reference offers a lot of information like depth and scale that a still image can't. This is one of the key parts of what make in person figure drawing so important. It also seems like AnimRefNewControl has no intention of ever adding this feature. 

🚀 You should still support AnimRefNewControl if you can! 🚀

# Example Previews
![First preview](github_page/1.gif)
### Youtube video trimming to loop only a specific portion
![second preview](github_page/2.gif)

# How to use
Download from releases here: [Releases](https://github.com/lettucegoblin/AnimRef/releases)
Windows, Mac, and linux support(need testing on mac and linux; If you're on these platforms please mention how they are in the issues)

## Shortcuts
Keys follow AnimRefNewControl's layout (Cmd instead of Ctrl on macOS). Press **Ctrl+H** in the app to see this list.

> Changed from earlier AnimRef versions: New Scene is now **Ctrl+K** (was Ctrl+N), Close is **Ctrl+Q** (Ctrl+W now locks the window), and developer tools moved to **F12**.

### Scene & files
| Action | Keys |
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
| Action | Keys |
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
| Action | Keys |
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
| Arrange randomly | `Ctrl+Alt+R` |
| Pack all and optimize | `Ctrl+Alt+P` |
| Optimize canvas | `Ctrl+O` |
| Normalize height | `Ctrl+Alt+Left` |
| Normalize width | `Ctrl+Alt+Right` |
| Normalize size | `Ctrl+Alt+Up` |
| Normalize scale | `Ctrl+Alt+Down` |
| Overlay selection | `Ctrl+Y` |
| Stack | `Ctrl+Alt+S` |
| Send to front | `Up` |
| Send to back | `Down` |

### Image
| Action | Keys |
|---|---|
| Flip horizontally | `Alt+Shift+H` |
| Flip vertically | `Alt+Shift+V` |
| Toggle grayscale | `Alt+G` |
| Toggle smooth / pixelated sampling | `Alt+T` |
| Toggle locked | `Alt+L` |
| Reset transform | `Ctrl+Shift+T` |

### View
| Action | Keys |
|---|---|
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
| Action | Keys |
|---|---|
| Always on top | `Ctrl+Shift+A` |
| Lock window | `Ctrl+W` |
| Transparent to mouse (Ctrl+T again anywhere to undo) | `Ctrl+T` |
| Increase window opacity | `Ctrl+Shift+=` or `Ctrl+Shift+Num+` |
| Decrease window opacity | `Ctrl+Shift+-` or `Ctrl+Shift+Num-` |
| Resize window to selection | `Ctrl+Shift+R` |
| Maximize | `Ctrl+F` |
| Minimize | `Ctrl+M` |
| Close | `Ctrl+Q` |
| Developer tools | `F12` |

### Video playback
| Action | Keys |
|---|---|
| Play / pause | `K` |
| Step one frame back | `,` |
| Step one frame forward | `.` |
| Jump back 5 seconds | `J` |
| Jump forward 5 seconds | `L` |
| Mute / unmute | `M` |
| Slower | `[` |
| Faster | `]` |
| Normal speed | `\` |

### Mouse
| Action | Keys |
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
| Focus selected image (tap) | `Space` |
| Focus whole canvas (tap) | `Ctrl+Space` |
| Step video frames | `Alt+Scroll over a video` |
| Move window / context menu | `Right drag / Right click` |

Playback keys act on the selected videos, or on every video when none are selected. In the loop editor (Enter on a video), plain scrolling steps frames too.

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
- Install nodejs(I use node version 19)
- in the local repo run `npm install`
- Running: `npm run start`
- Packaging: `npm run package` this makes a simple runnable non-installer(.exe for Windows, .dmg for macOS, or .deb for Linux) in out/AnimRef...
- Make: `npm run make` this makes an installer in out/make
- For debugging you can press Control+Shift+I to open the dev console.

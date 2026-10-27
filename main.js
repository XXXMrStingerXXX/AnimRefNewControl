const {
  BrowserWindow,
  Menu,
  MenuItem,
  ipcMain,
  app,
  clipboard,
  nativeImage,
  globalShortcut,
  dialog,
  shell,
  net,
} = require('electron')
const path = require('path')
const fs = require('fs');
const Store = require('electron-store');
const { effectiveBindings, displayKey, toAccelerator } = require('./shortcuts.js')

const store = new Store();

const isMac = process.platform === 'darwin'
const SCENE_FILTERS = [{ name: 'AnimRef Scene', extensions: ['purgif'] }]
const MEDIA_FILTERS = [
  { name: 'Images and videos', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'avif', 'mp4', 'webm', 'mov', 'm4v', 'ogv', 'mkv'] },
  { name: 'All files', extensions: ['*'] },
]
const CLIPBOARD_PREFIX = 'animref-clipboard:'

let width = 400;
let height = 300;

function createWindow() {
  const win = new BrowserWindow({
    backgroundColor: "#202020",
    width: width,
    height: height,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
    }
  })
  win.setAlwaysOnTop(true);

  win.loadFile('index.html')
  return win;
}
app.commandLine.appendSwitch('disable-site-isolation-trials');

// Key bindings: defaults from shortcuts.js plus the user's changes from the Ctrl+H panel.
function loadKeyOverrides() {
  const saved = store.get('keybinds')
  return saved && typeof saved === 'object' ? saved : {}
}
let bindings = effectiveBindings(loadKeyOverrides())

// Menu items show their action's current shortcut but don't register it: the renderer
// handles every key (see shortcuts.js) so each shortcut has exactly one code path.
function accel(actionId) {
  const combo = (bindings[actionId] || [])[0]
  return combo ? { accelerator: toAccelerator(combo), registerAccelerator: false } : {}
}

let windowIsReady = false;

app.whenReady().then(() => {
  const mainWin = createWindow()
  let contextMenu = new Menu()
  let recentSubmenu = new Menu()

  const windowState = {
    locked: false,
    clickThrough: false,
    scenePath: null,
  }

  mainWin.on('ready-to-show', () => {
    mainWin.show();
  });
  mainWin.webContents.on('did-finish-load', () => {
    loadMostRecent()
  });

  function hud(message) {
    mainWin.webContents.send('hud', message)
  }
  function runInRenderer(id) {
    return () => mainWin.webContents.send('run-action', id)
  }

  /* ---------------- clipboard ---------------- */

  function handlePaste() {
    let payload = {}
    var formats = clipboard.availableFormats();
    var text = formats.indexOf('text/plain') > -1 ? clipboard.readText() : ''
    var rawFilePath = clipboard.read('FileNameW');

    if (text.startsWith(CLIPBOARD_PREFIX)) {
      try {
        payload.type = 'animref'
        payload.animref = JSON.parse(text.slice(CLIPBOARD_PREFIX.length))
      } catch (err) {
        payload = {}
      }
    } else if (rawFilePath) {
      var filePath = rawFilePath.replace(new RegExp(String.fromCharCode(0), 'g'), '');
      payload.type = 'filePath'
      payload.filePath = filePath
    } else if (formats.indexOf('image/png') > -1) {
      const img = clipboard.readImage();
      payload.type = 'dataURL'
      payload.dataURL = img.toDataURL().replace('png', 'gif')
    } else if (text) {
      if (validateUrl(text)) {
        payload.type = 'filePath'
        payload.filePath = text
      } else {
        payload.type = 'text'
        payload.text = text
      }
    }
    mainWin.webContents.send('clipboard', JSON.stringify(payload))
  }

  function writeClipboard({ text, imagePath }) {
    const data = { text }
    if (imagePath) {
      let image = null
      if (imagePath.startsWith('data:')) image = nativeImage.createFromDataURL(imagePath.replace('image/gif', 'image/png'))
      else if (!/^https?:/i.test(imagePath)) image = nativeImage.createFromPath(imagePath)
      if (image && !image.isEmpty()) data.image = image
    }
    clipboard.write(data)
  }

  /* ---------------- scenes ---------------- */

  function addToRecent(filePath) {
    var recent = JSON.parse(store.get('recent') || "[]")
    let index = recent.indexOf(filePath)
    let exists = index != -1
    if (exists) {
      recent.splice(index, 1)
    }
    recent.push(filePath)
    store.set('recent', JSON.stringify(recent));
    if (!exists) {
      recentSubmenu.append(new MenuItem({
        label: filePath,
        click: (menuItem) => {
          readAndLoadFilePath(menuItem.label)
        }
      }))
    }
  }
  function populateRecent() {
    var recent = JSON.parse(store.get('recent') || "[]")
    for (const recentfile of recent) {
      recentSubmenu.append(new MenuItem({
        label: recentfile,
        click: (menuItem) => {
          readAndLoadFilePath(menuItem.label)
        }
      }))
    }
  }
  function loadMostRecent() {
    var recent = JSON.parse(store.get('recent') || "[]")
    if (recent.length > 0)
      readAndLoadFilePath(recent[recent.length - 1])
    else
      hud('No recent scenes')
  }

  function readAndLoadFilePath(filePath) {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        hud('Could not open ' + path.basename(filePath))
        return
      }
      let newState = JSON.parse(data);
      windowState.scenePath = filePath
      mainWin.webContents.send('load-scene', newState, filePath)
    });
  }

  function openSceneDialog() {
    dialog.showOpenDialog(mainWin, {
      properties: ['openFile'],
      filters: SCENE_FILTERS
    }).then(result => {
      if (!result.canceled) {
        readAndLoadFilePath(result.filePaths[0])
      }
    }).catch(err => console.log(err))
  }

  // mode: 'save' (reuse current file), 'save-as', or 'export' (write a copy, keep current file)
  async function saveScene({ mode, scene }) {
    let filePath = mode == 'save' ? windowState.scenePath : null
    if (!filePath) {
      const result = await dialog.showSaveDialog(mainWin, {
        defaultPath: windowState.scenePath || 'scene.purgif',
        filters: SCENE_FILTERS
      })
      if (result.canceled || !result.filePath) return
      filePath = result.filePath
    }
    fs.writeFileSync(filePath, JSON.stringify(scene));
    if (mode != 'export') {
      windowState.scenePath = filePath
      addToRecent(filePath)
    }
    hud((mode == 'export' ? 'Exported to ' : 'Saved ') + path.basename(filePath))
  }

  async function openImages() {
    const result = await dialog.showOpenDialog(mainWin, {
      properties: ['openFile', 'multiSelections'],
      filters: MEDIA_FILTERS
    })
    if (!result.canceled) mainWin.webContents.send('add-files', result.filePaths)
  }

  function openSource({ path: source, type }) {
    if (!source || type == 'text' || source.startsWith('data:')) {
      hud('This item has no source file')
    } else if (/^https?:/i.test(source)) {
      shell.openExternal(source)
    } else {
      shell.showItemInFolder(source)
    }
  }

  function uniquePath(dir, name) {
    const ext = path.extname(name)
    const base = path.basename(name, ext) || 'image'
    let candidate = path.join(dir, base + ext)
    for (let i = 2; fs.existsSync(candidate); i++) candidate = path.join(dir, `${base} (${i})${ext}`)
    return candidate
  }

  async function exportImages({ items, skipped }) {
    const result = await dialog.showOpenDialog(mainWin, {
      title: 'Export images to folder',
      properties: ['openDirectory', 'createDirectory'],
    })
    if (result.canceled || !result.filePaths.length) return
    const dir = result.filePaths[0]
    let exported = 0
    let failed = skipped || 0
    for (const [index, item] of items.entries()) {
      try {
        if (item.path.startsWith('data:')) {
          const base64 = item.path.split(',')[1]
          fs.writeFileSync(uniquePath(dir, `pasted-${index + 1}.png`), Buffer.from(base64, 'base64'))
        } else if (/^https?:/i.test(item.path)) {
          const response = await net.fetch(item.path)
          if (!response.ok) throw new Error(response.status)
          const name = item.name || `image-${index + 1}`
          fs.writeFileSync(uniquePath(dir, name), Buffer.from(await response.arrayBuffer()))
        } else {
          fs.copyFileSync(item.path, uniquePath(dir, path.basename(item.path)))
        }
        exported++
      } catch (err) {
        console.log('export failed', item.path, err)
        failed++
      }
    }
    hud(`Exported ${exported} file${exported == 1 ? '' : 's'}` + (failed ? ` (${failed} skipped)` : ''))
  }

  /* ---------------- window ---------------- */

  function setAlwaysOnTop(on) {
    mainWin.setAlwaysOnTop(on)
    contextMenu.getMenuItemById('always-on-top').checked = on
    hud('Always on top ' + (on ? 'on' : 'off'))
  }

  function setWindowLocked(on) {
    windowState.locked = on
    mainWin.setMovable(!on)
    mainWin.setResizable(!on)
    contextMenu.getMenuItemById('lock-window').checked = on
    hud(on ? 'Window locked' : 'Window unlocked')
  }

  let clickThroughShortcut = null
  function setClickThrough(on) {
    windowState.clickThrough = on
    mainWin.setIgnoreMouseEvents(on, { forward: true })
    contextMenu.getMenuItemById('click-through').checked = on
    if (clickThroughShortcut && globalShortcut.isRegistered(clickThroughShortcut)) globalShortcut.unregister(clickThroughShortcut)
    clickThroughShortcut = null
    if (on) {
      // The window no longer gets clicks (or focus), so listen system-wide to turn it back off.
      const combo = (bindings['transparent-to-mouse'] || [])[0] || 'Ctrl+KeyT'
      clickThroughShortcut = toAccelerator(combo)
      let registered = false
      try {
        registered = globalShortcut.register(clickThroughShortcut, () => setClickThrough(false))
      } catch (err) {
        registered = false
      }
      if (registered) {
        hud(`Click-through on — press ${displayKey(combo, isMac)} anywhere to turn it off`)
      } else {
        clickThroughShortcut = null
        mainWin.setIgnoreMouseEvents(false)
        windowState.clickThrough = false
        contextMenu.getMenuItemById('click-through').checked = false
        hud(`Couldn't use ${displayKey(combo, isMac)} system-wide, so click-through stayed off`)
      }
    } else {
      hud('Click-through off')
    }
  }

  function changeOpacity(delta) {
    const next = Math.min(Math.max(Math.round((mainWin.getOpacity() + delta) * 10) / 10, 0.1), 1)
    mainWin.setOpacity(next)
    hud(`Window opacity ${Math.round(next * 100)}%` + (process.platform == 'linux' ? ' (not supported on Linux)' : ''))
  }

  function resizeTo({ x, y, w, h }) {
    if (windowState.locked) return hud('Window is locked (Ctrl+W)')
    if (mainWin.isMaximized()) mainWin.unmaximize()
    const bounds = mainWin.getBounds()
    const newBounds = {
      x: Math.round(bounds.x + x),
      y: Math.round(bounds.y + y),
      width: Math.max(Math.round(w), 120),
      height: Math.max(Math.round(h), 80),
    }
    mainWin.setBounds(newBounds)
    width = newBounds.width
    height = newBounds.height
    mainWin.webContents.send('shift-view', -x, -y)
  }

  function toggleMaximize() {
    if (!mainWin.isMaximized()) mainWin.maximize();
    else mainWin.unmaximize();
  }

  const mainActions = {
    'write-clipboard': writeClipboard,
    'save': saveScene,
    'open-scene': openSceneDialog,
    'open-recent': loadMostRecent,
    'open-images': openImages,
    'open-scene-location': () => {
      if (windowState.scenePath) shell.showItemInFolder(windowState.scenePath)
      else hud('This scene hasn\'t been saved yet')
    },
    'open-source': openSource,
    'export-images': exportImages,
    'scene-cleared': () => { windowState.scenePath = null },
    'toggle-always-on-top': () => setAlwaysOnTop(!mainWin.isAlwaysOnTop()),
    'toggle-lock-window': () => setWindowLocked(!windowState.locked),
    'toggle-click-through': () => setClickThrough(!windowState.clickThrough),
    'window-opacity': changeOpacity,
    'resize-to': resizeTo,
    'toggle-maximize': toggleMaximize,
    'minimize': () => mainWin.minimize(),
    'close': () => mainWin.close(),
    'devtools': () => mainWin.webContents.toggleDevTools(),
  }

  ipcMain.on('main-action', (event, name, payload) => {
    const action = mainActions[name]
    if (!action) return
    Promise.resolve(action(payload)).catch(err => {
      console.log('main action failed', name, err)
      hud('Something went wrong: ' + name)
    })
  })

  /* ---------------- context menu ---------------- */

  // Rebuilt whenever key bindings change so the shortcut hints stay correct.
  function buildMenu() {
    const menu = new Menu()
    const arrangeSubmenu = new Menu()
    const windowSubmenu = new Menu()
    recentSubmenu = new Menu()
    contextMenu = menu

    menu.append(new MenuItem({
      id: "close-edit-video", label: 'Close Edit Video', visible: false, ...accel('escape'),
      click: () => mainWin.webContents.send('close-edit-video')
    }));
    menu.append(new MenuItem({
      id: "edit-video", label: 'Edit Video', visible: false, ...accel('edit-item'),
      click: () => mainWin.webContents.send('edit-video')
    }));
    menu.append(new MenuItem({ label: 'Paste', ...accel('paste'), click: handlePaste }));
    menu.append(new MenuItem({ label: 'Copy', ...accel('copy'), click: runInRenderer('copy') }));
    menu.append(new MenuItem({ label: 'Duplicate', ...accel('duplicate'), click: runInRenderer('duplicate') }));
    menu.append(new MenuItem({ label: 'Undo', ...accel('undo'), click: runInRenderer('undo') }));
    menu.append(new MenuItem({ label: 'Redo', ...accel('redo'), click: runInRenderer('redo') }));
    menu.append(new MenuItem({ type: 'separator' }))

    menu.append(new MenuItem({ label: 'Arrange', type: 'submenu', submenu: arrangeSubmenu }))
    arrangeSubmenu.append(new MenuItem({ label: 'Arrange optimal', ...accel('arrange-optimal'), click: runInRenderer('arrange-optimal') }))
    arrangeSubmenu.append(new MenuItem({ label: 'Arrange by name', ...accel('arrange-name'), click: runInRenderer('arrange-name') }))
    arrangeSubmenu.append(new MenuItem({ label: 'Arrange by addition', ...accel('arrange-addition'), click: runInRenderer('arrange-addition') }))
    arrangeSubmenu.append(new MenuItem({ label: 'Arrange randomly', ...accel('arrange-random'), click: runInRenderer('arrange-random') }))
    arrangeSubmenu.append(new MenuItem({ label: 'Pack all and optimize', ...accel('pack-all'), click: runInRenderer('pack-all') }))
    arrangeSubmenu.append(new MenuItem({ type: 'separator' }))
    arrangeSubmenu.append(new MenuItem({ label: 'Flip horizontally', ...accel('flip-horizontal'), click: runInRenderer('flip-horizontal') }))
    arrangeSubmenu.append(new MenuItem({ label: 'Toggle grayscale', ...accel('toggle-grayscale'), click: runInRenderer('toggle-grayscale') }))
    arrangeSubmenu.append(new MenuItem({ label: 'Toggle locked', ...accel('toggle-locked'), click: runInRenderer('toggle-locked') }))
    arrangeSubmenu.append(new MenuItem({ label: 'Reset transform', ...accel('reset-transform'), click: runInRenderer('reset-transform') }))

    menu.append(new MenuItem({ label: 'Pause All Videos', ...accel('pause-all'), click: runInRenderer('pause-all') }))
    menu.append(new MenuItem({ label: 'Play All Videos', ...accel('play-all'), click: runInRenderer('play-all') }))
    menu.append(new MenuItem({ type: 'separator' }))

    menu.append(new MenuItem({
      id: 'always-on-top', label: 'Always on Top', type: 'checkbox', checked: mainWin.isAlwaysOnTop(), ...accel('always-on-top'),
      click: (menuItem) => setAlwaysOnTop(menuItem.checked)
    }));
    menu.append(new MenuItem({
      id: 'lock-window', label: 'Lock Window', type: 'checkbox', checked: windowState.locked, ...accel('lock-window'),
      click: (menuItem) => setWindowLocked(menuItem.checked)
    }));
    menu.append(new MenuItem({
      id: 'click-through', label: 'Transparent to Mouse', type: 'checkbox', checked: windowState.clickThrough, ...accel('transparent-to-mouse'),
      click: (menuItem) => setClickThrough(menuItem.checked)
    }));
    menu.append(new MenuItem({ type: 'separator' }))

    menu.append(new MenuItem({
      label: "Recent", type: 'submenu',
      submenu: recentSubmenu
    }));
    populateRecent()
    menu.append(new MenuItem({
      label: "Window", type: 'submenu',
      submenu: windowSubmenu
    }));
    windowSubmenu.append(new MenuItem({ label: "Maximize", ...accel('maximize'), click: toggleMaximize }));
    windowSubmenu.append(new MenuItem({ label: "Minimize", ...accel('minimize'), click: () => mainWin.minimize() }));
    windowSubmenu.append(new MenuItem({ label: "Resize to Selection", ...accel('resize-to-selection'), click: runInRenderer('resize-to-selection') }));
    menu.append(new MenuItem({ label: 'Open Scene', ...accel('open-scene'), click: openSceneDialog }));
    menu.append(new MenuItem({ label: 'Open Images', ...accel('open-images'), click: openImages }));
    menu.append(new MenuItem({ label: 'Save', ...accel('save'), click: runInRenderer('save') }));
    menu.append(new MenuItem({ label: 'Save As', ...accel('save-as'), click: runInRenderer('save-as') }));
    menu.append(new MenuItem({ label: 'New Scene', ...accel('new-scene'), click: runInRenderer('new-scene') }));
    menu.append(new MenuItem({ label: 'Shortcuts (edit keys)', ...accel('help'), click: runInRenderer('help') }));
    menu.append(new MenuItem({ label: 'Close', ...accel('close'), click: () => mainWin.close() }));

    // No application menu: on Windows/Linux a borderless window still gets an invisible
    // menu bar, and pressing Alt would activate it and swallow every following key.
    // The menu is only used as the right-click popup.
    Menu.setApplicationMenu(null)
  }
  buildMenu()

  ipcMain.on('get-keybinds', (event) => {
    event.returnValue = loadKeyOverrides()
  })
  ipcMain.on('set-keybinds', (event, overrides) => {
    store.set('keybinds', overrides || {})
    bindings = effectiveBindings(overrides)
    buildMenu()
  })

  if (process.argv.indexOf("debug") > -1)
    mainWin.webContents.openDevTools()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  ipcMain.on('ready', () => {
    windowIsReady = true;
  });
  ipcMain.on('show-context-menu', (event, menuType) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    contextMenu.getMenuItemById("edit-video").visible = false;
    contextMenu.getMenuItemById("close-edit-video").visible = false;
    if (menuType == 'youtube' || menuType == 'video') {
      contextMenu.getMenuItemById("edit-video").visible = true;
    } else if (menuType == 'edit-video') {
      contextMenu.getMenuItemById("close-edit-video").visible = true;
    }
    contextMenu.popup({
      window: win,
      // hand the keyboard back to the page so shortcuts keep working after the menu closes
      callback: () => {
        if (!win.isDestroyed()) {
          win.focus()
          win.webContents.focus()
        }
      },
    })
  })
  ipcMain.on('handle-paste', () => {
    handlePaste()
  })
  ipcMain.on('loaded-state', (event, filePath) => {
    addToRecent(filePath)
  })
  ipcMain.on('record-window-size', () => {
    width = mainWin.getSize()[0]
    height = mainWin.getSize()[1]
  })
  ipcMain.on('move-electron-window', (event, x, y, initPos) => {
    if (windowState.locked || mainWin.isMaximized()) return
    // positions can be fractional on scaled (high-DPI) screens; Electron needs whole numbers
    const nx = Math.round(x - initPos.x)
    const ny = Math.round(y - initPos.y)
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) return
    mainWin.setPosition(nx, ny)
  })
})

// Log unexpected errors instead of showing Electron's blocking error dialog.
process.on('uncaughtException', (err) => {
  console.error('Unexpected error in main process:', err)
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function validateUrl(value) {
  return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
}

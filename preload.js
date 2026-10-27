const {
  ipcRenderer,
  contextBridge,
} = require('electron')

const interact = require('./interact.min.js')
const {
  SHORTCUTS, MOUSE_CONTROLS, MODIFIER_CODES,
  displayKey, comboFromEvent, normalizeCombo, defaultBindings, effectiveBindings, buildKeyMap,
} = require('./shortcuts.js')

const isMac = process.platform === 'darwin'

// Key bindings: defaults from shortcuts.js plus the user's changes from the Ctrl+H panel.
// Saved in the page's own storage, so the window process isn't involved.
const KEYBINDS_STORAGE = 'animref-keybinds'
let keyOverrides = {}
try {
  keyOverrides = JSON.parse(window.localStorage.getItem(KEYBINDS_STORAGE) || '{}') || {}
} catch (err) {
  keyOverrides = {}
}
let bindings = effectiveBindings(keyOverrides)
let keyMap = buildKeyMap(bindings)
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|ogv|mkv)$/i
const CLIPBOARD_PREFIX = 'animref-clipboard:'

let state = {
  mode: 'init', // 'init', 'standard', 'edit-video'
  editVideo: {

  },
  currentScale: 1,
  translate: {
    translateX: 0,
    translateY: 0
  },
  elements: [

  ],
  workspaceRect: {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
  },
  canvasLocked: false,
}

/* ------------------------------------------------------------------ *
 * Edit video (loop editor)
 * ------------------------------------------------------------------ */

function closeEditVideo() {
  state.mode = 'standard'
  updateScaleAndTranslate(state.editVideo.backupState.currentScale, state.editVideo.backupState.translate)
  state.editVideo.video.element.className = state.editVideo.backupState.elementClasses
  document.querySelector('#root').classList.remove('disableBorder')
  document.querySelector('#editVideoTools').classList.add('hide')
  state.editVideo = {}
}

function editVideo(video) {
  if (!video || (video.type != 'video' && video.type != 'youtube')) return
  state.mode = 'edit-video'
  document.querySelector('#root').style.cursor = ""
  state.editVideo.video = video
  state.editVideo.backupState = {
    currentScale: state.currentScale,
    translate: Object.assign({}, state.translate),
    elementClasses: video.element.className
  }
  updateScaleAndTranslate(1, {
    translateX: 0,
    translateY: 0
  })

  video.element.className = "editVideo"
  document.querySelector('#root').classList.add('disableBorder')
  document.querySelector('#editVideoTools').classList.remove('hide')

  document.getElementById('eventTrigger').dataset.changesliders = JSON.stringify(video.loopPairs[video.activeLoopPair])

  if (video.type == 'youtube') {
    state.editVideo.videoElement = document.querySelector('.editVideo iframe').contentDocument.querySelector('video')
  } else {
    state.editVideo.videoElement = document.querySelector('.editVideo')
  }
}

function onPlayerProgress(e) {
  let sliderPositions = document.querySelectorAll('.noUi-handle')
  let leftSliderPercent = Math.min(sliderPositions[0]['ariaValueText'], sliderPositions[1]['ariaValueText'])
  let rightSliderPercent = Math.max(sliderPositions[0]['ariaValueText'], sliderPositions[1]['ariaValueText'])
  let sliderElement = document.querySelector('#slider')
  let currentTimePercent = (this.currentTime / this.duration * 100)

  if (this != state.editVideo.videoElement) {

    let leftPercent = parseFloat(this.dataset.loopLeft)
    let rightPercent = parseFloat(this.dataset.loopRight)
    if (leftPercent > currentTimePercent) {
      this.currentTime = percentToCurrentTime(leftPercent, this.duration)
      currentTimePercent = (this.currentTime / this.duration * 100)
    }
    if (rightPercent < currentTimePercent) {
      this.currentTime = percentToCurrentTime(leftPercent, this.duration)
      currentTimePercent = (this.currentTime / this.duration * 100)
    }
    return;
  }

  state.editVideo.video.loopPairs[state.editVideo.video.activeLoopPair][0] = leftSliderPercent
  state.editVideo.video.loopPairs[state.editVideo.video.activeLoopPair][1] = rightSliderPercent
  this.dataset.loopLeft = leftSliderPercent
  this.dataset.loopRight = rightSliderPercent

  if (sliderElement.classList.contains('noUi-state-drag')) {
    dragPercent = parseFloat(sliderElement.querySelector('.noUi-active')['ariaValueNow'])
    this.currentTime = percentToCurrentTime(dragPercent, this.duration)
  } else {
    if (leftSliderPercent > currentTimePercent) {
      this.currentTime = percentToCurrentTime(leftSliderPercent, this.duration)
      currentTimePercent = (this.currentTime / this.duration * 100)
    }
    if (rightSliderPercent < currentTimePercent) {
      if (sliderElement.classList.contains('noUi-state-drag')) {
        this.currentTime = percentToCurrentTime(rightSliderPercent, this.duration)
      } else
        this.currentTime = percentToCurrentTime(leftSliderPercent, this.duration)

      currentTimePercent = (this.currentTime / this.duration * 100)
    }
  }
  let progressBarWidth = sliderElement.getBoundingClientRect().width
  let progressBarTimePosition = progressBarWidth * (currentTimePercent / 100)
  document.getElementById('progressbar').style.transform = `translateX(${progressBarTimePosition}px)`
}

function percentToCurrentTime(percent, duration) {
  if (percent >= 100) return duration
  if (percent <= 0) return 0
  return (percent * duration) / 100
}

/* ------------------------------------------------------------------ *
 * Scene
 * ------------------------------------------------------------------ */

function newScene() {
  if (state.mode == 'edit-video') closeEditVideo()
  document.getElementById('itemHolder').innerHTML = ''
  updateScaleAndTranslate(1, {
    translateX: 0,
    translateY: 0
  });
  initWorkspace()
  refreshWorkspace()

  state.elements = []
  history.undo = []
  history.redo = []
  updateWelcome()
}

function loadState(loadedState, filePath) {
  if (state.mode == 'init')
    init();

  newScene()
  updateScaleAndTranslate(loadedState.currentScale, loadedState.translate)

  setTimeout(function () {
    for (var i in loadedState.elements) {
      const item = loadedState.elements[i]
      if (item.addedAt == null) item.addedAt = Number(i)
      addMediaWithPath(item.path, item.type, item)
    }
    ipcRenderer.send('loaded-state', filePath)
  }, 1000);
}

function serializeObj(o) {
  const box = getBox(o)
  return JSON.parse(JSON.stringify({
    id: o.id,
    path: o.path,
    type: o.type,
    x: box.x,
    y: box.y,
    width: box.w || o.width,
    height: box.h || o.height,
    loopPairs: o.loopPairs,
    activeLoopPair: o.activeLoopPair,
    flipH: !!o.flipH,
    flipV: !!o.flipV,
    rotation: o.rotation || 0,
    opacity: o.opacity == null ? 1 : o.opacity,
    grayscale: !!o.grayscale,
    locked: !!o.locked,
    pixelated: !!o.pixelated,
    addedAt: o.addedAt,
  }))
}

function serializeScene(objs) {
  return {
    currentScale: state.currentScale,
    translate: Object.assign({}, state.translate),
    workspaceRect: Object.assign({}, state.workspaceRect),
    elements: objs.map(serializeObj),
  }
}

function updateWelcome() {
  document.querySelector('#welcome').classList.toggle('hide', state.elements.length > 0)
}

/* ------------------------------------------------------------------ *
 * Undo / redo
 * ------------------------------------------------------------------ */

const history = { undo: [], redo: [] }
const HISTORY_LIMIT = 100

function snapshot() {
  return {
    items: state.elements.map(serializeObj),
    selected: getSelectedObjs().map(o => o.id),
  }
}

function pushUndo() {
  history.undo.push(snapshot())
  if (history.undo.length > HISTORY_LIMIT) history.undo.shift()
  history.redo = []
}

function applyProps(o, item) {
  for (const key of ['flipH', 'flipV', 'rotation', 'opacity', 'grayscale', 'locked', 'pixelated', 'addedAt']) {
    o[key] = item[key]
  }
  if (item.loopPairs) {
    o.loopPairs = JSON.parse(JSON.stringify(item.loopPairs))
    o.activeLoopPair = item.activeLoopPair || 0
  }
  if (item.width > 0 && item.height > 0) setSize(o, item.width, item.height)
  setPos(o, item.x, item.y)
}

function restore(snap) {
  if (state.mode == 'edit-video') closeEditVideo()
  const keep = new Set(snap.items.map(i => i.id))
  for (const o of [...state.elements]) {
    if (!keep.has(o.id)) o.element.remove()
  }
  const byId = new Map(state.elements.map(o => [o.id, o]))
  const ordered = []
  for (const item of snap.items) {
    let o = byId.get(item.id)
    if (o) applyProps(o, item)
    else o = addMediaWithPath(item.path, item.type, JSON.parse(JSON.stringify(item)))
    if (o) ordered.push(o)
  }
  state.elements = ordered
  reindex()
  clearAllSelected()
  const selected = new Set(snap.selected)
  for (const o of ordered) if (selected.has(o.id)) setSelected(o, true)
  updateWelcome()
}

function undo() {
  if (!history.undo.length) return hud('Nothing to undo')
  history.redo.push(snapshot())
  restore(history.undo.pop())
  hud('Undo')
}

function redo() {
  if (!history.redo.length) return hud('Nothing to redo')
  history.undo.push(snapshot())
  restore(history.redo.pop())
  hud('Redo')
}

/* ------------------------------------------------------------------ *
 * Keyboard
 * ------------------------------------------------------------------ */

let mouseObj = {
  initPos: null,
  initClientPos: null,
  dragging: false,
  space: false,
  spaceUsed: false,
  spaceWithCtrl: false,
  keys: new Object(),
}

document.addEventListener('keydown', evt => {
  mouseObj.keys[evt.code] = true

  if (capture) {
    handleCapture(evt)
    return
  }
  const combo = comboFromEvent(evt, isMac)
  if (helpIsOpen()) {
    // Typing in the search box shouldn't trigger shortcuts.
    const typing = evt.target && evt.target.tagName == 'INPUT'
    if (evt.code === 'Escape' || (!typing && keyMap.get(combo)?.id == 'help')) {
      evt.preventDefault()
      closeHelp()
    }
    return
  }
  if (slideshow.timer) {
    stopSlideshow()
    if (evt.code === 'Escape') { evt.preventDefault(); return }
  }

  if (evt.code === 'Space') {
    // Space actions fire on release, so holding Space + dragging can still pan.
    evt.preventDefault()
    if (!evt.repeat) {
      mouseObj.space = true
      mouseObj.spaceUsed = false
      mouseObj.spaceCombo = combo
    }
    return
  }

  const shortcut = keyMap.get(combo)
  if (!shortcut) return
  evt.preventDefault()
  if (evt.repeat && !shortcut.repeat) return
  if (state.mode == 'edit-video' && !shortcut.inEdit) return
  runAction(shortcut.id)
});

document.addEventListener('keyup', evt => {
  mouseObj.keys[evt.code] = false
  if (evt.code === 'Space' && mouseObj.space) {
    mouseObj.space = false
    if (!mouseObj.spaceUsed && !helpIsOpen()) {
      const shortcut = keyMap.get(mouseObj.spaceCombo)
      if (shortcut && (state.mode != 'edit-video' || shortcut.inEdit)) runAction(shortcut.id)
    }
  }
})

window.addEventListener('blur', () => {
  mouseObj.keys = {}
  mouseObj.space = false
})

function runAction(id) {
  const action = actions[id]
  if (!action) return
  try {
    action()
  } catch (err) {
    console.error('action failed', id, err)
    hud('Could not ' + id.replace(/-/g, ' '))
  }
}

function mainAction(name, payload) {
  ipcRenderer.send('main-action', name, payload)
}

/* ------------------------------------------------------------------ *
 * Selection
 * ------------------------------------------------------------------ */

function objFromElement(el) {
  while (el && el !== document.body) {
    const found = state.elements.find(o => o.element === el)
    if (found) return found
    el = el.parentElement
  }
  return null
}

function isSelected(o) {
  return o.element.classList.contains('selectedItem')
}

function getSelectedObjs() {
  return state.elements.filter(isSelected)
}

function setSelected(o, on) {
  o.element.classList.toggle('selectedItem', on)
  o.element.classList.toggle('draggable', !on)
}

function clearAllSelected() {
  state.elements.forEach(o => setSelected(o, false))
}

function selectOnly(o) {
  clearAllSelected()
  setSelected(o, true)
}

// Single selected item, used by the context menu
function getSelected() {
  if (document.querySelector('.editVideo')) return { type: 'edit-video' }
  const selected = getSelectedObjs()
  return selected.length == 1 ? selected[0] : null
}

function reindex() {
  state.elements.forEach((o, i) => {
    o.element.style.zIndex = i
    o.element.dataset.zIndex = i
  })
}

function bringToFront(objs) {
  const set = new Set(objs)
  state.elements = state.elements.filter(o => !set.has(o)).concat(state.elements.filter(o => set.has(o)))
  reindex()
}

function sendToBack(objs) {
  const set = new Set(objs)
  state.elements = state.elements.filter(o => set.has(o)).concat(state.elements.filter(o => !set.has(o)))
  reindex()
}

function isBackground(target) {
  if (!target) return false
  if (target === document.documentElement || target === document.body) return true
  if (target.id == 'workspaceBox' || target.id == 'itemHolder') return true
  return !!(target.closest && target.closest('#welcome'))
}

/* ------------------------------------------------------------------ *
 * Mouse
 * ------------------------------------------------------------------ */

function isPanModifier(e) {
  return e && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey
}

function isMouseInBlockingState(e) {
  return mouseObj.space || mouseObj.keys['KeyZ'] || isPanModifier(e)
}

let marquee = null

document.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  if (mouseObj.dragging) {
    mouseObj.dragging = false;
    return;
  }
})

document.addEventListener('mousedown', (e) => {
  mouseObj.initPos = { x: e.clientX, y: e.clientY }
  mouseObj.initClientPos = { x: e.screenX, y: e.screenY }
  mouseObj.initTranslate = { x: (parseFloat(document.body.dataset.translateX) || 0), y: (parseFloat(document.body.dataset.translateY) || 0) }
  ipcRenderer.send('record-window-size', window.innerHeight, window.innerHeight)
  mouseObj.dragging = false
  if (slideshow.timer) stopSlideshow()

  if (e.button == 0 && state.mode != 'edit-video' && isBackground(e.target)) {
    if (isMouseInBlockingState(e) || state.canvasLocked) return
    marquee = {
      x0: e.clientX,
      y0: e.clientY,
      base: new Set(e.shiftKey ? getSelectedObjs() : []),
      additive: e.shiftKey,
      moved: false,
      div: null,
    }
  }
})

document.addEventListener('mousemove', (e) => {
  if (marquee && (e.buttons & 1)) {
    updateMarquee(e)
    return
  }

  if (e.buttons == 1 && mouseObj.space && (e.ctrlKey || e.metaKey)) {
    // ctrl + space + drag = zoom
    mouseObj.spaceUsed = true
    handleZoom(e.movementX, mouseObj.initPos.x, mouseObj.initPos.y)
    e.preventDefault()
  } else if (e.buttons == 1 && mouseObj.keys['KeyZ']) {
    // Z + drag = zoom
    handleZoom(e.movementX, mouseObj.initPos.x, mouseObj.initPos.y)
    e.preventDefault()
  } else if (e.buttons == 1 && (mouseObj.space || isPanModifier(e) || state.canvasLocked)) {
    if (mouseObj.space) mouseObj.spaceUsed = true
    e.preventDefault()
    handleMove(e.movementX, e.movementY)
  } else if (e.buttons == 4) { // middle mouse drag = move
    e.preventDefault()
    handleMove(e.movementX, e.movementY)
  } else if (e.buttons == 2) {
    e.preventDefault()
    ipcRenderer.send('move-electron-window', e.screenX, e.screenY, mouseObj.initPos)
    mouseObj.dragging = true;
  }
})

function updateMarquee(e) {
  const dx = e.clientX - marquee.x0
  const dy = e.clientY - marquee.y0
  if (!marquee.moved && Math.hypot(dx, dy) < 4) return
  if (!marquee.div) {
    marquee.div = document.createElement('div')
    marquee.div.id = 'marquee'
    document.documentElement.appendChild(marquee.div)
  }
  marquee.moved = true
  const left = Math.min(marquee.x0, e.clientX)
  const top = Math.min(marquee.y0, e.clientY)
  const right = Math.max(marquee.x0, e.clientX)
  const bottom = Math.max(marquee.y0, e.clientY)
  Object.assign(marquee.div.style, {
    left: left + 'px', top: top + 'px', width: (right - left) + 'px', height: (bottom - top) + 'px'
  })
  for (const o of state.elements) {
    const r = o.element.getBoundingClientRect()
    const hit = r.right > left && r.left < right && r.bottom > top && r.top < bottom
    setSelected(o, marquee.base.has(o) || hit)
  }
}

function endMarquee() {
  if (!marquee) return
  if (marquee.div) marquee.div.remove()
  if (!marquee.moved && !marquee.additive) clearAllSelected()
  marquee = null
}

function handleMove(dX, dY) {
  currentScale = parseFloat(document.body.dataset.currentScale) || 1

  let translateX = (parseFloat(document.body.dataset.translateX) || 0);
  let translateY = (parseFloat(document.body.dataset.translateY) || 0);
  translateX += dX
  translateY += dY

  updateScaleAndTranslate(currentScale, { translateX, translateY })
}

function handleZoom(_delta, clientX, clientY) {
  if (document.querySelector('.editVideo')) return;
  currentScale = parseFloat(document.body.dataset.currentScale) || 1
  let delta = _delta / 60

  const nextScale = Math.min(Math.max(currentScale + delta * (currentScale / 2), 0.01), 2)
  zoomAround(nextScale, clientX, clientY)
}

function zoomAround(nextScale, clientX, clientY) {
  const current = state.currentScale || 1
  const ratio = 1 - nextScale / current
  let translateX = state.translate.translateX + (clientX - state.translate.translateX) * ratio
  let translateY = state.translate.translateY + (clientY - state.translate.translateY) * ratio
  updateScaleAndTranslate(nextScale, { translateX, translateY })
}

document.addEventListener('mouseup', (e) => {
  if (e.button == 0) endMarquee()
  if (e.button == 2) {
    if (mouseObj.dragging) {
      const distance = Math.sqrt(
        Math.pow(e.screenX - mouseObj.initClientPos.x, 2)
        +
        Math.pow(e.screenY - mouseObj.initClientPos.y, 2));
      if (distance < 4) {
        ipcRenderer.send('show-context-menu', getSelected()?.type || "void")
      }
      mouseObj.dragging = false;

    } else {
      ipcRenderer.send('show-context-menu', getSelected()?.type || "void")
    }
  }
})

// Alt+scroll steps video frames. In the loop editor, plain scroll does too.
let wheelAccumulator = 0
window.addEventListener('wheel', (e) => {
  if (helpIsOpen()) {
    e.stopPropagation()
    return
  }
  const inEdit = state.mode == 'edit-video'
  if (!e.altKey && !inEdit) return
  let videos
  if (inEdit) {
    videos = videoTargets()
  } else {
    const hovered = objFromElement(e.target)
    videos = hovered && isVideoObj(hovered) ? [getVideoEl(hovered)].filter(Boolean) : videoTargets()
  }
  e.preventDefault()
  e.stopPropagation()
  if (!videos.length) return
  // One frame per mouse-wheel notch; small trackpad deltas add up to a frame.
  const delta = e.deltaY || e.deltaX
  wheelAccumulator = Math.abs(delta) >= 40 ? delta : wheelAccumulator + delta
  if (Math.abs(wheelAccumulator) >= 40) {
    stepFrames(wheelAccumulator > 0 ? 1 : -1, videos)
    wheelAccumulator = 0
  }
}, { capture: true, passive: false })

/* ------------------------------------------------------------------ *
 * IPC from main
 * ------------------------------------------------------------------ */

ipcRenderer.on('close-edit-video', () => {
  closeEditVideo()
})
ipcRenderer.on('edit-video', () => {
  editVideo(getSelected())
})
ipcRenderer.on('new-scene', () => {
  newScene()
})
ipcRenderer.on('load-scene', (event, newState, filePath) => {
  loadState(newState, filePath)
})
ipcRenderer.on('run-action', (event, id) => {
  runAction(id)
})
ipcRenderer.on('hud', (event, message) => {
  hud(message)
})
ipcRenderer.on('shift-view', (event, dx, dy) => {
  handleMove(dx, dy)
})
ipcRenderer.on('add-files', (event, paths) => {
  if (!paths || !paths.length) return
  pushUndo()
  for (const p of paths) addMediaWithPath(p, mediaTypeForPath(p))
})
ipcRenderer.on('clipboard', (event, msg) => {
  let payload = JSON.parse(msg);
  if (payload.type == 'animref') {
    pasteItems(payload.animref)
    return
  }
  if (!payload.type) return
  pushUndo()
  if (/youtube.com\/.*v=([^\?]*)/.test(payload[payload.type])) {
    addMediaWithPath(payload[payload.type], "youtube")
  } else
    addMediaWithPath(payload[payload.type], payload.type)
})

/* ------------------------------------------------------------------ *
 * Adding media
 * ------------------------------------------------------------------ */

function getCenterOfWindowScaled() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const widthScaled = (width / 2) / state.currentScale;
  const heightScaled = (height / 2) / state.currentScale;
  return {
    centerX: (-state.translate.translateX / state.currentScale) + widthScaled,
    centerY: (-state.translate.translateY / state.currentScale) + heightScaled
  };
}

function mediaTypeForPath(p) {
  if (/youtube.com\/.*v=([^\?]*)/.test(p) || /youtu\.be\//.test(p)) return 'youtube'
  if (VIDEO_EXTENSIONS.test(p)) return 'video'
  return 'img'
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function addMediaWithPath(path, type = 'img', loadedState) {
  const isNewElement = loadedState == null
  let centerWin = getCenterOfWindowScaled();
  loadedState = loadedState || { x: centerWin.centerX, y: centerWin.centerY, width: null, height: null }
  if (state.mode == 'init') init();
  updateWelcome()
  document.querySelector('#welcome').classList.add("hide");
  let itemHolder = document.getElementById('itemHolder')

  let mediaObj = undefined
  let mediaElement = undefined
  if (type == 'img' || type == 'dataURL' || type == 'filePath') {
    mediaElement = document.createElement('img')
    mediaElement.addEventListener('load', function loaded() {
      let { x, y, width, height } = this.getClientRects()[0]
      if (isNewElement) {
        mediaObj.loading = false
        setTransformForElement(mediaElement.dataset.zIndex, -width / 2, -height / 2, width, height)
      }
      resizeWorkspaceToFitObj(loadedState.x, loadedState.y, width, height)
    })
    mediaElement.src = path;
  } else if (type == 'video') {
    mediaElement = document.createElement('video')
    mediaElement.autoplay = true;
    mediaElement.loop = true;
    mediaElement.muted = true;

    let srcElement = document.createElement('source')
    srcElement.src = path;
    mediaElement.appendChild(srcElement)
  } else if (type == 'youtube') {
    if (/youtube.com\/.*v=([^\?]*)/.test(path)) {

      var code = extractYoutubeId(path)
      if (code == null) return;
      mediaElement = document.createElement('div')
      mediaElement.classList.add('youtubePlayer')
      mediaElement.classList.add('playerNeedsSetup')
      mediaElement.dataset.idcode = code

      mediaElement.style.width = (loadedState.width || 640) + "px";
      mediaElement.style.height = (loadedState.height || 360) + "px";

      var iframeDiv = document.createElement('div')
      iframeDiv.classList.add('iframeDiv')
      mediaElement.appendChild(iframeDiv)
      document.getElementById('eventTrigger').dataset.youtubetrigger = Date.now()
    } else {
      return
    }
  } else if (type == "text") {
    mediaElement = document.createElement('div')
    mediaElement.classList.add('textElement')
    mediaElement.innerText = path

    if (isNewElement) {
      const { width: newWidth, height: newHeight } = adjustFontSize2(mediaElement, path)
      loadedState.x = centerWin.centerX - (newWidth / state.currentScale / 2)
      loadedState.y = centerWin.centerY - (newHeight / state.currentScale / 2)

      loadedState.width = newWidth
      loadedState.height = newHeight
    } else {
      const { width: newWidth, height: newHeight } = adjustFontSize2(mediaElement, path, loadedState.width)
      mediaElement.style.width = loadedState.width + "px";
      mediaElement.style.height = newHeight + "px";
      loadedState.width = newWidth
      loadedState.height = newHeight
    }
    mediaElement.width = loadedState.width
    mediaElement.height = loadedState.height

  } else {
    alert('unsupported media type')
    return;
  }
  mediaElement.classList.add('draggable')

  const zIndex = state.elements.length;
  mediaElement.style.zIndex = zIndex
  mediaElement.dataset.zIndex = zIndex
  mediaElement.dataset.x = loadedState.x
  mediaElement.dataset.y = loadedState.y
  if (loadedState.width != null && loadedState.height != null) {
    mediaElement.width = loadedState.width
    mediaElement.height = loadedState.height
  }
  mediaObj = {
    id: loadedState.id || newId(),
    path: path,
    type: type,
    element: mediaElement,
    width: loadedState.width,
    height: loadedState.height,
    addedAt: loadedState.addedAt != null ? loadedState.addedAt : Date.now(),
    flipH: !!loadedState.flipH,
    flipV: !!loadedState.flipV,
    rotation: loadedState.rotation || 0,
    opacity: loadedState.opacity == null ? 1 : loadedState.opacity,
    grayscale: !!loadedState.grayscale,
    locked: !!loadedState.locked,
    pixelated: !!loadedState.pixelated,
    loading: isNewElement && mediaElement.tagName == 'IMG',
  }
  if (type == 'youtube' || type == 'video') {
    mediaObj.loopPairs = loadedState.loopPairs || [[0, 100]] // 0% & 100% positions for loop
    mediaObj.activeLoopPair = loadedState.activeLoopPair || 0
  }

  state.elements.push(mediaObj)
  if (type == 'video') {
    mediaObj.element.dataset.loopLeft = mediaObj.loopPairs[mediaObj.activeLoopPair][0]
    mediaObj.element.dataset.loopRight = mediaObj.loopPairs[mediaObj.activeLoopPair][1]
    mediaObj.element.addEventListener('timeupdate', onPlayerProgress)
    trackFrameRate(mediaObj.element)
  }

  itemHolder.appendChild(mediaElement)
  setTransformForElement(zIndex)
  return mediaObj
}

function adjustFontSize2(mediaElement, text, maxWidth = window.innerWidth) {
  const temp = document.createElement('div')
  temp.style.fontSize = '1ch' // 1ch is the width of the 0 character
  temp.style.position = 'absolute'
  temp.style.opacity = 0
  temp.style.color = "white"
  temp.style.whiteSpace = "nowrap"
  temp.innerText = text
  document.getElementById('hiddenTextTester').appendChild(temp)
  let { width: widthOnDom, height: heightOnDom } = temp.getClientRects()[0]
  document.getElementById('hiddenTextTester').removeChild(temp)

  const fontScaleFactor = (maxWidth / widthOnDom)
  const newWidth = maxWidth
  const newHeight = (heightOnDom * fontScaleFactor)
  mediaElement.style.opacity = 1
  mediaElement.style.fontSize = fontScaleFactor * state.currentScale + "ch"
  mediaElement.style.width = newWidth + "px";
  mediaElement.style.height = newHeight + "px";

  return { width: newWidth, height: newHeight }
}

document.addEventListener('drop', (event) => {
  event.preventDefault();
  event.stopPropagation();
  if (!event.dataTransfer.files.length) return
  pushUndo()
  for (const f of event.dataTransfer.files) {
    addMediaWithPath(f.path, mediaTypeForPath(f.path))
  }
});

function init() {
  state.mode = 'standard'
}

document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

function extractYoutubeId(path) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
  var capture = path.match(regExp)
  return capture ? capture[7] : null
}

/* ------------------------------------------------------------------ *
 * Camera
 * ------------------------------------------------------------------ */

const MAX_SCALE = 2
const MIN_SCALE = 0.01

function clampWorkspaceTranslate(ratio, newTranslate) {
  let { translateX, translateY } = newTranslate

  let windowElement = document.getElementById('root')
  let windowWidth = windowElement.clientWidth
  let windowHeight = windowElement.clientHeight

  if (-(translateX) > state.workspaceRect.x2 * ratio) { //workspace off screen to left
    translateX = -(state.workspaceRect.x2 * ratio)
  }
  else if ((translateX) + (state.workspaceRect.x1 * ratio) > windowWidth) { // workspace off screen to right
    translateX = windowWidth - (state.workspaceRect.x1 * ratio)
  }

  if (-(translateY) > state.workspaceRect.y2 * ratio) { // workspace off screen to top
    translateY = -(state.workspaceRect.y2 * ratio)
  }
  else if ((translateY) + (state.workspaceRect.y1 * ratio) > windowHeight) { // workspace off screen to bottom
    translateY = windowHeight - (state.workspaceRect.y1 * ratio)
  }
  return { translateX: translateX, translateY: translateY }
}

function updateScaleAndTranslate(newScale, newTranslate) {
  if (newScale > MAX_SCALE) {
    state.currentScale = MAX_SCALE
    return;
  }

  newTranslate = clampWorkspaceTranslate(newScale, newTranslate)
  state.currentScale = newScale
  state.translate = newTranslate
  document.body.style.transform = `translate(${state.translate.translateX}px, ${state.translate.translateY}px) scale(${state.currentScale})`
  document.body.dataset.currentScale = state.currentScale
  document.body.dataset.translateX = state.translate.translateX
  document.body.dataset.translateY = state.translate.translateY
  const ROOTCSS = document.querySelector(':root');
  ROOTCSS.style.setProperty('--scale', newScale);
}

function boundsOf(objs) {
  const boxes = objs.map(getBox).filter(b => b.w > 0 && b.h > 0)
  if (!boxes.length) return null
  const x1 = Math.min(...boxes.map(b => b.x))
  const y1 = Math.min(...boxes.map(b => b.y))
  const x2 = Math.max(...boxes.map(b => b.x + b.w))
  const y2 = Math.max(...boxes.map(b => b.y + b.h))
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }
}

function fitBounds(b) {
  if (!b) return
  const W = window.innerWidth
  const H = window.innerHeight
  const scale = Math.min(Math.max(Math.min(W / b.w, H / b.h) * 0.94, MIN_SCALE), MAX_SCALE)
  updateScaleAndTranslate(scale, {
    translateX: W / 2 - scale * (b.x + b.w / 2),
    translateY: H / 2 - scale * (b.y + b.h / 2),
  })
}

function focusCanvas() {
  fitBounds(boundsOf(state.elements))
}

function focusSelection() {
  const selected = getSelectedObjs()
  if (!selected.length) return focusCanvas()
  fitBounds(boundsOf(selected))
}

function focusStep(dir) {
  const ordered = [...state.elements].sort((a, b) => a.addedAt - b.addedAt)
  if (!ordered.length) return
  const current = getSelectedObjs()[0]
  let index = current ? ordered.indexOf(current) + dir : (dir > 0 ? 0 : ordered.length - 1)
  index = (index + ordered.length) % ordered.length
  selectOnly(ordered[index])
  fitBounds(boundsOf([ordered[index]]))
}

function zoomBy(factor) {
  const next = Math.min(Math.max(state.currentScale * factor, MIN_SCALE), MAX_SCALE)
  zoomAround(next, window.innerWidth / 2, window.innerHeight / 2)
}

/* ------------------------------------------------------------------ *
 * Item geometry
 * ------------------------------------------------------------------ */

function getBox(o) {
  const el = o.element
  return {
    x: parseFloat(el.dataset.x) || 0,
    y: parseFloat(el.dataset.y) || 0,
    w: el.offsetWidth,
    h: el.offsetHeight,
  }
}

function applyTransform(o) {
  const el = o.element
  const x = parseFloat(el.dataset.x) || 0
  const y = parseFloat(el.dataset.y) || 0
  let transform = `translate(${x}px, ${y}px)`
  if (o.rotation) transform += ` rotate(${o.rotation}deg)`
  if (o.flipH || o.flipV) transform += ` scale(${o.flipH ? -1 : 1}, ${o.flipV ? -1 : 1})`
  el.style.transform = transform
  el.style.opacity = o.loading ? 0 : (o.opacity == null ? 1 : o.opacity)
  el.style.filter = o.grayscale ? 'grayscale(1)' : ''
  el.style.imageRendering = o.pixelated ? 'pixelated' : ''
  el.classList.toggle('lockedItem', !!o.locked)
}

function setPos(o, x, y) {
  const el = o.element
  el.dataset.x = x
  el.dataset.y = y
  o.x = x
  o.y = y
  applyTransform(o)
  resizeWorkspaceToFitObj(x, y, el.offsetWidth, el.offsetHeight)
}

function setSize(o, w, h) {
  const el = o.element
  if (o.type == 'text') adjustFontSize2(el, el.innerText, w * state.currentScale)
  o.width = w
  o.height = h
  el.style.width = w + 'px'
  el.style.height = h + 'px'
}

function naturalSize(o) {
  const el = o.element
  if (o.type == 'video' && el.videoWidth) return { w: el.videoWidth, h: el.videoHeight }
  if (el.tagName == 'IMG' && el.naturalWidth) return { w: el.naturalWidth, h: el.naturalHeight }
  if (o.type == 'youtube') {
    const v = getVideoEl(o)
    if (v && v.videoWidth) return { w: v.videoWidth, h: v.videoHeight }
    return { w: 640, h: 360 }
  }
  return { w: el.offsetWidth, h: el.offsetHeight }
}

function resizeWorkspaceToFitObj(x, y, width, height) {
  if (width == 0 || height == 0) return
  state.workspaceRect.x1 = Math.min(x, state.workspaceRect.x1)
  state.workspaceRect.y1 = Math.min(y, state.workspaceRect.y1)

  state.workspaceRect.x2 = Math.max(x + width, state.workspaceRect.x2)
  state.workspaceRect.y2 = Math.max(y + height, state.workspaceRect.y2)
  refreshWorkspace()
}

function initWorkspace() {
  state.workspaceRect = {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0
  }
}

function refreshWorkspace() {
  const element = document.getElementById('workspaceBox');
  element.style.left = state.workspaceRect.x1 + "px";
  element.style.top = state.workspaceRect.y1 + "px";
  element.style.width = (state.workspaceRect.x2 - state.workspaceRect.x1) + "px"
  element.style.height = (state.workspaceRect.y2 - state.workspaceRect.y1) + "px"
}

function setTransformForElement(elementIndex, dx = 0, dy = 0, width = null, height = null) {
  let elementObj = state.elements[elementIndex]
  let x = (parseFloat(elementObj.element.dataset.x) || 0) + (dx / state.currentScale)
  let y = (parseFloat(elementObj.element.dataset.y) || 0) + (dy / state.currentScale)

  if (width != null && height != null) {
    elementObj.width = width / state.currentScale
    elementObj.height = height / state.currentScale
    elementObj.element.style.width = width / state.currentScale + 'px'
    elementObj.element.style.height = height / state.currentScale + 'px'
  }
  setPos(elementObj, x, y)
}

function forceRedraw() {
  if (document.body.parentElement.style.backgroundColor == '') {
    document.body.parentElement.style.backgroundColor = '#04040400'
  } else {
    document.body.parentElement.style.backgroundColor = ''
  }
}

/* ------------------------------------------------------------------ *
 * Dragging: move, axis move, rotate, scale, opacity
 * ------------------------------------------------------------------ */

let drag = null

function pointer(event) {
  return { x: event.clientX ?? event.client?.x, y: event.clientY ?? event.client?.y }
}

function onDragStart(event) {
  drag = { mode: 'none' }
  const target = objFromElement(event.target)
  if (!target || state.mode == 'edit-video') return
  if (isMouseInBlockingState(event) || state.canvasLocked) return

  const ctrl = event.ctrlKey || event.metaKey
  const alt = event.altKey
  const shift = event.shiftKey

  if (!isSelected(target)) {
    if (shift) setSelected(target, true)
    else {
      selectOnly(target)
      bringToFront([target])
    }
  }
  const items = getSelectedObjs().filter(o => !o.locked)
  if (!items.length) {
    if (target.locked) hud('Item is locked (Alt+L to unlock)')
    return
  }

  let mode = 'move'
  if (ctrl && alt && shift) mode = 'opacity'
  else if (ctrl && alt) mode = 'scale'
  else if (ctrl) mode = 'rotate'
  else if (shift) mode = 'axis'

  pushUndo()
  const start = pointer(event)
  drag = {
    mode,
    snap: shift,
    start,
    items: items.map(o => {
      const r = o.element.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      return {
        o,
        box: getBox(o),
        rotation: o.rotation || 0,
        opacity: o.opacity == null ? 1 : o.opacity,
        cx,
        cy,
        angle0: Math.atan2(start.y - cy, start.x - cx),
      }
    }),
  }
}

function onDragMove(event) {
  if (!drag || drag.mode == 'none') return
  const p = pointer(event)
  let dx = p.x - drag.start.x
  let dy = p.y - drag.start.y
  const scale = state.currentScale

  if (drag.mode == 'axis') {
    if (Math.abs(dx) >= Math.abs(dy)) dy = 0
    else dx = 0
  }

  for (const it of drag.items) {
    const o = it.o
    if (drag.mode == 'move' || drag.mode == 'axis') {
      setPos(o, it.box.x + dx / scale, it.box.y + dy / scale)
    } else if (drag.mode == 'rotate') {
      const angle = Math.atan2(p.y - it.cy, p.x - it.cx)
      let rotation = it.rotation + (angle - it.angle0) * 180 / Math.PI
      if (drag.snap) rotation = Math.round(rotation / 15) * 15
      o.rotation = ((rotation % 360) + 360) % 360
      applyTransform(o)
    } else if (drag.mode == 'scale') {
      const factor = Math.min(Math.max(Math.exp((dx - dy) / 250), 0.02), 50)
      const w = Math.max(it.box.w * factor, 4)
      const h = Math.max(it.box.h * factor, 4)
      setSize(o, w, h)
      setPos(o, it.box.x + (it.box.w - w) / 2, it.box.y + (it.box.h - h) / 2)
    } else if (drag.mode == 'opacity') {
      o.opacity = Math.min(Math.max(it.opacity + dx / 300, 0.05), 1)
      applyTransform(o)
    }
  }
  if (drag.mode == 'rotate') hud(Math.round(drag.items[0].o.rotation) + '°', 600)
  if (drag.mode == 'opacity') hud('Opacity ' + Math.round(drag.items[0].o.opacity * 100) + '%', 600)
  forceRedraw()
}

function onDragEnd() {
  drag = null
}

function onTap(event) {
  const target = objFromElement(event.target)
  if (!target || isMouseInBlockingState(event)) return
  if (event.button != null && event.button != 0) return
  if (event.shiftKey) {
    setSelected(target, !isSelected(target))
  } else {
    selectOnly(target)
    bringToFront([target])
  }
  event.preventDefault()
}

const dragListeners = { start: onDragStart, move: onDragMove, end: onDragEnd }

interact('.draggable')
  .draggable({
    listeners: dragListeners,
    inertia: false,
  }).on('tap', onTap)

let resizeBlocked = false
interact('.selectedItem').resizable({
  edges: { left: true, right: true, bottom: true, top: true },
  ratio: 1,
  enabled: true,
  margin: 4,
  listeners: [{
    start(event) {
      const o = objFromElement(event.target)
      resizeBlocked = !o || o.locked || state.canvasLocked || isMouseInBlockingState(event)
      if (!resizeBlocked) pushUndo()
    },
    move(event) {
      if (resizeBlocked || isMouseInBlockingState(event)) return;
      var target = event.target

      if (target.classList.contains('textElement')) {
        adjustFontSize2(target, target.innerText, event.rect.width)
      }
      setTransformForElement(target.dataset.zIndex, event.deltaRect.left, event.deltaRect.top, event.rect.width, event.rect.height)
      forceRedraw()
    }
  }],
  modifiers: [
    interact.modifiers.aspectRatio({
      ratio: 'preserve',
    }),
    interact.modifiers.restrictSize({
      min: { width: 10 }
    })
  ],
  inertia: true
}).draggable({
  listeners: dragListeners,
  inertia: false
}).on('tap', onTap)

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

function requireSelection(min = 1) {
  const selected = getSelectedObjs()
  if (selected.length < min) {
    hud(min == 1 ? 'Select an item first' : `Select ${min} or more items`)
    return null
  }
  return selected
}

function movable(objs) {
  return objs.filter(o => !o.locked)
}

function deleteSelected() {
  const selected = getSelectedObjs()
  const removable = movable(selected)
  if (!removable.length) {
    if (selected.length) hud('Locked items can\'t be deleted (Alt+L to unlock)')
    return
  }
  pushUndo()
  const set = new Set(removable)
  removable.forEach(o => o.element.remove())
  state.elements = state.elements.filter(o => !set.has(o))
  reindex()
  updateWelcome()
}

function copySelected() {
  const selected = requireSelection()
  if (!selected) return false
  const items = selected.map(serializeObj)
  const firstImage = selected.find(o => o.element.tagName == 'IMG')
  mainAction('write-clipboard', {
    text: CLIPBOARD_PREFIX + JSON.stringify(items),
    imagePath: firstImage ? firstImage.path : null,
  })
  hud(`Copied ${items.length} item${items.length == 1 ? '' : 's'}`)
  return true
}

function addItems(items, offsetX, offsetY) {
  const added = []
  const now = Date.now()
  items.forEach((item, i) => {
    const copy = JSON.parse(JSON.stringify(item))
    copy.id = newId()
    copy.addedAt = now + i
    copy.locked = false
    copy.x = (copy.x || 0) + offsetX
    copy.y = (copy.y || 0) + offsetY
    const o = addMediaWithPath(copy.path, copy.type, copy)
    if (o) added.push(o)
  })
  clearAllSelected()
  added.forEach(o => setSelected(o, true))
  return added
}

function pasteItems(items) {
  if (!items || !items.length) return
  pushUndo()
  const x1 = Math.min(...items.map(i => i.x || 0))
  const y1 = Math.min(...items.map(i => i.y || 0))
  const x2 = Math.max(...items.map(i => (i.x || 0) + (i.width || 0)))
  const y2 = Math.max(...items.map(i => (i.y || 0) + (i.height || 0)))
  const center = getCenterOfWindowScaled()
  addItems(items, center.centerX - (x1 + x2) / 2, center.centerY - (y1 + y2) / 2)
}

function itemName(o) {
  if (o.type == 'youtube') return extractYoutubeId(o.path) || o.path
  if (o.type == 'text' || String(o.path).startsWith('data:')) return ''
  const clean = decodeURIComponent(String(o.path).split(/[?#]/)[0])
  return clean.split(/[\\/]/).pop()
}

function arrangeItems(kind, objs) {
  let items = movable(objs).map(o => ({ o, box: getBox(o) })).filter(i => i.box.w > 0 && i.box.h > 0)
  if (!items.length) return
  const origin = boundsOf(items.map(i => i.o))
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

  if (kind == 'addition') items.sort((a, b) => a.o.addedAt - b.o.addedAt)
  else if (kind == 'name') items.sort((a, b) => collator.compare(itemName(a.o), itemName(b.o)))
  else if (kind == 'path') items.sort((a, b) => collator.compare(String(a.o.path), String(b.o.path)))
  else if (kind == 'order') items.sort((a, b) => state.elements.indexOf(a.o) - state.elements.indexOf(b.o))
  else if (kind == 'random') {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]]
    }
  } else if (kind == 'optimal') items.sort((a, b) => b.box.h - a.box.h)

  // Shelf packing: fill rows left to right, aiming for the window's aspect ratio.
  const totalArea = items.reduce((sum, i) => sum + i.box.w * i.box.h, 0)
  const aspect = window.innerWidth / window.innerHeight
  const rowWidth = Math.max(Math.max(...items.map(i => i.box.w)), Math.sqrt(totalArea * aspect))
  let x = 0, y = 0, rowHeight = 0
  for (const it of items) {
    if (x > 0 && x + it.box.w > rowWidth) {
      x = 0
      y += rowHeight
      rowHeight = 0
    }
    setPos(it.o, origin.x + x, origin.y + y)
    x += it.box.w
    rowHeight = Math.max(rowHeight, it.box.h)
  }
}

function arrange(kind) {
  const selected = getSelectedObjs()
  const targets = selected.length >= 2 ? selected : state.elements
  if (!targets.length) return
  pushUndo()
  arrangeItems(kind, targets)
  hud('Arranged ' + (kind == 'optimal' ? '' : 'by ' + kind))
}

function align(edge) {
  const selected = requireSelection(2)
  if (!selected) return
  pushUndo()
  const b = boundsOf(selected)
  for (const o of movable(selected)) {
    const box = getBox(o)
    if (edge == 'left') setPos(o, b.x, box.y)
    if (edge == 'right') setPos(o, b.x + b.w - box.w, box.y)
    if (edge == 'top') setPos(o, box.x, b.y)
    if (edge == 'bottom') setPos(o, box.x, b.y + b.h - box.h)
  }
}

function distribute(axis) {
  const selected = requireSelection(3)
  if (!selected) return
  pushUndo()
  const pos = axis == 'x' ? 'x' : 'y'
  const size = axis == 'x' ? 'w' : 'h'
  const items = selected.map(o => ({ o, box: getBox(o) })).sort((a, b) => a.box[pos] - b.box[pos])
  const first = items[0].box
  const last = items[items.length - 1].box
  const span = last[pos] + last[size] - first[pos]
  const used = items.reduce((sum, i) => sum + i.box[size], 0)
  const gap = (span - used) / (items.length - 1)
  // Equal gaps when the items fit side by side; otherwise space their centres evenly.
  const center = b => b[pos] + b[size] / 2
  if (gap < 0) items.sort((a, b) => center(a.box) - center(b.box))
  const firstCenter = center(items[0].box)
  const centerStep = (center(items[items.length - 1].box) - firstCenter) / (items.length - 1)
  let cursor = first[pos]
  items.forEach((it, i) => {
    const p = gap >= 0 ? cursor : firstCenter + centerStep * i - it.box[size] / 2
    if (!it.o.locked) {
      if (axis == 'x') setPos(it.o, p, it.box.y)
      else setPos(it.o, it.box.x, p)
    }
    cursor += it.box[size] + gap
  })
}

function normalize(kind) {
  const selected = requireSelection(2)
  if (!selected) return
  pushUndo()
  const items = movable(selected).map(o => ({ o, box: getBox(o), natural: naturalSize(o) })).filter(i => i.box.w > 0)
  const avg = values => values.reduce((a, b) => a + b, 0) / values.length
  const targetH = avg(items.map(i => i.box.h))
  const targetW = avg(items.map(i => i.box.w))
  const targetArea = avg(items.map(i => i.box.w * i.box.h))
  const targetScale = avg(items.map(i => i.box.w / i.natural.w))
  for (const it of items) {
    let factor = 1
    if (kind == 'height') factor = targetH / it.box.h
    if (kind == 'width') factor = targetW / it.box.w
    if (kind == 'size') factor = Math.sqrt(targetArea / (it.box.w * it.box.h))
    if (kind == 'scale') factor = (it.natural.w * targetScale) / it.box.w
    setSize(it.o, it.box.w * factor, it.box.h * factor)
    setPos(it.o, it.box.x, it.box.y)
  }
}

function overlay() {
  const selected = requireSelection(2)
  if (!selected) return
  pushUndo()
  const base = getBox(selected[0])
  const cx = base.x + base.w / 2
  const cy = base.y + base.h / 2
  selected.forEach((o, i) => {
    if (o.locked) return
    const box = getBox(o)
    setPos(o, cx - box.w / 2, cy - box.h / 2)
    if (i > 0) {
      o.opacity = 0.5
      applyTransform(o)
    }
  })
}

function stack() {
  const selected = requireSelection(2)
  if (!selected) return
  pushUndo()
  const base = getBox(selected[0])
  const step = 24 / state.currentScale
  movable(selected).forEach((o, i) => setPos(o, base.x + i * step, base.y + i * step))
}

function toggleFlag(key, label, onlyUnlocked) {
  const selected = requireSelection()
  if (!selected) return
  const targets = onlyUnlocked ? movable(selected) : selected
  if (!targets.length) return hud('Item is locked (Alt+L to unlock)')
  pushUndo()
  const turnOn = targets.some(o => !o[key])
  targets.forEach(o => {
    o[key] = turnOn
    applyTransform(o)
  })
  if (label) hud(label + (turnOn ? ' on' : ' off'))
}

function flip(axis) {
  const selected = requireSelection()
  if (!selected) return
  const targets = movable(selected)
  if (!targets.length) return
  pushUndo()
  const key = axis == 'h' ? 'flipH' : 'flipV'
  targets.forEach(o => {
    o[key] = !o[key]
    applyTransform(o)
  })
}

function resetTransform() {
  const selected = requireSelection()
  if (!selected) return
  pushUndo()
  for (const o of movable(selected)) {
    const box = getBox(o)
    const natural = naturalSize(o)
    o.rotation = 0
    o.flipH = false
    o.flipV = false
    if (o.type != 'text') setSize(o, natural.w, natural.h)
    setPos(o, box.x + (box.w - natural.w) / 2, box.y + (box.h - natural.h) / 2)
  }
}

function optimizeCanvas() {
  const b = boundsOf(state.elements)
  if (!b) {
    initWorkspace()
  } else {
    state.workspaceRect = { x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h }
  }
  refreshWorkspace()
}

function resizeToSelection() {
  const selected = requireSelection()
  if (!selected) return
  const rects = selected.map(o => o.element.getBoundingClientRect())
  const left = Math.min(...rects.map(r => r.left))
  const top = Math.min(...rects.map(r => r.top))
  const right = Math.max(...rects.map(r => r.right))
  const bottom = Math.max(...rects.map(r => r.bottom))
  mainAction('resize-to', { x: left, y: top, w: right - left, h: bottom - top })
}

const slideshow = { timer: null, items: [], index: 0 }

function startSlideshow() {
  const selected = getSelectedObjs()
  const items = (selected.length >= 2 ? selected : state.elements).slice().sort((a, b) => a.addedAt - b.addedAt)
  if (!items.length) return
  slideshow.items = items
  slideshow.index = 0
  const show = () => {
    fitBounds(boundsOf([slideshow.items[slideshow.index]]))
    slideshow.index = (slideshow.index + 1) % slideshow.items.length
  }
  show()
  slideshow.timer = setInterval(show, 3000)
  hud('Slideshow — press any key to stop')
}

function stopSlideshow() {
  clearInterval(slideshow.timer)
  slideshow.timer = null
}

function exportImages(objs) {
  const items = objs.filter(o => o.type != 'youtube' && o.type != 'text').map(o => ({ path: o.path, type: o.type, name: itemName(o) }))
  if (!items.length) return hud('No images to export')
  mainAction('export-images', { items, skipped: objs.length - items.length })
}

/* ------------------------------------------------------------------ *
 * Video playback
 * ------------------------------------------------------------------ */

const frameInfo = new WeakMap()
const PLAYBACK_RATES = [0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
const COMMON_FPS = [12, 15, 23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120]

function isVideoObj(o) {
  return o && (o.type == 'video' || o.type == 'youtube')
}

function getVideoEl(o) {
  if (o.type == 'video') return o.element
  try {
    return o.element.querySelector('iframe').contentDocument.querySelector('video')
  } catch (err) {
    return null
  }
}

function videoTargets() {
  if (state.mode == 'edit-video') return [state.editVideo.videoElement].filter(Boolean)
  const selected = getSelectedObjs().filter(isVideoObj)
  const objs = selected.length ? selected : state.elements.filter(isVideoObj)
  const videos = objs.map(getVideoEl).filter(Boolean)
  videos.forEach(trackFrameRate)
  return videos
}

// Learns each video's frame duration from the gaps between presented frames.
function trackFrameRate(video) {
  if (!video || frameInfo.has(video) || !video.requestVideoFrameCallback) return
  const info = { min: Infinity, last: null }
  frameInfo.set(video, info)
  const onFrame = (now, meta) => {
    if (info.last != null) {
      const d = meta.mediaTime - info.last
      if (d > 0.004 && d < 0.2) info.min = Math.min(info.min, d)
    }
    info.last = meta.mediaTime
    video.requestVideoFrameCallback(onFrame)
  }
  video.requestVideoFrameCallback(onFrame)
}

function frameDuration(video) {
  const info = frameInfo.get(video)
  if (!info || !isFinite(info.min)) return 1 / 30
  const fps = 1 / info.min
  const closest = COMMON_FPS.reduce((a, b) => Math.abs(b - fps) < Math.abs(a - fps) ? b : a)
  return 1 / (Math.abs(closest - fps) / fps < 0.08 ? closest : fps)
}

function formatTime(t) {
  const m = Math.floor(t / 60)
  const s = (t - m * 60).toFixed(2).padStart(5, '0')
  return `${m}:${s}`
}

function withVideos(fn) {
  const videos = videoTargets()
  if (!videos.length) {
    hud('No videos in the scene')
    return
  }
  fn(videos)
}

function stepFrames(dir, videos) {
  videos.forEach(v => {
    trackFrameRate(v)
    const fd = frameDuration(v)
    v.pause()
    const frame = Math.max(0, Math.floor(v.currentTime / fd + 1e-3) + dir)
    v.currentTime = Math.min((frame + 0.5) * fd, Math.max((v.duration || 0) - fd / 2, 0))
  })
  const v = videos[0]
  const fd = frameDuration(v)
  hud(`Frame ${Math.floor(v.currentTime / fd)} · ${formatTime(v.currentTime)}`, 900)
}

function playPause() {
  withVideos(videos => {
    const anyPlaying = videos.some(v => !v.paused)
    videos.forEach(v => anyPlaying ? v.pause() : v.play().catch(() => { }))
    hud(anyPlaying ? 'Paused' : 'Playing')
  })
}

// Selects every video in the scene and pauses (or plays) them all together.
function setAllVideosPlaying(play) {
  const objs = state.elements.filter(isVideoObj)
  if (state.mode != 'edit-video') {
    clearAllSelected()
    objs.forEach(o => setSelected(o, true))
  }
  const videos = state.mode == 'edit-video' ? videoTargets() : objs.map(getVideoEl).filter(Boolean)
  if (!videos.length) return hud('No videos in the scene')
  videos.forEach(v => play ? v.play().catch(() => { }) : v.pause())
  hud(`${play ? 'Playing' : 'Paused'} all ${videos.length} video${videos.length == 1 ? '' : 's'}`)
}

function seekBy(seconds) {
  withVideos(videos => {
    videos.forEach(v => {
      v.currentTime = Math.min(Math.max(v.currentTime + seconds, 0), v.duration || 0)
    })
    hud(formatTime(videos[0].currentTime), 900)
  })
}

function toggleMute() {
  withVideos(videos => {
    const mute = videos.some(v => !v.muted)
    videos.forEach(v => {
      v.muted = mute
      if (!mute && v.volume == 0) v.volume = 1
    })
    hud(mute ? 'Muted' : 'Sound on')
  })
}

function changeSpeed(dir) {
  withVideos(videos => {
    let rate = 1
    if (dir != 0) {
      const current = videos[0].playbackRate
      let index = PLAYBACK_RATES.findIndex(r => r >= current - 1e-6)
      if (index == -1) index = PLAYBACK_RATES.length - 1
      if (dir > 0 && PLAYBACK_RATES[index] <= current + 1e-6) index++
      if (dir < 0) index--
      rate = PLAYBACK_RATES[Math.min(Math.max(index, 0), PLAYBACK_RATES.length - 1)]
    }
    videos.forEach(v => {
      v.playbackRate = rate
    })
    hud(`Speed ${rate}×`)
  })
}

/* ------------------------------------------------------------------ *
 * On-screen feedback and help
 * ------------------------------------------------------------------ */

let hudTimer = null
function hud(message, duration = 1400) {
  let el = document.getElementById('hud')
  if (!el) {
    el = document.createElement('div')
    el.id = 'hud'
    document.documentElement.appendChild(el)
  }
  el.textContent = message
  el.classList.add('show')
  clearTimeout(hudTimer)
  hudTimer = setTimeout(() => el.classList.remove('show'), duration)
}

function helpIsOpen() {
  return !!document.getElementById('helpOverlay')
}

function closeHelp() {
  capture = null
  const el = document.getElementById('helpOverlay')
  if (el) el.remove()
}

/* ---- Key rebinding ---- */

// While set, the next key press is recorded as a binding: { id, index } (index -1 adds a new key).
let capture = null
const DEFAULTS = defaultBindings()
const LABELS = new Map(SHORTCUTS.map(s => [s.id, s.label]))

function saveBindings() {
  keyOverrides = {}
  for (const [id, keys] of Object.entries(bindings)) {
    if (JSON.stringify(keys) !== JSON.stringify(DEFAULTS[id])) keyOverrides[id] = keys
  }
  keyMap = buildKeyMap(bindings)
  try {
    window.localStorage.setItem(KEYBINDS_STORAGE, JSON.stringify(keyOverrides))
  } catch (err) {
    hud('Could not save shortcut changes')
  }
}

function assignKey(id, index, combo) {
  combo = normalizeCombo(combo)
  const moved = []
  for (const [otherId, keys] of Object.entries(bindings)) {
    if (otherId == id) continue
    if (keys.includes(combo)) {
      bindings[otherId] = keys.filter(k => k !== combo)
      moved.push(LABELS.get(otherId))
    }
  }
  const keys = [...bindings[id]]
  if (index >= 0 && index < keys.length) keys[index] = combo
  else keys.push(combo)
  bindings[id] = keys.filter((k, i) => keys.indexOf(k) === i)
  saveBindings()
  const name = displayKey(combo, isMac)
  hud(moved.length ? `${name} moved from “${moved.join('”, “')}”` : `${LABELS.get(id)}: ${name}`, 2600)
}

function removeKey(id, index) {
  bindings[id] = bindings[id].filter((k, i) => i != index)
  saveBindings()
  renderHelp()
}

function resetKeys(id) {
  if (id) {
    bindings[id] = [...DEFAULTS[id]]
    // a default key may have been given to another action; take it back
    for (const [otherId, keys] of Object.entries(bindings)) {
      if (otherId != id) bindings[otherId] = keys.filter(k => !DEFAULTS[id].includes(k))
    }
  } else {
    bindings = defaultBindings()
  }
  saveBindings()
  renderHelp()
  hud(id ? `Reset “${LABELS.get(id)}”` : 'All shortcuts reset to defaults')
}

function handleCapture(evt) {
  evt.preventDefault()
  evt.stopPropagation()
  if (MODIFIER_CODES.has(evt.code)) return // wait for the real key
  const target = capture
  capture = null
  if (evt.code === 'Escape') {
    renderHelp()
    return
  }
  assignKey(target.id, target.index, comboFromEvent(evt, isMac))
  renderHelp()
}

function startCapture(id, index) {
  capture = { id, index }
  renderHelp()
}

/* ---- Help overlay ---- */

let helpFilter = ''

function openHelp() {
  if (helpIsOpen()) return closeHelp()
  const overlay = document.createElement('div')
  overlay.id = 'helpOverlay'

  const header = document.createElement('div')
  header.className = 'helpHeader'
  const title = document.createElement('h2')
  title.textContent = 'Shortcuts'
  const search = document.createElement('input')
  search.type = 'search'
  search.placeholder = 'Search…'
  search.className = 'helpSearch'
  search.value = helpFilter
  search.addEventListener('input', () => {
    helpFilter = search.value
    renderHelp()
  })
  const resetAll = document.createElement('button')
  resetAll.className = 'helpButton'
  resetAll.textContent = 'Reset all'
  resetAll.addEventListener('click', () => resetKeys(null))
  const close = document.createElement('button')
  close.className = 'helpButton'
  close.textContent = 'Close'
  close.addEventListener('click', closeHelp)
  header.append(title, search, resetAll, close)

  const hint = document.createElement('p')
  hint.className = 'helpHint'
  hint.textContent = 'Click a key to change it, + to add another, × to remove. Changes are saved automatically. Playback keys act on selected videos, or all videos if none are selected.'
  const columns = document.createElement('div')
  columns.className = 'helpColumns'

  overlay.append(header, hint, columns)
  overlay.addEventListener('mousedown', e => e.stopPropagation())
  document.documentElement.appendChild(overlay)
  renderHelp()
}

function renderHelp() {
  const overlay = document.getElementById('helpOverlay')
  if (!overlay) return
  const columns = overlay.querySelector('.helpColumns')
  const scroll = overlay.scrollTop
  columns.textContent = ''
  const filter = helpFilter.trim().toLowerCase()

  const entries = [
    ...SHORTCUTS.map(s => ({ ...s, keys: bindings[s.id] || [] })),
    ...MOUSE_CONTROLS,
  ]
  const sections = new Map()
  for (const entry of entries) {
    const shown = entry.id ? entry.keys.map(k => displayKey(k, isMac)) : entry.keys
    if (filter && !(entry.label + ' ' + entry.section + ' ' + shown.join(' ')).toLowerCase().includes(filter)) continue
    if (!sections.has(entry.section)) sections.set(entry.section, [])
    sections.get(entry.section).push(entry)
  }

  for (const [name, list] of sections) {
    const section = document.createElement('section')
    const heading = document.createElement('h3')
    heading.textContent = name + (name == 'Mouse' ? ' (fixed)' : '')
    section.appendChild(heading)
    for (const entry of list) section.appendChild(helpRow(entry))
    columns.appendChild(section)
  }
  if (!sections.size) {
    const empty = document.createElement('p')
    empty.className = 'helpHint'
    empty.textContent = 'No shortcuts match.'
    columns.appendChild(empty)
  }
  overlay.scrollTop = scroll
}

function helpRow(entry) {
  const row = document.createElement('div')
  row.className = 'helpRow'
  const label = document.createElement('span')
  label.className = 'helpLabel'
  label.textContent = entry.label
  const keys = document.createElement('span')
  keys.className = 'helpKeys'
  row.append(label, keys)

  if (!entry.id) {
    for (const text of entry.keys) {
      const kbd = document.createElement('kbd')
      kbd.textContent = text
      keys.appendChild(kbd)
    }
    return row
  }

  const id = entry.id
  entry.keys.forEach((combo, index) => {
    const chip = document.createElement('span')
    chip.className = 'keyChip'
    const kbd = document.createElement('kbd')
    const listening = capture && capture.id == id && capture.index == index
    kbd.textContent = listening ? 'Press keys…' : displayKey(combo, isMac)
    kbd.classList.toggle('listening', !!listening)
    kbd.title = 'Click to change'
    kbd.addEventListener('click', () => startCapture(id, index))
    const remove = document.createElement('button')
    remove.className = 'keyRemove'
    remove.textContent = '×'
    remove.title = 'Remove this key'
    remove.addEventListener('click', () => removeKey(id, index))
    chip.append(kbd, remove)
    keys.appendChild(chip)
  })

  const adding = capture && capture.id == id && capture.index == -1
  const add = document.createElement('button')
  add.className = 'keyAdd' + (adding ? ' listening' : '')
  add.textContent = adding ? 'Press keys…' : (entry.keys.length ? '+' : '+ Add key')
  add.title = 'Add a key'
  add.addEventListener('click', () => startCapture(id, -1))
  keys.appendChild(add)

  if (JSON.stringify(entry.keys) !== JSON.stringify(DEFAULTS[id])) {
    row.classList.add('changed')
    const reset = document.createElement('button')
    reset.className = 'keyReset'
    reset.textContent = '↺'
    reset.title = 'Reset to default (' + DEFAULTS[id].map(k => displayKey(k, isMac)).join(', ') + ')'
    reset.addEventListener('click', () => resetKeys(id))
    keys.appendChild(reset)
  }
  return row
}

/* ------------------------------------------------------------------ *
 * Action table (ids match shortcuts.js)
 * ------------------------------------------------------------------ */

const actions = {
  // scene & files
  'new-scene': () => {
    newScene()
    mainAction('scene-cleared')
  },
  'open-scene': () => mainAction('open-scene'),
  'open-recent': () => mainAction('open-recent'),
  'open-scene-location': () => mainAction('open-scene-location'),
  'open-images': () => mainAction('open-images'),
  'open-source': () => {
    const selected = requireSelection()
    if (selected) mainAction('open-source', { path: selected[0].path, type: selected[0].type })
  },
  'save': () => mainAction('save', { mode: 'save', scene: serializeScene(state.elements) }),
  'save-as': () => mainAction('save', { mode: 'save-as', scene: serializeScene(state.elements) }),
  'export-scene': () => mainAction('save', { mode: 'export', scene: serializeScene(state.elements) }),
  'export-selected-scene': () => {
    const selected = requireSelection()
    if (selected) mainAction('save', { mode: 'export', scene: serializeScene(selected) })
  },
  'export-all-images': () => exportImages(state.elements),
  'export-selected-images': () => {
    const selected = requireSelection()
    if (selected) exportImages(selected)
  },

  // edit
  'undo': undo,
  'redo': redo,
  'copy': copySelected,
  'cut': () => {
    if (copySelected()) deleteSelected()
  },
  'paste': () => ipcRenderer.send('handle-paste'),
  'duplicate': () => {
    const selected = requireSelection()
    if (!selected) return
    pushUndo()
    const offset = 20 / state.currentScale
    addItems(selected.map(serializeObj), offset, offset)
  },
  'delete': deleteSelected,
  'select-all': () => state.elements.forEach(o => setSelected(o, true)),
  'escape': () => {
    if (marquee) return endMarquee()
    if (state.mode == 'edit-video') return closeEditVideo()
    clearAllSelected()
  },
  'edit-item': () => {
    const selected = getSelectedObjs()
    if (selected.length == 1 && isVideoObj(selected[0])) editVideo(selected[0])
    else hud('Select one video to edit its loop')
  },

  // arrange
  'align-left': () => align('left'),
  'align-right': () => align('right'),
  'align-top': () => align('top'),
  'align-bottom': () => align('bottom'),
  'distribute-horizontal': () => distribute('x'),
  'distribute-vertical': () => distribute('y'),
  'arrange-optimal': () => arrange('optimal'),
  'arrange-addition': () => arrange('addition'),
  'arrange-name': () => arrange('name'),
  'arrange-order': () => arrange('order'),
  'arrange-path': () => arrange('path'),
  'arrange-random': () => arrange('random'),
  'pack-all': () => {
    if (!state.elements.length) return
    pushUndo()
    arrangeItems('optimal', state.elements)
    optimizeCanvas()
    focusCanvas()
  },
  'optimize-canvas': () => {
    optimizeCanvas()
    hud('Canvas optimized')
  },
  'normalize-height': () => normalize('height'),
  'normalize-width': () => normalize('width'),
  'normalize-size': () => normalize('size'),
  'normalize-scale': () => normalize('scale'),
  'overlay': overlay,
  'stack': stack,
  'send-to-front': () => {
    const selected = requireSelection()
    if (!selected) return
    pushUndo()
    bringToFront(selected)
  },
  'send-to-back': () => {
    const selected = requireSelection()
    if (!selected) return
    pushUndo()
    sendToBack(selected)
  },

  // image
  'flip-horizontal': () => flip('h'),
  'flip-vertical': () => flip('v'),
  'toggle-grayscale': () => toggleFlag('grayscale', 'Grayscale'),
  'toggle-sampling': () => toggleFlag('pixelated', 'Pixelated sampling'),
  'toggle-locked': () => toggleFlag('locked', 'Locked'),
  'reset-transform': resetTransform,

  // view
  'focus-selection': focusSelection,
  'focus-canvas': focusCanvas,
  'focus-next': () => focusStep(1),
  'focus-prev': () => focusStep(-1),
  'zoom-in': () => zoomBy(1.25),
  'zoom-out': () => zoomBy(1 / 1.25),
  'reset-zoom': () => zoomAround(1, window.innerWidth / 2, window.innerHeight / 2),
  'toggle-grid': () => {
    const on = document.getElementById('workspaceBox').classList.toggle('showGrid')
    hud('Grid ' + (on ? 'on' : 'off'))
  },
  'grayscale-canvas': () => {
    const holder = document.getElementById('itemHolder')
    const on = !holder.classList.contains('grayscaleCanvas')
    holder.classList.toggle('grayscaleCanvas', on)
    hud('Grayscale canvas ' + (on ? 'on' : 'off'))
  },
  'slideshow': startSlideshow,
  'lock-canvas': () => {
    state.canvasLocked = !state.canvasLocked
    document.documentElement.classList.toggle('canvasLocked', state.canvasLocked)
    hud(state.canvasLocked ? 'Canvas locked — drag to pan' : 'Canvas unlocked')
  },
  'help': openHelp,

  // window (handled in main.js)
  'always-on-top': () => mainAction('toggle-always-on-top'),
  'lock-window': () => mainAction('toggle-lock-window'),
  'transparent-to-mouse': () => mainAction('toggle-click-through'),
  'opacity-up': () => mainAction('window-opacity', 0.1),
  'opacity-down': () => mainAction('window-opacity', -0.1),
  'resize-to-selection': resizeToSelection,
  'maximize': () => mainAction('toggle-maximize'),
  'minimize': () => mainAction('minimize'),
  'close': () => mainAction('close'),
  'devtools': () => mainAction('devtools'),

  // video playback
  'play-pause': playPause,
  'pause-all': () => setAllVideosPlaying(false),
  'play-all': () => setAllVideosPlaying(true),
  'frame-back': () => withVideos(videos => stepFrames(-1, videos)),
  'frame-forward': () => withVideos(videos => stepFrames(1, videos)),
  'seek-back': () => seekBy(-5),
  'seek-forward': () => seekBy(5),
  'toggle-mute': toggleMute,
  'speed-down': () => changeSpeed(-1),
  'speed-up': () => changeSpeed(1),
  'speed-reset': () => changeSpeed(0),
}

/* ------------------------------------------------------------------ *
 * Bridge to renderer.js
 * ------------------------------------------------------------------ */

contextBridge.exposeInMainWorld('myAPI', {
  updateScaleAndTranslate: updateScaleAndTranslate,
  updateYoutubeOriginalSize: (idcode, w, h) => {
    for (var i in state.elements) {
      if (state.elements[i].type == 'youtube' && extractYoutubeId(state.elements[i].path) == idcode) {

        state.elements[i].width = state.elements[i].width || w;
        state.elements[i].height = state.elements[i].height || h;

        state.elements[i].element.style.width = state.elements[i].width
        state.elements[i].element.style.height = state.elements[i].height

        let videoElement = state.elements[i].element.querySelector('iframe').contentDocument.querySelector('video');
        videoElement.dataset.loopLeft = state.elements[i].loopPairs[state.elements[i].activeLoopPair][0]
        videoElement.dataset.loopRight = state.elements[i].loopPairs[state.elements[i].activeLoopPair][1]
        videoElement.addEventListener('timeupdate', onPlayerProgress)
        trackFrameRate(videoElement)
      }
    }
  },
})

window.addEventListener('load', () => {
  setTimeout(function () {
    ipcRenderer.send('ready')
  }, 2000);
});

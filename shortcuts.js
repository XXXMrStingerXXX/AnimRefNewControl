// Single source of truth for AnimRef's keyboard shortcuts.
// Keys follow AnimRefNewControl's Windows/Linux layout
// plus AnimRef's own video playback keys. "Ctrl" means Cmd on macOS.
//
// Each key combo is written with KeyboardEvent.code names joined by "+",
// e.g. "Ctrl+Shift+KeyZ", "Ctrl+Alt+ArrowLeft", "BracketLeft".
// `repeat: true` lets the action fire again while the key is held down.
// `inEdit: true` keeps the action available while the Edit Video view is open.

const SHORTCUTS = [
  // --- Scene & files ---
  { id: 'new-scene', section: 'Scene & files', label: 'New scene', keys: ['Ctrl+KeyK'] },
  { id: 'open-scene', section: 'Scene & files', label: 'Open scene', keys: ['Ctrl+KeyL'] },
  { id: 'open-recent', section: 'Scene & files', label: 'Open most recent', keys: ['Ctrl+Shift+KeyL'] },
  { id: 'open-scene-location', section: 'Scene & files', label: 'Open scene location', keys: ['Ctrl+Alt+KeyL'] },
  { id: 'open-images', section: 'Scene & files', label: 'Open images / videos', keys: ['Ctrl+KeyI'] },
  { id: 'open-source', section: 'Scene & files', label: 'Open source of selected', keys: ['Ctrl+Shift+KeyO'] },
  { id: 'save', section: 'Scene & files', label: 'Save', keys: ['Ctrl+KeyS'] },
  { id: 'save-as', section: 'Scene & files', label: 'Save as', keys: ['Ctrl+Shift+KeyS'] },
  { id: 'export-scene', section: 'Scene & files', label: 'Export scene (copy)', keys: ['Ctrl+KeyE'] },
  { id: 'export-selected-scene', section: 'Scene & files', label: 'Export selected as scene', keys: ['Ctrl+Shift+KeyE'] },
  { id: 'export-all-images', section: 'Scene & files', label: 'Export all images', keys: ['Ctrl+Alt+KeyI'] },
  { id: 'export-selected-images', section: 'Scene & files', label: 'Export selected images', keys: ['Ctrl+Shift+KeyI'] },

  // --- Edit ---
  { id: 'undo', section: 'Edit', label: 'Undo', keys: ['Ctrl+KeyZ'], repeat: true },
  { id: 'redo', section: 'Edit', label: 'Redo', keys: ['Ctrl+Shift+KeyZ'], repeat: true },
  { id: 'copy', section: 'Edit', label: 'Copy', keys: ['Ctrl+KeyC'] },
  { id: 'cut', section: 'Edit', label: 'Cut', keys: ['Ctrl+KeyX'] },
  { id: 'paste', section: 'Edit', label: 'Paste', keys: ['Ctrl+KeyV'] },
  { id: 'duplicate', section: 'Edit', label: 'Duplicate', keys: ['Ctrl+KeyD'] },
  { id: 'delete', section: 'Edit', label: 'Delete', keys: ['Delete', 'Backspace'] },
  { id: 'select-all', section: 'Edit', label: 'Select all', keys: ['Ctrl+KeyA'] },
  { id: 'escape', section: 'Edit', label: 'Clear selection / cancel', keys: ['Escape'], inEdit: true },
  { id: 'edit-item', section: 'Edit', label: 'Edit item (video loop editor)', keys: ['Enter'] },

  // --- Arrange & align ---
  { id: 'align-left', section: 'Arrange', label: 'Align left', keys: ['Ctrl+ArrowLeft'] },
  { id: 'align-right', section: 'Arrange', label: 'Align right', keys: ['Ctrl+ArrowRight'] },
  { id: 'align-top', section: 'Arrange', label: 'Align top', keys: ['Ctrl+ArrowUp'] },
  { id: 'align-bottom', section: 'Arrange', label: 'Align bottom', keys: ['Ctrl+ArrowDown'] },
  { id: 'distribute-horizontal', section: 'Arrange', label: 'Distribute horizontally', keys: ['Ctrl+Alt+Shift+ArrowUp'] },
  { id: 'distribute-vertical', section: 'Arrange', label: 'Distribute vertically', keys: ['Ctrl+Alt+Shift+ArrowDown'] },
  { id: 'arrange-optimal', section: 'Arrange', label: 'Arrange optimal', keys: ['Ctrl+KeyP'] },
  { id: 'arrange-addition', section: 'Arrange', label: 'Arrange by addition', keys: ['Ctrl+Alt+KeyA'] },
  { id: 'arrange-name', section: 'Arrange', label: 'Arrange by name', keys: ['Ctrl+Alt+KeyN'] },
  { id: 'arrange-order', section: 'Arrange', label: 'Arrange by order', keys: ['Ctrl+Alt+KeyO'] },
  { id: 'arrange-path', section: 'Arrange', label: 'Arrange by path', keys: ['Ctrl+Alt+KeyD'] },
  { id: 'arrange-random', section: 'Arrange', label: 'Arrange randomly', keys: ['Ctrl+Alt+KeyR'] },
  { id: 'pack-all', section: 'Arrange', label: 'Pack all and optimize', keys: ['Ctrl+Alt+KeyP'] },
  { id: 'optimize-canvas', section: 'Arrange', label: 'Optimize canvas', keys: ['Ctrl+KeyO'] },
  { id: 'normalize-height', section: 'Arrange', label: 'Normalize height', keys: ['Ctrl+Alt+ArrowLeft'] },
  { id: 'normalize-width', section: 'Arrange', label: 'Normalize width', keys: ['Ctrl+Alt+ArrowRight'] },
  { id: 'normalize-size', section: 'Arrange', label: 'Normalize size', keys: ['Ctrl+Alt+ArrowUp'] },
  { id: 'normalize-scale', section: 'Arrange', label: 'Normalize scale', keys: ['Ctrl+Alt+ArrowDown'] },
  { id: 'overlay', section: 'Arrange', label: 'Overlay selection', keys: ['Ctrl+KeyY'] },
  { id: 'stack', section: 'Arrange', label: 'Stack', keys: ['Ctrl+Alt+KeyS'] },
  { id: 'send-to-front', section: 'Arrange', label: 'Send to front', keys: ['ArrowUp'] },
  { id: 'send-to-back', section: 'Arrange', label: 'Send to back', keys: ['ArrowDown'] },

  // --- Image ---
  { id: 'flip-horizontal', section: 'Image', label: 'Flip horizontally', keys: ['Alt+Shift+KeyH'] },
  { id: 'flip-vertical', section: 'Image', label: 'Flip vertically', keys: ['Alt+Shift+KeyV'] },
  { id: 'toggle-grayscale', section: 'Image', label: 'Toggle grayscale', keys: ['Alt+KeyG'] },
  { id: 'toggle-sampling', section: 'Image', label: 'Toggle smooth / pixelated sampling', keys: ['Alt+KeyT'] },
  { id: 'toggle-locked', section: 'Image', label: 'Toggle locked', keys: ['Alt+KeyL'] },
  { id: 'reset-transform', section: 'Image', label: 'Reset transform', keys: ['Ctrl+Shift+KeyT'] },

  // --- View ---
  { id: 'focus-selection', section: 'View', label: 'Focus selected image (tap)', keys: ['Space'] },
  { id: 'focus-canvas', section: 'View', label: 'Focus whole canvas (tap)', keys: ['Ctrl+Space'] },
  { id: 'focus-next', section: 'View', label: 'Focus next image', keys: ['ArrowRight'] },
  { id: 'focus-prev', section: 'View', label: 'Focus previous image', keys: ['ArrowLeft'] },
  { id: 'zoom-in', section: 'View', label: 'Zoom in', keys: ['Ctrl+Equal', 'Ctrl+NumpadAdd'], repeat: true },
  { id: 'zoom-out', section: 'View', label: 'Zoom out', keys: ['Ctrl+Minus', 'Ctrl+NumpadSubtract'], repeat: true },
  { id: 'reset-zoom', section: 'View', label: 'Reset camera zoom', keys: ['Ctrl+Digit0', 'Ctrl+Numpad0'] },
  { id: 'toggle-grid', section: 'View', label: 'Toggle grid', keys: ['KeyG'] },
  { id: 'grayscale-canvas', section: 'View', label: 'Grayscale canvas', keys: ['Ctrl+Alt+KeyG'] },
  { id: 'slideshow', section: 'View', label: 'Slideshow selection', keys: ['Alt+KeyS'] },
  { id: 'lock-canvas', section: 'View', label: 'Lock canvas', keys: ['Ctrl+KeyR'] },
  { id: 'help', section: 'View', label: 'Help (this list)', keys: ['Ctrl+KeyH'], inEdit: true },

  // --- Window ---
  { id: 'always-on-top', section: 'Window', label: 'Always on top', keys: ['Ctrl+Shift+KeyA'], inEdit: true },
  { id: 'lock-window', section: 'Window', label: 'Lock window', keys: ['Ctrl+KeyW'], inEdit: true },
  { id: 'transparent-to-mouse', section: 'Window', label: 'Transparent to mouse (Ctrl+T anywhere turns it off)', keys: ['Ctrl+KeyT'], inEdit: true },
  { id: 'opacity-up', section: 'Window', label: 'Increase window opacity', keys: ['Ctrl+Shift+Equal', 'Ctrl+Shift+NumpadAdd'], repeat: true, inEdit: true },
  { id: 'opacity-down', section: 'Window', label: 'Decrease window opacity', keys: ['Ctrl+Shift+Minus', 'Ctrl+Shift+NumpadSubtract'], repeat: true, inEdit: true },
  { id: 'resize-to-selection', section: 'Window', label: 'Resize window to selection', keys: ['Ctrl+Shift+KeyR'] },
  { id: 'maximize', section: 'Window', label: 'Maximize', keys: ['Ctrl+KeyF'], inEdit: true },
  { id: 'minimize', section: 'Window', label: 'Minimize', keys: ['Ctrl+KeyM'], inEdit: true },
  { id: 'close', section: 'Window', label: 'Close', keys: ['Ctrl+KeyQ'], inEdit: true },
  { id: 'devtools', section: 'Window', label: 'Developer tools', keys: ['F12'], inEdit: true },

  // --- Video playback (selected videos, or every video if none is selected) ---
  { id: 'play-pause', section: 'Video playback', label: 'Play / pause', keys: ['KeyK'], inEdit: true },
  { id: 'pause-all', section: 'Video playback', label: 'Select all videos and pause', keys: ['Shift+KeyK'], inEdit: true },
  { id: 'play-all', section: 'Video playback', label: 'Select all videos and play', keys: ['Ctrl+Shift+KeyK'], inEdit: true },
  { id: 'frame-back', section: 'Video playback', label: 'Step one frame back', keys: ['Comma'], repeat: true, inEdit: true },
  { id: 'frame-forward', section: 'Video playback', label: 'Step one frame forward', keys: ['Period'], repeat: true, inEdit: true },
  { id: 'seek-back', section: 'Video playback', label: 'Jump back 5 seconds', keys: ['KeyJ'], repeat: true, inEdit: true },
  { id: 'seek-forward', section: 'Video playback', label: 'Jump forward 5 seconds', keys: ['KeyL'], repeat: true, inEdit: true },
  { id: 'toggle-mute', section: 'Video playback', label: 'Mute / unmute', keys: ['KeyM'], inEdit: true },
  { id: 'speed-down', section: 'Video playback', label: 'Slower', keys: ['BracketLeft'], repeat: true, inEdit: true },
  { id: 'speed-up', section: 'Video playback', label: 'Faster', keys: ['BracketRight'], repeat: true, inEdit: true },
  { id: 'speed-reset', section: 'Video playback', label: 'Normal speed', keys: ['Backslash'], inEdit: true },
]

// Keys bound to Space fire when Space is tapped (pressed and released without dragging),
// because holding Space and dragging always pans the canvas.

// Mouse and hold-key controls. Shown in the help overlay; handled directly in preload.js.
const MOUSE_CONTROLS = [
  { section: 'Mouse', label: 'Select / move item', keys: ['Left drag'] },
  { section: 'Mouse', label: 'Add to / remove from selection', keys: ['Shift+Click'] },
  { section: 'Mouse', label: 'Box select (Shift adds)', keys: ['Left drag on empty canvas'] },
  { section: 'Mouse', label: 'Move along one axis', keys: ['Shift+Left drag'] },
  { section: 'Mouse', label: 'Rotate (Shift snaps to 15°)', keys: ['Ctrl+Left drag'] },
  { section: 'Mouse', label: 'Scale', keys: ['Ctrl+Alt+Left drag'] },
  { section: 'Mouse', label: 'Change item opacity', keys: ['Ctrl+Alt+Shift+Left drag'] },
  { section: 'Mouse', label: 'Pan', keys: ['Middle drag', 'Alt+Left drag', 'Space+Left drag'] },
  { section: 'Mouse', label: 'Zoom', keys: ['Scroll', 'Z+Left drag', 'Ctrl+Space+Left drag'] },
  { section: 'Mouse', label: 'Step video frames', keys: ['Alt+Scroll over a video'] },
  { section: 'Mouse', label: 'Move window / context menu', keys: ['Right drag / Right click'] },
]

const KEY_NAMES = {
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
  Equal: '=', Minus: '-', NumpadAdd: 'Num+', NumpadSubtract: 'Num-', Numpad0: 'Num0',
  Comma: ',', Period: '.', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  Escape: 'Esc', Delete: 'Del', Backspace: 'Backspace', Enter: 'Enter', Space: 'Space',
}

function displayKey(combo, isMac) {
  return combo.split('+').map(part => {
    if (part === 'Ctrl') return isMac ? 'Cmd' : 'Ctrl'
    if (part === 'Alt') return isMac ? 'Option' : 'Alt'
    if (part.startsWith('Key')) return part.slice(3)
    if (part.startsWith('Digit')) return part.slice(5)
    return KEY_NAMES[part] || part
  }).join('+')
}

// Turns a keyboard event into the same "Ctrl+Alt+Shift+Code" form used above.
function comboFromEvent(evt, isMac) {
  const parts = []
  if (isMac ? evt.metaKey : evt.ctrlKey) parts.push('Ctrl')
  if (evt.altKey) parts.push('Alt')
  if (evt.shiftKey) parts.push('Shift')
  parts.push(evt.code)
  return parts.join('+')
}

const MODIFIER_CODES = new Set(['ControlLeft', 'ControlRight', 'ShiftLeft', 'ShiftRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'OSLeft', 'OSRight', 'CapsLock'])

// Puts modifiers in a fixed Ctrl, Alt, Shift order so combos compare equal.
function normalizeCombo(combo) {
  const parts = combo.split('+')
  const code = parts.pop()
  return [...['Ctrl', 'Alt', 'Shift'].filter(m => parts.includes(m)), code].join('+')
}

function defaultBindings() {
  const bindings = {}
  for (const s of SHORTCUTS) bindings[s.id] = s.keys.map(normalizeCombo)
  return bindings
}

// Saved overrides only list the actions the user changed.
function effectiveBindings(overrides = {}) {
  const bindings = defaultBindings()
  for (const [id, keys] of Object.entries(overrides || {})) {
    if (id in bindings && Array.isArray(keys)) bindings[id] = keys.map(normalizeCombo)
  }
  return bindings
}

function buildKeyMap(bindings = defaultBindings()) {
  const byId = new Map(SHORTCUTS.map(s => [s.id, s]))
  const map = new Map()
  for (const [id, keys] of Object.entries(bindings)) {
    const shortcut = byId.get(id)
    if (!shortcut) continue
    for (const combo of keys) map.set(normalizeCombo(combo), shortcut)
  }
  return map
}

const ACCELERATOR_NAMES = {
  Equal: '=', Minus: '-', Comma: ',', Period: '.', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
  Escape: 'Esc', NumpadAdd: 'numadd', NumpadSubtract: 'numsub', Numpad0: 'num0',
  ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Semicolon: ';', Quote: "'",
  Slash: '/', Backquote: '`',
}

// Converts "Ctrl+Shift+KeyA" into an Electron accelerator such as "CmdOrCtrl+Shift+A".
function toAccelerator(combo) {
  if (!combo) return undefined
  return combo.split('+').map(part => {
    if (part === 'Ctrl') return 'CmdOrCtrl'
    if (part === 'Alt' || part === 'Shift') return part
    if (part.startsWith('Key')) return part.slice(3)
    if (part.startsWith('Digit')) return part.slice(5)
    if (part.startsWith('Numpad') && /\d$/.test(part)) return 'num' + part.slice(6)
    return ACCELERATOR_NAMES[part] || part
  }).join('+')
}

module.exports = {
  SHORTCUTS, MOUSE_CONTROLS, MODIFIER_CODES,
  displayKey, comboFromEvent, normalizeCombo, defaultBindings, effectiveBindings, buildKeyMap, toAccelerator,
}

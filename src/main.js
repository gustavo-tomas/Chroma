import './style.css'

import * as GRAPHICS from './graphics.js'
import * as EDITOR from './editor.js'

GRAPHICS.initializeGraphics()
EDITOR.initializeEditor()

// ===== Horizontal Resize (Theory ↔ Editor) =====
const theoryTab = document.getElementById('theory-tab')
const resizer   = document.getElementById('resizer')

resizer.addEventListener('mousedown', initHResize)

function initHResize(e) {
  e.preventDefault()  // prevent text selection while dragging
  document.addEventListener('mousemove', doHResize)
  document.addEventListener('mouseup',   stopHResize)
}

function doHResize(e) {
  // compute new width based on mouse X position
  const newWidth = e.clientX - theoryTab.getBoundingClientRect().left
  theoryTab.style.width = `${newWidth}px`
}

function stopHResize() {
  document.removeEventListener('mousemove', doHResize)
  document.removeEventListener('mouseup',   stopHResize)
}

// ===== Vertical Resize (Code Editor ↔ Shader View) =====
const codePanel = document.getElementById('code-panel')
const vResizer  = document.getElementById('v-resizer')

vResizer.addEventListener('mousedown', initVResize)

function initVResize(e) {
  e.preventDefault()  // prevent text selection
  document.addEventListener('mousemove', doVResize)
  document.addEventListener('mouseup',   stopVResize)
}

function doVResize(e) {
  // compute new height based on mouse Y position
  const top    = codePanel.getBoundingClientRect().top
  const height = e.clientY - top
  codePanel.style.height = `${height}px`
}

function stopVResize() {
  document.removeEventListener('mousemove', doVResize)
  document.removeEventListener('mouseup',   stopVResize)
}




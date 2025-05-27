import "./style.css";
import { Graphics } from "./graphics.js";
import { Editor } from "./editor.js";

const vertexCode = `varying vec3 vUv; 
void main() {
    vUv = position; 

    vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewPosition; 
}`;

const fragmentCode = `uniform vec3 colorA;
uniform vec3 colorB;
varying vec3 vUv;

void main() {
    gl_FragColor = vec4(mix(colorA, colorB, vUv.z), 1.0);
}
`;

const graphics = new Graphics(vertexCode, fragmentCode);

function onEditorUpdateCallback(tab, code) {
  if (tab === "vertex") {
    graphics.onVertexCodeUpdate(code);
  } else {
    graphics.onFragmentCodeUpdate(code);
  }
}

const editor = new Editor(vertexCode, fragmentCode, onEditorUpdateCallback);

// ===== Horizontal Resize (Theory ↔ Editor) =====
const theoryTab = document.getElementById("theory-tab");
const hResizer = document.getElementById("h-resizer");

hResizer.addEventListener("mousedown", initHResize);

function initHResize(e) {
  e.preventDefault(); // prevent text selection while dragging
  document.addEventListener("mousemove", doHResize);
  document.addEventListener("mouseup", stopHResize);
}

function doHResize(e) {
  // compute new width based on mouse X position
  const newWidth = e.clientX - theoryTab.getBoundingClientRect().left;
  theoryTab.style.width = `${newWidth}px`;

  // send resize event to the graphics
  graphics.onResize();
}

function stopHResize() {
  document.removeEventListener("mousemove", doHResize);
  document.removeEventListener("mouseup", stopHResize);
}

// ===== Vertical Resize (Code Editor ↔ Shader View) =====
const codePanel = document.getElementById("code-panel");
const vResizer = document.getElementById("v-resizer");

vResizer.addEventListener("mousedown", initVResize);

function initVResize(e) {
  e.preventDefault(); // prevent text selection
  document.addEventListener("mousemove", doVResize);
  document.addEventListener("mouseup", stopVResize);
}

function doVResize(e) {
  // compute new height based on mouse Y position
  const top = codePanel.getBoundingClientRect().top;
  const height = e.clientY - top;
  codePanel.style.height = `${height}px`;

  // send resize event to the graphics
  graphics.onResize();
}

function stopVResize() {
  document.removeEventListener("mousemove", doVResize);
  document.removeEventListener("mouseup", stopVResize);
}

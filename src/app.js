import "./style.css";
import { Graphics } from "./graphics.js";
import { Editor } from "./editor.js";
import { setupResizers } from "./resizer.js";

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
}`;

class App {
  init() {
    this.graphics = new Graphics(vertexCode, fragmentCode);
    this.editor = new Editor(
      vertexCode,
      fragmentCode,
      this.onEditorUpdate.bind(this)
    );
    setupResizers(this.graphics);
  }

  onEditorUpdate(tab, code) {
    if (tab === "vertex") {
      this.graphics.onVertexCodeUpdate(code);
    } else {
      this.graphics.onFragmentCodeUpdate(code);
    }
  }
}

export { App };

import { InputGeometryTypes, ShaderType, CameraTypes } from "./common.js";
import * as THREE from "three";

class ShaderCompileLog {
  errorMessage = "";
  lineNumber = 0;
  token = "";
}

class Graphics {
  constructor(vertexCode, fragmentCode, onShaderCompileCallback) {
    const canvas = document.getElementById("canvas");
    const wireframeInputButton = document.getElementById("wireframe");
    this._viewPanel = document.getElementById("view-panel");

    const geometryInputButtons =
      document.getElementsByClassName("geometry-btn");

    const cameraInputButtons = document.getElementsByClassName("camera-btn");

    const width = this._getWidth();
    const height = this._getHeight();

    this._onShaderCompileCallback = onShaderCompileCallback;
    this._camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
    this._camera.position.z = 1;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0.5, 0.5, 0.5);

    const geometry = new THREE.PlaneGeometry(0.5, 0.5);
    this._material = new THREE.ShaderMaterial({
      vertexShader: vertexCode,
      fragmentShader: fragmentCode,
      side: THREE.DoubleSide,
    });

    this._material.onBeforeCompile = this._onBeforeCompile.bind(this);

    this._mesh = new THREE.Mesh(geometry, this._material);

    this._scene.add(this._mesh);

    this._mousePositionNormalized = new THREE.Vector2();
    this._screenResolution = new THREE.Vector2(width, height);

    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvas,
    });
    this._renderer.setSize(width, height);
    this._renderer.setAnimationLoop(this._onUpdate.bind(this));

    const gl = this._renderer.getContext();
    this._glCompileShader = gl.compileShader.bind(gl);

    gl.compileShader = this._onCompile.bind(this);

    this._viewPanel.addEventListener("resize", this.onResize.bind(this));
    window.addEventListener("resize", this.onResize.bind(this));
    canvas.addEventListener("mousemove", this._onMouseMove.bind(this));

    wireframeInputButton.addEventListener(
      "change",
      this._onWireframeSelected.bind(this)
    );

    for (let i = 0; i < geometryInputButtons.length; i++) {
      const button = geometryInputButtons[i];
      button.addEventListener(
        "change",
        this._onInputGeometrySelected.bind(this)
      );
    }

    for (let i = 0; i < cameraInputButtons.length; i++) {
      const button = cameraInputButtons[i];
      button.addEventListener("change", this._onCameraInputSelected.bind(this));
    }

    initTexturePanelStatic(this._material);
  }

  onShaderCodeUpdate(vertexShader, fragmentShader) {
    this._material.vertexShader = vertexShader;
    this._material.fragmentShader = fragmentShader;

    this._material.uniforms = this._material.uniforms || {};

    [
      "iChannel0",
      "iChannel1",
      "iChannel2",
      "iChannel3",
      "u_userTexture",
    ].forEach((n) => {
      if (!this._material.uniforms[n])
        this._material.uniforms[n] = { value: null };
    });

    // Force shader recompilation
    this._material.dispose();
  }

  onUniformUpdate(uniforms) {
    // Clear current uniforms to avoid dealing with old state
    this._material.uniforms = {};

    for (const [name, description] of Object.entries(uniforms)) {
      let uniform = {
        type: description.type,
        value: description.value,
      };

      this._material.uniforms[name] = uniform;
    }

    this._material.needsUpdate = true;
  }

  onResize() {
    const width = this._getWidth();
    const height = this._getHeight();

    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();

    this._renderer.setSize(width, height);

    this._screenResolution.x = width;
    this._screenResolution.y = height;
  }

  getUserUniforms() {
    let uniforms = {};

    // Filter presets
    for (const [name, description] of Object.entries(this._material.uniforms)) {
      if (description.preset) {
        continue;
      }

      uniforms[name] = description;
    }

    return uniforms;
  }

  _onCameraInputSelected(e) {
    const button = e.target;
    if (!button.checked) {
      return;
    }

    let camera;

    switch (button.id) {
      case CameraTypes.Perspective:
        const width = this._getWidth();
        const height = this._getHeight();
        camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
        camera.position.z = 1;
        break;
      case CameraTypes.Orthographic:
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        break;
    }

    this._camera = camera;
  }

  _onInputGeometrySelected(e) {
    const button = e.target;
    if (!button.checked) {
      return;
    }

    let geometry;

    switch (button.id) {
      case InputGeometryTypes.Box:
        geometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        break;
      case InputGeometryTypes.Plane:
        geometry = new THREE.PlaneGeometry(0.5, 0.5);
        break;
    }

    this._mesh.geometry = geometry;
  }

  _onWireframeSelected(e) {
    const button = e.target;
    this._material.wireframe = button.checked;
  }

  _onUpdate(time) {
    const shader = this._mesh.material.userData.shader;

    if (shader) {
      // @TODO: use deltaTime
      shader.uniforms.u_time.value = time;
      shader.uniforms.u_mousePosition.value = this._mousePositionNormalized;
      shader.uniforms.u_screenResolution.value = this._screenResolution;
    }

    this._renderer.render(this._scene, this._camera);
  }

  // @NOTE: because we can't access the full shader during compilation, we need
  // to intercept the webgl-threejs shader before the compilation is done. Then
  // we can send the correct logs to the editor.

  _onCompile(shader) {
    const gl = this._renderer.getContext();

    const glShaderSource = gl.getShaderSource(shader);

    this._glCompileShader(shader);

    const glShaderType = gl.getShaderParameter(shader, gl.SHADER_TYPE);
    const glShaderLog = gl.getShaderInfoLog(shader);

    const shaderType =
      glShaderType === gl.VERTEX_SHADER
        ? ShaderType.Vertex
        : ShaderType.Fragment;

    const numLinesFullCode = glShaderSource.split(/\r\n|\r|\n/).length;

    const numLinesVisibleCode =
      shaderType === ShaderType.Vertex
        ? this._material.vertexShader.split(/\r\n|\r|\n/).length
        : this._material.fragmentShader.split(/\r\n|\r|\n/).length;

    const diff = numLinesFullCode - numLinesVisibleCode;

    let shaderLogs = [];

    if (glShaderLog.length > 0) {
      const infos = glShaderLog
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l != "\x00"); // junk

      infos.forEach((info) => {
        const m = info.match(/ERROR:\s*\d+:(\d+):\s*'(.*?)'/);
        const fullCodeLineNumber = m ? parseInt(m[1], 10) : 1;
        const lineNumber = fullCodeLineNumber - diff;
        const token = m && m[2] ? m[2] : null;

        // Don't forget to also update the error message
        const visibleErrorMessage = info.replace(
          /0:\d+/,
          "0:".concat(lineNumber)
        );

        const shaderLog = new ShaderCompileLog();
        shaderLog.errorMessage = visibleErrorMessage;
        shaderLog.lineNumber = lineNumber;
        shaderLog.token = token;

        shaderLogs.push(shaderLog);
      });
    }

    this._onShaderCompileCallback(shaderType, shaderLogs);
  }

  _onBeforeCompile(shader) {
    const prev = (n) =>
      this._material.uniforms && this._material.uniforms[n]
        ? this._material.uniforms[n].value
        : null;

    // These uniforms should be accessible but not modifiable by the user,
    // so we prepend them without changing the editable code
    shader.uniforms["u_time"] = { type: "float", value: 0, preset: true };

    shader.uniforms["u_mousePosition"] = {
      type: "vec2",
      value: new THREE.Vector2(0, 0),
      preset: true,
    };

    shader.uniforms["u_screenResolution"] = {
      type: "vec2",
      value: new THREE.Vector2(0, 0),
      preset: true,
    };

    shader.uniforms["u_userTexture"] = {
      type: "sampler2D",
      value: null,
      preset: true,
    };

    for (let i = 0; i < 4; i++) {
      const channel = "iChannel" + i;
      shader.uniforms[channel] = {
        type: "sampler2D",
        value: prev(channel) || null,
        preset: true,
      };
    }

    shader.uniforms["u_userTexture"] = {
      type: "sampler2D",
      value: prev("u_userTexture") || prev("iChannel0") || null,
      preset: true,
    };

    for (const [name, description] of Object.entries(shader.uniforms)) {
      const s = "uniform " + description.type + " " + name + ";\n";
      shader.vertexShader = s + shader.vertexShader;
      shader.fragmentShader = s + shader.fragmentShader;
    }

    this._material.userData.shader = shader;
    this._material.uniforms = shader.uniforms;
  }

  _onMouseMove(event) {
    const canvas = document.getElementById("canvas");
    const boundingRect = canvas.getBoundingClientRect();
    const mousePosition = new THREE.Vector2();

    // Convert to range [0, canvas_size]
    mousePosition.x = event.clientX - boundingRect.left;
    mousePosition.y = event.clientY - boundingRect.top;

    // Convert to range [-1, 1] with (0, 0) at the center
    mousePosition.x = mousePosition.x / canvas.clientWidth;
    mousePosition.y = mousePosition.y / canvas.clientHeight;
    mousePosition.x = mousePosition.x * 2.0 - 1.0;
    mousePosition.y = mousePosition.y * -2.0 + 1.0;

    this._mousePositionNormalized = mousePosition;
  }

  _getWidth() {
    return this._viewPanel.clientWidth;
  }

  _getHeight() {
    return this._viewPanel.clientHeight;
  }

  _glContext;
  _scene;
  _camera;
  _renderer;
  _material;
  _mesh;
  _onShaderCompileCallback;
  _mousePositionNormalized; // [-1.0, 1.0]
  _screenResolution;
}

export { Graphics, ShaderCompileLog };

export function initTexturePanelStatic(material) {
  function fileToTex(file, cb) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      cb(tex, url);
    };
    img.src = url;
  }

  function setUniform(name, tex) {
    material.uniforms = material.uniforms || {};
    if (!material.uniforms[name])
      material.uniforms[name] = {
        type: "sampler2D",
        value: null,
        preset: true,
      };
    material.uniforms[name].value = tex;
    if (name === "iChannel0") {
      if (!material.uniforms.u_userTexture)
        material.uniforms.u_userTexture = {
          type: "sampler2D",
          value: null,
          preset: true,
        };
      material.uniforms.u_userTexture.value = tex;
    }
    if (material.userData && material.userData.shader) {
      const su = material.userData.shader.uniforms || {};
      if (su[name]) su[name].value = tex;
      if (name === "iChannel0" && su.u_userTexture)
        su.u_userTexture.value = tex;
    }
    material.needsUpdate = true;
  }

  document.querySelectorAll("#channels-panel .tex-slot").forEach((slot) => {
    const name = slot.dataset.channel;
    const thumb = slot.querySelector(".tex-thumb");
    const load = slot.querySelector(".tex-load");
    const clear = slot.querySelector(".tex-clear");
    const input = slot.querySelector('input[type="file"]');

    function apply(tex, url) {
      setUniform(name, tex);
      if (url) thumb.src = url;
    }
    function loadFile(file) {
      fileToTex(file, apply);
    }

    load.onclick = () => input.click();
    input.onchange = (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) loadFile(f);
    };

    clear.onclick = () => {
      if (material.uniforms && material.uniforms[name])
        material.uniforms[name].value = null;
      if (
        material.userData &&
        material.userData.shader &&
        material.userData.shader.uniforms[name]
      ) {
        material.userData.shader.uniforms[name].value = null;
      }
      if (name === "iChannel0") {
        if (material.uniforms && material.uniforms.u_userTexture)
          material.uniforms.u_userTexture.value = null;
        if (
          material.userData &&
          material.userData.shader &&
          material.userData.shader.uniforms.u_userTexture
        ) {
          material.userData.shader.uniforms.u_userTexture.value = null;
        }
      }
      thumb.removeAttribute("src");
      material.needsUpdate = true;
    };

    slot.ondragover = (e) => {
      e.preventDefault();
      slot.classList.add("dragover");
    };
    slot.ondragleave = () => slot.classList.remove("dragover");
    slot.ondrop = (e) => {
      e.preventDefault();
      slot.classList.remove("dragover");
      const f =
        e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) loadFile(f);
    };
  });
}

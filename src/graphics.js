import { InputGeometryTypes, ShaderType, CameraTypes } from "./common.js";
import { appendTexSlot } from "./components/tex_slot.js";
import { setupDropdowns } from "./components/dropdown.js";
import * as THREE from "three";

class ShaderCompileLog {
  errorMessage = "";
  lineNumber = 0;
  token = "";
}

class PerspectiveCamera {
  fov = 60;
  near = 0.01;
  far = 10;
}

class OrthographicCamera {
  left = -1;
  right = 1;
  top = 1;
  bottom = -1;
  near = 0;
  far = 1;
}

class GraphicsConstructorParams {
  vertexCode = "";
  fragmentCode = "";
  inputGeometryType = InputGeometryTypes.Plane;
  inputGeometryValues = [0.5, 0.5];
  wireframe = false;
  backgroundColor = [0.5, 0.5, 0.5];
  cameraType = CameraTypes.Perspective;
  cameraPosition = [0.0, 0.0, 1.0];
  perspectiveCamera = new PerspectiveCamera();
  orthographicCamera = new OrthographicCamera();
  onShaderCompileCallback = null;
}

function arrayToColor(array) {
  const color = new THREE.Color();

  if (array.length < 3) {
    return color;
  }

  color.r = array[0];
  color.g = array[1];
  color.b = array[2];

  return color;
}

class Graphics {
  constructor(params) {
    const canvas = document.getElementById("canvas");
    this._wireframeInputButton = document.getElementById("wireframe");
    this._viewPanel = document.getElementById("view-panel");

    for (let i = 0; i < 4; i++) {
      appendTexSlot("iChannel" + i);
    }

    setupDropdowns();

    this._geometryInputButtons =
      document.getElementsByClassName("geometry-btn");

    this._cameraInputButtons = document.getElementsByClassName("camera-btn");

    this._cameraPerspectiveFov = document.getElementById(
      "camera-perspective-fov"
    );
    this._cameraPerspectiveNear = document.getElementById(
      "camera-perspective-near"
    );
    this._cameraPerspectiveFar = document.getElementById(
      "camera-perspective-far"
    );

    this._cameraOrthographicLeft = document.getElementById(
      "camera-orthographic-left"
    );
    this._cameraOrthographicRight = document.getElementById(
      "camera-orthographic-right"
    );
    this._cameraOrthographicTop = document.getElementById(
      "camera-orthographic-top"
    );
    this._cameraOrthographicBottom = document.getElementById(
      "camera-orthographic-bottom"
    );
    this._cameraOrthographicNear = document.getElementById(
      "camera-orthographic-near"
    );
    this._cameraOrthographicFar = document.getElementById(
      "camera-orthographic-far"
    );

    this._backgroundColorR = document.getElementById("background-input-r");
    this._backgroundColorG = document.getElementById("background-input-g");
    this._backgroundColorB = document.getElementById("background-input-b");

    this._cameraX = document.getElementById("camera-position-x");
    this._cameraY = document.getElementById("camera-position-y");
    this._cameraZ = document.getElementById("camera-position-z");

    this._planeX = document.getElementById("plane-input-x");
    this._planeY = document.getElementById("plane-input-y");

    this._boxX = document.getElementById("box-input-x");
    this._boxY = document.getElementById("box-input-y");
    this._boxZ = document.getElementById("box-input-z");

    const width = this._getWidth();
    const height = this._getHeight();

    this._onShaderCompileCallback = params.onShaderCompileCallback;

    this._camera = new THREE.PerspectiveCamera(
      params.perspectiveCamera.fov,
      width / height,
      params.perspectiveCamera.near,
      params.perspectiveCamera.far
    );

    this._scene = new THREE.Scene();

    const geometry = new THREE.PlaneGeometry();

    this._material = new THREE.ShaderMaterial({
      vertexShader: params.vertexCode,
      fragmentShader: params.fragmentCode,
      side: THREE.DoubleSide,
      wireframe: params.wireframe,
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

    this._wireframeInputButton.addEventListener(
      "change",
      this._onWireframeSelected.bind(this)
    );

    for (let i = 0; i < this._geometryInputButtons.length; i++) {
      const button = this._geometryInputButtons[i];
      button.addEventListener(
        "change",
        this._onInputGeometrySelected.bind(this)
      );
    }

    for (let i = 0; i < this._cameraInputButtons.length; i++) {
      const button = this._cameraInputButtons[i];
      button.addEventListener("change", this._onCameraInputSelected.bind(this));
    }

    // Camera position
    this._cameraX.addEventListener(
      "change",
      this._onCameraPositionUpdate.bind(this)
    );
    this._cameraY.addEventListener(
      "change",
      this._onCameraPositionUpdate.bind(this)
    );
    this._cameraZ.addEventListener(
      "change",
      this._onCameraPositionUpdate.bind(this)
    );

    // Perspective camera
    this._cameraPerspectiveFov.addEventListener(
      "change",
      this._onCameraPerspectiveUpdate.bind(this)
    );

    this._cameraPerspectiveNear.addEventListener(
      "change",
      this._onCameraPerspectiveUpdate.bind(this)
    );

    this._cameraPerspectiveFar.addEventListener(
      "change",
      this._onCameraPerspectiveUpdate.bind(this)
    );

    // Orthographic camera
    this._cameraOrthographicLeft.addEventListener(
      "change",
      this._onCameraOrthographicUpdate.bind(this)
    );
    this._cameraOrthographicRight.addEventListener(
      "change",
      this._onCameraOrthographicUpdate.bind(this)
    );
    this._cameraOrthographicTop.addEventListener(
      "change",
      this._onCameraOrthographicUpdate.bind(this)
    );
    this._cameraOrthographicBottom.addEventListener(
      "change",
      this._onCameraOrthographicUpdate.bind(this)
    );
    this._cameraOrthographicNear.addEventListener(
      "change",
      this._onCameraOrthographicUpdate.bind(this)
    );
    this._cameraOrthographicFar.addEventListener(
      "change",
      this._onCameraOrthographicUpdate.bind(this)
    );

    // Background color
    this._backgroundColorR.addEventListener(
      "change",
      this._onBackgroundColorUpdate.bind(this)
    );

    this._backgroundColorG.addEventListener(
      "change",
      this._onBackgroundColorUpdate.bind(this)
    );

    this._backgroundColorB.addEventListener(
      "change",
      this._onBackgroundColorUpdate.bind(this)
    );

    this._planeX.addEventListener(
      "change",
      this._onPlaneGeometryUpdate.bind(this)
    );
    this._planeY.addEventListener(
      "change",
      this._onPlaneGeometryUpdate.bind(this)
    );

    this._boxX.addEventListener("change", this._onBoxGeometryUpdate.bind(this));
    this._boxY.addEventListener("change", this._onBoxGeometryUpdate.bind(this));
    this._boxZ.addEventListener("change", this._onBoxGeometryUpdate.bind(this));

    this.setInputGeometryType(params.inputGeometryType);
    this.setInputGeometryValues(params.inputGeometryValues);
    this.setWireframe(params.wireframe);
    this.setBackgroundColor(params.backgroundColor);
    this.setCameraPosition(params.cameraPosition);
    this.setCameraType(params.cameraType);
    this.setCameraValues(
      params.cameraType === CameraTypes.Perspective
        ? params.perspectiveCamera
        : params.orthographicCamera
    );

    this._iChannelMeta = {}; // i0..i3 -> {src, mimeType, name}

    initTexturePanelStatic(this._material, (channel, meta) => {
      const ch = (channel || "").toLowerCase();
      const key =
        ch === "ichannel0"
          ? "i0"
          : ch === "ichannel1"
          ? "i1"
          : ch === "ichannel2"
          ? "i2"
          : ch === "ichannel3"
          ? "i3"
          : null;

      if (!key) return;
      this._iChannelMeta[key] = meta
        ? {
            src: meta.src || null,
            name: meta.name || key,
            mimeType: meta.mimeType || undefined,
          }
        : null;
    });
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
      this._material.uniforms[name] = {
        type: description.type,
        value: description.value,
      };
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

  getWireframe() {
    return this._wireframeInputButton.checked;
  }

  getActiveCameraType() {
    for (let i = 0; i < this._cameraInputButtons.length; i++) {
      const button = this._cameraInputButtons[i];

      if (button.checked) {
        return button.id;
      }
    }

    console.error("No active camera");
  }

  getActiveInputGeometryType() {
    for (let i = 0; i < this._geometryInputButtons.length; i++) {
      const button = this._geometryInputButtons[i];

      if (button.checked) {
        return button.id;
      }
    }

    console.error("No active geometry");
  }

  getInputGeometryValues(geometryType) {
    switch (geometryType) {
      case InputGeometryTypes.Plane:
        return [parseFloat(this._planeX.value), parseFloat(this._planeY.value)];

      case InputGeometryTypes.Box:
        return [
          parseFloat(this._boxX.value),
          parseFloat(this._boxY.value),
          parseFloat(this._boxZ.value),
        ];
    }

    console.error("Invalid geometry type: ", geometryType);
  }

  getPerspectiveCameraValues() {
    const camera = new PerspectiveCamera();

    camera.fov = parseFloat(this._cameraPerspectiveFov.value);
    camera.near = parseFloat(this._cameraPerspectiveNear.value);
    camera.far = parseFloat(this._cameraPerspectiveFar.value);

    return camera;
  }

  getOrthographicCameraValues() {
    const camera = new OrthographicCamera();

    camera.left = parseFloat(this._cameraOrthographicLeft.value);
    camera.right = parseFloat(this._cameraOrthographicRight.value);
    camera.top = parseFloat(this._cameraOrthographicTop.value);
    camera.bottom = parseFloat(this._cameraOrthographicBottom.value);
    camera.near = parseFloat(this._cameraOrthographicNear.value);
    camera.far = parseFloat(this._cameraOrthographicFar.value);

    return camera;
  }

  getCameraPosition() {
    return [
      parseFloat(this._cameraX.value),
      parseFloat(this._cameraY.value),
      parseFloat(this._cameraZ.value),
    ];
  }

  getBackgroundColor() {
    return [
      parseFloat(this._backgroundColorR.value),
      parseFloat(this._backgroundColorG.value),
      parseFloat(this._backgroundColorB.value),
    ];
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

  setBackgroundColor(color) {
    this._scene.background = arrayToColor(color);

    this._backgroundColorR.value = color[0];
    this._backgroundColorG.value = color[1];
    this._backgroundColorB.value = color[2];
  }

  setWireframe(wireframe) {
    this._material.wireframe = wireframe;
    this._wireframeInputButton.checked = wireframe;
  }

  setCameraType(cameraType) {
    this._selectCamera(cameraType);

    this.setCameraValues(
      cameraType === CameraTypes.Perspective
        ? this.getPerspectiveCameraValues()
        : this.getOrthographicCameraValues()
    );
  }

  setCameraValues(values) {
    let camera = null;
    const position = this.getCameraPosition();

    switch (this.getActiveCameraType()) {
      case CameraTypes.Perspective:
        {
          const aspect = this._getWidth() / this._getHeight();
          camera = new THREE.PerspectiveCamera(
            values.fov,
            aspect,
            values.near,
            values.far
          );
          camera.position.set(position[0], position[1], position[2]);

          this._cameraPerspectiveFov.value = camera.fov;
          this._cameraPerspectiveNear.value = camera.near;
          this._cameraPerspectiveFar.value = camera.far;
        }
        break;
      case CameraTypes.Orthographic:
        {
          camera = new THREE.OrthographicCamera(
            values.left,
            values.right,
            values.top,
            values.bottom,
            values.near,
            values.far
          );
          camera.position.set(position[0], position[1], position[2]);

          this._cameraOrthographicLeft.value = camera.left;
          this._cameraOrthographicRight.value = camera.right;
          this._cameraOrthographicTop.value = camera.top;
          this._cameraOrthographicBottom.value = camera.bottom;
          this._cameraOrthographicNear.value = camera.near;
          this._cameraOrthographicFar.value = camera.far;
        }
        break;
    }

    this._camera = camera;
  }

  setCameraPosition(position) {
    this._camera.position.set(position[0], position[1], position[2]);

    this._cameraX.value = position[0];
    this._cameraY.value = position[1];
    this._cameraZ.value = position[2];
  }

  setInputGeometryType(geometryType) {
    this._selectGeometry(geometryType);
  }

  setInputGeometryValues(values) {
    let geometry = null;

    switch (this.getActiveInputGeometryType()) {
      case InputGeometryTypes.Box:
        {
          geometry = new THREE.BoxGeometry(values[0], values[1], values[2]);
          this._boxX.value = values[0];
          this._boxY.value = values[1];
          this._boxZ.value = values[2];
        }
        break;
      case InputGeometryTypes.Plane:
        {
          geometry = new THREE.PlaneGeometry(values[0], values[1]);
          this._planeX.value = values[0];
          this._planeY.value = values[1];
        }
        break;
    }

    this._mesh.geometry = geometry;
  }

  _onBackgroundColorUpdate(e) {
    const values = this.getBackgroundColor();
    this.setBackgroundColor(values);
  }

  _onCameraInputSelected(e) {
    const button = e.target;
    if (!button.checked) {
      return;
    }

    this.setCameraType(button.id);
  }

  _onInputGeometrySelected(e) {
    const button = e.target;
    if (!button.checked) {
      return;
    }

    const values = this.getInputGeometryValues(button.id);
    this.setInputGeometryValues(values);
  }

  _onPlaneGeometryUpdate(e) {
    if (!this._isGeometrySelected(InputGeometryTypes.Plane)) {
      return;
    }

    const values = this.getInputGeometryValues(InputGeometryTypes.Plane);

    this._mesh.geometry = new THREE.PlaneGeometry(values[0], values[1]);
  }

  _onBoxGeometryUpdate(e) {
    if (!this._isGeometrySelected(InputGeometryTypes.Box)) {
      return;
    }

    const values = this.getInputGeometryValues(InputGeometryTypes.Box);

    this._mesh.geometry = new THREE.BoxGeometry(
      values[0],
      values[1],
      values[2]
    );
  }

  _onCameraPositionUpdate(e) {
    const values = this.getCameraPosition();
    this._camera.position.set(values[0], values[1], values[2]);
  }

  _onCameraPerspectiveUpdate(e) {
    if (!this._isCameraSelected(CameraTypes.Perspective)) {
      return;
    }

    const values = this.getPerspectiveCameraValues();

    this._camera.fov = values.fov;
    this._camera.near = values.near;
    this._camera.far = values.far;

    this._camera.updateProjectionMatrix();
  }

  _onCameraOrthographicUpdate(e) {
    if (!this._isCameraSelected(CameraTypes.Orthographic)) {
      return;
    }

    const values = this.getOrthographicCameraValues();

    this._camera.left = values.left;
    this._camera.right = values.right;
    this._camera.top = values.top;
    this._camera.bottom = values.bottom;
    this._camera.near = values.near;
    this._camera.far = values.far;

    this._camera.updateProjectionMatrix();
  }

  _onWireframeSelected(e) {
    const button = e.target;
    this.setWireframe(button.checked);
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
        .filter((l) => l != "\x00" && l.length > 0); // junk

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

  getTextureSlotsMeta() {
    const out = {};
    ["i0", "i1", "i2", "i3"].forEach((ch) => {
      out[ch] = this._iChannelMeta[ch] ? { ...this._iChannelMeta[ch] } : null;
    });
    return out;
  }

  restoreTextureFromObjectUrl(ch, url, mime, pathHint) {
    const name =
      ch === "i0"
        ? "iChannel0"
        : ch === "i1"
        ? "iChannel1"
        : ch === "i2"
        ? "iChannel2"
        : ch === "i3"
        ? "iChannel3"
        : null;
    if (!name || !url) return;

    const img = new Image();
    img.onload = () => {
      const tex = new THREE.Texture(img);
      tex.needsUpdate = true;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;

      this._material.uniforms = this._material.uniforms || {};
      if (!this._material.uniforms[name])
        this._material.uniforms[name] = {
          type: "sampler2D",
          value: null,
          preset: true,
        };
      this._material.uniforms[name].value = tex;

      if (name === "iChannel0") {
        if (!this._material.uniforms.u_userTexture)
          this._material.uniforms.u_userTexture = {
            type: "sampler2D",
            value: null,
            preset: true,
          };
        this._material.uniforms.u_userTexture.value = tex;
      }

      if (this._material.userData && this._material.userData.shader) {
        const su = this._material.userData.shader.uniforms || {};
        if (su[name]) su[name].value = tex;
        if (name === "iChannel0" && su.u_userTexture)
          su.u_userTexture.value = tex;
      }

      const slot = document.querySelector(
        `#channels-panel .tex-slot[data-channel="${name}"]`
      );
      if (slot) slot.style.backgroundImage = "url(" + url + ")";

      this._material.needsUpdate = true;

      this._iChannelMeta = this._iChannelMeta || {};
      const key =
        name === "iChannel0"
          ? "i0"
          : name === "iChannel1"
          ? "i1"
          : name === "iChannel2"
          ? "i2"
          : "i3";
      this._iChannelMeta[key] = {
        src: url,
        name: pathHint || key,
        mimeType: mime,
      };
    };
    img.src = url;
  }

  clearTextureChannel(ch) {
    const name =
      ch === "i0"
        ? "iChannel0"
        : ch === "i1"
        ? "iChannel1"
        : ch === "i2"
        ? "iChannel2"
        : ch === "i3"
        ? "iChannel3"
        : null;
    if (!name) return;

    // materials uniforms
    if (this._material.uniforms && this._material.uniforms[name]) {
      this._material.uniforms[name].value = null;
    }
    if (this._material.userData && this._material.userData.shader) {
      const su = this._material.userData.shader.uniforms || {};
      if (su[name]) su[name].value = null;
    }
    if (name === "iChannel0") {
      if (this._material.uniforms && this._material.uniforms.u_userTexture) {
        this._material.uniforms.u_userTexture.value = null;
      }
      if (this._material.userData && this._material.userData.shader) {
        const su = this._material.userData.shader.uniforms || {};
        if (su.u_userTexture) su.u_userTexture.value = null;
      }
    }

    const slot = document.querySelector(
      `#channels-panel .tex-slot[data-channel="${name}"]`
    );
    if (slot) slot.style.backgroundImage = "none";

    // clears meta
    const key =
      name === "iChannel0"
        ? "i0"
        : name === "iChannel1"
        ? "i1"
        : name === "iChannel2"
        ? "i2"
        : "i3";
    this._iChannelMeta[key] = null;

    this._material.needsUpdate = true;
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

  _selectCamera(cameraType) {
    for (let i = 0; i < this._cameraInputButtons.length; i++) {
      const button = this._cameraInputButtons[i];
      if (button.id === cameraType) {
        button.checked = true;
        return;
      }
    }
  }

  _selectGeometry(geometryType) {
    for (let i = 0; i < this._geometryInputButtons.length; i++) {
      const button = this._geometryInputButtons[i];
      if (button.id === geometryType) {
        button.checked = true;
        return;
      }
    }
  }

  _isCameraSelected(cameraType) {
    for (let i = 0; i < this._cameraInputButtons.length; i++) {
      const button = this._cameraInputButtons[i];
      if (button.id === cameraType) {
        return button.checked;
      }
    }
  }

  _isGeometrySelected(geometryType) {
    for (let i = 0; i < this._geometryInputButtons.length; i++) {
      const button = this._geometryInputButtons[i];
      if (button.id === geometryType) {
        return button.checked;
      }
    }

    return false;
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
  _iChannelMeta;
}

export { Graphics, GraphicsConstructorParams, ShaderCompileLog };

export function initTexturePanelStatic(material, onMetaUpdate) {
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
      cb(tex, url, file);
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
    const name = slot.dataset.channel; // iChannel0..3
    const load = slot.querySelector(".tex-load");
    const clear = slot.querySelector(".tex-clear");
    const input = slot.querySelector('input[type="file"]');

    function apply(tex, url, file) {
      setUniform(name, tex);
      if (url) slot.style.backgroundImage = "url(" + url + ")";
      if (typeof onMetaUpdate === "function") {
        onMetaUpdate(name, {
          src: url,
          mimeType: (file && file.type) || undefined,
          name: file && file.name ? file.name : name,
        });
      }
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
      slot.style.backgroundImage = "none";
      material.needsUpdate = true;

      if (typeof onMetaUpdate === "function") {
        onMetaUpdate(name, null);
      }
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

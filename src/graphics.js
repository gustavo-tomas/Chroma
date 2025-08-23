import * as THREE from "three";

class Graphics {
  constructor(vertexCode, fragmentCode) {
    const canvas = document.getElementById("canvas");
    const viewPanel = document.getElementById("view-panel");

    const width = viewPanel.clientWidth;
    const height = viewPanel.clientHeight;

    this._camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
    this._camera.position.z = 1;

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0.5, 0.5, 0.5);

    // const geometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
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

    viewPanel.addEventListener("resize", this.onResize.bind(this));
    window.addEventListener("resize", this.onResize.bind(this));
    canvas.addEventListener("mousemove", this._onMouseMove.bind(this));
  }

  onVertexCodeUpdate(vertexCode) {
    this._material.vertexShader = vertexCode;
    this._material.needsUpdate = true;
  }

  onFragmentCodeUpdate(fragmentCode) {
    this._material.fragmentShader = fragmentCode;
    this._material.needsUpdate = true;
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
    const viewPanel = document.getElementById("view-panel");

    const width = viewPanel.clientWidth;
    const height = viewPanel.clientHeight;

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

  _onBeforeCompile(shader) {
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

    // Add user uniforms
    for (const [name, description] of Object.entries(shader.uniforms)) {
      const uniformStr = "uniform " + description.type + " " + name + ";\n";

      shader.vertexShader = uniformStr + shader.vertexShader;
      shader.fragmentShader = uniformStr + shader.fragmentShader;
    }

    this._material.userData.shader = shader;
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

  _scene;
  _camera;
  _renderer;
  _material;
  _mesh;
  _mousePositionNormalized; // [-1.0, 1.0]
  _screenResolution;
}

export { Graphics };

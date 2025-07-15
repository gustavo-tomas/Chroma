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

    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvas,
    });
    this._renderer.setSize(width, height);
    this._renderer.setAnimationLoop((time) => {
      const shader = this._mesh.material.userData.shader;

      if (shader) {
        // @TODO: use deltaTime
        shader.uniforms.time.value = time;
      }

      this._renderer.render(this._scene, this._camera);
    });

    viewPanel.addEventListener("resize", this.onResize);
    window.addEventListener("resize", this.onResize);
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
      let value;

      if (description.type == "vec3") {
        value = this._array3ToColor(description.value);
      } else {
        console.error("Unhandled uniform type: ", description.type);
        return;
      }

      let uniform = {
        type: description.type,
        value: value,
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
  }

  _onBeforeCompile(shader) {
    // These uniforms should be accessible but not modifiable by the user,
    // so we add them at the top without changing the editable code
    shader.uniforms["time"] = { type: "float", value: 0 };

    // Add user uniforms
    for (const [name, description] of Object.entries(shader.uniforms)) {
      const uniformStr = "uniform " + description.type + " " + name + ";\n";

      shader.vertexShader = uniformStr + shader.vertexShader;
      shader.fragmentShader = uniformStr + shader.fragmentShader;
    }

    this._material.userData.shader = shader;
  }

  // Helpers
  _array3ToColor(array) {
    // @TODO: This will crash if the indices are out of bounds
    const color = new THREE.Color(array[0], array[1], array[2]);
    return color;
  }

  _scene;
  _camera;
  _renderer;
  _material;
  _mesh;
}

export { Graphics };

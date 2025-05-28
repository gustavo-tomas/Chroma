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

    let uniforms = {
      colorB: { type: "vec3", value: new THREE.Color(0xacb6e5) },
      colorA: { type: "vec3", value: new THREE.Color(0x74ebd5) },
    };

    // const geometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const geometry = new THREE.PlaneGeometry(0.5, 0.5);
    this._material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexCode,
      fragmentShader: fragmentCode,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, this._material);
    this._scene.add(mesh);

    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvas,
    });
    this._renderer.setSize(width, height);
    this._renderer.setAnimationLoop((time) => {
      mesh.rotation.x = time / 2000;
      mesh.rotation.y = time / 1000;

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

  onResize(w1, w2) {
    const viewPanel = document.getElementById("view-panel");

    const width = viewPanel.clientWidth;
    const height = viewPanel.clientHeight;

    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();

    this._renderer.setSize(width, height);
  }

  _scene;
  _camera;
  _renderer;
  _material;
}

export { Graphics };

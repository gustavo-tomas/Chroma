import * as THREE from "three";

function vertexShader() {
  return `
        varying vec3 vUv; 
    
        void main() {
            vUv = position; 

            vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * modelViewPosition; 
        }
    `;
}

function fragmentShader() {
  return `
        uniform vec3 colorA; 
        uniform vec3 colorB; 
        varying vec3 vUv;

        void main() {
            gl_FragColor = vec4(mix(colorA, colorB, vUv.z), 1.0);
        }
    `;
}

let camera;
let renderer;
let view_panel;
let material;

function initializeGraphics() {
  const canvas = document.getElementById("canvas");
  view_panel = document.getElementById("view-panel");

  const width = view_panel.clientWidth;
  const height = view_panel.clientHeight;

  // init

  camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 10);
  camera.position.z = 1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.5, 0.5, 0.5);

  let uniforms = {
    colorB: { type: "vec3", value: new THREE.Color(0xacb6e5) },
    colorA: { type: "vec3", value: new THREE.Color(0x74ebd5) },
  };

  // const geometry = new THREE.BoxGeometry(0.2, 0.7, 0.2);
  const geometry = new THREE.PlaneGeometry(0.5, 0.5);
  material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    fragmentShader: fragmentShader(),
    vertexShader: vertexShader(),
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas });
  renderer.setSize(width, height);
  renderer.setAnimationLoop((time) => {
    mesh.rotation.x = time / 2000;
    mesh.rotation.y = time / 1000;

    renderer.render(scene, camera);
  });

  view_panel.addEventListener("resize", onResize);
  window.addEventListener("resize", onResize);
}

function onShaderChange(vertexShadercode) {
  material.vertexShader = vertexShadercode;
  material.needsUpdate = true;
}

function onResize() {
  const width = view_panel.clientWidth;
  const height = view_panel.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
}

export { initializeGraphics, onResize, onShaderChange };

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);


// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  5000
);

camera.position.set(0, 120, 220);


// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true
});

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);


// Controls
const controls = new OrbitControls(camera, renderer.domElement);


// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const light = new THREE.DirectionalLight(0xffffff, 1.5);

light.position.set(200, 300, 100);

scene.add(light);


// Loader
const loader = new GLTFLoader();

function loadModel(path) {

  return new Promise((resolve, reject) => {

    loader.load(
      path,
      gltf => resolve(gltf.scene),
      undefined,
      reject
    );

  });

}

function getXEdges(model) {

  const bounds = new THREE.Box3().setFromObject(model);

  return [bounds.min.x, bounds.max.x];

}

function getBoundsInfo(model) {

  const bounds = new THREE.Box3().setFromObject(model);

  const size = bounds.getSize(new THREE.Vector3());

  const center = bounds.getCenter(new THREE.Vector3());

  return { bounds, size, center };

}

function getConnectorAndFarX(model) {

  const [minX, maxX] = getXEdges(model);

  if(Math.abs(minX) < Math.abs(maxX)) {

    return { connectorX: minX, farX: maxX };

  }

  return { connectorX: maxX, farX: minX };

}

function addMeasurementGuides(bounds) {

  const size = bounds.getSize(new THREE.Vector3());

  const y = bounds.max.y + size.y * 0.08;

  const z = bounds.max.z + size.z * 0.08;

  const x = bounds.max.x + size.x * 0.04;

  const lengthMaterial = new THREE.LineBasicMaterial({ color: 0xff3333 });

  const widthMaterial = new THREE.LineBasicMaterial({ color: 0x3333ff });

  const lengthLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(bounds.min.x, y, z),
      new THREE.Vector3(bounds.max.x, y, z)
    ]),
    lengthMaterial
  );

  const widthLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, y, bounds.min.z),
      new THREE.Vector3(x, y, bounds.max.z)
    ]),
    widthMaterial
  );

  scene.add(lengthLine, widthLine);

}

function logMeasurements(bounds, buildInfo = {}) {

  const size = bounds.getSize(new THREE.Vector3());

  console.table({
    targetLength: totalLength.toFixed(2),
    measuredLength: size.x.toFixed(2),
    lengthDifference: (size.x - totalLength).toFixed(2),
    targetWidth: totalWidth.toFixed(2),
    measuredWidth: size.z.toFixed(2),
    widthDifference: (size.z - totalWidth).toFixed(2),
    targetHeight: buildInfo.targetHeight?.toFixed(2),
    measuredHeight: size.y.toFixed(2),
    heightDifference: buildInfo.targetHeight === undefined ? undefined : (size.y - buildInfo.targetHeight).toFixed(2),
    cargoCount: buildInfo.cargoCount,
    shipScale: buildInfo.shipScale?.toFixed(4),
    scaledBowLength: buildInfo.scaledBowLength?.toFixed(2),
    scaledCargoLength: buildInfo.scaledCargoLength?.toFixed(2),
    scaledSternLength: buildInfo.scaledSternLength?.toFixed(2),
    cargoRunLength: buildInfo.cargoRunLength?.toFixed(2),
    containerCountAcross: buildInfo.containerCountAcross,
    containerCountLong: buildInfo.containerCountLong,
    containerLevels: buildInfo.containerLevels,
    bridgeLimitHeight: buildInfo.bridgeLimitHeight?.toFixed(2),
    scaledBridgeViewClearance: buildInfo.scaledBridgeViewClearance?.toFixed(2),
    availableContainerHeight: buildInfo.availableContainerHeight?.toFixed(2),
    containerBlockLength: buildInfo.containerBlockLength?.toFixed(2),
    containerBlockWidth: buildInfo.containerBlockWidth?.toFixed(2)
  });

}

function tintModel(model, color) {

  model.traverse(child => {

    if(child.isMesh) {

      const materials = Array.isArray(child.material) ? child.material : [child.material];

      const tintedMaterials = materials.map(material => {

        const tintedMaterial = material.clone();

        tintedMaterial.color.set(color);

        return tintedMaterial;

      });

      child.material = Array.isArray(child.material) ? tintedMaterials : tintedMaterials[0];

    }

  });

}


// Ship parameters
const totalLength = 366;
const totalWidth = 51;

const sternOverlap = 3;

const containerSectionOverlap = 1;

const containerWidth = 6.06;
const containerSpacing = 0;
const containerYOffset = -5;
const bridgeViewClearance = 2;
const containerColors = [
  0xffd21f,
  0xe53935,
  0x29b6f6,
  0x43a047,
  0xff8f00
];
const showMeasurementGuides = true;


async function generateShip() {

  const bowModel = await loadModel("/models/sections/cargo_ship_01_bow.glb");

  const cargoModel = await loadModel("/models/sections/cargo_ship_01_container.glb");

  const sternModel = await loadModel("/models/sections/cargo_ship_01_stern.glb");

  const containerModel = await loadModel("/models/container.glb");


  const ship = new THREE.Group();

  const cargoEdges = getConnectorAndFarX(cargoModel);

  const bowEdges = getConnectorAndFarX(bowModel);

  const sternEdges = getConnectorAndFarX(sternModel);

  const cargoBounds = getBoundsInfo(cargoModel);

  const bowBounds = getBoundsInfo(bowModel);

  const sternBounds = getBoundsInfo(sternModel);

  const containerBounds = getBoundsInfo(containerModel);

  const cargoLength = Math.abs(cargoEdges.farX - cargoEdges.connectorX);

  const cargoWidth = cargoBounds.size.z;

  const containerScale = containerWidth / containerBounds.size.z;

  const containerLength = containerBounds.size.x * containerScale;

  const containerHeight = containerBounds.size.y * containerScale;

  const cargoDirection = Math.sign(cargoEdges.farX - cargoEdges.connectorX);

  const shipScale = totalWidth / cargoWidth;

  const scaledCargoLength = cargoLength * shipScale;

  const bowScale = shipScale;

  const sternScale = shipScale;

  const scaledBowLength = Math.abs(bowEdges.farX - bowEdges.connectorX) * bowScale;

  const scaledSternLength = Math.abs(sternEdges.farX - sternEdges.connectorX) * sternScale;

  const targetCargoRunLength = Math.max(
    scaledCargoLength,
    totalLength - scaledBowLength - scaledSternLength + containerSectionOverlap + sternOverlap
  );

  const cargoCount = Math.max(
    1,
    Math.round((targetCargoRunLength - containerSectionOverlap) / (scaledCargoLength - containerSectionOverlap))
  );

  const cargoStartX = 0;

  const cargoSpacing = (scaledCargoLength - containerSectionOverlap) * cargoDirection;

  const cargoRunLength = cargoCount * scaledCargoLength - (cargoCount - 1) * containerSectionOverlap;

  const cargoEndX = cargoStartX + cargoRunLength * cargoDirection;

  const cargoDeck = new THREE.Group();


  // Bow
  const bow = bowModel.clone(true);

  bow.scale.setScalar(bowScale);

  bow.position.x = cargoEndX - containerSectionOverlap * cargoDirection - bowEdges.connectorX * bowScale;

  bow.position.z = -bowBounds.center.z * bowScale;

  ship.add(bow);


  // Cargo
  for(let i = 0; i < cargoCount; i++) {

    const cargoConnectorX = cargoStartX + i * cargoSpacing;

    const cargo = cargoModel.clone(true);

    cargo.scale.setScalar(shipScale);

    cargo.position.x = cargoConnectorX - cargoEdges.connectorX * shipScale;

    cargo.position.z = -cargoBounds.center.z * shipScale;

    cargoDeck.add(cargo);
  }

  ship.add(cargoDeck);

  // Stern
  const stern = sternModel.clone(true);

  stern.scale.setScalar(sternScale);

  stern.position.x = cargoStartX + sternOverlap * cargoDirection - sternEdges.connectorX * sternScale;

  stern.position.z = -sternBounds.center.z * sternScale;

  ship.add(stern);

  const cargoDeckBounds = new THREE.Box3().setFromObject(cargoDeck);

  const cargoDeckSize = cargoDeckBounds.getSize(new THREE.Vector3());

  const hullBounds = new THREE.Box3().setFromObject(ship);

  const targetHeight = hullBounds.getSize(new THREE.Vector3()).y;

  const bridgeBounds = new THREE.Box3().setFromObject(stern);

  const scaledBridgeViewClearance = bridgeViewClearance * shipScale;

  const bridgeLimitHeight = bridgeBounds.max.y - scaledBridgeViewClearance;

  const availableContainerHeight = bridgeLimitHeight - cargoDeckBounds.max.y - containerYOffset;

  const containerLevels = Math.max(0, Math.floor(availableContainerHeight / containerHeight));

  const containerStepX = containerLength + containerSpacing;

  const containerStepZ = containerWidth + containerSpacing;

  const containerCountLong = Math.max(1, Math.floor((cargoDeckSize.x + containerSpacing) / containerStepX));

  const containerCountAcross = Math.max(1, Math.floor((cargoDeckSize.z + containerSpacing) / containerStepZ));

  const containerBlockLength = containerCountLong * containerLength + (containerCountLong - 1) * containerSpacing;

  const containerBlockWidth = containerCountAcross * containerWidth + (containerCountAcross - 1) * containerSpacing;

  const containerStartX = cargoDeckBounds.min.x + (cargoDeckSize.x - containerBlockLength) / 2 + containerLength / 2;

  const containerStartZ = cargoDeckBounds.min.z + (cargoDeckSize.z - containerBlockWidth) / 2 + containerWidth / 2;

  for(let level = 0; level < containerLevels; level++) {

    for(let i = 0; i < containerCountLong; i++) {

      for(let j = 0; j < containerCountAcross; j++) {

        const container = containerModel.clone(true);

        const containerColor = containerColors[Math.floor(Math.random() * containerColors.length)];

        const containerCenterX = containerStartX + i * containerStepX;

        const containerCenterZ = containerStartZ + j * containerStepZ;

        container.scale.setScalar(containerScale);

        tintModel(container, containerColor);

        container.position.x = containerCenterX - containerBounds.center.x * containerScale;

        container.position.y = cargoDeckBounds.max.y - containerBounds.bounds.min.y * containerScale + containerYOffset + level * containerHeight;

        container.position.z = containerCenterZ - containerBounds.center.z * containerScale;

        ship.add(container);
      }
    }
  }

  scene.add(ship);


  // Camera target
  const shipBounds = new THREE.Box3().setFromObject(ship);

  logMeasurements(shipBounds, {
    cargoCount,
    shipScale,
    scaledBowLength,
    scaledCargoLength,
    scaledSternLength,
    cargoRunLength,
    containerCountAcross,
    containerCountLong,
    containerLevels,
    bridgeLimitHeight,
    scaledBridgeViewClearance,
    availableContainerHeight,
    targetHeight,
    containerBlockLength,
    containerBlockWidth
  });

  if(showMeasurementGuides) {

    addMeasurementGuides(shipBounds);

  }

  const shipCenter = shipBounds.getCenter(new THREE.Vector3());

  controls.target.copy(shipCenter);

  camera.lookAt(shipCenter);

  controls.update();

}


function exportPNG() {

  renderer.render(scene, camera);

  const dataURL = renderer.domElement.toDataURL("image/png");

  const a = document.createElement("a");

  a.href = dataURL;

  a.download = "ship.png";

  a.click();

}


window.addEventListener("keydown", e => {

  if(e.key.toLowerCase() === "p") {

    exportPNG();

  }

});


generateShip().catch(error => {
  console.error("Could not generate ship:", error);
});


// Render loop
function animate() {

  requestAnimationFrame(animate);

  controls.update();

  renderer.render(scene, camera);

}

animate();


// Resize
window.addEventListener("resize", () => {

  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

});

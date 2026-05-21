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
    lengthCorrectionScale: buildInfo.lengthCorrectionScale?.toFixed(5),
    containerCountAcross: buildInfo.containerCountAcross,
    containerCountLong: buildInfo.containerCountLong,
    containerLevels: buildInfo.containerLevels,
    fillModel: buildInfo.fillModel,
    fillCountAcross: buildInfo.fillCountAcross,
    fillCountLong: buildInfo.fillCountLong,
    fillLevels: buildInfo.fillLevels,
    bridgeLimitHeight: buildInfo.bridgeLimitHeight?.toFixed(2),
    scaledBridgeViewClearance: buildInfo.scaledBridgeViewClearance?.toFixed(2),
    availableContainerHeight: buildInfo.availableContainerHeight?.toFixed(2),
    fillBlockLength: buildInfo.fillBlockLength?.toFixed(2),
    fillBlockWidth: buildInfo.fillBlockWidth?.toFixed(2),
    containerBlockLength: buildInfo.containerBlockLength?.toFixed(2),
    containerBlockWidth: buildInfo.containerBlockWidth?.toFixed(2)
  });

}

function fitShipLength(ship, targetLength) {

  const bounds = new THREE.Box3().setFromObject(ship);

  const size = bounds.getSize(new THREE.Vector3());

  if(size.x === 0) {

    return 1;

  }

  const centerX = bounds.getCenter(new THREE.Vector3()).x;

  const lengthCorrectionScale = targetLength / size.x;

  ship.scale.x *= lengthCorrectionScale;

  const correctedBounds = new THREE.Box3().setFromObject(ship);

  const correctedCenterX = correctedBounds.getCenter(new THREE.Vector3()).x;

  ship.position.x += centerX - correctedCenterX;

  return lengthCorrectionScale;

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
const totalLength = 400;
const totalWidth = 64;

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
const shipFillModel = "container";
const fillModels = {
  container: {
    path: "/models/container.glb",
    scalesWithShip: false,
    scale: 1,
    targetWidth: containerWidth,
    spacing: containerSpacing,
    yOffset: containerYOffset,
    stackToBridge: true,
    randomColors: containerColors
  },
  crane: {
    path: "/models/crane.glb",
    scalesWithShip: false,
    scale: 2,
    spacing: 30,
    yOffset: -1,
    xOffset: 5,
    zOffset: 20,
    alternateFacingSides: true,
    facingRotationY: 0,
    stackToBridge: false
  }
};
const showMeasurementGuides = true;


async function generateShip() {

  const bowModel = await loadModel("/models/sections/cargo_ship_01_bow.glb");

  const cargoModel = await loadModel("/models/sections/cargo_ship_01_container.glb");

  const sternModel = await loadModel("/models/sections/cargo_ship_01_stern.glb");

  const selectedFillModel = fillModels[shipFillModel] ? shipFillModel : "container";

  const fillConfig = fillModels[selectedFillModel];

  const fillModel = await loadModel(fillConfig.path);


  const ship = new THREE.Group();

  const cargoEdges = getConnectorAndFarX(cargoModel);

  const bowEdges = getConnectorAndFarX(bowModel);

  const sternEdges = getConnectorAndFarX(sternModel);

  const cargoBounds = getBoundsInfo(cargoModel);

  const bowBounds = getBoundsInfo(bowModel);

  const sternBounds = getBoundsInfo(sternModel);

  const fillBounds = getBoundsInfo(fillModel);

  const cargoLength = Math.abs(cargoEdges.farX - cargoEdges.connectorX);

  const cargoWidth = cargoBounds.size.z;

  const cargoDirection = Math.sign(cargoEdges.farX - cargoEdges.connectorX);

  const shipScale = totalWidth / cargoWidth;

  const fillBaseScale = fillConfig.scalesWithShip
    ? shipScale
    : fillConfig.targetWidth
      ? fillConfig.targetWidth / fillBounds.size.z
      : 1;

  const fillScale = fillBaseScale * (fillConfig.scale ?? 1);

  const fillLength = fillBounds.size.x * fillScale;

  const fillWidth = fillBounds.size.z * fillScale;

  const fillHeight = fillBounds.size.y * fillScale;

  const fillSpacing = fillConfig.scalesWithShip ? fillConfig.spacing * shipScale : fillConfig.spacing;

  const fillYOffset = fillConfig.scalesWithShip ? fillConfig.yOffset * shipScale : fillConfig.yOffset;

  const fillXOffsetValue = fillConfig.xOffset ?? 0;

  const fillZOffsetValue = fillConfig.zOffset ?? 0;

  const fillXOffset = fillConfig.scalesWithShip ? fillXOffsetValue * shipScale : fillXOffsetValue;

  const fillZOffset = fillConfig.scalesWithShip ? fillZOffsetValue * shipScale : fillZOffsetValue;

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

  const availableFillHeight = bridgeLimitHeight - cargoDeckBounds.max.y - fillYOffset;

  const fillLevels = fillConfig.stackToBridge
    ? Math.max(0, Math.floor(availableFillHeight / fillHeight))
    : 1;

  const fillStepX = fillLength + fillSpacing;

  const fillStepZ = fillWidth + fillSpacing;

  const fillCountLong = Math.max(1, Math.floor((cargoDeckSize.x + fillSpacing) / fillStepX));

  const fillCountAcross = Math.max(1, Math.floor((cargoDeckSize.z + fillSpacing) / fillStepZ));

  const fillBlockLength = fillCountLong * fillLength + (fillCountLong - 1) * fillSpacing;

  const fillBlockWidth = fillCountAcross * fillWidth + (fillCountAcross - 1) * fillSpacing;

  const fillStartX = cargoDeckBounds.min.x + (cargoDeckSize.x - fillBlockLength) / 2 + fillLength / 2;

  const fillStartZ = cargoDeckBounds.min.z + (cargoDeckSize.z - fillBlockWidth) / 2 + fillWidth / 2;

  for(let level = 0; level < fillLevels; level++) {

    for(let i = 0; i < fillCountLong; i++) {

      for(let j = 0; j < fillCountAcross; j++) {

        const fill = fillModel.clone(true);

        const fillCenterX = fillStartX + i * fillStepX + fillXOffset;

        const fillCenterZ = fillStartZ + j * fillStepZ + fillZOffset;

        fill.scale.setScalar(fillScale);

        if(fillConfig.alternateFacingSides) {

          const fillIndex = i * fillCountAcross + j;

          fill.rotation.y = (fillConfig.facingRotationY ?? 0) + (fillIndex % 2 === 0 ? 0 : Math.PI);

        }

        if(fillConfig.randomColors) {

          const fillColor = fillConfig.randomColors[Math.floor(Math.random() * fillConfig.randomColors.length)];

          tintModel(fill, fillColor);

        }

        fill.position.x = fillCenterX - fillBounds.center.x * fillScale;

        fill.position.y = cargoDeckBounds.max.y - fillBounds.bounds.min.y * fillScale + fillYOffset + level * fillHeight;

        fill.position.z = fillCenterZ - fillBounds.center.z * fillScale;

        ship.add(fill);
      }
    }
  }

  const lengthCorrectionScale = fitShipLength(ship, totalLength);

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
    lengthCorrectionScale,
    containerCountAcross: selectedFillModel === "container" ? fillCountAcross : undefined,
    containerCountLong: selectedFillModel === "container" ? fillCountLong : undefined,
    containerLevels: selectedFillModel === "container" ? fillLevels : undefined,
    fillModel: selectedFillModel,
    fillCountAcross,
    fillCountLong,
    fillLevels,
    bridgeLimitHeight,
    scaledBridgeViewClearance,
    availableContainerHeight: selectedFillModel === "container" ? availableFillHeight : undefined,
    targetHeight,
    fillBlockLength,
    fillBlockWidth,
    containerBlockLength: selectedFillModel === "container" ? fillBlockLength : undefined,
    containerBlockWidth: selectedFillModel === "container" ? fillBlockWidth : undefined
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

import {
  FLAVORS,
  SHEET_URL,
  SW,
  BH,
  mod5,
  Flavor,
} from '../data/flavors';
import {
  computeVertexZ,
  computeCameraParams,
  mixWithInk,
  hexToRgba,
  BarScreenState,
} from '../utils/math';

const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string
) => Promise<any>;

export interface BarInstance {
  group: any;
  frontMesh: any;
  backMesh: any;
  frontMat: any;
  backMat: any;
  shadowMesh: any;
  shadowMat: any;
  flavorIdx: number;
  slotJ: number;
}

export interface BarSceneController {
  updateBar: (
    bar: BarInstance,
    flavorIdx: number,
    state: BarScreenState,
    vw: number,
    vh: number
  ) => void;
  pool: BarInstance[];
  traveller: BarInstance;
  resize: (vw: number, vh: number) => void;
  render: () => void;
  raycastHeroBar: (
    clientX: number,
    clientY: number,
    vw: number,
    vh: number
  ) => number | null;
  isSoftwareGl: boolean;
  afterDraw: (cb: () => void) => void;
  dispose: () => void;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBackCanvas(
  canvas: HTMLCanvasElement,
  flavor: Flavor,
  img: HTMLImageElement | null
) {
  const [bx, by, bw, bh] = flavor.box;
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  const sealH = 0.075 * H;

  if (img && img.naturalWidth > 0) {
    const scale = img.naturalWidth / SW;
    const sx = (bx - 4) * scale;
    const sy = (by - 4) * scale;
    const sw = (bw + 8) * scale;
    const sh = (bh + 8) * scale;

    ctx.save();
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
    ctx.restore();

    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = hexToRgba(flavor.color, 0.9);
    ctx.fillRect(0, sealH, W, H - 2 * sealH);

    ctx.fillStyle = hexToRgba(flavor.color, 0.35);
    ctx.fillRect(0, 0, W, sealH);
    ctx.fillRect(0, H - sealH, W, sealH);
  } else {
    drawRoundedRect(ctx, W * 0.02, H * 0.01, W * 0.96, H * 0.98, W * 0.04);
    ctx.fillStyle = flavor.color;
    ctx.fill();
    ctx.globalCompositeOperation = 'source-atop';
  }

  const sheen = ctx.createLinearGradient(0, 0, W, 0);
  sheen.addColorStop(0, 'rgba(0,0,0,.10)');
  sheen.addColorStop(0.28, 'rgba(255,255,255,.14)');
  sheen.addColorStop(0.5, 'rgba(0,0,0,0)');
  sheen.addColorStop(0.8, 'rgba(0,0,0,.04)');
  sheen.addColorStop(1, 'rgba(0,0,0,.14)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'source-over';
  const ink = mixWithInk(flavor.color, 0.78);

  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${Math.round(0.085 * W)}px "Archivo Black", sans-serif`;
  ctx.fillText('STRIDE', W / 2, 0.15 * H);

  ctx.font = `500 ${Math.round(0.042 * W)}px "DM Mono", monospace`;
  ctx.fillText(`${flavor.name.toUpperCase()} · 50 G`, W / 2, 0.185 * H);

  const px = 0.15 * W;
  const py = 0.215 * H;
  const pw = 0.7 * W;
  const ph = 0.36 * H;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  drawRoundedRect(ctx, px, py, pw, ph, 0.03 * W);
  ctx.fill();

  const innerLeft = 0.195 * W;
  const innerRight = 0.805 * W;
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.font = `400 ${Math.round(0.058 * W)}px "Archivo Black", sans-serif`;
  ctx.fillText('NUTRITION', innerLeft, 0.248 * H);

  ctx.font = `400 ${Math.round(0.032 * W)}px "DM Mono", monospace`;
  ctx.fillText('Serving size 1 bar (50 g)', innerLeft, 0.278 * H);

  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, 0.005 * W);
  ctx.beginPath();
  ctx.moveTo(innerLeft, 0.298 * H);
  ctx.lineTo(innerRight, 0.298 * H);
  ctx.stroke();

  const rows: [string, string, number][] = [
    ['Calories', '210', 500],
    ['Protein', '12 g', 500],
    ['Total fat', '9 g', 400],
    ['Carbohydrate', '22 g', 400],
    ['Fibre', '6 g', 400],
    ['Sugars', '8 g', 400],
    ['Salt', '0.2 g', 400],
  ];

  rows.forEach(([label, val, weight], idx) => {
    const ry = (0.324 + idx * 0.034) * H;
    ctx.font = `${weight} ${Math.round(0.032 * W)}px "DM Mono", monospace`;
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.fillText(label, innerLeft, ry);
    ctx.textAlign = 'right';
    ctx.fillText(val, innerRight, ry);

    const lineY = ry + 0.015 * H;
    ctx.strokeStyle = 'rgba(28, 26, 31, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerLeft, lineY);
    ctx.lineTo(innerRight, lineY);
    ctx.stroke();
  });

  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = `500 ${Math.round(0.036 * W)}px "DM Mono", monospace`;
  ctx.fillText('INGREDIENTS', W / 2, 0.62 * H);

  ctx.font = `400 ${Math.round(0.034 * W)}px "DM Mono", monospace`;
  const maxWrapW = 0.7 * W;
  const words = flavor.ingredients.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const testLine = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(testLine).width > maxWrapW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = testLine;
    }
  }
  if (cur) lines.push(cur);

  lines.forEach((line, i) => {
    ctx.fillText(line, W / 2, (0.648 + i * 0.022) * H);
  });

  const bcW = 0.56 * W;
  const bcH = 0.105 * H;
  const bcX = (W - bcW) / 2;
  const bcY = 0.735 * H;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  drawRoundedRect(ctx, bcX, bcY, bcW, bcH, 0.022 * W);
  ctx.fill();

  ctx.fillStyle = ink;
  let seed = 1009 + flavor.index * 7919;
  const rand = () => {
    seed = (seed * 48271) % 0x7fffffff;
    return seed / 0x7fffffff;
  };
  let bxCursor = bcX + 0.05 * W;
  const bxEnd = bcX + bcW - 0.05 * W;
  const barTop = bcY + 0.014 * H;
  const barHeight = 0.058 * H;
  while (bxCursor < bxEnd) {
    const barW = Math.max(1.2, (0.004 + rand() * 0.011) * W);
    if (bxCursor + barW > bxEnd) break;
    ctx.fillRect(bxCursor, barTop, barW, barHeight);
    bxCursor += barW + (0.004 + rand() * 0.009) * W;
  }

  ctx.font = `400 ${Math.round(0.026 * W)}px "DM Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(`5 060842 1900${flavor.index + 1}4`, W / 2, bcY + 0.088 * H);

  ctx.fillStyle = ink;
  ctx.font = `500 ${Math.round(0.036 * W)}px "DM Mono", monospace`;
  ctx.fillText('PRESSED, NOT BAKED', W / 2, 0.885 * H);
}

function drawFrontCanvas(
  canvas: HTMLCanvasElement,
  flavor: Flavor,
  img: HTMLImageElement | null
) {
  const [bx, by, bw, bh] = flavor.box;
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  if (img && img.naturalWidth > 0) {
    const scale = img.naturalWidth / SW;
    const sx = (bx - 4) * scale;
    const sy = (by - 4) * scale;
    const sw = (bw + 8) * scale;
    const sh = (bh + 8) * scale;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
  } else {
    drawRoundedRect(ctx, W * 0.02, H * 0.01, W * 0.96, H * 0.98, W * 0.04);
    ctx.fillStyle = flavor.color;
    ctx.fill();
    ctx.fillStyle = '#1c1a1f';
    ctx.textAlign = 'center';
    ctx.font = `400 ${Math.round(0.11 * W)}px "Archivo Black", sans-serif`;
    ctx.fillText('STRIDE', W / 2, H * 0.25);
    ctx.font = `400 ${Math.round(0.07 * W)}px "Archivo Black", sans-serif`;
    ctx.fillText(flavor.name.toUpperCase(), W / 2, H * 0.48);
  }
}

export async function initBarScene(
  canvas: HTMLCanvasElement,
  onReady?: () => void
): Promise<BarSceneController> {
  const THREE = await dynamicImport('three');
  const { RoomEnvironment } = await dynamicImport(
    'three/addons/environments/RoomEnvironment.js'
  );

  const isSoftwareGl = (() => {
    try {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return false;
    }
  })();

  const vw0 = window.innerWidth;
  const vh0 = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isSoftwareGl,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const updatePixelRatio = (w: number) => {
    const cap = w < 820 ? 1.75 : 2;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, cap)
    );
  };
  updatePixelRatio(vw0);
  renderer.setSize(vw0, vh0, false);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
  dirLight.position.set(-0.6, 0.9, 1.4);
  scene.add(dirLight);

  const camParams = computeCameraParams(vw0, vh0);
  const camera = new THREE.PerspectiveCamera(
    camParams.fovDeg,
    vw0 / Math.max(1, vh0),
    camParams.near,
    camParams.far
  );
  camera.position.set(0, 0, camParams.D);

  const frontGeo = new THREE.PlaneGeometry(1, BH, 30, 64);
  const backGeo = new THREE.PlaneGeometry(1, BH, 30, 64);

  {
    const posF = frontGeo.attributes.position;
    const uvF = frontGeo.attributes.uv;
    for (let i = 0; i < posF.count; i++) {
      const u = uvF.getX(i);
      const v = uvF.getY(i);
      const z = computeVertexZ(u, v);
      posF.setZ(i, z);
    }
    posF.needsUpdate = true;
    frontGeo.computeVertexNormals();

    const posB = backGeo.attributes.position;
    const uvB = backGeo.attributes.uv;
    for (let i = 0; i < posB.count; i++) {
      const u = uvB.getX(i);
      const v = uvB.getY(i);
      const z = computeVertexZ(u, v);
      posB.setZ(i, -z);
      uvB.setX(i, 1 - u);
    }
    posB.needsUpdate = true;
    uvB.needsUpdate = true;

    const indexB = backGeo.index;
    if (indexB) {
      const arr = indexB.array;
      for (let i = 0; i < arr.length; i += 3) {
        const tmp = arr[i + 1];
        arr[i + 1] = arr[i + 2];
        arr[i + 2] = tmp;
      }
      indexB.needsUpdate = true;
    }
    backGeo.computeVertexNormals();
  }

  const shadowGeo = new THREE.PlaneGeometry(1.25, 1.04 * BH);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 256;
  const sCtx = shadowCanvas.getContext('2d')!;
  sCtx.save();
  sCtx.translate(64, 128);
  sCtx.scale(1, 2);
  const sGrad = sCtx.createRadialGradient(0, 0, 4, 0, 0, 60);
  sGrad.addColorStop(0, 'rgba(30, 18, 40, 0.55)');
  sGrad.addColorStop(0.55, 'rgba(30, 18, 40, 0.22)');
  sGrad.addColorStop(1, 'rgba(30, 18, 40, 0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(-64, -64, 128, 128);
  sCtx.restore();

  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  shadowTex.colorSpace = THREE.SRGBColorSpace;

  const frontCanvases: HTMLCanvasElement[] = [];
  const backCanvases: HTMLCanvasElement[] = [];
  const frontTextures: any[] = [];
  const backTextures: any[] = [];

  for (let f = 0; f < 5; f++) {
    const flavor = FLAVORS[f];
    const bw = flavor.box[2];
    const W = Math.round((bw + 8) * 1.5 * 0.75);
    const H = Math.round(W * BH);

    const fc = document.createElement('canvas');
    fc.width = W;
    fc.height = H;
    drawFrontCanvas(fc, flavor, null);
    const fTex = new THREE.CanvasTexture(fc);
    fTex.colorSpace = THREE.SRGBColorSpace;
    fTex.anisotropy = 8;

    const bc = document.createElement('canvas');
    bc.width = W;
    bc.height = H;
    drawBackCanvas(bc, flavor, null);
    const bTex = new THREE.CanvasTexture(bc);
    bTex.colorSpace = THREE.SRGBColorSpace;
    bTex.anisotropy = 8;

    frontCanvases.push(fc);
    backCanvases.push(bc);
    frontTextures.push(fTex);
    backTextures.push(bTex);
  }

  const loadFontsPromise = Promise.all([
    document.fonts.load('400 16px "Archivo Black"'),
    document.fonts.load('400 16px "DM Mono"'),
    document.fonts.load('500 16px "DM Mono"'),
    document.fonts.load('700 16px "Inter"'),
  ]).catch(() => {});

  const loadImagePromise = new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = SHEET_URL;
  });

  Promise.all([loadFontsPromise, loadImagePromise]).then(([, img]) => {
    for (let f = 0; f < 5; f++) {
      drawFrontCanvas(frontCanvases[f], FLAVORS[f], img);
      drawBackCanvas(backCanvases[f], FLAVORS[f], img);
      frontTextures[f].needsUpdate = true;
      backTextures[f].needsUpdate = true;
    }
    onReady?.();
  });

  function createBarInstance(initialFlavor = 0): BarInstance {
    const fIdx = mod5(initialFlavor);
    const frontMat = new THREE.MeshPhysicalMaterial({
      map: frontTextures[fIdx],
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.45,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.42,
    });
    const backMat = new THREE.MeshPhysicalMaterial({
      map: backTextures[fIdx],
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.45,
      metalness: 0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.32,
      envMapIntensity: 0.42,
    });

    const frontMesh = new THREE.Mesh(frontGeo, frontMat);
    const backMesh = new THREE.Mesh(backGeo, backMat);
    const group = new THREE.Group();
    group.rotation.order = 'ZYX';
    group.add(frontMesh);
    group.add(backMesh);
    scene.add(group);

    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.5,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.renderOrder = -1;
    scene.add(shadowMesh);

    const inst: BarInstance = {
      group,
      frontMesh,
      backMesh,
      frontMat,
      backMat,
      shadowMesh,
      shadowMat,
      flavorIdx: fIdx,
      slotJ: 0,
    };
    frontMesh.userData.barInstance = inst;
    backMesh.userData.barInstance = inst;
    return inst;
  }

  const pool: BarInstance[] = [];
  for (let i = 0; i < 11; i++) {
    pool.push(createBarInstance(i));
  }
  const traveller = createBarInstance(1);

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  function updateBar(
    bar: BarInstance,
    flavorIdx: number,
    state: BarScreenState,
    vw: number,
    vh: number
  ) {
    const fIdx = mod5(flavorIdx);
    if (bar.flavorIdx !== fIdx) {
      bar.flavorIdx = fIdx;
      bar.frontMat.map = frontTextures[fIdx];
      bar.backMat.map = backTextures[fIdx];
    }

    if (state.op <= 0.01 || state.h <= 1) {
      bar.group.visible = false;
      bar.shadowMesh.visible = false;
      return;
    }

    bar.group.visible = true;
    const camD = camera.position.z || 2200;
    const wx = state.x - vw / 2;
    const wy = vh / 2 - state.y;
    const pScale = (camD - state.z) / camD;
    bar.group.position.set(wx * pScale, wy * pScale, state.z);

    const s = (state.h / BH) * pScale;
    bar.group.scale.set(s * state.sx, s * state.sy, s);

    const rxRad = (state.rx * Math.PI) / 180;
    const ryRad = (state.ry * Math.PI) / 180;
    const rzRad = (-state.rz * Math.PI) / 180;
    bar.group.rotation.set(rxRad, ryRad, rzRad);

    bar.frontMat.opacity = state.op;
    bar.backMat.opacity = state.op;

    if (state.shadow > 0.01) {
      bar.shadowMesh.visible = true;
      const zShadow = state.z - 0.32 * state.h;
      const shScale = (camD - zShadow) / camD;
      bar.shadowMesh.position.set(
        wx * shScale,
        (wy - 0.045 * state.h) * shScale,
        zShadow
      );
      bar.shadowMesh.rotation.set(0, 0, rzRad);
      const widthScale = Math.max(0.3, Math.abs(Math.cos(ryRad)));
      const sSh = (state.h / BH) * shScale;
      bar.shadowMesh.scale.set(sSh * state.sx * widthScale, sSh * state.sy, 1);
      bar.shadowMat.opacity = 0.5 * state.op * state.shadow;
    } else {
      bar.shadowMesh.visible = false;
    }
  }

  function resize(vw: number, vh: number) {
    updatePixelRatio(vw);
    renderer.setSize(vw, vh, false);
    const cp = computeCameraParams(vw, vh);
    camera.fov = cp.fovDeg;
    camera.aspect = vw / Math.max(1, vh);
    camera.near = cp.near;
    camera.far = cp.far;
    camera.position.set(0, 0, cp.D);
    camera.updateProjectionMatrix();
  }

  function raycastHeroBar(
    clientX: number,
    clientY: number,
    vw: number,
    vh: number
  ): number | null {
    pointerNdc.x = (clientX / vw) * 2 - 1;
    pointerNdc.y = -(clientY / vh) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);

    const meshes: any[] = [];
    for (const b of pool) {
      if (b.group.visible) {
        meshes.push(b.frontMesh, b.backMesh);
      }
    }
    if (traveller.group.visible) {
      meshes.push(traveller.frontMesh, traveller.backMesh);
    }

    const hits = raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const hitBar = hits[0].object.userData.barInstance as
        | BarInstance
        | undefined;
      if (hitBar) {
        return hitBar.slotJ;
      }
    }
    return null;
  }

  let syncTimer = 0;
  function afterDraw(cb: (now: number) => void) {
    const gl = renderer.getContext() as WebGL2RenderingContext | null;
    if (!gl || typeof gl.fenceSync !== 'function') {
      syncTimer = window.setTimeout(() => requestAnimationFrame(cb), 16);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (!sync) {
        requestAnimationFrame(cb);
        return;
      }
      const st = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (st === gl.UNSIGNALED) {
        syncTimer = window.setTimeout(poll, 4);
      } else {
        gl.deleteSync(sync);
        requestAnimationFrame(cb);
      }
    };
    syncTimer = window.setTimeout(poll, 4);
  }

  return {
    updateBar,
    pool,
    traveller,
    resize,
    render: () => renderer.render(scene, camera),
    raycastHeroBar,
    isSoftwareGl,
    afterDraw,
    dispose: () => {
      window.clearTimeout(syncTimer);
      frontGeo.dispose();
      backGeo.dispose();
      shadowGeo.dispose();
      shadowTex.dispose();
      frontTextures.forEach((t) => t.dispose());
      backTextures.forEach((t) => t.dispose());
      renderer.dispose();
    },
  };
}

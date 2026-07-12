/**
 * ==========================================================================
 * BLUSH AR — script.js
 * --------------------------------------------------------------------------
 * Filtro de blush em tempo real usando MediaPipe Face Landmarker + Canvas 2D.
 *
 * Estrutura do arquivo:
 *   1. Imports / constantes
 *   2. Referências de DOM
 *   3. Estado global da aplicação
 *   4. CameraManager   -> lista/seleciona/inicia webcams (inclui Iriun)
 *   5. FaceTracker      -> carrega e executa o MediaPipe Face Landmarker
 *   6. BlushRenderer    -> desenha o blush realista no canvas
 *   7. Loop principal de renderização (com contador de FPS)
 *   8. Ligação da interface (sliders, paleta de cores, botões, etc.)
 *   9. Inicialização da aplicação
 * ==========================================================================
 */

import {
  FaceLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

/* =========================================================================
   1. CONSTANTES
   ========================================================================= */

// Paleta oficial de cores de blush solicitada.
const BLUSH_COLORS = [
  { id: "rosa-claro", label: "Rosa Claro", emoji: "🌸", hex: "#F4B6C2" },
  { id: "rosa-bebe", label: "Rosa Bebê", emoji: "🌷", hex: "#F7C9CE" },
  { id: "rosa-pink", label: "Rosa Pink", emoji: "🌺", hex: "#EC6E9E" },
  { id: "pessego", label: "Pêssego", emoji: "🍑", hex: "#F4A883" },
  { id: "coral", label: "Coral", emoji: "🧡", hex: "#F07B62" },
  { id: "rosado-queimado", label: "Rosado Queimado", emoji: "🌹", hex: "#C7677A" },
  { id: "rose", label: "Rosé", emoji: "🩷", hex: "#E497A6" },
  { id: "terracota", label: "Terracota", emoji: "🤎", hex: "#B96E52" },
];

// Índices dos landmarks do MediaPipe FaceMesh (468 pontos) usados no filtro.
// Referência visual: https://storage.googleapis.com/mediapipe-assets/documentation/mediapipe_face_landmark_fullsize.png
const LANDMARKS = {
  cheekRight: 50, // maçã do rosto do lado direito da imagem (sem espelhar)
  cheekLeft: 280, // maçã do rosto do lado esquerdo da imagem
  faceEdgeRight: 234,
  faceEdgeLeft: 454,
  // pontos usados para medir a "compressão" de cada lado (rotação de cabeça)
  eyeRight: 130,
  eyeLeft: 359,
  mouthRight: 61,
  mouthLeft: 291,
  noseTip: 1,
};

// Configurações de cada formato de blush: proporção (largura x altura),
// deslocamento vertical relativo e suavidade extra da borda.
const SHAPE_PRESETS = {
  natural: { ratioX: 1.0, ratioY: 0.75, offsetY: 0.0, softness: 1.0 },
  oval: { ratioX: 0.85, ratioY: 1.15, offsetY: -0.05, softness: 1.0 },
  coreano: { ratioX: 1.25, ratioY: 0.65, offsetY: -0.12, softness: 1.3 }, // mais alto e difuso, efeito "gradiente sob os olhos"
  circular: { ratioX: 1.0, ratioY: 1.0, offsetY: 0.02, softness: 0.85 },
  alongado: { ratioX: 0.7, ratioY: 1.4, offsetY: 0.05, softness: 1.05 },
};

const DEFAULT_SETTINGS = {
  colorId: "rosa-pink",
  intensity: 55, // 0-100
  size: 100, // 50-180 (%)
  blur: 16, // 0-40 px
  shape: "natural",
  symmetry: true,
  showLandmarks: false,
  mirrored: true,
  darkMode: false,
};

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

/* =========================================================================
   2. REFERÊNCIAS DE DOM
   ========================================================================= */

const el = {
  permissionScreen: document.getElementById("permissionScreen"),
  btnRequestCamera: document.getElementById("btnRequestCamera"),
  permissionStatus: document.getElementById("permissionStatus"),

  app: document.getElementById("app"),
  cameraSelect: document.getElementById("cameraSelect"),
  fpsCounter: document.getElementById("fpsCounter"),
  faceStatus: document.getElementById("faceStatus"),
  btnDarkMode: document.getElementById("btnDarkMode"),

  previewFrame: document.getElementById("previewFrame"),
  video: document.getElementById("video"),
  overlayCanvas: document.getElementById("overlayCanvas"),
  loadingModel: document.getElementById("loadingModel"),

  btnMirror: document.getElementById("btnMirror"),
  btnFullscreen: document.getElementById("btnFullscreen"),
  btnLandmarks: document.getElementById("btnLandmarks"),

  btnCapture: document.getElementById("btnCapture"),
  btnReset: document.getElementById("btnReset"),

  colorPalette: document.getElementById("colorPalette"),
  sliderIntensity: document.getElementById("sliderIntensity"),
  valueIntensity: document.getElementById("valueIntensity"),
  sliderSize: document.getElementById("sliderSize"),
  valueSize: document.getElementById("valueSize"),
  sliderBlur: document.getElementById("sliderBlur"),
  valueBlur: document.getElementById("valueBlur"),
  shapeOptions: document.getElementById("shapeOptions"),
  toggleSymmetry: document.getElementById("toggleSymmetry"),

  captureCanvas: document.getElementById("captureCanvas"),
};

const ctx = el.overlayCanvas.getContext("2d");

/* =========================================================================
   3. ESTADO GLOBAL
   ========================================================================= */

const state = {
  settings: { ...DEFAULT_SETTINGS },
  currentStream: null,
  faceLandmarker: null,
  lastVideoTime: -1,
  latestResult: null,
  fps: 0,
  frameTimes: [],
  modelRecovering: false,
};

/* =========================================================================
   4. CAMERA MANAGER
   Responsável por listar dispositivos de vídeo, detectar automaticamente
   a Iriun Webcam (ou câmeras virtuais equivalentes) e iniciar o stream.
   ========================================================================= */

class CameraManager {
  /** Solicita permissão inicial (necessária para enumerar labels dos devices). */
  static async requestInitialPermission() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    // Paramos esse stream de "sondagem" — o stream real é aberto depois,
    // já com o deviceId escolhido.
    stream.getTracks().forEach((track) => track.stop());
  }

  /** Lista todas as câmeras de vídeo disponíveis no navegador. */
  static async listVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput");
  }

  /**
   * Escolhe automaticamente a melhor câmera:
   * 1) Iriun Webcam, se disponível
   * 2) DroidCam / OBS Virtual Camera, se disponíveis
   * 3) Primeira câmera da lista (geralmente a webcam integrada)
   */
  static pickBestDevice(devices) {
    const byLabel = (needle) =>
      devices.find((d) => d.label.toLowerCase().includes(needle));

    return (
      byLabel("iriun") ||
      byLabel("droidcam") ||
      byLabel("obs virtual camera") ||
      byLabel("obs-camera") ||
      devices[0] ||
      null
    );
  }

  /** Inicia o stream de vídeo para um deviceId específico. */
  static async startStream(deviceId) {
    const constraints = {
      audio: false,
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        // Resolução moderada: reduz a carga sobre o modelo de detecção
        // facial (mais estabilidade, especialmente com câmeras virtuais
        // como Iriun/DroidCam/OBS) sem prejudicar visivelmente a qualidade
        // do preview.
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: deviceId ? undefined : "user",
      },
    };
    return navigator.mediaDevices.getUserMedia(constraints);
  }
}

/* =========================================================================
   5. FACE TRACKER
   Encapsula o carregamento e a execução do modelo MediaPipe Face Landmarker.
   ========================================================================= */

class FaceTracker {
  /**
   * Cria uma instância do Face Landmarker.
   * @param {{preferGpu?: boolean}} options
   */
  static async create({ preferGpu = false } = {}) {
    const filesetResolver = await FilesetResolver.forVisionTasks(WASM_URL);

    const baseConfig = {
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
      runningMode: "VIDEO",
      numFaces: 1,
    };

    // O delegate "CPU" é o padrão aqui porque é muito mais estável em uma
    // ampla gama de navegadores/placas de vídeo e, principalmente, com
    // câmeras virtuais (Iriun, DroidCam, OBS): o delegate "GPU" já
    // demonstrou travar de forma irrecuperável (RuntimeError "Aborted()")
    // durante a inferência em certas combinações de vídeo/driver. Para uma
    // única face em resolução moderada, o CPU dá conta tranquilamente de
    // 30+ FPS na maioria das máquinas.
    const order = preferGpu ? ["GPU", "CPU"] : ["CPU", "GPU"];

    let lastError = null;
    for (const delegate of order) {
      try {
        console.info(`[BlushAR] Carregando Face Landmarker (delegate: ${delegate})…`);
        return await FaceLandmarker.createFromOptions(filesetResolver, {
          ...baseConfig,
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
        });
      } catch (err) {
        console.warn(`[BlushAR] Falha ao carregar com delegate ${delegate}:`, err);
        lastError = err;
      }
    }
    throw lastError;
  }
}

/* =========================================================================
   6. BLUSH RENDERER
   Todo o desenho do blush "realista": gradiente radial + blur + blending.
   ========================================================================= */

class BlushRenderer {
  /**
   * Desenha o blush nas duas bochechas a partir dos landmarks detectados.
   * @param {CanvasRenderingContext2D} c - contexto 2D do canvas de overlay
   * @param {Array} landmarks - lista de 468 pontos normalizados (x,y em 0-1)
   * @param {number} width - largura do canvas em px
   * @param {number} height - altura do canvas em px
   * @param {object} settings - configurações atuais do filtro
   */
  static draw(c, landmarks, width, height, settings) {
    const shape = SHAPE_PRESETS[settings.shape];
    const color = BLUSH_COLORS.find((col) => col.id === settings.colorId).hex;

    // Distância entre as bordas do rosto: usada como referência de escala,
    // assim o blush cresce/diminui proporcionalmente ao se aproximar/afastar.
    const p = (idx) => ({
      x: landmarks[idx].x * width,
      y: landmarks[idx].y * height,
    });

    const faceRight = p(LANDMARKS.faceEdgeRight);
    const faceLeft = p(LANDMARKS.faceEdgeLeft);
    const faceWidth = distance(faceRight, faceLeft);

    // Raio base do blush proporcional à largura do rosto e ao slider "Tamanho".
    const baseRadius = faceWidth * 0.22 * (settings.size / 100);

    // Escala individual de cada bochecha (usada quando a simetria está OFF),
    // baseada na distância olho->boca de cada lado. Quando a cabeça gira,
    // o lado mais próximo da câmera "aumenta" e o mais distante "encolhe",
    // reproduzindo o efeito de perspectiva real.
    const rightLocal = distance(p(LANDMARKS.eyeRight), p(LANDMARKS.mouthRight));
    const leftLocal = distance(p(LANDMARKS.eyeLeft), p(LANDMARKS.mouthLeft));
    const avgLocal = (rightLocal + leftLocal) / 2;

    const scaleRight = settings.symmetry ? 1 : rightLocal / avgLocal;
    const scaleLeft = settings.symmetry ? 1 : leftLocal / avgLocal;

    BlushRenderer._drawCheek(
      c,
      p(LANDMARKS.cheekRight),
      baseRadius * scaleRight,
      shape,
      color,
      settings
    );
    BlushRenderer._drawCheek(
      c,
      p(LANDMARKS.cheekLeft),
      baseRadius * scaleLeft,
      shape,
      color,
      settings
    );
  }

  /** Desenha o blush de uma única bochecha usando gradiente radial + blur. */
  static _drawCheek(c, center, radius, shape, color, settings) {
    const radiusX = radius * shape.ratioX;
    const radiusY = radius * shape.ratioY;
    const cy = center.y + radius * shape.offsetY;

    c.save();

    // Aplica blur real do canvas (CSS filter) para simular maquiagem
    // difusa na pele, controlado pelo slider "Desfoque".
    const blurAmount = Math.max(settings.blur * shape.softness, 0.0001);
    c.filter = `blur(${blurAmount}px)`;

    // "multiply" mistura o blush com o tom de pele por baixo, dando um
    // resultado muito mais realista do que uma simples cor sólida.
    c.globalCompositeOperation = "multiply";
    c.globalAlpha = clamp(settings.intensity / 100, 0, 1) * 0.9;

    c.translate(center.x, cy);
    c.scale(radiusX, radiusY);

    const gradient = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, hexToRgba(color, 0.95));
    gradient.addColorStop(0.55, hexToRgba(color, 0.55));
    gradient.addColorStop(1, hexToRgba(color, 0));

    c.fillStyle = gradient;
    c.beginPath();
    c.arc(0, 0, 1, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Segunda camada, mais sutil e com "screen", para dar um leve brilho
    // saudável por cima do multiply (imita luz refletindo na pele).
    c.save();
    c.filter = `blur(${blurAmount * 1.4}px)`;
    c.globalCompositeOperation = "screen";
    c.globalAlpha = clamp(settings.intensity / 100, 0, 1) * 0.12;
    c.translate(center.x, cy);
    c.scale(radiusX * 0.6, radiusY * 0.6);
    const glow = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    glow.addColorStop(0, hexToRgba(color, 0.6));
    glow.addColorStop(1, hexToRgba(color, 0));
    c.fillStyle = glow;
    c.beginPath();
    c.arc(0, 0, 1, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /** Desenha todos os 468 landmarks (modo de depuração / visualização). */
  static drawLandmarks(c, landmarks, width, height) {
    c.save();
    c.fillStyle = "rgba(80, 220, 255, 0.85)";
    for (const lm of landmarks) {
      c.beginPath();
      c.arc(lm.x * width, lm.y * height, 1.4, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
}

/* Utilitários --------------------------------------------------------- */

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* =========================================================================
   7. LOOP PRINCIPAL DE RENDERIZAÇÃO
   ========================================================================= */

function resizeCanvasToVideo() {
  const rect = el.previewFrame.getBoundingClientRect();
  el.overlayCanvas.width = rect.width;
  el.overlayCanvas.height = rect.height;
}

function renderLoop() {
  requestAnimationFrame(renderLoop);

  if (!state.faceLandmarker || el.video.readyState < 2) return;

  const now = performance.now();

  try {
    // Evita processar o mesmo frame de vídeo duas vezes.
    if (el.video.currentTime !== state.lastVideoTime) {
      state.lastVideoTime = el.video.currentTime;
      state.latestResult = state.faceLandmarker.detectForVideo(el.video, now);
    }

    const { width, height } = el.overlayCanvas;
    ctx.clearRect(0, 0, width, height);

    const result = state.latestResult;
    const hasFace =
      result && result.faceLandmarks && result.faceLandmarks.length > 0;

    if (hasFace) {
      const landmarks = result.faceLandmarks[0];

      // O vídeo é exibido com object-fit: cover, então mapeamos os landmarks
      // (normalizados 0-1 em relação ao frame de vídeo) para o canvas cobrindo
      // a mesma área visível.
      const videoRatio = el.video.videoWidth / el.video.videoHeight;
      const canvasRatio = width / height;

      let drawW = width;
      let drawH = height;
      let offsetX = 0;
      let offsetY = 0;

      if (videoRatio > canvasRatio) {
        drawH = height;
        drawW = height * videoRatio;
        offsetX = (width - drawW) / 2;
      } else {
        drawW = width;
        drawH = width / videoRatio;
        offsetY = (height - drawH) / 2;
      }

      const mapped = landmarks.map((lm) => ({
        x: (lm.x * drawW + offsetX) / width,
        y: (lm.y * drawH + offsetY) / height,
      }));

      BlushRenderer.draw(ctx, mapped, width, height, state.settings);

      if (state.settings.showLandmarks) {
        BlushRenderer.drawLandmarks(ctx, mapped, width, height);
      }
    }

    setFaceStatus(hasFace ? "" : "Nenhum rosto detectado");
  } catch (err) {
    // Nunca deixamos uma exceção matar o loop silenciosamente: registramos
    // no console (para depuração) e mostramos um aviso curto na tela, mas
    // o requestAnimationFrame já foi reagendado no topo da função.
    console.error("[BlushAR] Erro ao processar o quadro:", err);

    // Um RuntimeError vindo do WASM (ex.: "Aborted()") deixa a instância
    // do Face Landmarker permanentemente inutilizável — todo quadro
    // seguinte voltaria a travar com o mesmo erro. Nesse caso específico,
    // descartamos a instância e recriamos o modelo automaticamente (usando
    // o delegate CPU, mais estável) em vez de continuar tentando com algo
    // corrompido.
    const isFatalWasmCrash =
      (err && err.name === "RuntimeError") ||
      /aborted/i.test(String(err && err.message));

    if (isFatalWasmCrash) {
      recoverModel();
    } else {
      setFaceStatus("Erro ao processar o vídeo (veja o console)");
    }
  }

  updateFps(now);
}

/**
 * Descarta a instância atual do Face Landmarker (que travou de forma
 * irrecuperável) e cria uma nova, forçando o delegate CPU por estabilidade.
 * Enquanto a recriação acontece, o renderLoop simplesmente pula os quadros
 * (state.faceLandmarker fica null).
 */
async function recoverModel() {
  if (state.modelRecovering) return;
  state.modelRecovering = true;

  const crashedInstance = state.faceLandmarker;
  state.faceLandmarker = null;
  setFaceStatus("Reiniciando o modelo de detecção…");

  if (crashedInstance && typeof crashedInstance.close === "function") {
    try {
      crashedInstance.close();
    } catch (_) {
      // instância já corrompida — ignoramos erro ao fechá-la
    }
  }

  try {
    state.faceLandmarker = await FaceTracker.create({ preferGpu: false });
    setFaceStatus("");
    console.info("[BlushAR] Modelo de detecção facial recuperado com sucesso.");
  } catch (err) {
    console.error("[BlushAR] Não foi possível recuperar o modelo:", err);
    showLoadingError(
      "O modelo de detecção facial travou e não foi possível reiniciá-lo automaticamente. Recarregue a página."
    );
  } finally {
    state.modelRecovering = false;
  }
}

function setFaceStatus(message) {
  if (el.faceStatus.textContent !== message) {
    el.faceStatus.textContent = message;
  }
}

function updateFps(now) {
  state.frameTimes.push(now);
  // mantém só o último ~1s de amostras
  while (state.frameTimes.length && now - state.frameTimes[0] > 1000) {
    state.frameTimes.shift();
  }
  state.fps = state.frameTimes.length;
  el.fpsCounter.textContent = `${state.fps} FPS`;
}

/* =========================================================================
   8. LIGAÇÃO DA INTERFACE (UI)
   ========================================================================= */

function buildColorPalette() {
  el.colorPalette.innerHTML = "";
  BLUSH_COLORS.forEach((color) => {
    const btn = document.createElement("button");
    btn.className = "color-swatch";
    btn.style.background = color.hex;
    btn.title = `${color.emoji} ${color.label}`;
    btn.dataset.colorId = color.id;
    if (color.id === state.settings.colorId) btn.classList.add("active");

    btn.addEventListener("click", () => {
      state.settings.colorId = color.id;
      document
        .querySelectorAll(".color-swatch")
        .forEach((s) => s.classList.remove("active"));
      btn.classList.add("active");
    });

    el.colorPalette.appendChild(btn);
  });
}

function bindShapeOptions() {
  el.shapeOptions.querySelectorAll(".shape-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.settings.shape = btn.dataset.shape;
      el.shapeOptions
        .querySelectorAll(".shape-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });
}

function bindSliders() {
  el.sliderIntensity.addEventListener("input", (e) => {
    state.settings.intensity = Number(e.target.value);
    el.valueIntensity.textContent = `${state.settings.intensity}%`;
  });

  el.sliderSize.addEventListener("input", (e) => {
    state.settings.size = Number(e.target.value);
    el.valueSize.textContent = `${state.settings.size}%`;
  });

  el.sliderBlur.addEventListener("input", (e) => {
    state.settings.blur = Number(e.target.value);
    el.valueBlur.textContent = `${state.settings.blur}px`;
  });
}

function bindToggles() {
  el.toggleSymmetry.addEventListener("change", (e) => {
    state.settings.symmetry = e.target.checked;
  });

  el.btnLandmarks.addEventListener("click", () => {
    state.settings.showLandmarks = !state.settings.showLandmarks;
    el.btnLandmarks.classList.toggle("active", state.settings.showLandmarks);
  });

  el.btnMirror.addEventListener("click", () => {
    state.settings.mirrored = !state.settings.mirrored;
    el.previewFrame.classList.toggle("mirrored", state.settings.mirrored);
    el.btnMirror.classList.toggle("active", state.settings.mirrored);
  });

  el.btnDarkMode.addEventListener("click", () => {
    state.settings.darkMode = !state.settings.darkMode;
    document.body.classList.toggle("dark", state.settings.darkMode);
  });
}

function bindButtons() {
  el.btnFullscreen.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      el.previewFrame.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  });

  el.btnCapture.addEventListener("click", capturePhoto);
  el.btnReset.addEventListener("click", resetSettings);
}

/** Restaura todas as configurações para os valores padrão e sincroniza a UI. */
function resetSettings() {
  state.settings = { ...DEFAULT_SETTINGS };

  el.sliderIntensity.value = state.settings.intensity;
  el.valueIntensity.textContent = `${state.settings.intensity}%`;

  el.sliderSize.value = state.settings.size;
  el.valueSize.textContent = `${state.settings.size}%`;

  el.sliderBlur.value = state.settings.blur;
  el.valueBlur.textContent = `${state.settings.blur}px`;

  el.toggleSymmetry.checked = state.settings.symmetry;

  el.shapeOptions.querySelectorAll(".shape-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.shape === state.settings.shape);
  });

  document.querySelectorAll(".color-swatch").forEach((s) => {
    s.classList.toggle("active", s.dataset.colorId === state.settings.colorId);
  });

  el.btnLandmarks.classList.remove("active");
  el.previewFrame.classList.toggle("mirrored", state.settings.mirrored);
  el.btnMirror.classList.toggle("active", state.settings.mirrored);

  document.body.classList.toggle("dark", state.settings.darkMode);
}

/** Captura o frame atual (vídeo + blush) e salva como imagem PNG. */
function capturePhoto() {
  const captureCanvas = el.captureCanvas;
  const rect = el.previewFrame.getBoundingClientRect();
  captureCanvas.width = rect.width;
  captureCanvas.height = rect.height;
  const cctx = captureCanvas.getContext("2d");

  cctx.save();
  if (state.settings.mirrored) {
    cctx.translate(captureCanvas.width, 0);
    cctx.scale(-1, 1);
  }

  // Desenha o vídeo "cobrindo" o quadro, do mesmo jeito que o CSS object-fit: cover.
  const videoRatio = el.video.videoWidth / el.video.videoHeight;
  const canvasRatio = captureCanvas.width / captureCanvas.height;
  let drawW = captureCanvas.width;
  let drawH = captureCanvas.height;
  let offsetX = 0;
  let offsetY = 0;

  if (videoRatio > canvasRatio) {
    drawH = captureCanvas.height;
    drawW = drawH * videoRatio;
    offsetX = (captureCanvas.width - drawW) / 2;
  } else {
    drawW = captureCanvas.width;
    drawH = drawW / videoRatio;
    offsetY = (captureCanvas.height - drawH) / 2;
  }

  cctx.drawImage(el.video, offsetX, offsetY, drawW, drawH);
  cctx.drawImage(el.overlayCanvas, 0, 0, captureCanvas.width, captureCanvas.height);
  cctx.restore();

  captureCanvas.toBlob((blob) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `blush-ar-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, "image/png");
}

/* =========================================================================
   9. CÂMERAS: listagem, seleção e (re)início do stream
   ========================================================================= */

async function populateCameraSelect(devices, selectedId) {
  el.cameraSelect.innerHTML = "";
  devices.forEach((device, i) => {
    const opt = document.createElement("option");
    opt.value = device.deviceId;
    opt.textContent = device.label || `Câmera ${i + 1}`;
    if (device.deviceId === selectedId) opt.selected = true;
    el.cameraSelect.appendChild(opt);
  });
}

async function startCamera(deviceId) {
  if (state.currentStream) {
    state.currentStream.getTracks().forEach((t) => t.stop());
  }
  const stream = await CameraManager.startStream(deviceId);
  state.currentStream = stream;
  el.video.srcObject = stream;

  await new Promise((resolve) => {
    el.video.onloadedmetadata = () => {
      el.video.play();
      resolve();
    };
  });

  resizeCanvasToVideo();
}

el.cameraSelect.addEventListener("change", async (e) => {
  await startCamera(e.target.value);
});

window.addEventListener("resize", resizeCanvasToVideo);
document.addEventListener("fullscreenchange", resizeCanvasToVideo);

// ResizeObserver cobre qualquer mudança de tamanho do preview que não
// dispare o evento "resize" da janela (ex.: painel lateral colapsando em
// telas menores, grid do CSS recalculando, fontes carregando, etc.).
if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(() => resizeCanvasToVideo()).observe(el.previewFrame);
}

/* =========================================================================
   10. INICIALIZAÇÃO DA APLICAÇÃO
   ========================================================================= */

async function init() {
  buildColorPalette();
  bindShapeOptions();
  bindSliders();
  bindToggles();
  bindButtons();

  el.previewFrame.classList.toggle("mirrored", state.settings.mirrored);
  el.btnMirror.classList.toggle("active", state.settings.mirrored);

  el.btnRequestCamera.addEventListener("click", async () => {
    el.btnRequestCamera.disabled = true;
    el.permissionStatus.textContent = "Solicitando acesso à câmera…";

    // --- Etapa 1: permissão + listagem de câmeras -----------------------
    // Enquanto isso pode falhar, mantemos a tela de permissão visível para
    // que o erro apareça exatamente onde o usuário está olhando.
    let devices, bestDevice;
    try {
      await CameraManager.requestInitialPermission();

      devices = await CameraManager.listVideoDevices();
      if (devices.length === 0) {
        throw new Error("Nenhuma câmera encontrada.");
      }

      bestDevice = CameraManager.pickBestDevice(devices);
      await populateCameraSelect(devices, bestDevice.deviceId);
    } catch (err) {
      console.error("[BlushAR] Erro ao acessar a câmera:", err);
      el.permissionStatus.textContent =
        "Não foi possível acessar a câmera. Verifique as permissões do navegador e tente novamente.";
      el.btnRequestCamera.disabled = false;
      return;
    }

    // --- Etapa 2: mostrar o app -----------------------------------------
    // IMPORTANTE: o painel precisa ficar visível (display diferente de
    // "none") ANTES de dimensionarmos o canvas do blush, pois ele é medido
    // com base no tamanho real do preview na tela (getBoundingClientRect).
    // A partir daqui, qualquer erro precisa aparecer DENTRO do app (a tela
    // de permissão já não está mais visível), então usamos o overlay de
    // carregamento (#loadingModel) para reportar falhas também.
    el.permissionScreen.classList.add("hidden");
    el.app.classList.remove("hidden");
    el.permissionStatus.textContent = "";

    // --- Etapa 3: iniciar o vídeo ----------------------------------------
    try {
      await startCamera(bestDevice.deviceId);
    } catch (err) {
      console.error("[BlushAR] Erro ao iniciar o stream de vídeo:", err);
      showLoadingError(
        "Não foi possível iniciar o vídeo da câmera selecionada. Tente escolher outra câmera no seletor do topo."
      );
      return;
    }

    // --- Etapa 4: carregar o modelo de detecção facial --------------------
    // Pode levar alguns segundos na primeira execução, pois baixa os
    // arquivos do MediaPipe via CDN.
    try {
      state.faceLandmarker = await FaceTracker.create();
      el.loadingModel.classList.add("hidden");
      renderLoop();
    } catch (err) {
      console.error("[BlushAR] Erro ao carregar o modelo de detecção facial:", err);
      showLoadingError(
        "Não foi possível carregar o modelo de detecção facial. Verifique sua conexão com a internet (o modelo é baixado via CDN) e tente novamente."
      );
    }
  });
}

/**
 * Substitui o conteúdo do overlay de carregamento por uma mensagem de erro
 * visível, com botão para recarregar a página e tentar de novo. Usado
 * sempre que algo falha DEPOIS que a tela de permissão já foi escondida,
 * para que o problema nunca fique invisível para o usuário.
 */
function showLoadingError(message) {
  el.loadingModel.innerHTML = `
    <div style="font-size:32px;">⚠️</div>
    <span>${message}</span>
    <button id="btnRetryModel" class="btn btn-ghost" style="margin-top:6px;">
      Recarregar página
    </button>
  `;
  el.loadingModel.classList.remove("hidden");
  document
    .getElementById("btnRetryModel")
    .addEventListener("click", () => location.reload());
}

init();
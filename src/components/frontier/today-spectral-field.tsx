"use client";

import { useEffect, useRef } from "react";

const SIGNAL_COUNT = 7;

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2 uResolution;
uniform float uTime;
uniform vec4 uRects[7];
uniform float uLane[7];
uniform float uHover;
uniform vec2 uPointer;
uniform float uHandoff;
uniform float uDeckness;
uniform float uPresence;
uniform float uAlpha;

const int SIGNAL_COUNT = 7;

float sat(float value) {
  return clamp(value, 0.0, 1.0);
}

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float fillMask(float sd, float feather) {
  return 1.0 - smoothstep(-feather, feather, sd);
}

float edgeMask(float sd, float width) {
  return exp(-pow(sd / width, 2.0));
}

float dotGrid(vec2 uv) {
  vec2 px = uv * uResolution;
  vec2 cell = fract(px / 18.0) - 0.5;
  float d = length(cell) * 18.0;
  return 1.0 - smoothstep(0.52, 1.05, d);
}

float axisLine(vec2 uv) {
  float px = abs(uv.x - 0.5) * uResolution.x;
  return 1.0 - smoothstep(0.25, 1.15, px);
}

float laneMask(float lane, float target) {
  return 1.0 - smoothstep(0.1, 0.45, abs(lane - target));
}

vec3 thinFilm(float phase) {
  return 0.54 + 0.46 * cos(phase + vec3(0.0, 2.0943951, 4.1887902));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / max(1.0, uResolution.y);

  vec2 warp = vec2(0.0);
  float contactShadow = 0.0;
  float laminate = 0.0;
  vec3 foil = vec3(0.0);
  vec3 traces = vec3(0.0);

  float deckAtten = mix(1.0, 0.30, sat(uDeckness));

  for (int i = 0; i < SIGNAL_COUNT; i++) {
    float fi = float(i);
    vec4 rect = uRects[i];
    vec2 halfSize = max(rect.zw, vec2(0.014));

    float lead = i == 0 ? 1.0 : 0.0;
    float adjacent = laneMask(uLane[i], 1.0);
    float wildcard = laneMask(uLane[i], 2.0);
    float core = 1.0 - max(adjacent, wildcard);
    float hovered = 1.0 - smoothstep(0.1, 0.45, abs(uHover - fi));

    vec2 q = (uv - rect.xy) / halfSize;
    q.x *= aspect / max(1.0, aspect * 0.86);

    float tilt = -0.018 + fi * 0.008 + lead * -0.014 + adjacent * 0.018 - wildcard * 0.026;
    tilt += (uPointer.x - 0.5) * 0.017 * (0.22 + hovered * 0.78);
    q = rotate2d(tilt) * q;

    vec2 b = vec2(1.05, 1.12);
    b += vec2(lead * 0.18, lead * 0.34);
    b += vec2(adjacent * 0.07, adjacent * 0.09);
    b += vec2(wildcard * 0.09, wildcard * 0.13);

    vec2 fq = q;
    fq.x += fq.y * (0.010 + adjacent * 0.018 - wildcard * 0.018);
    fq.y += sin(fq.x * 2.15 + fi * 0.83) * (0.008 + lead * 0.014 + wildcard * 0.024);
    fq.x += sin(fq.y * 2.75 - fi * 0.61) * wildcard * 0.018;

    float sd = sdBox(fq, b);
    float sheet = fillMask(sd, 0.022);
    float edge = edgeMask(sd, 0.026 + lead * 0.007);

    vec2 shadowQ = fq - vec2(0.032 + fi * 0.0015, -0.060 - lead * 0.026);
    float shadowSheet = fillMask(sdBox(shadowQ, b + vec2(0.014, 0.018)), 0.070);
    float exposedShadow = max(shadowSheet - sheet * 0.95, 0.0);
    contactShadow += exposedShadow * (0.014 + lead * 0.014 + wildcard * 0.004) * deckAtten * uPresence;

    float pointerAngle = (uPointer.x - 0.5) * 1.10 + (uPointer.y - 0.5) * -0.46;

    float waveA = 0.5 + 0.5 * sin(
      fq.x * (4.3 + lead * 0.7) +
      sin(fq.y * 3.8 + fi * 0.72) * 1.55 +
      pointerAngle * 2.7 + fi * 1.13
    );
    float waveB = 0.5 + 0.5 * sin(
      fq.y * (6.1 + adjacent * 1.4) -
      fq.x * 1.9 +
      cos(fq.x * 3.1 - fi * 0.54) * 1.25 -
      pointerAngle * 2.0
    );
    float interference = pow(sat(waveA * 0.56 + waveB * 0.44), 2.35) * sheet;

    float phase = fq.x * 3.9 + fq.y * 5.1;
    phase += sin(fq.x * 2.5 + fi) * 1.45 + sin(fq.y * 3.2 - fi * 0.7) * 1.05;
    phase += pointerAngle * 3.8 + fi * 1.71;
    vec3 spectrum = thinFilm(phase);

    vec2 specDir = normalize(vec2(0.88, 0.48 + adjacent * 0.14 - wildcard * 0.18));
    float sweepCenter = -1.18 + uPointer.x * 2.34 + sin(uTime * 0.16 + fi * 0.77) * 0.055;
    float specCoord = dot(fq, specDir) - sweepCenter;
    float broadSpec = exp(-pow(specCoord * (8.0 + lead * 2.0), 2.0)) * sheet;
    float razorSpec = exp(-pow((specCoord - 0.065 - sin(fi) * 0.010) * 58.0, 2.0)) * sheet;

    float foldA = exp(-pow((fq.y - sin(fq.x * 2.45 + fi * 1.15) * 0.145) * 31.0, 2.0));
    float foldB = exp(-pow((fq.x * 0.57 + fq.y * 0.82 - 0.16 * sin(fi * 1.8)) * 43.0, 2.0));
    float foldC = exp(-pow((fq.x * -0.46 + fq.y * 0.88 + 0.22) * 49.0, 2.0));
    float foldD = exp(-pow((fq.x * 0.91 - fq.y * 0.39 - 0.28) * 55.0, 2.0));
    float crinkle = sat(foldA * 0.54 + foldB * 0.46 + foldC * 0.42 + foldD * 0.34) * sheet;

    float sparkleA = 0.5 + 0.5 * sin(fq.x * 31.0 + sin(fq.y * 17.0 + fi) * 4.1 + pointerAngle * 5.0);
    float sparkleB = 0.5 + 0.5 * sin(fq.y * 37.0 - cos(fq.x * 19.0 - fi) * 3.7 - pointerAngle * 3.0);
    float sparkle = pow(sat(sparkleA * sparkleB), 16.0) * sheet;

    float bodyIntensity = 0.030 + core * 0.020 + lead * 0.075 + adjacent * 0.095 + wildcard * 0.050;
    bodyIntensity += hovered * 0.030;
    vec3 pearlFilm = mix(vec3(0.985, 0.982, 0.974), spectrum, 0.56 + adjacent * 0.12);
    foil += pearlFilm * interference * bodyIntensity * deckAtten * uPresence;

    float edgeIntensity = 0.048 + lead * 0.085 + adjacent * 0.145 + wildcard * 0.075 + hovered * 0.040;
    foil += mix(vec3(0.98), spectrum, 0.72) * edge * edgeIntensity * deckAtten * uPresence;

    foil += vec3(1.0) * broadSpec * (0.035 + lead * 0.070 + adjacent * 0.055 + wildcard * 0.030) * deckAtten * uPresence;
    foil += mix(vec3(1.0), spectrum, 0.36) * razorSpec * (0.18 + lead * 0.17 + adjacent * 0.15 + wildcard * 0.10) * deckAtten * uPresence;
    foil += spectrum * sparkle * (0.040 + lead * 0.070 + adjacent * 0.11 + wildcard * 0.055 + hovered * 0.045) * deckAtten * uPresence;

    float candyBodyWave = 0.5 + 0.5 * sin(fq.x * 2.8 - fq.y * 3.5 + fi + pointerAngle * 1.7);
    vec3 candyWarm = mix(vec3(1.00, 0.79, 0.83), vec3(1.00, 0.91, 0.64), candyBodyWave);
    foil += candyWarm * sheet * wildcard * (0.026 + interference * 0.026) * deckAtten * uPresence;
    foil += mix(candyWarm, spectrum, 0.58) * crinkle * wildcard * (0.18 + hovered * 0.11) * deckAtten * uPresence;
    foil += vec3(1.0, 0.97, 0.93) * crinkle * wildcard * 0.075 * deckAtten * uPresence;

    laminate += sheet * (0.0035 + lead * 0.006 + adjacent * 0.004 + wildcard * 0.005) * deckAtten * uPresence;

    float relief = sin(fq.x * 3.0 + fi) * sin(fq.y * 2.6 - fi * 0.47) * sheet;
    vec2 reliefDir = normalize(vec2(cos(fi * 0.71 + 0.4), sin(fi * 0.71 + 0.4)));
    float warpStrength = 0.00024 + lead * 0.00052 + adjacent * 0.00043 + wildcard * 0.00066;
    warpStrength *= 1.0 + hovered * 0.80;
    warp += reliefDir * relief * warpStrength * deckAtten * uPresence;
    warp += normalize(vec2(0.58, 0.82)) * (foldA - foldB * 0.62 + foldC * 0.35) * wildcard * 0.00062 * deckAtten * uPresence;
    warp += vec2(razorSpec * 0.00028, -razorSpec * 0.00018) * (1.0 + adjacent * 0.8 + wildcard * 0.5) * deckAtten * uPresence;

    float below = step(uv.y, rect.y);
    float traceCurve = rect.x + sin((uv.y * 7.0) + fi * 1.4) * (0.003 + 0.009 * uHandoff);
    float traceWidth = 0.00115 + lead * 0.00065 + adjacent * 0.00055 + wildcard * 0.00068;
    float trace = exp(-pow((uv.x - traceCurve) / traceWidth, 2.0));
    trace *= below * smoothstep(0.0, 0.12, rect.y - uv.y) * uHandoff;
    vec3 traceColor = mix(vec3(0.93, 0.95, 0.97), spectrum, adjacent * 0.62 + wildcard * 0.52);
    traces += traceColor * trace * (0.32 + adjacent * 0.24 + wildcard * 0.22);
  }

  vec2 warpedUv = uv + warp;

  float dotsR = dotGrid(warpedUv + warp * 0.30);
  float dotsG = dotGrid(warpedUv);
  float dotsB = dotGrid(warpedUv - warp * 0.30);
  vec3 dots = vec3(dotsR, dotsG, dotsB);

  float axisR = axisLine(warpedUv + warp * 0.22);
  float axisG = axisLine(warpedUv);
  float axisB = axisLine(warpedUv - warp * 0.22);
  vec3 axis = vec3(axisR, axisG, axisB);

  vec3 paper = vec3(0.949, 0.939, 0.910);
  vec3 color = paper;
  color -= dots * vec3(0.080, 0.074, 0.084);
  color -= axis * vec3(0.050, 0.047, 0.055);
  color -= vec3(contactShadow) * (1.0 - uHandoff * 0.84);
  color += vec3(laminate * 0.54, laminate * 0.61, laminate * 0.68);
  color += foil * (1.0 - uHandoff * 0.30);
  color += traces;

  float paperGrain = sin(gl_FragCoord.x * 0.73 + gl_FragCoord.y * 0.41) * sin(gl_FragCoord.y * 1.17 - gl_FragCoord.x * 0.23);
  color += vec3(paperGrain * 0.0016);

  outColor = vec4(color, sat(uAlpha));
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Foil shader compile failed", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Foil shader link failed", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function smoothstep(value: number) {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

function laneValue(lane: string | undefined) {
  if (lane === "adjacent") return 1;
  if (lane === "wildcard") return 2;
  return 0;
}

export function TodaySpectralField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = canvas?.closest<HTMLElement>(".motion-lab-shell");
    const stage = canvas?.parentElement;
    if (!canvas || !root || !stage) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) {
      root.dataset.foilV4 = "fallback";
      return;
    }

    const program = createProgram(gl);
    if (!program) {
      root.dataset.foilV4 = "fallback";
      return;
    }

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uRects = gl.getUniformLocation(program, "uRects[0]");
    const uLane = gl.getUniformLocation(program, "uLane[0]");
    const uHover = gl.getUniformLocation(program, "uHover");
    const uPointer = gl.getUniformLocation(program, "uPointer");
    const uHandoff = gl.getUniformLocation(program, "uHandoff");
    const uDeckness = gl.getUniformLocation(program, "uDeckness");
    const uPresence = gl.getUniformLocation(program, "uPresence");
    const uAlpha = gl.getUniformLocation(program, "uAlpha");

    const rects = new Float32Array(SIGNAL_COUNT * 4);
    const lanes = new Float32Array(SIGNAL_COUNT);
    let pointerX = 0.5;
    let pointerY = 0.5;
    let frame = 0;
    const started = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.7);
      const width = Math.max(1, Math.round(stage.clientWidth * dpr));
      const height = Math.max(1, Math.round(stage.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    const measureSignals = () => {
      const stageRect = stage.getBoundingClientRect();
      const cards = Array.from(root.querySelectorAll<HTMLElement>(".motion-lab-signal[role=\"link\"]")).slice(0, SIGNAL_COUNT);
      for (let index = 0; index < SIGNAL_COUNT; index += 1) {
        const card = cards[index];
        if (!card) {
          rects.set([0.5, 0.5, 0.01, 0.01], index * 4);
          lanes[index] = 0;
          continue;
        }
        const rect = card.getBoundingClientRect();
        const centerX = (rect.left - stageRect.left + rect.width / 2) / Math.max(1, stageRect.width);
        const centerY = 1 - (rect.top - stageRect.top + rect.height / 2) / Math.max(1, stageRect.height);
        const halfWidth = rect.width / Math.max(1, stageRect.width) / 2;
        const halfHeight = rect.height / Math.max(1, stageRect.height) / 2;
        rects.set([centerX, centerY, halfWidth, halfHeight], index * 4);
        lanes[index] = laneValue(card.dataset.lane);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      pointerX = Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(1, rect.width)));
      pointerY = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(1, rect.height)));
    };

    const render = (now: number) => {
      frame = window.requestAnimationFrame(render);
      resize();
      measureSignals();

      const computed = getComputedStyle(root);
      const rawProgress = Number.parseFloat(computed.getPropertyValue("--lab-progress")) || 0;
      const handoff = Number.parseFloat(computed.getPropertyValue("--direct-handoff")) || 0;
      const deckness = Number.parseFloat(computed.getPropertyValue("--deckness")) || 0;
      const presence = 0.46 + smoothstep((rawProgress - 0.16) / 0.38) * 0.54;

      const cards = Array.from(root.querySelectorAll<HTMLElement>(".motion-lab-signal[role=\"link\"]")).slice(0, SIGNAL_COUNT);
      const hovered = cards.findIndex((card) => card.dataset.productionHovered === "true");

      root.dataset.foilV4 = "active";
      canvas.style.opacity = "1";

      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - started) / 1000);
      gl.uniform4fv(uRects, rects);
      gl.uniform1fv(uLane, lanes);
      gl.uniform1f(uHover, hovered);
      gl.uniform2f(uPointer, pointerX, pointerY);
      gl.uniform1f(uHandoff, Math.min(1, Math.max(0, handoff)));
      gl.uniform1f(uDeckness, Math.min(1, Math.max(0, deckness)));
      gl.uniform1f(uPresence, Math.min(1, Math.max(0, presence)));
      gl.uniform1f(uAlpha, 1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resizeObserver = new ResizeObserver(() => {
      resize();
      measureSignals();
    });
    resizeObserver.observe(stage);
    root.addEventListener("pointermove", onPointerMove, { passive: true });
    resize();
    measureSignals();
    root.dataset.foilV4 = "active";
    frame = window.requestAnimationFrame(render);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeAttribute("data-foil-v4");
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="today-spectral-field" aria-hidden="true" />;
}
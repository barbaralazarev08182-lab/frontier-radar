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
uniform float uAlpha;

const int SIGNAL_COUNT = 7;
const float PI = 3.141592653589793;

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
  return 0.52 + 0.48 * cos(phase + vec3(0.0, 2.0943951, 4.1887902));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / max(1.0, uResolution.y);

  vec2 warp = vec2(0.0);
  float contactShadow = 0.0;
  float laminate = 0.0;
  vec3 foil = vec3(0.0);
  vec3 traces = vec3(0.0);

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

    float tilt = (-0.020 + fi * 0.009) + lead * -0.018 + adjacent * 0.025 + wildcard * -0.032;
    tilt += (uPointer.x - 0.5) * 0.018 * (0.25 + hovered * 0.75);
    q = rotate2d(tilt) * q;

    vec2 b = vec2(1.05, 1.13);
    b += vec2(lead * 0.20, lead * 0.42);
    b += vec2(adjacent * 0.08, adjacent * 0.11);
    b += vec2(wildcard * 0.10, wildcard * 0.16);

    vec2 fq = q;
    fq.x += fq.y * (0.018 + adjacent * 0.028 - wildcard * 0.024);
    fq.y += sin(fq.x * (2.25 + fi * 0.13) + fi * 0.91) * (0.010 + lead * 0.020 + wildcard * 0.032);
    fq.x += sin(fq.y * 3.1 - fi * 0.67) * wildcard * 0.024;

    float sd = sdBox(fq, b);
    float sheet = fillMask(sd, 0.024);
    float edge = edgeMask(sd, 0.030 + lead * 0.008);

    vec2 shadowQ = fq - vec2(0.045 + fi * 0.002, -0.080 - lead * 0.035);
    float shadowSheet = fillMask(sdBox(shadowQ, b + vec2(0.018, 0.022)), 0.080);
    float exposedShadow = max(shadowSheet - sheet * 0.94, 0.0);
    contactShadow += exposedShadow * (0.025 + lead * 0.022 + wildcard * 0.006);

    float pointerAngle = (uPointer.x - 0.5) * 0.95 + (uPointer.y - 0.5) * -0.35;
    float sweep = -0.82 + (uPointer.x * 1.52) + sin(uTime * 0.22 + fi) * 0.035;
    float streakCoord = fq.y + fq.x * (0.20 + adjacent * 0.13 - wildcard * 0.10) - sweep;
    float hardSpec = exp(-pow(streakCoord * (26.0 + lead * 7.0 + adjacent * 8.0), 2.0)) * sheet;
    float razorSpec = exp(-pow((streakCoord + 0.105 + sin(fi) * 0.025) * 74.0, 2.0)) * sheet;

    float foldA = exp(-pow((fq.y - sin(fq.x * 2.7 + fi * 1.3) * 0.17) * (35.0 + wildcard * 10.0), 2.0));
    float foldB = exp(-pow((fq.x * 0.61 + fq.y * 0.79 - 0.18 * sin(fi * 2.1)) * (48.0 + wildcard * 16.0), 2.0));
    float foldC = exp(-pow((fq.x * -0.42 + fq.y * 0.91 + 0.25) * 54.0, 2.0));
    float crinkle = sat(foldA * 0.62 + foldB * 0.54 + foldC * wildcard * 0.72) * sheet;

    float diffraction = pow(0.5 + 0.5 * sin((fq.x * 48.0 + fq.y * 13.0) + fi * 4.1 + pointerAngle * 7.0), 18.0) * sheet;
    diffraction *= 0.32 + edge * 0.78;

    float phase = fq.x * 8.2 + fq.y * -4.6 + fi * 1.93 + pointerAngle * 4.8;
    phase += hardSpec * 2.4 + crinkle * 1.8;
    vec3 spectrum = thinFilm(phase);
    vec3 pearlSpectrum = mix(vec3(0.96, 0.975, 0.99), spectrum, 0.72);

    float coreIntensity = 0.018 + lead * 0.115 + hovered * 0.030;
    float adjacentIntensity = adjacent * (0.31 + hovered * 0.18);
    float wildcardIntensity = wildcard * (0.26 + hovered * 0.20);

    foil += vec3(1.0) * (hardSpec * (0.17 + lead * 0.24 + adjacent * 0.12 + wildcard * 0.10));
    foil += vec3(1.0) * razorSpec * (0.30 + lead * 0.28 + adjacent * 0.22 + wildcard * 0.19);
    foil += pearlSpectrum * edge * (coreIntensity + adjacentIntensity + wildcardIntensity);
    foil += spectrum * diffraction * (lead * 0.11 + adjacent * 0.28 + wildcard * 0.18 + hovered * 0.06);

    vec3 candySpectrum = mix(vec3(1.0, 0.86, 0.72), spectrum, 0.72);
    foil += candySpectrum * crinkle * wildcard * (0.28 + hovered * 0.18);
    foil += vec3(1.0, 0.96, 0.90) * crinkle * wildcard * 0.16;

    laminate += sheet * (0.006 + lead * 0.013 + adjacent * 0.008 + wildcard * 0.010);

    vec2 creaseDirection = normalize(vec2(0.55 + 0.15 * sin(fi), 0.83));
    float creaseWarp = (foldA - foldB * 0.72 + foldC * 0.48) * sheet;
    float warpStrength = 0.00045 + lead * 0.00085 + adjacent * 0.00070 + wildcard * 0.00105;
    warpStrength *= 1.0 + hovered * 0.85;
    warp += creaseDirection * creaseWarp * warpStrength;
    warp += vec2(hardSpec * 0.00035, -hardSpec * 0.00024) * (1.0 + adjacent + wildcard * 0.7);

    float below = step(uv.y, rect.y);
    float traceCurve = rect.x + sin((uv.y * 7.0) + fi * 1.4) * (0.003 + 0.009 * uHandoff);
    float traceWidth = 0.00115 + lead * 0.00065 + adjacent * 0.00055 + wildcard * 0.00068;
    float trace = exp(-pow((uv.x - traceCurve) / traceWidth, 2.0));
    trace *= below * smoothstep(0.0, 0.12, rect.y - uv.y) * uHandoff;
    vec3 traceColor = mix(vec3(0.92, 0.95, 0.98), spectrum, adjacent * 0.58 + wildcard * 0.46);
    traces += traceColor * trace * (0.34 + adjacent * 0.27 + wildcard * 0.25);
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
  color += vec3(laminate * 0.58, laminate * 0.66, laminate * 0.72);
  color += foil * (1.0 - uHandoff * 0.32);
  color += traces;

  float paperGrain = sin(gl_FragCoord.x * 0.73 + gl_FragCoord.y * 0.41) * sin(gl_FragCoord.y * 1.17 - gl_FragCoord.x * 0.23);
  color += vec3(paperGrain * 0.0018);

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
    const uAlpha = gl.getUniformLocation(program, "uAlpha");

    const rects = new Float32Array(SIGNAL_COUNT * 4);
    const lanes = new Float32Array(SIGNAL_COUNT);
    let pointerX = 0.5;
    let pointerY = 0.5;
    let frame = 0;
    let lastMeasure = -100;
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

      const computed = getComputedStyle(root);
      const rawProgress = Number.parseFloat(computed.getPropertyValue("--lab-progress")) || 0;
      const handoff = Number.parseFloat(computed.getPropertyValue("--direct-handoff")) || 0;
      const alpha = smoothstep((rawProgress - 0.50) / 0.105);

      if (now - lastMeasure > 100 || handoff > 0.001) {
        measureSignals();
        lastMeasure = now;
      }

      const cards = Array.from(root.querySelectorAll<HTMLElement>(".motion-lab-signal[role=\"link\"]")).slice(0, SIGNAL_COUNT);
      const hovered = cards.findIndex((card) => card.dataset.productionHovered === "true");

      root.dataset.foilV4 = alpha > 0.05 ? "active" : "off";
      canvas.style.opacity = String(Math.min(1, alpha * 1.04));

      gl.useProgram(program);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - started) / 1000);
      gl.uniform4fv(uRects, rects);
      gl.uniform1fv(uLane, lanes);
      gl.uniform1f(uHover, hovered);
      gl.uniform2f(uPointer, pointerX, pointerY);
      gl.uniform1f(uHandoff, Math.min(1, Math.max(0, handoff)));
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
    root.dataset.foilV4 = "off";
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

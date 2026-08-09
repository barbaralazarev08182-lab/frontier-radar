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

float sat(float value) {
  return clamp(value, 0.0, 1.0);
}

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
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

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / max(1.0, uResolution.y);

  vec2 warp = vec2(0.0);
  float castShadow = 0.0;
  vec3 spectral = vec3(0.0);
  vec3 traces = vec3(0.0);
  float glassBody = 0.0;

  vec3 laserViolet = vec3(0.47, 0.18, 1.00);
  vec3 candyUltraviolet = vec3(0.78, 0.20, 1.00);
  vec3 electricCyan = vec3(0.03, 0.86, 1.00);
  vec3 hotMagenta = vec3(1.00, 0.13, 0.67);
  vec3 amber = vec3(1.00, 0.56, 0.11);
  vec3 pearl = vec3(0.90, 0.95, 0.98);

  for (int i = 0; i < SIGNAL_COUNT; i++) {
    vec4 rect = uRects[i];
    vec2 halfSize = max(rect.zw, vec2(0.018));

    float lead = i == 0 ? 1.0 : 0.0;
    float adjacent = laneMask(uLane[i], 1.0);
    float wildcard = laneMask(uLane[i], 2.0);
    float core = 1.0 - max(adjacent, wildcard);
    float hovered = 1.0 - smoothstep(0.1, 0.45, abs(uHover - float(i)));

    vec2 expanded = halfSize * vec2(lead > 0.5 ? 1.55 : 1.27, lead > 0.5 ? 2.25 : 1.72);
    vec2 q = (uv - rect.xy) / expanded;
    q.x *= aspect / max(1.0, aspect * 0.74);

    float baseAngle = (-0.07 + float(i) * 0.037) + (uPointer.x - 0.5) * 0.055 * (0.25 + hovered);
    q = rotate2d(baseAngle) * q;

    float ripple = sin(q.x * 5.4 + q.y * 3.1 + float(i) * 1.7 + uTime * (0.08 + hovered * 0.22)) * 0.045;
    float d = length(q * vec2(0.92, 1.08 + ripple));
    float field = 1.0 - smoothstep(0.16, 1.18, d);
    float coreField = pow(field, 1.32);
    float edge = exp(-pow((d - 0.82) * (lead > 0.5 ? 8.5 : 11.0), 2.0));

    vec2 radial = normalize(q + vec2(0.0001));
    radial.x /= max(1.0, aspect * 0.82);

    float strength = 0.0038 + lead * 0.0105 + adjacent * 0.0065 + wildcard * 0.0078;
    strength *= 1.0 + hovered * 1.35;
    strength *= 1.0 - uHandoff * 0.52;
    warp += radial * coreField * strength;

    vec2 shadowCenter = rect.xy + vec2((0.010 + float(i) * 0.0015), -(0.015 + lead * 0.018));
    vec2 sq = (uv - shadowCenter) / (expanded * vec2(1.08, 0.78));
    float shadowField = 1.0 - smoothstep(0.12, 1.15, length(sq));
    castShadow += shadowField * (0.012 + lead * 0.040 + adjacent * 0.012 + wildcard * 0.015);

    float beamCoord = q.y + q.x * (0.27 + wildcard * 0.22 - adjacent * 0.14);
    float beam = pow(sat(1.0 - abs(beamCoord + ripple * 0.65) * (5.8 + core * 2.5)), 4.2) * field;
    float crossBeam = pow(sat(1.0 - abs(q.y - q.x * 0.52) * 8.5), 5.0) * field;

    vec3 coreSpectrum = mix(laserViolet, electricCyan, sat(q.x * 0.45 + 0.5));
    spectral += coreSpectrum * edge * core * (0.055 + lead * 0.15 + hovered * 0.08);
    spectral += pearl * beam * core * (0.035 + lead * 0.11);

    vec3 adjacentSpectrum = mix(laserViolet, electricCyan, sat(q.x * 0.62 + 0.48));
    spectral += adjacentSpectrum * (edge * 0.58 + beam * 0.44) * adjacent * (0.68 + hovered * 0.34);
    spectral += candyUltraviolet * crossBeam * adjacent * (0.22 + hovered * 0.18);

    vec3 wildcardA = mix(hotMagenta, amber, sat(q.x * 0.55 + 0.50));
    vec3 wildcardB = mix(candyUltraviolet, hotMagenta, sat(q.y * 0.58 + 0.47));
    spectral += wildcardA * (edge * 0.48 + beam * 0.38) * wildcard * (0.78 + hovered * 0.42);
    spectral += wildcardB * crossBeam * wildcard * (0.26 + hovered * 0.20);

    glassBody += field * (0.006 + lead * 0.018 + adjacent * 0.010 + wildcard * 0.012);

    float below = step(uv.y, rect.y);
    float traceCurve = rect.x + sin((uv.y * 7.0) + float(i) * 1.4) * (0.004 + 0.009 * uHandoff);
    float traceWidth = 0.0015 + lead * 0.0009 + adjacent * 0.0007 + wildcard * 0.0009;
    float trace = exp(-pow((uv.x - traceCurve) / traceWidth, 2.0));
    trace *= below * smoothstep(0.0, 0.12, rect.y - uv.y) * uHandoff;

    vec3 traceColor = pearl;
    traceColor = mix(traceColor, mix(laserViolet, electricCyan, 0.55), adjacent);
    traceColor = mix(traceColor, mix(hotMagenta, amber, 0.55), wildcard);
    traces += traceColor * trace * (0.36 + adjacent * 0.28 + wildcard * 0.30);
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
  color -= vec3(castShadow) * (1.0 - uHandoff * 0.82);
  color += vec3(glassBody * 0.68, glassBody * 0.86, glassBody);
  color += spectral * (1.0 - uHandoff * 0.36);
  color += traces;

  float vignette = smoothstep(1.12, 0.18, distance(uv, vec2(0.5)));
  color += vec3(0.008) * vignette;

  outColor = vec4(color, sat(uAlpha));
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Spectral shader compile failed", gl.getShaderInfoLog(shader));
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
    console.error("Spectral shader link failed", gl.getProgramInfoLog(program));
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
      root.dataset.spectralV3 = "fallback";
      return;
    }

    const program = createProgram(gl);
    if (!program) {
      root.dataset.spectralV3 = "fallback";
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.65);
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
      const alpha = smoothstep((rawProgress - 0.50) / 0.115);

      if (now - lastMeasure > 100 || handoff > 0.001) {
        measureSignals();
        lastMeasure = now;
      }

      const cards = Array.from(root.querySelectorAll<HTMLElement>(".motion-lab-signal[role=\"link\"]")).slice(0, SIGNAL_COUNT);
      const hovered = cards.findIndex((card) => card.dataset.productionHovered === "true");

      root.dataset.spectralV3 = alpha > 0.05 ? "active" : "off";
      canvas.style.opacity = String(Math.min(1, alpha * 1.06));

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
    root.dataset.spectralV3 = "off";
    frame = window.requestAnimationFrame(render);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeAttribute("data-spectral-v3");
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="today-spectral-field" aria-hidden="true" />;
}

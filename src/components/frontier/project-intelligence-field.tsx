"use client";

import { useEffect, useRef } from "react";

const VERTEX = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * .5 + .5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_stage;
uniform float u_step;
uniform vec2 u_pointer;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float line(float d, float w) {
  return 1.0 - smoothstep(w, w * 1.7, abs(d));
}

float circleLine(vec2 p, float r, float w) {
  return line(length(p) - r, w);
}

vec3 spectrum(float x) {
  vec3 a = vec3(.55, .88, 1.0);
  vec3 b = vec3(1.0, .60, .85);
  vec3 c = vec3(1.0, .82, .40);
  float t = .5 + .5 * sin(x * 6.28318);
  return mix(mix(a, b, t), c, .5 + .5 * sin(x * 5.1 + 1.7));
}

vec4 captureField(vec2 uv, vec2 p) {
  float sweep = uv.x * .72 + uv.y * .42 - mod(u_time * .055, 1.65) + .25;
  float foil = exp(-pow(sweep * 8.0, 2.0));
  float band = .5 + .5 * sin((uv.x + uv.y) * 18.0 + u_time * .6);
  float grain = hash21(floor(uv * u_resolution.xy / 6.0));
  float halo = exp(-length(p - vec2(.22, .05)) * 3.4);
  vec3 col = spectrum(uv.y + u_time * .035) * foil * .72;
  col += vec3(.50, .75, .95) * halo * .12;
  col += vec3(1.0) * band * grain * .018;
  float alpha = foil * .26 + halo * .05 + grain * .008;
  return vec4(col, alpha);
}

vec4 evidenceField(vec2 uv, vec2 p) {
  vec2 q = p;
  q.x *= u_resolution.x / max(1.0, u_resolution.y);
  float r = length(q);
  float a = atan(q.y, q.x);
  float rings = line(fract(r * 7.0 - u_time * .55) - .5, .06);
  float spokes = line(sin(a * 9.0 + u_time * .12), .075);
  float pulse = exp(-pow((r - mod(u_time * .18 + u_step * .08, 1.3)) * 7.0, 2.0));
  float star = pow(max(0.0, 1.0 - r), 5.0);
  vec3 col = vec3(.18, .34, 1.0) * (rings * .28 + spokes * .12);
  col += vec3(.72, .90, 1.0) * pulse * .48;
  col += vec3(.20, .30, .95) * star * .22;
  return vec4(col, clamp(rings * .12 + spokes * .07 + pulse * .22 + star * .08, 0.0, .34));
}

vec4 interrogationField(vec2 uv, vec2 p) {
  float scanX = mod(u_time * .095, 1.35) - .18;
  float scan = exp(-pow((uv.x - scanX) * 16.0, 2.0));
  float bars = step(.82, hash21(vec2(floor(uv.y * 17.0), floor(u_time * 1.7))))
    * line(fract(uv.y * 17.0) - .5, .20);
  float fracture = line(sin((uv.x * 1.35 + uv.y) * 19.0 + u_time * .18), .045) * .08;
  float center = exp(-length(p) * 2.6);
  vec3 col = vec3(.06, .04, .025) * (bars * .8 + fracture);
  col += vec3(1.0, .83, .54) * scan * .20;
  col += vec3(.18, .02, .0) * center * .11;
  return vec4(col, clamp(bars * .12 + fracture + scan * .13 + center * .035, 0.0, .22));
}

vec4 resolutionField(vec2 uv, vec2 p) {
  vec2 q = p;
  q.x *= u_resolution.x / max(1.0, u_resolution.y);
  float t = u_time * .20;
  float rings = circleLine(q, .22 + .03 * sin(t), .006)
              + circleLine(q, .39 + .025 * sin(t + 1.2), .004)
              + circleLine(q, .58 + .018 * sin(t + 2.4), .003);
  float dots = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float ang = t * (.42 + fi * .015) + fi * 6.28318 / 7.0;
    float rad = .34 + .075 * sin(t * .7 + fi * 1.8);
    vec2 c = vec2(cos(ang), sin(ang)) * rad;
    dots += exp(-length(q - c) * 78.0);
  }
  float pressure = exp(-length(q) * 5.2) * (.55 + .45 * sin(u_time * 1.1));
  vec3 col = vec3(.08, .10, .16) * rings * .55;
  col += vec3(.20, .31, 1.0) * dots * .80;
  col += vec3(1.0, .30, .09) * pressure * .34;
  return vec4(col, clamp(rings * .12 + dots * .22 + pressure * .10, 0.0, .34));
}

vec4 buildField(vec2 uv, vec2 p) {
  vec2 q = uv - vec2(.5, .42);
  float depth = max(.02, uv.y + .08);
  float fan = 0.0;
  for (int i = -3; i <= 3; i++) {
    float fi = float(i);
    fan += line(q.x - fi * .11 * depth, .004 + depth * .002);
  }
  float road = line(fract((1.0 / depth) * 1.9 - u_time * 1.15) - .5, .065);
  road *= smoothstep(.04, .94, uv.y);
  float beam = exp(-pow((uv.x - .5 - sin(u_time * .28) * .08) * 8.0, 2.0)) * .18;
  vec3 col = vec3(.60, .82, 1.0) * fan * .22;
  col += vec3(1.0) * road * .18;
  col += vec3(.18, .55, 1.0) * beam;
  return vec4(col, clamp(fan * .08 + road * .08 + beam * .20, 0.0, .28));
}

void main() {
  vec2 uv = v_uv;
  vec2 p = uv - .5;
  p += u_pointer * vec2(.034, -.026);

  vec4 c;
  if (u_stage < .5) c = captureField(uv, p);
  else if (u_stage < 1.5) c = evidenceField(uv, p);
  else if (u_stage < 2.5) c = interrogationField(uv, p);
  else if (u_stage < 3.5) c = resolutionField(uv, p);
  else c = buildField(uv, p);

  vec2 mouseUv = vec2(u_pointer.x * .5 + .5, .5 - u_pointer.y * .5);
  vec2 mouseDelta = uv - mouseUv;
  mouseDelta.x *= u_resolution.x / max(1.0, u_resolution.y);
  float mouseR = length(mouseDelta);
  float mouseHalo = exp(-mouseR * 9.5);
  float mouseRing = circleLine(mouseDelta, .075 + .012 * sin(u_time * 2.2), .0055);
  vec3 mouseColor = u_stage < 1.5
    ? vec3(.46, .80, 1.0)
    : (u_stage < 2.5 ? vec3(1.0, .56, .26) : (u_stage < 3.5 ? vec3(.48, .55, 1.0) : vec3(.72, .90, 1.0)));
  c.rgb += mouseColor * (mouseHalo * .22 + mouseRing * .34);
  c.a += mouseHalo * .075 + mouseRing * .12;

  float vignette = smoothstep(.95, .28, length(p));
  c.a *= .72 + .28 * vignette;
  outColor = c;
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function ProjectIntelligenceField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = document.querySelector<HTMLElement>(".project-intelligence-shell");
    if (!canvas || !root) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });
    if (!gl) {
      root.dataset.piWebgl = "unavailable";
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vs || !fs) return;
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(program, "a_position");
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const time = gl.getUniformLocation(program, "u_time");
    const stage = gl.getUniformLocation(program, "u_stage");
    const step = gl.getUniformLocation(program, "u_step");
    const pointer = gl.getUniformLocation(program, "u_pointer");

    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    let frame = 0;
    let targetX = 0;
    let targetY = 0;
    let px = 0;
    let py = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(1.6, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    const onPointer = (event: PointerEvent) => {
      targetX = (event.clientX / Math.max(1, window.innerWidth) - .5) * 2;
      targetY = (event.clientY / Math.max(1, window.innerHeight) - .5) * 2;
    };

    const render = (now: number) => {
      resize();
      px += (targetX - px) * .072;
      py += (targetY - py) * .072;

      const stageValue = Number(root.dataset.piStage ?? "0");
      const stepValue = Number(root.dataset.piStep ?? "0");
      root.style.setProperty("--pi-idle-time", String((now - start) / 1000));

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, (now - start) / 1000);
      gl.uniform1f(stage, Number.isFinite(stageValue) ? stageValue : 0);
      gl.uniform1f(step, Number.isFinite(stepValue) ? stepValue : 0);
      gl.uniform2f(pointer, px, py);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      frame = window.requestAnimationFrame(render);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    frame = window.requestAnimationFrame(render);
    root.dataset.piWebgl = "ready";

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      root.removeAttribute("data-pi-webgl");
    };
  }, []);

  return <canvas ref={canvasRef} className="pi-webgl-field" aria-hidden="true" />;
}

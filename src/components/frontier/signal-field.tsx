"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float glow(vec2 uv, vec2 center, float radius) {
  float d = length(uv - center);
  return exp(-d * d / radius);
}

void main() {
  vec2 frag = gl_FragCoord.xy / u_resolution.xy;
  vec2 uv = frag;
  uv.x *= u_resolution.x / max(u_resolution.y, 1.0);

  vec2 pointer = u_pointer;
  pointer.x *= u_resolution.x / max(u_resolution.y, 1.0);

  float t = u_time * 0.18;
  vec2 c1 = vec2(0.25 + sin(t * 0.9) * 0.12, 0.75 + cos(t * 0.7) * 0.10);
  vec2 c2 = vec2(0.92 + cos(t * 0.8) * 0.14, 0.35 + sin(t * 0.6) * 0.14);
  vec2 c3 = vec2(0.58 + sin(t * 0.55) * 0.18, 0.18 + cos(t * 0.85) * 0.10);

  float n = noise(uv * 2.6 + vec2(t * 0.17, -t * 0.11));
  float g1 = glow(uv, c1, 0.18 + n * 0.05);
  float g2 = glow(uv, c2, 0.15 + n * 0.04);
  float g3 = glow(uv, c3, 0.13 + n * 0.05);
  float gp = glow(uv, pointer, 0.08) * 0.7;

  vec3 base = vec3(0.012, 0.018, 0.038);
  vec3 cyan = vec3(0.08, 0.93, 1.0);
  vec3 violet = vec3(0.43, 0.18, 1.0);
  vec3 magenta = vec3(1.0, 0.08, 0.62);
  vec3 lime = vec3(0.62, 1.0, 0.26);

  vec3 color = base;
  color += cyan * g1 * 0.42;
  color += violet * g2 * 0.36;
  color += magenta * g3 * 0.22;
  color += mix(cyan, lime, frag.y) * gp * 0.17;

  vec2 center = frag - vec2(0.5);
  center.x *= u_resolution.x / max(u_resolution.y, 1.0);
  float radius = length(center);
  float ring = 1.0 - smoothstep(0.0, 0.008, abs(fract(radius * 5.0 - t * 0.16) - 0.5) - 0.485);
  color += cyan * ring * 0.018 * smoothstep(0.85, 0.08, radius);

  float grain = hash(gl_FragCoord.xy + u_time) - 0.5;
  color += grain * 0.025;

  float vignette = smoothstep(0.95, 0.24, length(frag - 0.5));
  color *= mix(0.55, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
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

export function SignalField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertex || !fragment) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const position = gl.getAttribLocation(program, "a_position");
    const resolution = gl.getUniformLocation(program, "u_resolution");
    const pointerUniform = gl.getUniformLocation(program, "u_pointer");
    const timeUniform = gl.getUniformLocation(program, "u_time");

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    let pointer = { x: 0.5, y: 0.5 };
    let frame = 0;
    const start = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.7);
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
    };

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = {
        x: Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(rect.width, 1))),
        y: 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(rect.height, 1))),
      };
    };

    const draw = (now: number) => {
      resize();
      gl.useProgram(program);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(pointerUniform, pointer.x, pointer.y);
      gl.uniform1f(timeUniform, reduced ? 0 : (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) frame = requestAnimationFrame(draw);
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("resize", resize);
    draw(performance.now());

    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", resize);
      if (frame) cancelAnimationFrame(frame);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}

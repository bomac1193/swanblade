"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface ShaderBackgroundProps {
  colors: [string, string, string];
  width?: number;
  height?: number;
  className?: string;
  interactive?: boolean;
}

// Convert hex to RGB normalized (0-1)
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ];
}

const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;

  varying vec2 v_uv;
  uniform float u_time;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;

  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                           + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                           dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = v_uv;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 pos = uv;
    pos.x *= aspect;

    float time = u_time * 0.4;

    // Mouse influence - creates a flowing attraction point
    vec2 mouse = u_mouse;
    mouse.x *= aspect;
    float mouseDist = length(pos - mouse);
    float mouseInfluence = smoothstep(0.8, 0.0, mouseDist);

    // Create flowing noise patterns with more movement
    float n1 = snoise(pos * 2.0 + time * 0.5 + mouse * 0.3) * 0.5 + 0.5;
    float n2 = snoise(pos * 3.0 - time * 0.4 + vec2(100.0) - mouse * 0.2) * 0.5 + 0.5;
    float n3 = snoise(pos * 1.5 + time * 0.3 + vec2(200.0)) * 0.5 + 0.5;

    // Layered turbulence for more organic movement
    float turb = snoise(pos * 4.0 + time) * 0.25;
    turb += snoise(pos * 8.0 - time * 0.7) * 0.125;

    // Mouse creates swirling effect
    float swirl = sin(mouseDist * 10.0 - time * 2.0) * mouseInfluence * 0.3;
    n1 += swirl;
    n2 -= swirl * 0.5;

    // Blend colors based on noise with mouse interaction
    vec3 color = u_color1 * n1;
    color += u_color2 * n2 * (1.0 - n1 * 0.4);
    color += u_color3 * n3 * 0.4;
    color += turb * (u_color1 + u_color2) * 0.2;

    // Mouse glow effect
    color += mouseInfluence * 0.15 * (u_color1 + u_color3);

    // Pulsing effect
    float pulse = sin(time * 1.5) * 0.05 + 1.0;
    color *= pulse;

    // Add subtle vignette
    float vignette = 1.0 - length(uv - 0.5) * 0.4;
    color *= vignette;

    // Gamma correction
    color = pow(color, vec3(0.85));

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function ShaderBackground({
  colors,
  width,
  height,
  className,
  interactive = true,
}: ShaderBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 });
  const currentMouseRef = useRef({ x: 0.5, y: 0.5 });

  const createShader = useCallback(
    (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    },
    []
  );

  const initGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
    });
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    glRef.current = gl;

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vertexShader || !fragmentShader) return;

    // Create program
    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;

    // Create fullscreen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    startTimeRef.current = performance.now();
  }, [createShader]);

  const render = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;

    if (!gl || !program || !canvas) return;

    // Smooth mouse interpolation
    const lerp = 0.08;
    currentMouseRef.current.x += (targetMouseRef.current.x - currentMouseRef.current.x) * lerp;
    currentMouseRef.current.y += (targetMouseRef.current.y - currentMouseRef.current.y) * lerp;

    // Update canvas size
    const displayWidth = width ?? canvas.clientWidth;
    const displayHeight = height ?? canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, displayWidth, displayHeight);
    }

    gl.useProgram(program);

    // Set uniforms
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const mouseLocation = gl.getUniformLocation(program, "u_mouse");
    const color1Location = gl.getUniformLocation(program, "u_color1");
    const color2Location = gl.getUniformLocation(program, "u_color2");
    const color3Location = gl.getUniformLocation(program, "u_color3");

    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    gl.uniform1f(timeLocation, elapsed);
    gl.uniform2f(resolutionLocation, displayWidth, displayHeight);
    gl.uniform2f(mouseLocation, currentMouseRef.current.x, currentMouseRef.current.y);

    const [r1, g1, b1] = hexToRgb(colors[0]);
    const [r2, g2, b2] = hexToRgb(colors[1]);
    const [r3, g3, b3] = hexToRgb(colors[2]);

    gl.uniform3f(color1Location, r1, g1, b1);
    gl.uniform3f(color2Location, r2, g2, b2);
    gl.uniform3f(color3Location, r3, g3, b3);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    animationRef.current = requestAnimationFrame(render);
  }, [colors, width, height]);

  useEffect(() => {
    initGL();
    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initGL, render]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!interactive) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height; // Flip Y for WebGL
      targetMouseRef.current = { x, y };
    },
    [interactive]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLCanvasElement>) => {
      if (!interactive) return;
      const canvas = canvasRef.current;
      if (!canvas || !e.touches[0]) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) / rect.width;
      const y = 1.0 - (e.touches[0].clientY - rect.top) / rect.height;
      targetMouseRef.current = { x, y };
    },
    [interactive]
  );

  return (
    <canvas
      ref={canvasRef}
      className={className}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      style={{
        width: width ?? "100%",
        height: height ?? "100%",
        display: "block",
      }}
    />
  );
}

export default ShaderBackground;

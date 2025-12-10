import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface AuroraSkyProps {
  visible: boolean;
  intensity?: number;
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  skyColor?: string;
}

// --- Aurora Vertex Shader ---
const auroraVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// --- Aurora Fragment Shader (FIXED - No Seam) ---
const auroraFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColorPrimary;
  uniform vec3 uColorSecondary;
  uniform vec3 uColorTertiary;
  uniform vec3 uSkyColor;
  
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  // Simplex noise
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  void main() {
    // FIXED: Use UV.x for horizontal (seamless wrapping on sphere)
    // UV.x goes 0->1 around the sphere without discontinuity
    float horizontalPos = vUv.x;
    
    // Use world position Y for height (more accurate than UV.y on sphere)
    vec3 dir = normalize(vWorldPosition);
    float worldHeight = dir.y;
    
    // Below horizon - solid sky color
    if (worldHeight < 0.0) {
      gl_FragColor = vec4(uSkyColor, 1.0);
      return;
    }
    
    // Normalized height (0 at horizon, 1 at zenith)
    float normalizedHeight = worldHeight;
    
    // === AURORA CURTAIN EFFECT ===
    
    float slowTime = uTime * 0.06;
    float verySlowTime = uTime * 0.025;
    
    // FIXED: Scale horizontal to create seamless tiling
    // Multiply by 2π equivalent for seamless noise wrapping
    float hPos = horizontalPos * 6.28318;
    
    // Layer 1: Primary curtain waves (use sin/cos for seamless wrapping)
    float curtain1 = snoise(vec2(sin(hPos) * 2.0 + slowTime, cos(hPos) * 2.0 + normalizedHeight * 0.6 + verySlowTime));
    curtain1 += snoise(vec2(horizontalPos * 8.0 + slowTime, normalizedHeight * 0.8));
    curtain1 = smoothstep(-0.4, 0.8, curtain1 * 0.5);
    
    // Layer 2: Secondary waves
    float curtain2 = snoise(vec2(sin(hPos * 2.0) * 3.0 - slowTime * 0.8, cos(hPos * 2.0) * 3.0 + normalizedHeight + verySlowTime));
    curtain2 = smoothstep(-0.2, 0.6, curtain2);
    
    // Layer 3: Fine shimmer
    float shimmer = snoise(vec2(horizontalPos * 20.0 + slowTime * 0.4, normalizedHeight * 2.0 - verySlowTime));
    shimmer = smoothstep(0.1, 0.6, shimmer) * 0.3;
    
    // Vertical bands (curtain ribbons) - use sin for seamless wrap
    float bands = sin(hPos * 4.0 + slowTime * 0.4) * 0.5 + 0.5;
    bands *= sin(hPos * 7.0 - slowTime * 0.25) * 0.5 + 0.5;
    bands = smoothstep(0.15, 0.85, bands);
    
    // Combine layers
    float auroraShape = curtain1 * 0.5 + curtain2 * 0.35 + shimmer;
    auroraShape *= bands;
    
    // Aurora strongest just above horizon, fading toward zenith
    float heightFade = exp(-normalizedHeight * 2.2) * 1.4;
    heightFade = clamp(heightFade, 0.0, 1.0);
    
    // Clean horizon line fade
    float horizonFade = smoothstep(0.0, 0.12, normalizedHeight);
    heightFade *= horizonFade;
    
    auroraShape *= heightFade;
    
    // === COLOR MIXING ===
    
    float colorNoise = snoise(vec2(sin(hPos) * 4.0 + verySlowTime, normalizedHeight * 3.0));
    colorNoise = colorNoise * 0.5 + 0.5;
    
    vec3 auroraColor = mix(uColorPrimary, uColorSecondary, colorNoise);
    
    // Tertiary accent
    float tertiaryRegion = snoise(vec2(cos(hPos) * 3.0 - verySlowTime * 0.6, normalizedHeight * 1.5));
    tertiaryRegion = smoothstep(0.25, 0.75, tertiaryRegion);
    auroraColor = mix(auroraColor, uColorTertiary, tertiaryRegion * 0.35);
    
    // Brighten core
    auroraColor += vec3(0.2, 0.15, 0.25) * pow(auroraShape, 0.5);
    
    // === FINAL COMPOSITE ===
    
    float finalAlpha = auroraShape * uIntensity * 1.3;
    finalAlpha = clamp(finalAlpha, 0.0, 1.0);
    
    // Blend with sky
    vec3 finalColor = mix(uSkyColor, auroraColor, finalAlpha);
    
    // Glow effect
    finalColor += auroraColor * finalAlpha * 0.25;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// --- Aurora Sky Component ---
const AuroraSky: React.FC<AuroraSkyProps> = ({ 
  visible, 
  intensity = 0.7,
  primaryColor = '#9966ff',
  secondaryColor = '#ff66aa',
  tertiaryColor = '#6688ff',
  skyColor = '#0a1628',
}) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Memoize uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uColorPrimary: { value: new THREE.Color(primaryColor) },
    uColorSecondary: { value: new THREE.Color(secondaryColor) },
    uColorTertiary: { value: new THREE.Color(tertiaryColor) },
    uSkyColor: { value: new THREE.Color(skyColor) },
  }), []);
  
  // Animate
  useFrame((_, delta) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    
    // Update time
    mat.uniforms.uTime.value += delta;
    
    // Smooth intensity transition
    const targetIntensity = visible ? intensity : 0;
    mat.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      mat.uniforms.uIntensity.value,
      targetIntensity,
      delta * 0.8
    );
    
    // Lerp colors for smooth transitions
    mat.uniforms.uColorPrimary.value.lerp(new THREE.Color(primaryColor), delta * 0.5);
    mat.uniforms.uColorSecondary.value.lerp(new THREE.Color(secondaryColor), delta * 0.5);
    mat.uniforms.uColorTertiary.value.lerp(new THREE.Color(tertiaryColor), delta * 0.5);
    mat.uniforms.uSkyColor.value.lerp(new THREE.Color(skyColor), delta * 0.5);
    
    // Visibility control
    if (meshRef.current) {
      meshRef.current.visible = mat.uniforms.uIntensity.value > 0.01 || visible;
    }
  });
  
  return (
    <mesh 
      ref={meshRef}
      visible={visible}
      frustumCulled={false}
    >
      {/* Sky dome - large sphere */}
      <sphereGeometry args={[95, 64, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={auroraVertexShader}
        fragmentShader={auroraFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent={false}
        depthWrite={false}
        fog={false}  // CRITICAL: Disable fog on sky dome
      />
    </mesh>
  );
};

export default AuroraSky;
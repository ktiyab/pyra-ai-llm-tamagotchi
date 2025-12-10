import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TimeOfDay } from '../../types';
import { ENVIRONMENT, TIME_OF_DAY_THEME } from '../../constants';

interface GrassFieldProps {
  timeOfDay: TimeOfDay;
  creatureScale: number;
  creaturePosition: THREE.Vector3; // FIXED: Dynamic position for clearing
}

// GLSL Vertex Shader - Wind animation + dynamic clearing
const grassVertexShader = `
  uniform float uTime;
  uniform float uWindStrength;
  uniform float uClearingRadius;
  uniform vec3 uCreaturePosition;
  uniform vec3 uGrassBaseColor;
  uniform vec3 uGrassTipColor;
  
  attribute vec3 basePosition;
  attribute float offset;
  
  varying float vHeight;
  varying vec3 vColor;
  varying float vVisibility;
  
  void main() {
    vHeight = position.y;
    
    // FIXED: Calculate distance from CREATURE position (not origin)
    vec2 creatureXZ = uCreaturePosition.xz;
    vec2 bladeXZ = basePosition.xz;
    float distFromCreature = length(bladeXZ - creatureXZ);
    
    // Smooth fade at clearing edge
    vVisibility = smoothstep(uClearingRadius * 0.6, uClearingRadius * 1.4, distFromCreature);
    
    // Skip vertices in clearing (GPU optimization)
    if (vVisibility < 0.01) {
      gl_Position = vec4(0.0, -1000.0, 0.0, 1.0);
      return;
    }
    
    vec3 pos = position;
    
    // Wind effect - varies by world position and time
    float windPhase = uTime * 2.0 + basePosition.x * 0.5 + basePosition.z * 0.3 + offset * 6.28;
    float windEffect = sin(windPhase) * uWindStrength;
    windEffect *= position.y * position.y; // Stronger at tip
    
    // FIXED: Add subtle creature influence - grass bends away slightly when close
    float creatureInfluence = 1.0 - smoothstep(uClearingRadius, uClearingRadius * 2.5, distFromCreature);
    vec2 awayDir = normalize(bladeXZ - creatureXZ + vec2(0.001)); // Avoid zero
    pos.xz += awayDir * creatureInfluence * position.y * 0.15;
    
    pos.x += windEffect;
    pos.z += windEffect * 0.5;
    
    vec3 worldPos = pos + basePosition;
    
    // Color variation based on position
    float colorVariation = fract(sin(dot(basePosition.xz, vec2(12.9898, 78.233))) * 43758.5453);
    vColor = mix(uGrassBaseColor, uGrassTipColor, colorVariation);
    vColor = mix(vColor, uGrassTipColor, vHeight * 0.6);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(worldPos, 1.0);
  }
`;

// GLSL Fragment Shader
const grassFragmentShader = `
  varying float vHeight;
  varying vec3 vColor;
  varying float vVisibility;
  
  void main() {
    if (vVisibility < 0.01) discard;
    
    vec3 color = vColor;
    color *= 0.7 + vHeight * 0.4;
    
    gl_FragColor = vec4(color, vVisibility);
  }
`;

const GrassField: React.FC<GrassFieldProps> = ({ timeOfDay, creatureScale, creaturePosition }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Calculate clearing radius based on creature scale
  const clearingRadius = useMemo(() => {
    return ENVIRONMENT.GRASS_CLEARING_BASE + (creatureScale * ENVIRONMENT.GRASS_CLEARING_SCALE_MULT);
  }, [creatureScale]);
  
  // Get current theme colors
  const theme = TIME_OF_DAY_THEME[timeOfDay];
  
  // Build grass geometry (runs once)
  const geometry = useMemo(() => {
    const {
      GRASS_DENSITY,
      GRASS_RADIUS,
      GRASS_BLADE_HEIGHT,
      GRASS_BLADE_WIDTH,
    } = ENVIRONMENT;
    
    const geo = new THREE.BufferGeometry();
    const segments = 4;
    
    const bladeVerts: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const h = t * GRASS_BLADE_HEIGHT;
      const w = GRASS_BLADE_WIDTH * (1 - t * 0.8);
      bladeVerts.push(-w, h, 0);
      bladeVerts.push(w, h, 0);
    }
    
    const bladeIndices: number[] = [];
    for (let i = 0; i < segments; i++) {
      const base = i * 2;
      bladeIndices.push(base, base + 1, base + 2);
      bladeIndices.push(base + 1, base + 3, base + 2);
    }
    
    const positions: number[] = [];
    const basePositions: number[] = [];
    const offsets: number[] = [];
    const vertsPerBlade = bladeVerts.length / 3;
    
    for (let i = 0; i < GRASS_DENSITY; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * GRASS_RADIUS;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const scale = 0.5 + Math.random() * 1.0;
      const rotation = Math.random() * Math.PI * 2;
      const bladeOffset = Math.random();
      
      for (let j = 0; j < bladeVerts.length; j += 3) {
        const vx = bladeVerts[j];
        const vy = bladeVerts[j + 1] * scale;
        const vz = bladeVerts[j + 2];
        
        const rx = vx * Math.cos(rotation) - vz * Math.sin(rotation);
        const rz = vx * Math.sin(rotation) + vz * Math.cos(rotation);
        
        positions.push(rx, vy, rz);
        basePositions.push(x, 0, z);
        offsets.push(bladeOffset);
      }
    }
    
    const allIndices: number[] = [];
    for (let i = 0; i < GRASS_DENSITY; i++) {
      const offset = i * vertsPerBlade;
      for (const idx of bladeIndices) {
        allIndices.push(idx + offset);
      }
    }
    
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('basePosition', new THREE.Float32BufferAttribute(basePositions, 3));
    geo.setAttribute('offset', new THREE.Float32BufferAttribute(offsets, 1));
    geo.setIndex(allIndices);
    
    return geo;
  }, []);
  
  // Animate wind and update uniforms each frame
  useFrame(({ clock }, delta) => {
    if (!materialRef.current) return;
    
    const mat = materialRef.current;
    mat.uniforms.uTime.value = clock.getElapsedTime();
    mat.uniforms.uClearingRadius.value = clearingRadius;
    
    // Update creature position uniform every frame
    mat.uniforms.uCreaturePosition.value.copy(creaturePosition);
    
    // Lerp grass colors for smooth TimeOfDay transitions
    const targetBase = new THREE.Color().setRGB(theme.grassBase[0], theme.grassBase[1], theme.grassBase[2]);
    const targetTip = new THREE.Color().setRGB(theme.grassTip[0], theme.grassTip[1], theme.grassTip[2]);
    
    const currentBase = mat.uniforms.uGrassBaseColor.value as THREE.Color;
    const currentTip = mat.uniforms.uGrassTipColor.value as THREE.Color;
    
    currentBase.lerp(targetBase, delta * 0.5);
    currentTip.lerp(targetTip, delta * 0.5);
  });
  
  return (
    <mesh frustumCulled={false} position={[0, -0.5, 0]}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        ref={materialRef}
        vertexShader={grassVertexShader}
        fragmentShader={grassFragmentShader}
        side={THREE.DoubleSide}
        transparent
        uniforms={{
          uTime: { value: 0 },
          uWindStrength: { value: 0.25 },
          uClearingRadius: { value: clearingRadius },
          uCreaturePosition: { value: new THREE.Vector3(0, 0, 0) },
          uGrassBaseColor: { value: new THREE.Color().setRGB(theme.grassBase[0], theme.grassBase[1], theme.grassBase[2]) },
          uGrassTipColor: { value: new THREE.Color().setRGB(theme.grassTip[0], theme.grassTip[1], theme.grassTip[2]) },
        }}
      />
    </mesh>
  );
};

export default GrassField;
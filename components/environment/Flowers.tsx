import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ENVIRONMENT, FLOWER_PALETTE } from '../../constants';

// FIXED: Extended props for dynamic clearing + scroll regeneration
interface FlowersProps {
  creaturePosition: THREE.Vector3;
  creatureScale: number;
  scrollSeed: number; // FIXED: Changes on scroll to trigger regeneration
  worldOffset: THREE.Vector3; // FIXED: Added for zone-based positioning
}

interface FlowerData {
  id: number;
  position: THREE.Vector3;
  color: THREE.Color;
  scale: number;
  baseVisible: boolean;
  swayOffset: number;
}

// Deterministic random based on seed
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

// FIXED: JavaScript smoothstep matching GLSL behavior
const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const Flowers: React.FC<FlowersProps> = ({ creaturePosition, creatureScale, scrollSeed, worldOffset }) => {
  const groupRef = useRef<THREE.Group>(null);
  const materialsRef = useRef<(THREE.MeshLambertMaterial | null)[]>([]);
  
  // Calculate clearing radius using same formula as GrassField
  const clearingRadius = useMemo(() => {
    return ENVIRONMENT.GRASS_CLEARING_BASE + (creatureScale * ENVIRONMENT.GRASS_CLEARING_SCALE_MULT);
  }, [creatureScale]);
  
  // FIXED: Generate flowers based on scrollSeed AND worldOffset for zone-awareness
  const flowers = useMemo((): FlowerData[] => {
    const { FLOWER_COUNT, FLOWER_RADIUS, GRASS_CLEARING_BASE } = ENVIRONMENT;
    const result: FlowerData[] = [];
    
    // FIXED: Incorporate worldOffset into seed for true zone variation
    // Different zones at different offsets will have different flower arrangements
    const zoneHash = Math.floor(worldOffset.z / 10) * 7919; // Prime for better distribution
    const baseSeed = (scrollSeed * 12345) + zoneHash;
    
    for (let i = 0; i < FLOWER_COUNT; i++) {
      const flowerSeed = baseSeed + i;
      
      // Evolution visibility - varies per zone
      const isBaseVisible = seededRandom(flowerSeed * 137) > ENVIRONMENT.FLOWER_CHANGE_PERCENT;
      
      // Position (ring around origin - creature stays near origin due to scroll system)
      const angle = seededRandom(flowerSeed * 12.9898) * Math.PI * 2;
      const minRadius = GRASS_CLEARING_BASE + 1;
      const radius = minRadius + seededRandom(flowerSeed * 78.233) * (FLOWER_RADIUS - minRadius);
      
      // FIXED: Add slight zone-based offset variation for visual variety
      const zoneVariationX = (seededRandom(flowerSeed * 11.11 + zoneHash) - 0.5) * 2;
      const zoneVariationZ = (seededRandom(flowerSeed * 22.22 + zoneHash) - 0.5) * 2;
      
      const x = Math.cos(angle) * radius + zoneVariationX;
      const z = Math.sin(angle) * radius + zoneVariationZ;
      const y = 0.3 + seededRandom(flowerSeed * 43.758) * 0.25;
      
      // Color from palette - zone can influence color distribution
      const colorSeed = flowerSeed * 93.989 + (zoneHash * 0.001);
      const paletteIndex = Math.floor(seededRandom(colorSeed) * FLOWER_PALETTE.length);
      const { h, s, l } = FLOWER_PALETTE[paletteIndex];
      const hueVar = (seededRandom(flowerSeed * 27.183) - 0.5) * 15;
      const color = new THREE.Color().setHSL((h + hueVar) / 360, s / 100, l / 100);
      
      result.push({
        id: i,
        position: new THREE.Vector3(x, y, z),
        color,
        scale: 0.08 + seededRandom(flowerSeed * 61.803) * 0.06,
        baseVisible: isBaseVisible,
        swayOffset: seededRandom(flowerSeed * 17.32) * Math.PI * 2,
      });
    }
    
    console.log("🌸 Flowers regenerated - seed:", scrollSeed, "zone:", Math.floor(worldOffset.z / 10));
    return result;
  }, [scrollSeed, worldOffset.z]); // FIXED: Added worldOffset.z dependency
  
  // FIXED: Reset materials ref when flowers regenerate
  useMemo(() => {
    materialsRef.current = new Array(flowers.length).fill(null);
  }, [flowers]);
  
  // Dynamic visibility + sway animation per frame
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    
    const time = clock.getElapsedTime();
    const creatureX = creaturePosition.x;
    const creatureZ = creaturePosition.z;
    
    // Pre-calculate clearing thresholds
    const fadeStart = clearingRadius * 0.6;
    const fadeEnd = clearingRadius * 1.4;
    
    groupRef.current.children.forEach((child, i) => {
      if (i >= flowers.length) return;
      const flower = flowers[i];
      const mat = materialsRef.current[i];
      
      if (!mat) return;
      
      // Distance check from creature position
      const dx = flower.position.x - creatureX;
      const dz = flower.position.z - creatureZ;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      // Smoothstep visibility matching grass shader
      const proximityVisibility = smoothstep(fadeStart, fadeEnd, distance);
      
      // Combine with base evolution visibility
      const finalVisibility = flower.baseVisible ? proximityVisibility : 0;
      
      // Update material opacity
      mat.opacity = finalVisibility;
      mat.visible = finalVisibility > 0.01;
      
      // Gentle sway (only if visible)
      if (mat.visible) {
        const sway = Math.sin(time * 1.5 + flower.swayOffset) * 0.05;
        child.position.x = flower.position.x + sway;
        child.position.z = flower.position.z + sway * 0.5;
      }
    });
  });
  
  // Shared geometry
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  
  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {flowers.map((flower, idx) => (
        <mesh
          key={`${scrollSeed}-${flower.id}`} // FIXED: Key includes seed for proper React reconciliation
          geometry={sphereGeo}
          position={flower.position}
          scale={flower.scale}
        >
          <meshLambertMaterial
            ref={(mat) => {
              if (mat) materialsRef.current[idx] = mat;
            }}
            color={flower.color}
            transparent
            opacity={flower.baseVisible ? 1 : 0}
          />
        </mesh>
      ))}
    </group>
  );
};

export default Flowers;
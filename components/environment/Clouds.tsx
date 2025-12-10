import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TimeOfDay } from '../../types';
import { ENVIRONMENT, TIME_OF_DAY_THEME, WORLD_SCROLL_CONFIG } from '../../constants';

// FIXED: Added worldOffset for parallax
interface CloudsProps {
  timeOfDay: TimeOfDay;
  worldOffset: THREE.Vector3;
}

interface CloudGroupData {
  id: number;
  position: THREE.Vector3;
  basePosition: THREE.Vector3; // FIXED: Store original position for parallax calc
  scale: number;
  speed: number;
  parts: { offset: THREE.Vector3; scale: number }[]; 
}

// Deterministic random
const seededRandom = (seed: number) => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

const Clouds: React.FC<CloudsProps> = ({ timeOfDay, worldOffset }) => {
  const groupRef = useRef<THREE.Group>(null);
  const opacityRef = useRef(1);
  const colorRef = useRef(new THREE.Color(TIME_OF_DAY_THEME[timeOfDay].cloudColor));
  
  // FIXED: Track previous offset for smooth parallax
  const prevOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  // Generate cloud formations
  const clouds = useMemo((): CloudGroupData[] => {
    const { CLOUD_COUNT, CLOUD_SPREAD, CLOUD_HEIGHT_MIN, CLOUD_HEIGHT_MAX } = ENVIRONMENT;
    const result: CloudGroupData[] = [];
    
    for (let i = 0; i < CLOUD_COUNT; i++) {
      const x = (seededRandom(i * 12.34) - 0.5) * CLOUD_SPREAD;
      const y = CLOUD_HEIGHT_MIN + seededRandom(i * 56.78) * (CLOUD_HEIGHT_MAX - CLOUD_HEIGHT_MIN);
      const z = (seededRandom(i * 90.12) - 0.5) * CLOUD_SPREAD;
      
      const partCount = 3 + Math.floor(seededRandom(i * 34.56) * 3);
      const parts: { offset: THREE.Vector3; scale: number }[] = [];
      
      for (let j = 0; j < partCount; j++) {
        parts.push({
          offset: new THREE.Vector3(
            j * 1.2 - (partCount * 0.6),
            seededRandom(i * 100 + j * 11) * 0.5,
            seededRandom(i * 100 + j * 22) * 0.5
          ),
          scale: 1 + seededRandom(i * 100 + j * 33) * 1.5,
        });
      }
      
      const basePos = new THREE.Vector3(x, y, z);
      
      result.push({
        id: i,
        position: basePos.clone(),
        basePosition: basePos.clone(), // FIXED: Store for parallax reference
        scale: 1 + seededRandom(i * 78.9),
        speed: 0.5 + seededRandom(i * 45.67) * 0.5,
        parts,
      });
    }
    
    return result;
  }, []);
  
  // Target opacity and color based on TimeOfDay
  const theme = TIME_OF_DAY_THEME[timeOfDay];
  const targetOpacity = theme.cloudOpacity;
  const targetColor = new THREE.Color(theme.cloudColor);
  
  // FIXED: Animate drift, opacity, color, AND parallax
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    // Lerp opacity
    opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, delta * 0.5);
    
    // Lerp color
    colorRef.current.lerp(targetColor, delta * 0.5);
    
    // FIXED: Calculate parallax offset (clouds move slower than ground)
    const parallaxFactor = WORLD_SCROLL_CONFIG.CLOUD_PARALLAX_FACTOR;
    const parallaxOffset = {
      x: worldOffset.x * parallaxFactor,
      z: worldOffset.z * parallaxFactor,
    };
    
    // Update cloud positions with drift + parallax
    groupRef.current.children.forEach((cloudGroup, i) => {
      if (i >= clouds.length) return;
      const cloudData = clouds[i];
      
      // Natural drift (existing behavior)
      cloudData.position.x += cloudData.speed * delta * 0.3;
      
      // Wrap around when out of view
      if (cloudData.position.x > ENVIRONMENT.CLOUD_SPREAD / 2 + 10) {
        cloudData.position.x = -ENVIRONMENT.CLOUD_SPREAD / 2 - 10;
      }
      
      // FIXED: Apply parallax offset (makes clouds seem further away)
      // Subtract parallax so clouds move OPPOSITE to travel direction
      cloudGroup.position.x = cloudData.position.x - parallaxOffset.x;
      cloudGroup.position.y = cloudData.basePosition.y;
      cloudGroup.position.z = cloudData.basePosition.z - parallaxOffset.z;
      
      // Update opacity and color on all cloud parts
      cloudGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
          mat.opacity = opacityRef.current;
          mat.color.copy(colorRef.current);
          mat.transparent = true;
          mat.visible = opacityRef.current > 0.01;
        }
      });
    });
    
    // Update previous offset ref
    prevOffsetRef.current.copy(worldOffset);
  });
  
  // Shared geometry
  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  
  // Don't render at all if fully transparent
  if (targetOpacity < 0.01 && opacityRef.current < 0.01) {
    return null;
  }
  
  return (
    <group ref={groupRef}>
      {clouds.map((cloud) => (
        <group key={cloud.id} position={cloud.position.toArray()} scale={cloud.scale}>
          {cloud.parts.map((part, partIdx) => (
            <mesh
              key={partIdx}
              geometry={sphereGeo}
              position={part.offset.toArray()}
              scale={part.scale}
            >
              <meshLambertMaterial
                color={theme.cloudColor}
                transparent
                opacity={opacityRef.current}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

export default Clouds;
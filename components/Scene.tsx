import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, useGLTF, Sparkles, Float, useAnimations, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GameState, Stage, Seed, AnimationDirective, TimeOfDay, ChatMessage } from '../types';
// FIXED: Added CAMERA_FOLLOW import
import { TREX_MODEL_URL, TIME_OF_DAY_THEME, MAGICAL_PARTICLES, INTERACTION_EMOJIS, CAMERA_FOLLOW } from '../constants';
import { audioService } from '../services/audioService';
import { 
  animController, 
  AnimationName, 
  playHatchSequence, 
  resetAnimationWorld,
  ScrollDirection  // FIXED: Add this import
} from '../services/animationController';

import { GrassField, Flowers, Clouds, AuroraSky } from './environment';

// --- FIXED: Decoupled Animation Updater ---
// Runs independently of camera, ensures worldPosition updates every frame
const AnimationUpdater: React.FC = () => {
  useFrame((_, delta) => {
    animController.update(delta);
  });
  return null;
};

// --- FIXED: Camera Sync with Delta-Based Lerp and Snap/Catch-up ---
const CameraSync = ({ controlsRef }: { controlsRef: React.RefObject<any> }) => {
  const targetPos = useRef(new THREE.Vector3(0, 2, 8));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    const { targetCamDistance, targetCamHeight, worldPosition } = animController;

    // 1. Update look-at target from T-Rex world position
    targetLookAt.current.set(worldPosition.x, 0, worldPosition.z);
    
    // 2. Calculate distance for snap/catch-up decision
    const distanceToTarget = controls.target.distanceTo(targetLookAt.current);
    
    // 3. Determine lerp strategy
    // FIXED: Check if scroll just occurred - need atomic snap
    const scrollOccurred = animController.justScrolled; // Read but don't consume yet
    
    if (distanceToTarget > CAMERA_FOLLOW.SNAP_THRESHOLD || scrollOccurred) {
      // SNAP: Instant teleport for large jumps OR scroll reset
      controls.target.copy(targetLookAt.current);
      
      // FIXED: Also snap camera position during scroll to prevent visual jump
      if (scrollOccurred) {
        const spherical = new THREE.Spherical();
        const offsetFromTarget = controls.object.position.clone().sub(controls.target);
        spherical.setFromVector3(offsetFromTarget);
        spherical.radius = targetCamDistance;
        
        const snapPos = new THREE.Vector3().setFromSpherical(spherical).add(controls.target);
        snapPos.y = targetCamHeight;
        controls.object.position.copy(snapPos);
      }
    } else {
      // LERP: Smooth follow with catch-up
      // LERP: Smooth follow with catch-up
      // FIXED: Frame-rate independent lerp (delta * 60 normalizes to 60fps)
      let lerpFactor = CAMERA_FOLLOW.TARGET_LERP * delta * 60;
      
      // FIXED: Catch-up multiplier when falling behind
      if (distanceToTarget > CAMERA_FOLLOW.CATCHUP_THRESHOLD) {
        lerpFactor *= CAMERA_FOLLOW.CATCHUP_MULTIPLIER;
      }
      
      // FIXED: Clamp to prevent overshooting on frame spikes
      lerpFactor = Math.min(lerpFactor, CAMERA_FOLLOW.MAX_LERP_FACTOR);
      controls.target.lerp(targetLookAt.current, lerpFactor);
    }

    // 4. Calculate camera position based on orbit angle + target
    const spherical = new THREE.Spherical();
    const offsetFromTarget = controls.object.position.clone().sub(controls.target);
    spherical.setFromVector3(offsetFromTarget);
    spherical.radius = targetCamDistance;
    
    targetPos.current.setFromSpherical(spherical).add(controls.target);
    targetPos.current.y = targetCamHeight;

    // 5. FIXED: Smooth camera position follow (delta-based)
    const posLerpFactor = Math.min(
      CAMERA_FOLLOW.POSITION_LERP * delta * 60,
      CAMERA_FOLLOW.MAX_LERP_FACTOR
    );
    controls.object.position.lerp(targetPos.current, posLerpFactor);
    
    // 6. Update orbit constraints
    controls.minDistance = Math.max(3, targetCamDistance - 3);
    controls.maxDistance = targetCamDistance + 4;
    
    // Required when programmatically updating target
    controls.update();
  });

  return null;
};

// --- Ground Component (TimeOfDay-aware) ---
const Ground = ({ timeOfDay }: { timeOfDay: TimeOfDay }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetColor = useRef(new THREE.Color(TIME_OF_DAY_THEME[timeOfDay].ground));
  
  useEffect(() => {
    targetColor.current.set(TIME_OF_DAY_THEME[timeOfDay].ground);
  }, [timeOfDay]);
  
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.color.lerp(targetColor.current, delta * 0.5);
  });
  
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial 
        color={TIME_OF_DAY_THEME[timeOfDay].ground} 
        roughness={0.85} 
        envMapIntensity={0.3} 
      />
    </mesh>
  );
};

// --- Lighting Controller (uses consolidated TIME_OF_DAY_THEME) ---

const LightingController = ({ timeOfDay }: { timeOfDay: TimeOfDay }) => {
  const { scene, gl } = useThree();
  const directionalRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  
  // Track background state
  const backgroundColorRef = useRef(new THREE.Color());
  const isAuroraActiveRef = useRef(false);
  
  // Get theme for current time of day
  const theme = TIME_OF_DAY_THEME[timeOfDay];
  
  // Particle config
  const particles = MAGICAL_PARTICLES[timeOfDay];

  // Aurora visible at EVENING and NIGHT
  const showAurora = timeOfDay === 'night' || timeOfDay === 'evening';
  
  // Aurora config with matching fog colors
  const auroraConfig = useMemo(() => {
    if (timeOfDay === 'night') {
      return {
        intensity: 0.85,
        primary: '#9966ff',
        secondary: '#ff66aa',
        tertiary: '#6688ff',
        sky: '#0a1628',
        fog: '#0a1225',
        fogNear: 15,
        fogFar: 60,
      };
    } else if (timeOfDay === 'evening') {
      return {
        intensity: 0.65,
        primary: '#cc66ff',
        secondary: '#ff6699',
        tertiary: '#ff9966',
        sky: '#1a1020',
        fog: '#15101a',
        fogNear: 12,
        fogFar: 50,
      };
    }
    return {
      intensity: 0,
      primary: '#9966ff',
      secondary: '#ff66aa',
      tertiary: '#6688ff',
      sky: '#0a1628',
      fog: theme.fog,
      fogNear: theme.fogNear,
      fogFar: theme.fogFar,
    };
  }, [timeOfDay, theme.fog, theme.fogNear, theme.fogFar]);

  // Initialize Fog once
  useEffect(() => {
    if (!scene.fog) {
      scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    }
  }, [scene]);

  // Background and fog management
  useFrame((_, delta) => {
    const lerpSpeed = delta * 0.4;

    // === BACKGROUND MANAGEMENT ===
    if (showAurora) {
      if (scene.background !== null) {
        scene.background = null;
        gl.setClearColor(new THREE.Color(auroraConfig.sky).getHex(), 1);
      }
      isAuroraActiveRef.current = true;
    } else {
      if (scene.background === null || isAuroraActiveRef.current) {
        backgroundColorRef.current.set(theme.sky);
        scene.background = backgroundColorRef.current;
        isAuroraActiveRef.current = false;
      }
      
      if (scene.background instanceof THREE.Color) {
        scene.background.lerp(new THREE.Color(theme.sky), lerpSpeed);
      }
    }

    // === FOG MANAGEMENT ===
    if (scene.fog instanceof THREE.Fog) {
      const targetFogColor = showAurora ? auroraConfig.fog : theme.fog;
      const targetFogNear = showAurora ? auroraConfig.fogNear : theme.fogNear;
      const targetFogFar = showAurora ? auroraConfig.fogFar : theme.fogFar;
      
      scene.fog.color.lerp(new THREE.Color(targetFogColor), lerpSpeed);
      scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, targetFogNear, lerpSpeed);
      scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, targetFogFar, lerpSpeed);
    }

    // === LIGHTING ===
    if (directionalRef.current) {
      directionalRef.current.intensity = THREE.MathUtils.lerp(
        directionalRef.current.intensity, 
        theme.directional.intensity, 
        lerpSpeed
      );
      directionalRef.current.color.lerp(new THREE.Color(theme.directional.color), lerpSpeed);
      directionalRef.current.position.lerp(
        new THREE.Vector3(...theme.directional.position), 
        lerpSpeed * 0.5
      );
    }
    
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity, 
        theme.ambient.intensity, 
        lerpSpeed
      );
      ambientRef.current.color.lerp(new THREE.Color(theme.ambient.color), lerpSpeed);
    }
  });

  return (
    <>
      {/* Aurora with time-appropriate colors */}
      <AuroraSky 
        visible={showAurora} 
        intensity={auroraConfig.intensity}
        primaryColor={auroraConfig.primary}
        secondaryColor={auroraConfig.secondary}
        tertiaryColor={auroraConfig.tertiary}
        skyColor={auroraConfig.sky}
      />
      
      <ambientLight 
        ref={ambientRef} 
        intensity={theme.ambient.intensity} 
        color={theme.ambient.color} 
      />
      <directionalLight 
        ref={directionalRef} 
        position={theme.directional.position}
        intensity={theme.directional.intensity}
        color={theme.directional.color}
        castShadow 
        shadow-bias={-0.0001}
        shadow-mapSize={[1024, 1024]}
      />
      
      {/* Stars */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0.2} 
        fade 
      />
      
      {/* Particles */}
      <Sparkles 
        count={particles.count}
        scale={15}
        size={particles.size}
        speed={particles.speed}
        opacity={showAurora ? 0.7 : 0.4}
        color={particles.color}
      />
      
      {/* Extra sparkles during aurora */}
      {showAurora && (
        <Sparkles 
          count={timeOfDay === 'night' ? 80 : 50} 
          scale={20} 
          size={3} 
          speed={0.15} 
          opacity={timeOfDay === 'night' ? 0.5 : 0.35} 
          color="#aaddff" 
        />
      )}
    </>
  );
};

// --- Egg Geometry Constants ---
const EGG_SCALE: [number, number, number] = [0.7, 0.9, 0.7];
const EGG_RADIUS = 0.8;

// --- Speckle Texture Generator ---
interface SpeckleConfig {
  baseHue: number;
  glowHue: number;
  pattern: 'solid' | 'speckled' | 'swirl' | 'cracked';
}

const createEggTexture = (config: SpeckleConfig, size: number = 512): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  const { baseHue } = config;
  const baseSat = 55;
  const baseLight = 52;
  
  ctx.fillStyle = `hsl(${baseHue}, ${baseSat}%, ${baseLight}%)`;
  ctx.fillRect(0, 0, size, size);
  
  switch (config.pattern) {
    case 'speckled':
      drawSpeckles(ctx, size, baseHue, baseSat, baseLight);
      break;
    case 'swirl':
      drawSwirl(ctx, size, baseHue, baseSat, baseLight);
      break;
    case 'cracked':
      drawCracks(ctx, size, baseHue);
      break;
    case 'solid':
    default:
      drawSubtleNoise(ctx, size);
      break;
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  
  return texture;
};

// --- Speckle Pattern ---
const drawSpeckles = (
  ctx: CanvasRenderingContext2D,
  size: number,
  baseHue: number,
  baseSat: number,
  baseLight: number
) => {
  const speckleCount = 60 + Math.floor(Math.random() * 40);
  
  for (let i = 0; i < speckleCount; i++) {
    const x = Math.random() * size;
    const yCenter = size * 0.5;
    const ySpread = size * 0.4;
    const y = yCenter + (Math.random() - 0.5) * 2 * ySpread * (0.5 + Math.random() * 0.5);
    const radius = 3 + Math.random() * 12;
    
    const hueShift = (Math.random() - 0.5) * 30;
    const lightShift = -10 - Math.random() * 20;
    const satShift = (Math.random() - 0.5) * 20;
    
    const spotHue = (baseHue + hueShift + 360) % 360;
    const spotSat = Math.max(20, Math.min(80, baseSat + satShift));
    const spotLight = Math.max(20, Math.min(70, baseLight + lightShift));
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `hsla(${spotHue}, ${spotSat}%, ${spotLight}%, 0.9)`);
    gradient.addColorStop(0.6, `hsla(${spotHue}, ${spotSat}%, ${spotLight}%, 0.5)`);
    gradient.addColorStop(1, `hsla(${spotHue}, ${spotSat}%, ${spotLight}%, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  const accentCount = 15 + Math.floor(Math.random() * 15);
  for (let i = 0; i < accentCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 2 + Math.random() * 6;
    const spotLight = Math.min(80, baseLight + 10 + Math.random() * 15);
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `hsla(${baseHue}, ${baseSat - 10}%, ${spotLight}%, 0.7)`);
    gradient.addColorStop(1, `hsla(${baseHue}, ${baseSat - 10}%, ${spotLight}%, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  
  drawSubtleNoise(ctx, size);
};

// --- Swirl Pattern ---
const drawSwirl = (
  ctx: CanvasRenderingContext2D,
  size: number,
  baseHue: number,
  baseSat: number,
  baseLight: number
) => {
  const lineCount = 8 + Math.floor(Math.random() * 6);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  for (let i = 0; i < lineCount; i++) {
    let x = Math.random() * size;
    let y = Math.random() * size * 0.3;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    const segments = 4 + Math.floor(Math.random() * 4);
    for (let j = 0; j < segments; j++) {
      const cp1x = x + (Math.random() - 0.5) * size * 0.4;
      const cp1y = y + size / segments * 0.5;
      const cp2x = x + (Math.random() - 0.5) * size * 0.4;
      const cp2y = y + size / segments * 0.8;
      const endX = x + (Math.random() - 0.5) * size * 0.3;
      const endY = y + size / segments;
      
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      x = endX;
      y = endY;
    }
    
    const lineHue = (baseHue + (Math.random() - 0.5) * 40 + 360) % 360;
    const lineLight = baseLight + (Math.random() - 0.5) * 20;
    ctx.strokeStyle = `hsla(${lineHue}, ${baseSat}%, ${lineLight}%, 0.4)`;
    ctx.lineWidth = 8 + Math.random() * 20;
    ctx.stroke();
  }
  
  drawSubtleNoise(ctx, size);
};

// --- Crack Pattern ---
const drawCracks = (
  ctx: CanvasRenderingContext2D,
  size: number,
  baseHue: number
) => {
  const crackCount = 5 + Math.floor(Math.random() * 5);
  ctx.strokeStyle = `hsla(${baseHue}, 30%, 25%, 0.6)`;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  for (let i = 0; i < crackCount; i++) {
    let x = Math.random() * size;
    let y = size * 0.3 + Math.random() * size * 0.4;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    const segments = 6 + Math.floor(Math.random() * 8);
    for (let j = 0; j < segments; j++) {
      x += (Math.random() - 0.5) * 40;
      y += 10 + Math.random() * 30;
      ctx.lineTo(x, y);
      
      if (Math.random() < 0.3) {
        const branchX = x + (Math.random() - 0.5) * 30;
        const branchY = y + 10 + Math.random() * 20;
        ctx.lineTo(branchX, branchY);
        ctx.moveTo(x, y);
      }
    }
    ctx.stroke();
  }
  
  drawSubtleNoise(ctx, size);
};

// --- Subtle Noise (organic texture) ---
const drawSubtleNoise = (ctx: CanvasRenderingContext2D, size: number) => {
  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  
  ctx.putImageData(imageData, 0, 0);
};


// --- Egg Component ---

const EggModel = ({ seed, crackLevel, warmth }: { seed: Seed; crackLevel: number; warmth: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  const eggTexture = useMemo(() => {
    return createEggTexture({
      baseHue: seed.egg.baseHue,
      glowHue: seed.egg.glowHue,
      pattern: seed.egg.pattern as 'solid' | 'speckled' | 'swirl' | 'cracked'
    });
  }, [seed.egg.baseHue, seed.egg.glowHue, seed.egg.pattern]);

  useEffect(() => {
    return () => { eggTexture.dispose(); };
  }, [eggTexture]);

  useEffect(() => {
    audioService.startEggHum();
    return () => { audioService.stopEggHum(); };
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const pulseSpeed = 1 + (warmth / 50);
      const sine = Math.sin(clock.getElapsedTime() * pulseSpeed);
      
      const pulse = 1 + sine * 0.02;
      meshRef.current.scale.set(
        EGG_SCALE[0] * pulse,
        EGG_SCALE[1] * pulse,
        EGG_SCALE[2] * pulse
      );

      if (crackLevel > 50) {
        const intensity = (crackLevel - 50) / 50;
        meshRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 30) * intensity * 0.2;
      }
      
      audioService.syncEggHum((sine + 1) / 2, warmth);
    }
    
    if (glowRef.current) {
      glowRef.current.intensity = 0.5 + (warmth / 100) * 1.5;
    }
  });

  const glowColor = useMemo(
    () => new THREE.Color(`hsl(${seed.egg.glowHue}, 80%, 60%)`), 
    [seed.egg.glowHue]
  );

  return (
    <group position={[0, 0.5, 0]}>
      <mesh ref={meshRef} castShadow receiveShadow scale={EGG_SCALE}>
        <sphereGeometry args={[EGG_RADIUS, 32, 32]} />
        <meshStandardMaterial
          map={eggTexture}
          emissive={glowColor}
          emissiveIntensity={(warmth / 100) * 0.6}
          roughness={0.4}
          metalness={0.1}
          envMapIntensity={0.5}
        />
      </mesh>
      
      <pointLight ref={glowRef} distance={5} color={glowColor} />
      
      {crackLevel > 0 && (
        <Sparkles
          count={Math.floor(crackLevel * 1.5)}
          scale={1.5}
          size={3}
          speed={0.4}
          color={crackLevel > 90 ? '#fff' : '#222'}
        />
      )}
    </group>
  );
};

// --- Manga-Style Speech Bubble Component ---
const SpeechBubble = ({ messages, creatureScale }: { messages: ChatMessage[], creatureScale: number }) => {
  const [currentText, setCurrentText] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMsgIdRef = useRef<string | null>(null);

  // FIXED: Lowered Y offset to create gap from EmoteBubble, adjusted X for better framing
  const yOffset = (1.8 * creatureScale) + 0.4;
  const xOffset = 0.6 * creatureScale; // Offset to the right

  useEffect(() => {
    if (messages.length === 0) return;
    
    const lastMsg = messages[messages.length - 1];
    
    if (lastMsg.role === 'model' && lastMsg.id !== lastMsgIdRef.current) {
      lastMsgIdRef.current = lastMsg.id;
      setCurrentText(lastMsg.text);
      setIsVisible(true);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      const duration = Math.min(8000, Math.max(3000, 2000 + lastMsg.text.length * 60));
      
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, duration);
    }
  }, [messages]);

  return (
    <Html
      position={[xOffset, yOffset, 0]} 
      center
      zIndexRange={[100, 0]}
      distanceFactor={10}
      style={{
        pointerEvents: 'none',
        transition: 'opacity 0.3s ease-in-out, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        opacity: isVisible ? 1 : 0,
        transform: `scale(${isVisible ? 1 : 0.5}) translateY(${isVisible ? 0 : 20}px)`,
        whiteSpace: 'nowrap',
      }}
    >
      <div className="relative flex flex-col items-center">
        {/* FIXED: Reduced padding, max-width, and font size for less screen obstruction */}
        <div className="bg-white text-stone-900 px-5 py-3 rounded-2xl shadow-2xl max-w-[280px] text-center border-[3px] border-stone-900">
          <p className="text-xl font-bold leading-snug font-sans tracking-wide whitespace-normal">
            {currentText}
          </p>
        </div>
        {/* FIXED: Smaller tail to match reduced bubble size */}
        <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-[8px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-stone-900 drop-shadow-sm transform -rotate-12">
            <div className="absolute -top-[14px] -left-[7px] w-0 h-0 border-l-[7px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white" />
        </div>
      </div>
    </Html>
  );
};

// --- Floating Emote Bubble Component ---
const EmoteBubble = ({ interaction, creatureScale }: { interaction: { type: string; id: number } | null, creatureScale: number }) => {
  const [visible, setVisible] = useState(false);
  const [emoji, setEmoji] = useState('');
  
  // FIXED: Increased Y offset and added X offset to prevent overlap with speech bubble
  const yOffset = (3.2 * creatureScale) + 0.8;
  const xOffset = -0.5 * creatureScale; // Offset to the left of speech bubble

  useEffect(() => {
    if (interaction) {
      const typeKey = interaction.type.toLowerCase();
      const emojis = INTERACTION_EMOJIS[typeKey] || INTERACTION_EMOJIS['love'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      setEmoji(randomEmoji);
      
      setVisible(true);
      
      // FIXED: Reduced duration to minimize overlap with speech bubble
      const timer = setTimeout(() => {
        setVisible(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [interaction]);

  if (!visible) return null;

  return (
    <Html
      position={[xOffset, yOffset, 0]}
      center
      zIndexRange={[110, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div 
        key={interaction?.id}
        className="float-emoji text-[10rem] drop-shadow-2xl select-none filter contrast-125"
      >
        {emoji}
      </div>
    </Html>
  );
};

// --- T-Rex Component ---
interface TRexModelProps {
  stage: Stage;
  seed: Seed;
  animation: AnimationDirective | null;
  isNewlyHatched?: boolean;
  timeOfDay: TimeOfDay;
  messages: ChatMessage[]; 
  latestInteraction: { type: string; id: number } | null;
}

const TRexModel = ({ stage, seed, animation, isNewlyHatched, timeOfDay, messages, latestInteraction }: TRexModelProps) => {
  const { scene, animations } = useGLTF(TREX_MODEL_URL);
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);
  const headBone = useRef<THREE.Object3D | null>(null);
  const [controllerReady, setControllerReady] = useState(false);
  
  const bodyMaterials = useRef<THREE.MeshStandardMaterial[]>([]);
  const eyeMaterials = useRef<THREE.MeshStandardMaterial[]>([]);

  const baseColors = useMemo(() => {
    const lightness = seed.appearance.lightness ? seed.appearance.lightness / 100 : 0.5;
    
    const bodyHSL = {
      h: seed.appearance.baseHue / 360,
      s: seed.appearance.saturation / 100,
      l: lightness
    };

    const eyeHSL = {
      h: (bodyHSL.h + 0.5) % 1.0, 
      s: 0.9, 
      l: 0.6 
    };
    
    return { bodyHSL, eyeHSL };
  }, [seed]);

  useEffect(() => {
    if (!actions || controllerReady) return;
    
    animController.initialize(actions as Record<string, THREE.AnimationAction | null>);
    setControllerReady(true);

    return () => {
      animController.dispose();
      setControllerReady(false);
    };
  }, [actions]);

  useEffect(() => {
    if (controllerReady && isNewlyHatched) {
      playHatchSequence(); 
      setTimeout(() => animController.startIdleBehavior(), 2500);
    }
  }, [isNewlyHatched, controllerReady]);

  useEffect(() => {
    if (controllerReady && !isNewlyHatched) {
      animController.enableMovement();
      animController.play(AnimationName.IDLE);
      animController.startIdleBehavior();
    }
  }, [controllerReady, isNewlyHatched]);

  useEffect(() => {
    if (!animation || !controllerReady) return;

    animController.stopIdleBehavior();
    animController.play(animation.primary as any);

    if (animation.transition_to) {
      setTimeout(() => {
        animController.play(animation.transition_to as any);
        setTimeout(() => animController.startIdleBehavior(), 2000);
      }, animation.delay_ms || 2000);
    } else {
      setTimeout(() => animController.startIdleBehavior(), 3000);
    }
  }, [animation, controllerReady]);

  // MATERIAL SETUP
  useEffect(() => {
    bodyMaterials.current = [];
    eyeMaterials.current = [];
    
    const bodyBaseColor = new THREE.Color().setHSL(
      baseColors.bodyHSL.h, 
      baseColors.bodyHSL.s, 
      baseColors.bodyHSL.l
    );

    const eyeBaseColor = new THREE.Color().setHSL(
      baseColors.eyeHSL.h,
      baseColors.eyeHSL.s,
      baseColors.eyeHSL.l
    );

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();
        
        const oldMat = mesh.material as THREE.MeshStandardMaterial;
        const newMat = oldMat.clone();
        
        if (name.includes('eye') || name.includes('iris') || name.includes('pupil')) {
          newMat.color = eyeBaseColor;
          newMat.emissive = eyeBaseColor;
          newMat.emissiveIntensity = 0.5;
          newMat.roughness = 0.2;
          newMat.metalness = 0.3;
          eyeMaterials.current.push(newMat);
        } else {
          newMat.color = bodyBaseColor;
          newMat.emissive = bodyBaseColor;
          newMat.emissiveIntensity = 0.05;
          newMat.envMapIntensity = 1.0;
          bodyMaterials.current.push(newMat);
        }
        
        mesh.material = newMat;
      }
      if ((child as THREE.Bone).isBone) {
        const name = child.name.toLowerCase();
        if (name.includes('head') || name.includes('neck')) {
          headBone.current = child;
        }
      }
    });
  }, [scene, baseColors]);

  const scale = useMemo(() => {
    const scales: Record<Stage, number> = {
      [Stage.EGG]: 1,
      [Stage.HATCHLING]: 0.6,
      [Stage.PUPPY]: 0.8,
      [Stage.JUVENILE]: 1.2,
      [Stage.ADOLESCENT]: 1.8,
      [Stage.ADULT]: 2.5,
    };
    return scales[stage] ?? 1;
  }, [stage]);

  useFrame((state, delta) => {
    // 1. FIXED: Move T-Rex group to world position
    if (group.current) {
      // FIXED: Check for scroll reset - snap instead of lerp
      const shouldSnap = animController.consumeScrollFlag();
      
      if (shouldSnap) {
        // Atomic snap during world scroll reset
        group.current.position.copy(animController.worldPosition);
      } else {
        // Normal smooth lerp
        const lerpFactor = Math.min(
          CAMERA_FOLLOW.MODEL_LERP * delta * 60,
          CAMERA_FOLLOW.MAX_LERP_FACTOR
        );
        group.current.position.lerp(animController.worldPosition, lerpFactor);
      }
    }
    
    // 2. Head tracking
    if (headBone.current) {
      const tx = THREE.MathUtils.clamp(state.mouse.y * 0.3, -0.3, 0.3);
      const ty = THREE.MathUtils.clamp(state.mouse.x * 0.5, -0.6, 0.6);
      headBone.current.rotation.x = THREE.MathUtils.lerp(headBone.current.rotation.x, tx, 0.1);
      headBone.current.rotation.y = THREE.MathUtils.lerp(headBone.current.rotation.y, ty, 0.1);
    }

    // 3. COLOR SHIFTING based on TimeOfDay
    const theme = TIME_OF_DAY_THEME[timeOfDay];
    const shift = theme.creatureColorShift;
    const lerpSpeed = delta * 0.5;

    let targetHue = (baseColors.bodyHSL.h + (shift.hue / 360));
    if (targetHue > 1) targetHue -= 1;
    if (targetHue < 0) targetHue += 1;

    const targetSat = THREE.MathUtils.clamp(baseColors.bodyHSL.s * shift.satMult, 0, 1);
    const targetLight = THREE.MathUtils.clamp(baseColors.bodyHSL.l * shift.lightMult, 0, 1);
    
    const targetBodyColor = new THREE.Color().setHSL(targetHue, targetSat, targetLight);
    
    bodyMaterials.current.forEach(mat => {
      mat.color.lerp(targetBodyColor, lerpSpeed);
      mat.emissive.lerp(targetBodyColor, lerpSpeed);
    });

    // 4. EYE GLOW modulation
    const baseGlow = 0.3 + (seed.appearance.eyeGlow / 100) * 1.2;
    const targetGlow = baseGlow * theme.eyeGlowMult;
    
    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1;

    eyeMaterials.current.forEach(mat => {
      mat.emissiveIntensity = THREE.MathUtils.lerp(mat.emissiveIntensity, targetGlow + pulse, lerpSpeed);
    });
  });

  return (
    <group ref={group}>
      <Float speed={1} rotationIntensity={0.1} floatIntensity={0.1}>
        <primitive object={scene} scale={scale} />
        <SpeechBubble messages={messages} creatureScale={scale} />
        <EmoteBubble interaction={latestInteraction} creatureScale={scale} />
      </Float>
    </group>
  );
};

// --- Scale Helper ---
const getCreatureScale = (stage: Stage): number => {
  const scales: Record<Stage, number> = {
    [Stage.EGG]: 1,
    [Stage.HATCHLING]: 0.6,
    [Stage.PUPPY]: 0.8,
    [Stage.JUVENILE]: 1.2,
    [Stage.ADOLESCENT]: 1.8,
    [Stage.ADULT]: 2.5,
  };
  return scales[stage] ?? 1;
};

// --- Creature Position Provider ---
const useCreaturePosition = (stage: Stage): THREE.Vector3 => {
  const positionRef = useRef(new THREE.Vector3(0, 0, 0));
  
  useFrame(() => {
    if (stage === Stage.EGG) {
      positionRef.current.set(0, 0, 0);
    } else {
      positionRef.current.copy(animController.worldPosition);
    }
  });
  
  return positionRef.current;
};

// --- Scroll State Hook ---
const useScrollState = () => {
  const [scrollSeed, setScrollSeed] = useState(1);
  const worldOffsetRef = useRef(new THREE.Vector3(0, 0, 0));
  
  useEffect(() => {
    // Register scroll callback with animation controller
    animController.onScroll((direction: ScrollDirection, newOffset: THREE.Vector3) => {
      // Update seed to trigger flower regeneration
      setScrollSeed(prev => prev + 1);
      // Update offset ref for cloud parallax
      worldOffsetRef.current.copy(newOffset);
    });
    
    return () => {
      // Cleanup: unregister callback
      animController.onScroll(() => {});
    };
  }, []);
  
  return { scrollSeed, worldOffset: worldOffsetRef.current };
};

// --- Environment Wrapper ---
interface EnvironmentLayerProps {
  timeOfDay: TimeOfDay;
  stage: Stage;
  creatureScale: number;
  scrollSeed: number;      // FIXED: Add scroll seed
  worldOffset: THREE.Vector3; // FIXED: Add world offset for parallax
}

const EnvironmentLayer: React.FC<EnvironmentLayerProps> = ({ 
  timeOfDay, 
  stage, 
  creatureScale,
  scrollSeed,
  worldOffset 
}) => {
  const creaturePosition = useCreaturePosition(stage);
  
  return (
    <>
      <Ground timeOfDay={timeOfDay} />
      <GrassField 
        timeOfDay={timeOfDay} 
        creatureScale={creatureScale} 
        creaturePosition={creaturePosition} 
      />
      {/* FIXED: Flowers receive scroll seed for regeneration */}
      {/* FIXED: Pass worldOffset for zone-aware flower generation */}
      <Flowers 
        creaturePosition={creaturePosition}
        creatureScale={creatureScale}
        scrollSeed={scrollSeed}
        worldOffset={worldOffset}
      />
      {/* FIXED: Clouds receive world offset for parallax */}
      <Clouds 
        timeOfDay={timeOfDay} 
        worldOffset={worldOffset}
      />
    </>
  );
};

// --- Main Scene ---
interface SceneProps {
  state: GameState;
  onInteract: (type: 'warm' | 'pet') => void;
  isNewlyHatched?: boolean;
}

// Inside Scene component, add scroll state and pass to EnvironmentLayer

const Scene: React.FC<SceneProps> = ({ state, onInteract, isNewlyHatched = false }) => {
  const controlsRef = useRef<any>(null);
  const creatureScale = useMemo(() => getCreatureScale(state.stage), [state.stage]);
  
  // FIXED: Add scroll state
  const { scrollSeed, worldOffset } = useScrollState();

  useEffect(() => {
    if (state.stage === Stage.EGG) {
      resetAnimationWorld();
    }
  }, [state.stage]);

  return (
    <Canvas 
      shadows 
      camera={{ position: [0, 2, 8], fov: 45 }}
      gl={{ 
        toneMapping: THREE.LinearToneMapping, 
        toneMappingExposure: 0.64,
        antialias: true 
      }}
    >
      <AnimationUpdater />
      
      <LightingController timeOfDay={state.timeOfDay} />
      <Environment preset="sunset" background={false} />
      
      <CameraSync controlsRef={controlsRef} />

      {/* FIXED: Pass scroll state to EnvironmentLayer */}
      <EnvironmentLayer 
        timeOfDay={state.timeOfDay} 
        stage={state.stage}
        creatureScale={creatureScale}
        scrollSeed={scrollSeed}
        worldOffset={worldOffset}
      />

      <group onClick={() => onInteract(state.stage === Stage.EGG ? 'warm' : 'pet')}>
        {state.stage === Stage.EGG ? (
          <EggModel
            seed={state.seed}
            crackLevel={state.eggCrackLevel}
            warmth={state.needs.warmth}
          />
        ) : (
          <TRexModel
            stage={state.stage}
            seed={state.seed}
            animation={state.currentAnimation}
            isNewlyHatched={isNewlyHatched}
            timeOfDay={state.timeOfDay}
            messages={state.messages}
            latestInteraction={state.latestInteraction}
          />
        )}
      </group>

      <OrbitControls
        ref={controlsRef}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={12}
        enablePan={false}
      />
    </Canvas>
  );
};

export default Scene;

export { animController, AnimationName, resetAnimationWorld };
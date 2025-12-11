import * as THREE from 'three';
import { ENVIRONMENT, MOVEMENT_SPEEDS, DRIFT_CONFIG, CAMERA_FOLLOW, WORLD_SCROLL_CONFIG } from '../constants';

// FIXED: Remove WORLD_BOUNDARY for Z, use WORLD_SCROLL_CONFIG instead
const { X_BOUNDARY } = WORLD_SCROLL_CONFIG;

// FIXED: Robust animation name normalization for matching
const normalizeAnimName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '') // Remove spaces, underscores, hyphens
    .replace(/[^a-z0-9]/g, ''); // Remove any other special chars
};

// --- Animation Names (exact match to GLB) ---
export const AnimationName = {
  ALL_DELETE: 'All_Delete',
  DIE: 'Die',
  IDLE: 'idle',
  IDLE_2: 'Idle_2',
  REBORN: 'Reborn',
  RETREAT_ROAR: 'Retreat_Roar',
  ROAR: 'ROAR',
  ROAR_FORWARD: 'Roar_Forward',
  RUN_TO_STOP: 'run to stop',
  RUN_BACKWARD: 'Run_Backward',
  RUN_FORWARD: 'Run_Forward',
  WALK_SLOW: 'walk slow',
  WALK_SLOW_LOOP: 'walk slow loop',
  WALK_FORWARD: 'Walk_Forward',
} as const;

export type AnimationNameType = typeof AnimationName[keyof typeof AnimationName];

// --- Animation Metadata ---
interface AnimMeta {
  defaultDuration: number;
  autoNext: AnimationNameType | null;
  validNext: AnimationNameType[];
  cameraDistance: number;
  cameraHeight: number;
  loop: THREE.AnimationActionLoopStyles;
  clamp: boolean;
}

export const ANIM_META: Record<AnimationNameType, AnimMeta> = {
  [AnimationName.ALL_DELETE]: {
    defaultDuration: 0, autoNext: null,
    validNext: [AnimationName.IDLE, AnimationName.IDLE_2, AnimationName.WALK_SLOW_LOOP, AnimationName.WALK_FORWARD, AnimationName.ROAR, AnimationName.DIE],
    cameraDistance: 8, cameraHeight: 2, loop: THREE.LoopRepeat, clamp: false
  },
  [AnimationName.DIE]: {
    defaultDuration: 0, autoNext: null,
    validNext: [AnimationName.REBORN],
    cameraDistance: 6, cameraHeight: 1.5, loop: THREE.LoopOnce, clamp: true
  },
  [AnimationName.IDLE]: {
    defaultDuration: 0, autoNext: null,
    validNext: [AnimationName.ALL_DELETE, AnimationName.IDLE_2, AnimationName.WALK_SLOW_LOOP, AnimationName.WALK_FORWARD, AnimationName.RUN_FORWARD, AnimationName.ROAR, AnimationName.ROAR_FORWARD, AnimationName.DIE],
    cameraDistance: 8, cameraHeight: 2, loop: THREE.LoopRepeat, clamp: false
  },
  [AnimationName.IDLE_2]: {
    defaultDuration: 0, autoNext: null,
    validNext: [AnimationName.IDLE, AnimationName.ALL_DELETE, AnimationName.WALK_SLOW_LOOP, AnimationName.WALK_FORWARD, AnimationName.RUN_FORWARD, AnimationName.ROAR],
    cameraDistance: 7, cameraHeight: 2, loop: THREE.LoopRepeat, clamp: false
  },
  [AnimationName.REBORN]: {
    defaultDuration: 2200, autoNext: AnimationName.IDLE,
    validNext: [AnimationName.IDLE, AnimationName.ALL_DELETE, AnimationName.WALK_SLOW_LOOP],
    cameraDistance: 6, cameraHeight: 1.5, loop: THREE.LoopOnce, clamp: true
  },
  [AnimationName.RETREAT_ROAR]: {
    defaultDuration: 2000, autoNext: AnimationName.IDLE,
    validNext: [AnimationName.RUN_BACKWARD, AnimationName.IDLE, AnimationName.WALK_SLOW],
    cameraDistance: 7, cameraHeight: 2, loop: THREE.LoopOnce, clamp: true
  },
  [AnimationName.ROAR]: {
    defaultDuration: 1800, autoNext: AnimationName.IDLE,
    validNext: [AnimationName.IDLE, AnimationName.WALK_FORWARD, AnimationName.RUN_FORWARD],
    cameraDistance: 5, cameraHeight: 2.5, loop: THREE.LoopOnce, clamp: true
  },
  [AnimationName.ROAR_FORWARD]: {
    defaultDuration: 2000, autoNext: AnimationName.WALK_FORWARD,
    validNext: [AnimationName.WALK_FORWARD, AnimationName.IDLE, AnimationName.RETREAT_ROAR],
    cameraDistance: 6, cameraHeight: 2, loop: THREE.LoopOnce, clamp: true
  },
  [AnimationName.RUN_TO_STOP]: {
    defaultDuration: 1500, autoNext: AnimationName.IDLE,
    validNext: [AnimationName.IDLE, AnimationName.WALK_SLOW_LOOP],
    cameraDistance: 10, cameraHeight: 2, loop: THREE.LoopOnce, clamp: true
  },
  [AnimationName.RUN_BACKWARD]: {
    defaultDuration: 0, autoNext: null,
    validNext: [AnimationName.IDLE, AnimationName.RETREAT_ROAR, AnimationName.WALK_SLOW],
    cameraDistance: 10, cameraHeight: 2, loop: THREE.LoopRepeat, clamp: false
  },
  [AnimationName.RUN_FORWARD]: {
    defaultDuration: 0, autoNext: null,
    validNext: [AnimationName.RUN_TO_STOP, AnimationName.WALK_FORWARD, AnimationName.ROAR],
    cameraDistance: 12, cameraHeight: 2.5, loop: THREE.LoopRepeat, clamp: false
  },
  [AnimationName.WALK_SLOW]: {
    defaultDuration: 0, autoNext: null,
    validNext: [AnimationName.IDLE, AnimationName.WALK_SLOW_LOOP, AnimationName.RUN_BACKWARD],
    cameraDistance: 8, cameraHeight: 2, loop: THREE.LoopRepeat, clamp: false
  },
  [AnimationName.WALK_SLOW_LOOP]: {
    defaultDuration: 0, autoNext: null,
    validNext: [AnimationName.IDLE, AnimationName.WALK_FORWARD, AnimationName.RUN_FORWARD, AnimationName.RUN_TO_STOP],
    cameraDistance: 9, cameraHeight: 2, loop: THREE.LoopRepeat, clamp: false
  },
  [AnimationName.WALK_FORWARD]: {
    defaultDuration: 0, autoNext: null,
    validNext: [AnimationName.IDLE, AnimationName.RUN_FORWARD, AnimationName.WALK_SLOW_LOOP, AnimationName.ROAR],
    cameraDistance: 10, cameraHeight: 2, loop: THREE.LoopRepeat, clamp: false
  },
};

// --- Idle animations for random selection ---
const IDLE_ANIMS: AnimationNameType[] = [
  AnimationName.IDLE,
  AnimationName.IDLE_2,
  AnimationName.ALL_DELETE,
];

// FIXED: Scroll direction type
export type ScrollDirection = 'forward' | 'backward';

// FIXED: Scroll callback type
export type ScrollCallback = (direction: ScrollDirection, newOffset: THREE.Vector3) => void;

// --- Controller Class ---
export class TRexAnimationController {
  private actions: Record<string, THREE.AnimationAction> = {};
  private current: AnimationNameType | null = null;
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;
  private idleBehaviorTimer: ReturnType<typeof setInterval> | null = null;
  private elapsedTime = 0;
  
  // Camera targets (read by CameraSync)
  public targetCamDistance = 8;
  public targetCamHeight = 2;
  
  // World position - T-Rex local position within scrolling zone
  public worldPosition = new THREE.Vector3(0, 0, 0);
  
  // FIXED: Cumulative world offset (tracks total "distance traveled")
  public worldOffset = new THREE.Vector3(0, 0, 0);
  
  public isMovementEnabled = false;
  
  // FIXED: Scroll event callback
  private onScrollCallback: ScrollCallback | null = null;

  // FIXED: Normalized name lookup for robust matching
  private normalizedActions: Map<string, THREE.AnimationAction> = new Map();

  // FIXED: Flag to signal atomic position reset (read once, then auto-clears)
  public justScrolled: boolean = false;

  initialize(actions: Record<string, THREE.AnimationAction | null>) {
    this.actions = {};
    this.normalizedActions.clear();
    const foundNames: string[] = [];
    const matchedMeta: string[] = [];
    const unmatchedAnims: string[] = [];

    Object.entries(actions).forEach(([name, action]) => {
      if (action) {
        // Store with original name
        this.actions[name] = action;
        foundNames.push(name);

        // FIXED: Store with normalized name for robust lookup
        const normalized = normalizeAnimName(name);
        this.normalizedActions.set(normalized, action);

        // FIXED: Find matching metadata using normalized comparison
        const metaKey = Object.values(AnimationName).find(an => 
          normalizeAnimName(an) === normalized
        );

        if (metaKey) {
          const meta = ANIM_META[metaKey];
          if (meta) {
            action.setLoop(meta.loop, Infinity);
            action.clampWhenFinished = meta.clamp;
            matchedMeta.push(`${name} → ${metaKey}`);
          }
        } else {
          // FIXED: Apply default loop settings for unmatched animations
          // Assume movement animations should loop, others play once
          const isMovementAnim = /walk|run|move|loop/i.test(name);
          if (isMovementAnim) {
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.clampWhenFinished = false;
          } else {
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
          }
          unmatchedAnims.push(name);
        }
      }
    });
    
    console.log("🦖 Animations Initialized:", foundNames);
    console.log("🦖 Metadata matched:", matchedMeta);
    if (unmatchedAnims.length > 0) {
      console.warn("🦖 Unmatched animations (using defaults):", unmatchedAnims);
    }
  }

  /**
   * FIXED: Robust action lookup with normalized matching
   */
  private getAction(name: string): THREE.AnimationAction | null {
    // 1. Exact match
    if (this.actions[name]) {
      return this.actions[name];
    }
    
    // 2. Normalized match
    const normalized = normalizeAnimName(name);
    const fromNormalized = this.normalizedActions.get(normalized);
    if (fromNormalized) {
      return fromNormalized;
    }
    
    // 3. Legacy fuzzy match (fallback)
    const fuzzyKey = Object.keys(this.actions).find(
      k => k.toLowerCase() === name.toLowerCase()
    );
    if (fuzzyKey) {
      return this.actions[fuzzyKey];
    }
    
    return null;
  }

  get currentAnimation(): AnimationNameType | null {
    return this.current;
  }

  // FIXED: Register scroll callback
  onScroll(callback: ScrollCallback) {
    this.onScrollCallback = callback;
  }

  enableMovement() {
    this.isMovementEnabled = true;
    console.log("🦖 World movement enabled");
  }

  resetWorld() {
    this.stopIdleBehavior();
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.worldPosition.set(0, 0, 0);
    this.worldOffset.set(0, 0, 0); // FIXED: Reset offset too
    this.justScrolled = false; // FIXED: Clear scroll flag on reset
    this.isMovementEnabled = false;
    this.current = null;
    this.elapsedTime = 0;
    this.targetCamDistance = 8;
    this.targetCamHeight = 2;
    console.log("🦖 World state reset");
  }

  resetPosition() {
    this.worldPosition.set(0, 0, 0);
    this.worldOffset.set(0, 0, 0); // FIXED: Reset offset too
    this.isMovementEnabled = false;
    this.elapsedTime = 0;
  }

  // FIXED: Rewritten update method with scroll detection
  update(delta: number) {
    if (!this.current) return;
    
    this.elapsedTime += delta;
    
    const speedKey = this.getSpeedKey(this.current);
    const moveSpeed = speedKey !== null ? MOVEMENT_SPEEDS[speedKey] : 0;
    
    if (this.isMovementEnabled && moveSpeed !== 0) {
      // Z movement
      this.worldPosition.z += moveSpeed * delta;
      
      // X drift for natural wandering
      const xDrift = Math.sin(this.elapsedTime * DRIFT_CONFIG.FREQUENCY) 
                     * DRIFT_CONFIG.AMPLITUDE * delta * Math.abs(moveSpeed);
      this.worldPosition.x += xDrift;
      
      // FIXED: X boundary remains hard (side limits)
      this.worldPosition.x = Math.max(-X_BOUNDARY, Math.min(X_BOUNDARY, this.worldPosition.x));
      
      // FIXED: Z uses scroll system instead of hard boundary
      const { FORWARD_THRESHOLD, BACKWARD_THRESHOLD, SCROLL_AMOUNT } = WORLD_SCROLL_CONFIG;
      
      if (this.worldPosition.z > FORWARD_THRESHOLD) {
        // Forward scroll: reset position, increment offset
        this.worldPosition.z -= SCROLL_AMOUNT;
        this.worldOffset.z += SCROLL_AMOUNT;
        
        // FIXED: Signal atomic reset for mesh/camera snap
        this.justScrolled = true;
        
        // console.log("🦖 Scroll FORWARD - offset now:", this.worldOffset.z);
        this.onScrollCallback?.('forward', this.worldOffset.clone());
      } 
      else if (this.worldPosition.z < BACKWARD_THRESHOLD) {
        // Backward scroll: reset position, decrement offset
        this.worldPosition.z += SCROLL_AMOUNT;
        this.worldOffset.z -= SCROLL_AMOUNT;
        
        // FIXED: Signal atomic reset for mesh/camera snap
        this.justScrolled = true;
        
        // console.log("🦖 Scroll BACKWARD - offset now:", this.worldOffset.z);
        this.onScrollCallback?.('backward', this.worldOffset.clone());
      }
      
      // Camera distance adjustment
      const cameraAdjust = moveSpeed > 0 
        ? -CAMERA_FOLLOW.DISTANCE_ADJUST_RATE 
        : CAMERA_FOLLOW.DISTANCE_ADJUST_RATE;
      this.targetCamDistance += cameraAdjust * delta;
      this.targetCamDistance = Math.max(
        CAMERA_FOLLOW.DISTANCE_MIN, 
        Math.min(CAMERA_FOLLOW.DISTANCE_MAX, this.targetCamDistance)
      );
    }
  }

  /**
   * Consumes and clears the justScrolled flag.
   * Call this AFTER reading to ensure flag is only true for one frame.
   */
  consumeScrollFlag(): boolean {
    if (this.justScrolled) {
      this.justScrolled = false;
      return true;
    }
    return false;
  }
  
  private getSpeedKey(animName: AnimationNameType): keyof typeof MOVEMENT_SPEEDS | null {
    const mapping: Record<AnimationNameType, keyof typeof MOVEMENT_SPEEDS | null> = {
      [AnimationName.RUN_FORWARD]: 'RUN_FORWARD',
      [AnimationName.WALK_FORWARD]: 'WALK_FORWARD',
      [AnimationName.WALK_SLOW_LOOP]: 'WALK_SLOW_LOOP',
      [AnimationName.ROAR_FORWARD]: 'ROAR_FORWARD',
      [AnimationName.RUN_TO_STOP]: 'RUN_TO_STOP',
      [AnimationName.RUN_BACKWARD]: 'RUN_BACKWARD',
      [AnimationName.RETREAT_ROAR]: 'RETREAT_ROAR',
      [AnimationName.WALK_SLOW]: 'WALK_SLOW',
      [AnimationName.IDLE]: 'IDLE',
      [AnimationName.IDLE_2]: 'IDLE_2',
      [AnimationName.ALL_DELETE]: 'ALL_DELETE',
      [AnimationName.ROAR]: 'ROAR',
      [AnimationName.DIE]: 'DIE',
      [AnimationName.REBORN]: 'REBORN',
    };
    return mapping[animName] ?? null;
  }

  play(
    name: AnimationNameType,
    opts: { fadeDuration?: number; overrideDuration?: number; onComplete?: () => void; force?: boolean } = {}
  ): boolean {
    const { fadeDuration = 0.3, overrideDuration, onComplete, force = false } = opts;
    
    // FIXED: Use robust lookup
    const action = this.getAction(name);

    if (!action) {
      console.warn(`Animation "${name}" not found. Available:`, Object.keys(this.actions));
      return false;
    }

    // FIXED: Check if already playing this animation (avoid reset/rewind)
    const normalizedRequested = normalizeAnimName(name);
    const normalizedCurrent = this.current ? normalizeAnimName(this.current) : '';
    
    if (!force && normalizedRequested === normalizedCurrent && action.isRunning()) {
      // Already playing this animation, don't interrupt
      return true;
    }

    // Clear any pending transition
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    // Fade out current animation (if different)
    if (this.current && normalizedCurrent !== normalizedRequested) {
      const currAction = this.getAction(this.current);
      if (currAction) {
        currAction.fadeOut(fadeDuration);
      }
    }

    // FIXED: Only reset if not already running, or if forced
    if (!action.isRunning() || force) {
      action.reset();
    }
    
    action.fadeIn(fadeDuration).play();
    this.current = name;

    // Apply camera settings from metadata
    const metaKey = Object.values(AnimationName).find(an => 
      normalizeAnimName(an) === normalizedRequested
    );
    const meta = metaKey ? ANIM_META[metaKey] : null;
    
    if (meta) {
      this.targetCamDistance = meta.cameraDistance;
      this.targetCamHeight = meta.cameraHeight;

      const duration = overrideDuration ?? meta.defaultDuration;
      if (duration > 0) {
        this.transitionTimer = setTimeout(() => {
          onComplete?.();
          if (meta.autoNext) {
            this.play(meta.autoNext);
          }
        }, duration);
      }
    }

    return true;
  }

  playFor(name: AnimationNameType, durationMs: number, thenPlay?: AnimationNameType): void {
    this.play(name, { overrideDuration: durationMs });
    
    if (this.transitionTimer) clearTimeout(this.transitionTimer);
    
    this.transitionTimer = setTimeout(() => {
      this.play(thenPlay ?? AnimationName.IDLE);
    }, durationMs);
  }

  // FIXED: Idle behavior no longer needs Z boundary awareness (scroll handles it)
  startIdleBehavior() {
    this.stopIdleBehavior();

    if (!this.current) {
      this.play(AnimationName.IDLE);
    }

    this.idleBehaviorTimer = setInterval(() => {
      if (!this.current || !IDLE_ANIMS.includes(this.current)) return;

      const rand = Math.random();
      
      if (rand < 0.25) {
        // 25%: Switch idle variant
        const next = IDLE_ANIMS[Math.floor(Math.random() * IDLE_ANIMS.length)];
        if (next !== this.current) this.play(next);
      } else if (rand < 0.45) {
        // 20%: Random walk (any direction - scroll handles boundaries)
        const walkAnims = [
          AnimationName.WALK_SLOW_LOOP, 
          AnimationName.WALK_SLOW, 
          AnimationName.WALK_FORWARD
        ];
        this.playFor(
          walkAnims[Math.floor(Math.random() * walkAnims.length)], 
          2500 + Math.random() * 2000
        );
      }
      // 55%: Stay as is
    }, 6000 + Math.random() * 6000);
  }

  stopIdleBehavior() {
    if (this.idleBehaviorTimer) {
      clearInterval(this.idleBehaviorTimer);
      this.idleBehaviorTimer = null;
    }
  }

  canTransitionTo(target: AnimationNameType): boolean {
    if (!this.current) return true;
    
    // FIXED: Use normalized lookup for metadata
    const normalizedCurrent = normalizeAnimName(this.current);
    const metaKey = Object.values(AnimationName).find(an => 
      normalizeAnimName(an) === normalizedCurrent
    );
    
    if (!metaKey) return true;
    
    const meta = ANIM_META[metaKey];
    if (!meta) return true;
    
    // FIXED: Check valid transitions with normalized matching
    const normalizedTarget = normalizeAnimName(target);
    return meta.validNext.some(valid => normalizeAnimName(valid) === normalizedTarget);
  }

  getValidTransitions(): AnimationNameType[] {
    if (!this.current) return Object.values(AnimationName);
    
    // FIXED: Use normalized lookup
    const normalizedCurrent = normalizeAnimName(this.current);
    const metaKey = Object.values(AnimationName).find(an => 
      normalizeAnimName(an) === normalizedCurrent
    );
    
    const meta = metaKey ? ANIM_META[metaKey] : null;
    return meta ? meta.validNext : Object.values(AnimationName);
  }

  dispose() {
    this.stopIdleBehavior();
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    this.current = null;
    this.resetPosition();
    
    // FIXED: Clear lookup maps
    this.actions = {};
    this.normalizedActions.clear();
  }
}

// --- Singleton for global access ---
export const animController = new TRexAnimationController();

// --- Predefined sequences ---
export const playHatchSequence = async () => {
  animController.play(AnimationName.REBORN);
  setTimeout(() => animController.enableMovement(), 2200);
};

export const resetAnimationWorld = () => {
  animController.resetWorld();
};

export const playGreetSequence = () => {
  animController.play(AnimationName.RUN_FORWARD);
  setTimeout(() => animController.play(AnimationName.RUN_TO_STOP), 1200);
};

export const playHappySequence = () => {
  animController.play(AnimationName.ROAR);
  setTimeout(() => animController.play(AnimationName.IDLE_2), 2000);
};

export const playScaredSequence = () => {
  animController.play(AnimationName.RETREAT_ROAR);
  setTimeout(() => animController.play(AnimationName.RUN_BACKWARD), 2000);
  setTimeout(() => animController.play(AnimationName.IDLE), 3500);
};
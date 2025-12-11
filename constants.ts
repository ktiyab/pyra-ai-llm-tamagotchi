import { 
  Stage, 
  Needs, 
  PersonalityDimension, 
  LearnedPersonality,
  MemoryCategory,
  TriggerCooldownType,
  LearnedBehavior,
  CareGrade
} from './types';

export const TREX_MODEL_URL = 'https://storage.googleapis.com/vai-pet/T_Rex_Baby.glb';

export const INITIAL_NEEDS: Needs = {
  hunger: 100,
  warmth: 100,
  attention: 100,
  rest: 100,
  play: 100,
  cleanliness: 100
};

export const DECAY_RATES = {
  [Stage.EGG]: { hunger: 0, warmth: 100.0, attention: 0, rest: 0, play: 0, cleanliness: 0 },
  [Stage.HATCHLING]: { hunger: 5.0, warmth: 8.0, attention: 5.0, rest: -10.0, play: 4.0, cleanliness: 2.0 },
  [Stage.PUPPY]: { hunger: 4.0, warmth: 3.0, attention: 6.0, rest: -5.0, play: 8.0, cleanliness: 3.0 },
  [Stage.JUVENILE]: { hunger: 3.0, warmth: 2.0, attention: 4.0, rest: -3.0, play: 5.0, cleanliness: 3.0 },
  [Stage.ADOLESCENT]: { hunger: 3.0, warmth: 1.0, attention: 3.0, rest: -2.0, play: 3.0, cleanliness: 2.0 },
  [Stage.ADULT]: { hunger: 2.0, warmth: 1.0, attention: 3.0, rest: +5.0, play: 1.0, cleanliness: 1.0 }
};

export const EVOLUTION_THRESHOLDS = {
  [Stage.EGG]: 0.017,
  [Stage.HATCHLING]: 72,
  [Stage.PUPPY]: 336,
  [Stage.JUVENILE]: 672,
  [Stage.ADOLESCENT]: 1440,
  [Stage.ADULT]: Infinity
};

export const GAME_TICK_RATE = 1000;
export const GAME_SPEED_MULTIPLIER = 1;

// =============================================
// TRUST SYSTEM CONFIGURATION
// =============================================

export const TRUST_CONFIG = {
  BASE_REWARD: 0.5,
  URGENT_NEED_THRESHOLD: 30,
  LOW_NEED_THRESHOLD: 50,
  URGENT_NEED_MULTIPLIER: 3.0,
  LOW_NEED_MULTIPLIER: 1.5,
  OVERFED_PENALTY: -0.2,
  STAGE_MULTIPLIERS: {
    [Stage.EGG]: 0, [Stage.HATCHLING]: 2.5, [Stage.PUPPY]: 2.0,
    [Stage.JUVENILE]: 1.5, [Stage.ADOLESCENT]: 0.6, [Stage.ADULT]: 1.0,
  } as Record<Stage, number>,
  DECAY_RATE_PER_HOUR: 0.5,
  NEGLECT_THRESHOLD_HOURS: 2,
  MAX_DECAY_PER_TICK: 0.01,
  EVOLUTION_BONUS: {
    [Stage.EGG]: 0, [Stage.HATCHLING]: 5, [Stage.PUPPY]: 3,
    [Stage.JUVENILE]: 2, [Stage.ADOLESCENT]: 2, [Stage.ADULT]: 10,
  } as Record<Stage, number>,
  INTERACTION_WEIGHTS: {
    feed: 1.0, pet: 1.2, play: 1.0, clean: 0.8, warm: 1.0,
  } as Record<string, number>,
} as const;

// =============================================
// RESPECT SYSTEM CONFIGURATION
// =============================================

export const RESPECT_CONFIG = {
  OBEY_REWARD: 1.0,
  PARTIAL_OBEY_REWARD: 0.5,
  DISOBEY_PENALTY: -0.3,
  STAGE_MULTIPLIERS: {
    [Stage.EGG]: 0, [Stage.HATCHLING]: 0, [Stage.PUPPY]: 1.5,
    [Stage.JUVENILE]: 1.2, [Stage.ADOLESCENT]: 0.4, [Stage.ADULT]: 1.0,
  } as Record<Stage, number>,
  COMPLIANCE_BONUS_PER_POINT: 0.5,
  // ADDED: Respect decay configuration
  DECAY_THRESHOLD_HOURS: 24,
  DECAY_RATE_PER_HOUR: 0.2,
  MAX_DECAY_PER_TICK: 0.005,
} as const;

// =============================================
// POINT NOTIFICATION CONFIGURATION
// =============================================

export const POINT_NOTIFICATION_CONFIG = {
  DISPLAY_DURATION_MS: 2500,
  FADE_DURATION_MS: 500,
  MAX_VISIBLE: 5,
  STACK_OFFSET_PX: 50,
} as const;

// =============================================
// ENERGY SYSTEM CONFIGURATION
// =============================================

export const ENERGY_CONFIG = {
  ANIMATION_COSTS: {
    'Run_Forward': 8.0, 'Run_Backward': 8.0, 'run to stop': 6.0,
    'Walk_Forward': 3.0, 'walk slow loop': 2.0, 'walk slow': 2.0,
    'Roar_Forward': 4.0, 'Retreat_Roar': 5.0, 'ROAR': 3.0,
    'idle': 0, 'Idle_2': 0.5, 'All_Delete': 0, 'Die': 0, 'Reborn': 2.0,
  } as Record<string, number>,
  DEFAULT_COST: 1.0,
  HUNGER_DRAIN_PER_ENERGY_SPENT: 0.4,
  LOW_HUNGER_ENERGY_PENALTY: 0.5,
  LOW_ENERGY_THRESHOLD: 30,
  STAGE_ENERGY_MULTIPLIERS: {
    [Stage.EGG]: 0, [Stage.HATCHLING]: 1.5, [Stage.PUPPY]: 1.3,
    [Stage.JUVENILE]: 1.0, [Stage.ADOLESCENT]: 0.8, [Stage.ADULT]: 0.7,
  } as Record<Stage, number>,
} as const;

// =============================================
// EMOTION → NEEDS DECAY MODIFIERS
// =============================================

export const EMOTION_DECAY_MODIFIERS: Record<string, Partial<Record<keyof Needs | 'all', number>>> = {
  excited: { play: 1.5, attention: 0.7, rest: 1.3 },
  curious: { play: 1.2, attention: 0.9 },
  content: { all: 0.85 },
  scared: { attention: 1.8, rest: 1.3, warmth: 1.2 },
  hurt: { attention: 2.0, play: 0.5 },
  tired: { rest: 0.5, play: 1.5, attention: 1.2 },
  demanding: { attention: 1.5, play: 1.3, hunger: 1.2 },
  proud: { attention: 0.6, play: 0.9 },
  sick: { hunger: 0.7, play: 0.3, rest: 1.5, attention: 1.5 },
  neutral: { all: 1.0 },
} as const;

// =============================================
// REWARD/OBEDIENCE HISTORY CONFIGURATION
// =============================================

export const REWARD_HISTORY_CONFIG = {
  MAX_ENTRIES: 15, DISPLAY_RECENT: 5, TREND_WINDOW_RECENT: 5,
  TREND_WINDOW_PRIOR: 5, TREND_RISING_THRESHOLD: 0.5, TREND_FALLING_THRESHOLD: -0.5,
  LOG_SOURCES: ['interaction', 'llm', 'obedience'] as const, LOG_DECAY: false,
} as const;

export const OBEDIENCE_HISTORY_CONFIG = {
  MAX_ENTRIES: 5,
  RECOGNIZED_COMMANDS: [
    'come', 'here', 'approach', 'go', 'away', 'back', 'leave',
    'stay', 'stop', 'wait', 'sit', 'down', 'lie', 'speak', 'roar',
    'voice', 'quiet', 'hush', 'shh', 'play', 'fetch', 'catch', 'eat', 'food', 'dinner',
  ] as const,
  RESPECT_REWARDS: { obeyed: 1.0, partial: 0.5, refused: -0.3, ignored: 0 } as const,
} as const;

export const IMMEDIATE_CONTEXT_CONFIG = {
  MAX_MESSAGES: 3, INCLUDE_NARRATOR: true, MAX_MESSAGE_LENGTH: 150,
} as const;

export const STAGE_DELTA_MULTIPLIERS = {
  [Stage.EGG]: { love: 0, energy: 0 },
  [Stage.HATCHLING]: { love: 2.0, energy: 1.5 },
  [Stage.PUPPY]: { love: 1.8, energy: 1.3 },
  [Stage.JUVENILE]: { love: 1.3, energy: 1.1 },
  [Stage.ADOLESCENT]: { love: 0.7, energy: 0.9 },
  [Stage.ADULT]: { love: 1.0, energy: 1.0 },
} as const;

export const INTERACTION_EMOJIS: Record<string, string[]> = {
  feed: ['🍖', '🍗', '🥩', '🥓', '🥛'],
  pet: ['❤️', '💖', '💕', '😻', '💓'],
  play: ['🥎', '🧶', '🪀', '🎈', '🧸'],
  clean: ['🧼', '🚿', '✨', '🛁', '🫧'],
  warm: ['🔥', '🧣', '☀️'],
  comfort: ['🩹', '🫂', '❤️‍🩹']
};

// =============================================
// ENVIRONMENT CONFIGURATION
// =============================================

export const ENVIRONMENT = {
  GRASS_DENSITY: 10000, GRASS_RADIUS: 25, GRASS_BLADE_HEIGHT: 0.8,
  GRASS_BLADE_WIDTH: 0.05, GRASS_CLEARING_BASE: 1.5, GRASS_CLEARING_SCALE_MULT: 0.5,
  FLOWER_COUNT: 60, FLOWER_RADIUS: 20, FLOWER_EVOLUTION_INTERVAL: 30000, FLOWER_CHANGE_PERCENT: 0.15,
  CLOUD_COUNT: 10, CLOUD_SPREAD: 60, CLOUD_HEIGHT_MIN: 18, CLOUD_HEIGHT_MAX: 28,
  WORLD_BOUNDARY: { minZ: -12, maxZ: 12, minX: -8, maxX: 8 },
} as const;

export const MOVEMENT_SPEEDS = {
  RUN_FORWARD: 3.5, WALK_FORWARD: 1.5, WALK_SLOW_LOOP: 0.8, ROAR_FORWARD: 0.6,
  RUN_TO_STOP: 2.5, RUN_BACKWARD: -3.0, RETREAT_ROAR: -0.8, WALK_SLOW: -0.6,
  IDLE: 0, IDLE_2: 0, ALL_DELETE: 0, ROAR: 0, DIE: 0, REBORN: 0,
} as const;

export const DRIFT_CONFIG = { AMPLITUDE: 0.15, FREQUENCY: 0.3 } as const;

export const CAMERA_FOLLOW = {
  MODEL_LERP: 0.12, TARGET_LERP: 0.10, POSITION_LERP: 0.07,
  SNAP_THRESHOLD: 4.0, CATCHUP_THRESHOLD: 1.5, CATCHUP_MULTIPLIER: 2.0,
  MAX_LERP_FACTOR: 0.4, DISTANCE_ADJUST_RATE: 0.12, DISTANCE_MIN: 4, DISTANCE_MAX: 12,
} as const;

// =============================================
// TIME OF DAY THEME (condensed)
// =============================================

export const TIME_OF_DAY_THEME = {
  morning: {
    sky: '#ffb088', fog: '#ffc4a3', fogNear: 10, fogFar: 40,
    ambient: { intensity: 0.35, color: '#fff5e6' },
    directional: { intensity: 1.8, color: '#ffd699', position: [8, 12, 5] as const },
    starOpacity: 0, ground: '#4a7c42',
    grassBase: [0.25, 0.48, 0.18] as const, grassTip: [0.55, 0.72, 0.28] as const,
    cloudColor: '#fff8f0', cloudOpacity: 0.85,
    creatureColorShift: { hue: 5, satMult: 1.0, lightMult: 1.05 }, eyeGlowMult: 0.8,
  },
  day: {
    sky: '#4db8ff', fog: '#87d3ff', fogNear: 12, fogFar: 45,
    ambient: { intensity: 0.45, color: '#ffffff' },
    directional: { intensity: 2.8, color: '#fffef5', position: [5, 15, 7] as const },
    starOpacity: 0, ground: '#3d8c35',
    grassBase: [0.22, 0.55, 0.15] as const, grassTip: [0.45, 0.78, 0.25] as const,
    cloudColor: '#ffffff', cloudOpacity: 1.0,
    creatureColorShift: { hue: 0, satMult: 1.0, lightMult: 1.0 }, eyeGlowMult: 0.7,
  },
  evening: {
    sky: '#e85a3c', fog: '#d4785a', fogNear: 8, fogFar: 35,
    ambient: { intensity: 0.28, color: '#ffe0d0' },
    directional: { intensity: 1.4, color: '#ff7744', position: [12, 6, 8] as const },
    starOpacity: 0.25, ground: '#4a6838',
    grassBase: [0.32, 0.42, 0.18] as const, grassTip: [0.58, 0.55, 0.22] as const,
    cloudColor: '#ffaa77', cloudOpacity: 0.7,
    creatureColorShift: { hue: 15, satMult: 0.95, lightMult: 0.95 }, eyeGlowMult: 1.0,
  },
  night: {
    sky: '#0a1628', fog: '#101c30', fogNear: 6, fogFar: 30,
    ambient: { intensity: 0.12, color: '#a0c0ff' },
    directional: { intensity: 0.4, color: '#8eb4ff', position: [3, 12, 5] as const },
    starOpacity: 1.0, ground: '#1a2830',
    grassBase: [0.08, 0.15, 0.12] as const, grassTip: [0.15, 0.28, 0.22] as const,
    cloudColor: '#2a3a50', cloudOpacity: 0.15,
    creatureColorShift: { hue: -20, satMult: 0.85, lightMult: 0.80 }, eyeGlowMult: 1.5,
    aurora: { enabled: true, intensity: 0.7, primaryColor: '#9966ff', secondaryColor: '#ff66aa', tertiaryColor: '#6688ff', speed: 0.08 }
  },
} as const;

export type TimeOfDayTheme = typeof TIME_OF_DAY_THEME[keyof typeof TIME_OF_DAY_THEME];

export const FLOWER_PALETTE = [
  { h: 48, s: 90, l: 58 }, { h: 340, s: 75, l: 52 }, { h: 55, s: 30, l: 88 },
  { h: 275, s: 60, l: 65 }, { h: 28, s: 85, l: 55 }, { h: 180, s: 50, l: 60 },
] as const;

export const MAGICAL_PARTICLES = {
  morning: { count: 50, color: '#ffd700', size: 1.5, speed: 0.15 },
  day: { count: 30, color: '#ffffff', size: 1.2, speed: 0.1 },
  evening: { count: 60, color: '#ff9944', size: 2, speed: 0.2 },
  night: { count: 100, color: '#aaccff', size: 2.5, speed: 0.25 },
} as const;

// =============================================
// LEARNED BEHAVIOR SYSTEM - PERSONALITY CONFIG
// =============================================

export const PERSONALITY_CONFIG = {
  DIMENSIONS: ['fearfulness', 'attachment', 'obedience', 'energy', 'trustDisposition', 'temperament'] as PersonalityDimension[],
  BOUNDS: { MIN: -100, MAX: 100 },
  NOTABLE_THRESHOLD: 30,
  
  STAGE_PLASTICITY: {
    [Stage.EGG]: 0,
    [Stage.HATCHLING]: 2.0,
    [Stage.PUPPY]: 1.5,
    [Stage.JUVENILE]: 1.0,
    [Stage.ADOLESCENT]: 0.5,
    [Stage.ADULT]: 0.3,
  } as Record<Stage, number>,
  
  DIMINISHING_RETURNS_DIVISOR: 150,
  DAILY_SHIFT_CAP: 15,
  
  // Personality affects decay rates
  DECAY_MODIFIERS: {
    attachment: { attention: { perPoint: 0.005 } },      // +100 attachment = attention decay × 1.5
    energy: { play: { perPoint: 0.005 }, rest: { perPoint: -0.003 } },
    trustDisposition: { trustGain: { perPoint: 0.003 }, trustDecay: { perPoint: -0.005 } },
    temperament: { demandingThreshold: { perPoint: 0.15 } }, // +100 = demanding at 20%, -100 = demanding at 50%
  },
  
  // Personality affects compliance
  COMPLIANCE_MODIFIERS: {
    obedience: { perPoint: 0.004 },       // +100 = +40% compliance
    fearfulness: { perPoint: -0.002 },    // +100 = -20% compliance (scared creatures hesitate)
    trustDisposition: { perPoint: 0.002 }, // +100 = +20% compliance
  },
} as const;

// =============================================
// LEARNED BEHAVIOR SYSTEM - MEMORY CONFIG
// =============================================

export const MEMORY_CONFIG = {
  MAX_MEMORIES: 20,
  DOMINANT_MEMORY_COUNT: 5,
  DUPLICATE_COOLDOWN_MS: 24 * 60 * 60 * 1000, // 24 hours
  RECENCY_WEIGHT_DAYS: 7,
  
  PRUNE_PRIORITY: ['milestone', 'high_impact', 'recent', 'referenced'] as const,
  HIGH_IMPACT_THRESHOLD: 15, // Sum of |personality impacts|
  
  CONSOLIDATION_THRESHOLD: 3, // Same type memories before consolidation
} as const;

// =============================================
// LEARNED BEHAVIOR SYSTEM - KNOWLEDGE CONFIG
// =============================================

export const KNOWLEDGE_CONFIG = {
  COMMAND_PROFICIENCY: {
    FIRST_DETECTION: 10,
    OBEYED: 5,
    OBEYED_PRAISED: 8,
    PARTIAL: 2,
    REFUSED: 1,
    REFUSED_CAP: 60,
    DECAY_PER_WEEK: 1,
    MASTERY_THRESHOLD: 80,
    LEARNED_FLOOR: 20,
    COMPLIANCE_BONUS_PER_POINT: 0.25, // proficiency 100 = +25% compliance for that command
  },
  
  VOCABULARY: {
    STAGE_CAPS: {
      [Stage.EGG]: 0,
      [Stage.HATCHLING]: 0,
      [Stage.PUPPY]: 15,
      [Stage.JUVENILE]: 40,
      [Stage.ADOLESCENT]: 100,
      [Stage.ADULT]: Infinity,
    } as Record<Stage, number>,
    LEARN_THRESHOLD: 3,
    AUTO_WORDS: {
      [Stage.PUPPY]: ['name', 'food', 'hungry', 'play', 'no', 'good', 'bad', 'come', 'love'],
      [Stage.JUVENILE]: ['why', 'what', 'want', 'happy', 'sad', 'tired', 'help', 'friend'],
      [Stage.ADOLESCENT]: ['think', 'feel', 'understand', 'remember', 'dream', 'future'],
      [Stage.ADULT]: [],
    } as Record<Stage, string[]>,
  },
  
  PREFERENCES: {
    MAX_LOVES: 5,
    MAX_DISLIKES: 5,
    DETECTION_THRESHOLD: 5,
    ROLLING_WINDOW: 50,
    MIN_TRUST_DELTA_FOR_LOVE: 2,
    MAX_TRUST_DELTA_FOR_DISLIKE: -1,
  },
  
  PLAYER_FACTS: {
    MAX_FACTS: 10,
  },
} as const;

// =============================================
// LEARNED BEHAVIOR SYSTEM - TRIGGER COOLDOWNS
// =============================================

export const TRIGGER_COOLDOWNS: Record<TriggerCooldownType, number> = {
  interaction: 60 * 1000,           // 1 minute
  time_based: 24 * 60 * 60 * 1000,  // 24 hours
  milestone: Infinity,               // Once ever
  critical: 10 * 60 * 1000,          // 10 minutes
} as const;

// =============================================
// LEARNED BEHAVIOR SYSTEM - INITIAL STATE
// =============================================

export const INITIAL_LEARNED_PERSONALITY: LearnedPersonality = {
  fearfulness: 0,
  attachment: 0,
  obedience: 0,
  energy: 0,
  trustDisposition: 0,
  temperament: 0,
};

export const INITIAL_LEARNED_BEHAVIOR: LearnedBehavior = {
  personality: { ...INITIAL_LEARNED_PERSONALITY },
  memories: [],
  knowledge: {
    commands: {},
    vocabulary: [],
    preferences: { loves: [], dislikes: [] },
    playerKnowledge: { facts: [], playStyle: 'unknown' },
  },
  aggregates: {
    totalPositiveExperiences: 0,
    totalNegativeExperiences: 0,
    dominantTraits: [],
    careGrade: 'C',
    lastCalculated: Date.now(),
  },
  shiftTracking: {
    lastShiftTime: {},
    dailyShifts: {
      fearfulness: 0, attachment: 0, obedience: 0,
      energy: 0, trustDisposition: 0, temperament: 0,
    },
    lastDayReset: Date.now(),
    milestonesTriggered: [],
  },
};

// =============================================
// MEMORY TEMPLATES & PERSONALITY IMPACTS
// =============================================

export interface MemoryTemplate {
  id: string;
  category: MemoryCategory;
  narrative: string;
  narrativeRepeat?: string; // For repeated events
  personalityImpact: Partial<LearnedPersonality>;
  isMilestone: boolean;
}

export const MEMORY_TEMPLATES: Record<string, MemoryTemplate> = {
  // TRAUMA
  STARVED: {
    id: 'STARVED', category: 'trauma',
    narrative: 'Remembers being terribly hungry once',
    narrativeRepeat: 'Has known hunger too many times',
    personalityImpact: { fearfulness: 8, attachment: 5, obedience: -3, energy: -5, trustDisposition: -5, temperament: -5 },
    isMilestone: false,
  },
  FROZEN: {
    id: 'FROZEN', category: 'trauma',
    narrative: 'Remembers feeling dangerously cold',
    personalityImpact: { fearfulness: 10, attachment: 8, energy: -3, trustDisposition: -5 },
    isMilestone: false,
  },
  ABANDONED: {
    id: 'ABANDONED', category: 'trauma',
    narrative: 'Remembers being left alone for too long',
    personalityImpact: { fearfulness: 5, attachment: -10, trustDisposition: -15, temperament: -3 },
    isMilestone: false,
  },
  BETRAYED: {
    id: 'BETRAYED', category: 'trauma',
    narrative: 'Remembers harsh words that hurt deeply',
    personalityImpact: { fearfulness: 5, attachment: -5, obedience: -8, trustDisposition: -20, temperament: -5 },
    isMilestone: false,
  },
  EXHAUSTED: {
    id: 'EXHAUSTED', category: 'trauma',
    narrative: 'Remembers being pushed past exhaustion',
    personalityImpact: { fearfulness: 3, obedience: -5, energy: -10, trustDisposition: -3, temperament: -5 },
    isMilestone: false,
  },
  SCOLDED: {
    id: 'SCOLDED', category: 'trauma',
    narrative: 'Remembers being scolded repeatedly',
    personalityImpact: { fearfulness: 10, obedience: -15, energy: -5, trustDisposition: -10, temperament: -8 },
    isMilestone: false,
  },
  
  // JOY
  RESCUED: {
    id: 'RESCUED', category: 'joy',
    narrative: 'Remembers being saved when desperate',
    personalityImpact: { fearfulness: -5, attachment: 8, obedience: 3, trustDisposition: 10, temperament: 3 },
    isMilestone: false,
  },
  LOVED: {
    id: 'LOVED', category: 'joy',
    narrative: 'Remembers feeling truly loved',
    personalityImpact: { fearfulness: -8, attachment: 5, obedience: 5, energy: 3, trustDisposition: 15, temperament: 5 },
    isMilestone: true,
  },
  CELEBRATED: {
    id: 'CELEBRATED', category: 'joy',
    narrative: 'Remembers a wonderful day of play and love',
    personalityImpact: { fearfulness: -3, attachment: 3, obedience: 3, energy: 8, trustDisposition: 8, temperament: 3 },
    isMilestone: false,
  },
  FIRST_PLAY: {
    id: 'FIRST_PLAY', category: 'joy',
    narrative: 'Remembers first play session fondly',
    personalityImpact: { fearfulness: -5, attachment: 3, energy: 10, trustDisposition: 5 },
    isMilestone: true,
  },
  COMFORTED: {
    id: 'COMFORTED', category: 'joy',
    narrative: 'Remembers being comforted when afraid',
    personalityImpact: { fearfulness: -10, attachment: 5, obedience: 3, trustDisposition: 8, temperament: 3 },
    isMilestone: false,
  },
  
  // ACHIEVEMENT
  EVOLVED_HATCHLING: {
    id: 'EVOLVED_HATCHLING', category: 'achievement',
    narrative: 'Remembers hatching into the world',
    personalityImpact: { fearfulness: 5, attachment: 5 },
    isMilestone: true,
  },
  EVOLVED_PUPPY: {
    id: 'EVOLVED_PUPPY', category: 'achievement',
    narrative: 'Remembers growing from hatchling to puppy',
    personalityImpact: { energy: 5, trustDisposition: 3 },
    isMilestone: true,
  },
  EVOLVED_JUVENILE: {
    id: 'EVOLVED_JUVENILE', category: 'achievement',
    narrative: 'Remembers becoming a juvenile',
    personalityImpact: { obedience: 3, trustDisposition: 3 },
    isMilestone: true,
  },
  EVOLVED_ADOLESCENT: {
    id: 'EVOLVED_ADOLESCENT', category: 'achievement',
    narrative: 'Remembers the start of adolescence',
    personalityImpact: { obedience: -5, energy: 5 },
    isMilestone: true,
  },
  EVOLVED_ADULT: {
    id: 'EVOLVED_ADULT', category: 'achievement',
    narrative: 'Remembers reaching adulthood',
    personalityImpact: { temperament: 10, trustDisposition: 5 },
    isMilestone: true,
  },
  NAMED: {
    id: 'NAMED', category: 'achievement',
    narrative: 'Remembers being given a name',
    personalityImpact: { attachment: 5, trustDisposition: 5 },
    isMilestone: true,
  },
  MASTERED_COMMAND: {
    id: 'MASTERED_COMMAND', category: 'achievement',
    narrative: 'Proud of mastering a command',
    personalityImpact: { obedience: 5, trustDisposition: 3 },
    isMilestone: false,
  },
  TRUSTED: {
    id: 'TRUSTED', category: 'achievement',
    narrative: 'Remembers the moment trust was established',
    personalityImpact: { trustDisposition: 10, attachment: 3 },
    isMilestone: true,
  },
  
  // BONDING
  FIRST_WORD: {
    id: 'FIRST_WORD', category: 'bonding',
    narrative: 'Remembers first words spoken by human',
    personalityImpact: { attachment: 5, trustDisposition: 3 },
    isMilestone: true,
  },
  ROUTINE: {
    id: 'ROUTINE', category: 'bonding',
    narrative: 'Loves the daily routine',
    personalityImpact: { temperament: 5, attachment: 3, trustDisposition: 3 },
    isMilestone: false,
  },
  SECRET: {
    id: 'SECRET', category: 'bonding',
    narrative: 'Knows something special about human',
    personalityImpact: { attachment: 5, trustDisposition: 5 },
    isMilestone: false,
  },
  NICKNAME: {
    id: 'NICKNAME', category: 'bonding',
    narrative: 'Loves being called by a special name',
    personalityImpact: { attachment: 3, trustDisposition: 3 },
    isMilestone: true,
  },
  
  // LEARNING
  LEARNED_COMMAND: {
    id: 'LEARNED_COMMAND', category: 'learning',
    narrative: 'Learning a new command',
    personalityImpact: { obedience: 2, trustDisposition: 2 },
    isMilestone: false,
  },
  NEW_WORD: {
    id: 'NEW_WORD', category: 'learning',
    narrative: 'Learned a new word',
    personalityImpact: { trustDisposition: 1 },
    isMilestone: false,
  },
};

// =============================================
// CARE GRADE THRESHOLDS
// =============================================

export const CARE_GRADE_THRESHOLDS: { grade: CareGrade; ratio: number }[] = [
  { grade: 'S', ratio: 3.0 },   // positive > negative × 3
  { grade: 'A', ratio: 2.0 },
  { grade: 'B', ratio: 1.5 },
  { grade: 'C', ratio: 1.0 },
  { grade: 'D', ratio: 0.5 },
  { grade: 'F', ratio: 0 },
];

// =============================================
// PERSONALITY DIMENSION DESCRIPTORS
// =============================================

export const PERSONALITY_DESCRIPTORS: Record<PersonalityDimension, { negative: string; positive: string; negativeLabel: string; positiveLabel: string }> = {
  fearfulness: { negativeLabel: 'Confident', positiveLabel: 'Fearful', negative: 'approaches everything boldly', positive: 'the world feels scary, needs safety' },
  attachment: { negativeLabel: 'Independent', positiveLabel: 'Clingy', negative: 'content alone, aloof', positive: 'needs human, anxious alone' },
  obedience: { negativeLabel: 'Rebellious', positiveLabel: 'Eager', negative: 'does what it wants', positive: 'lives to make human happy' },
  energy: { negativeLabel: 'Calm', positiveLabel: 'Hyperactive', negative: 'prefers lounging, slow movements', positive: 'constant motion, zoomies' },
  trustDisposition: { negativeLabel: 'Suspicious', positiveLabel: 'Trusting', negative: 'trust no one, ever watchful', positive: 'complete faith, forgives easily' },
  temperament: { negativeLabel: 'Impatient', positiveLabel: 'Patient', negative: 'wants things NOW, quick to demand', positive: 'zen-like calm, rarely demands' },
};

// =============================================
// INTERACTION PATTERN CONFIG
// =============================================

export const INTERACTION_PATTERN_CONFIG = {
  MAX_ENTRIES: 50,
  ROUTINE_DETECTION_DAYS: 5,
  ROUTINE_TIME_TOLERANCE_HOURS: 2,
} as const;

// =============================================
// PERSISTENCE CONFIGURATION
// =============================================

export const PERSISTENCE_CONFIG = {
  /** Debounce interval for automatic saves (ms) */
  SAVE_DEBOUNCE_MS: 5000,
  
  /** Storage keys */
  STORAGE_KEY: 'mochi_pyra_state_v3',
  LEGACY_STORAGE_KEY: 'mochi_pyra_state_v2',
  
  /** Fields to EXCLUDE from persistence (transient/runtime state) */
  TRANSIENT_FIELDS: [
    'pointNotifications',
    'currentAnimation', 
    'latestInteraction',
  ] as const,
  
  /** Maximum retry attempts for save operations */
  MAX_SAVE_RETRIES: 2,
} as const;

// =============================================
// WORLD SCROLLING CONFIGURATION
// =============================================

export const WORLD_SCROLL_CONFIG = {
  /** Trigger forward scroll when T-Rex exceeds this Z value */
  FORWARD_THRESHOLD: 10,
  
  /** Trigger backward scroll when T-Rex goes below this Z value */
  BACKWARD_THRESHOLD: -10,
  
  /** Amount to shift position when scrolling (resets toward center) */
  SCROLL_AMOUNT: 8,
  
  /** X boundaries remain hard (side limits) */
  X_BOUNDARY: 8,
  
  /** Cloud parallax multiplier (0.1 = clouds move 10% of scroll distance) */
  CLOUD_PARALLAX_FACTOR: 0.15,
} as const;

// =============================================
// CELEBRATION SYSTEM CONFIGURATION
// =============================================

export const CELEBRATION_CONFIG = {
  TRUST_MILESTONES: [25, 50, 75, 90] as const,
  STREAK_MILESTONES: [3, 7, 14, 30, 60, 100] as const,
  COMMAND_MASTERY_THRESHOLD: 80,
  STREAK_WINDOW_HOURS: 28, // Hours to count as "next day" return
  STREAK_BREAK_HOURS: 48,  // Hours before streak resets
} as const;

export const EVOLUTION_CELEBRATIONS: Record<Stage, {
  title: string;
  subtitle: string;
  emoji: string;
  unlocks: string[];
}> = {
  [Stage.EGG]: {
    title: "A New Beginning",
    subtitle: "Your egg is waiting...",
    emoji: "🥚",
    unlocks: [],
  },
  [Stage.HATCHLING]: {
    title: "It's Alive!",
    subtitle: "Your baby dinosaur has hatched!",
    emoji: "🐣",
    unlocks: ["Pyra can see you!", "Pyra responds to your voice"],
  },
  [Stage.PUPPY]: {
    title: "First Words!",
    subtitle: "Pyra is learning to understand you!",
    emoji: "🗣️",
    unlocks: ["Pyra knows simple words!", "Try teaching commands!", "Pyra can say your name!"],
  },
  [Stage.JUVENILE]: {
    title: "Growing Up!",
    subtitle: "Pyra is becoming curious about everything!",
    emoji: "🦕",
    unlocks: ["Pyra asks 'why?' now!", "Longer conversations!", "Pyra remembers more!"],
  },
  [Stage.ADOLESCENT]: {
    title: "Teenager Phase!",
    subtitle: "Pyra has their own opinions now...",
    emoji: "🦖",
    unlocks: ["Pyra might disagree!", "Deeper conversations", "Strong personality forming"],
  },
  [Stage.ADULT]: {
    title: "All Grown Up!",
    subtitle: "Your journey together has shaped who Pyra became.",
    emoji: "👑",
    unlocks: ["Full vocabulary!", "Wise companion", "Your bond is complete"],
  },
};

export const TRUST_MILESTONE_MESSAGES: Record<number, {
  title: string;
  subtitle: string;
  emoji: string;
}> = {
  25: {
    title: "Building Trust",
    subtitle: "Pyra is starting to feel safe with you!",
    emoji: "🌱",
  },
  50: {
    title: "Real Friends",
    subtitle: "Pyra trusts you now!",
    emoji: "🤝",
  },
  75: {
    title: "Best Friends",
    subtitle: "Pyra loves spending time with you!",
    emoji: "💕",
  },
  90: {
    title: "Unbreakable Bond",
    subtitle: "Pyra trusts you completely!",
    emoji: "💖",
  },
};

export const STREAK_MESSAGES: Record<number, {
  title: string;
  subtitle: string;
  emoji: string;
}> = {
  3: { title: "3 Days Together!", subtitle: "You're building a habit!", emoji: "⭐" },
  7: { title: "One Week!", subtitle: "Pyra counts on you now!", emoji: "🌟" },
  14: { title: "Two Weeks!", subtitle: "You're a dedicated caretaker!", emoji: "✨" },
  30: { title: "One Month!", subtitle: "Pyra is so lucky to have you!", emoji: "🏆" },
  60: { title: "Two Months!", subtitle: "Your bond is legendary!", emoji: "👑" },
  100: { title: "100 Days!", subtitle: "A friendship for the ages!", emoji: "💎" },
};


// =============================================
// DAILY SURPRISE SYSTEM CONFIGURATION
// =============================================

export const DAILY_SURPRISE_CONFIG = {
  /** Probability of surprise on return (0-1) */
  CHANCE_ON_RETURN: 0.4,
  /** Minimum hours away to trigger surprise */
  MIN_HOURS_AWAY: 4,
  /** Cooldown between surprises (hours) */
  COOLDOWN_HOURS: 20,
} as const;

export type SurpriseType = 
  | 'found_item'
  | 'learned_trick'
  | 'funny_moment'
  | 'waiting_gift'
  | 'dream'
  | 'discovery';

export interface DailySurprise {
  id: string;
  type: SurpriseType;
  message: string;
  emoji: string;
  animation?: string;
  vocalization?: 'chirp' | 'purr' | 'babble' | 'roar' | 'none';
  /** Personality bias: positive = more likely if trait is high */
  personalityBias?: Partial<LearnedPersonality>;
  /** Minimum stage required */
  minStage?: Stage;
}

export const DAILY_SURPRISES: DailySurprise[] = [
  // === FOUND ITEMS ===
  {
    id: 'found_pebble',
    type: 'found_item',
    message: "Pyra found a shiny pebble and saved it for you!",
    emoji: "💎",
    animation: 'Idle_2',
    vocalization: 'chirp',
  },
  {
    id: 'found_sparkle',
    type: 'found_item',
    message: "Pyra dug up something sparkly in the grass!",
    emoji: "✨",
    animation: 'idle',
    vocalization: 'chirp',
  },
  {
    id: 'found_flower',
    type: 'found_item',
    message: "Pyra found a pretty flower and wants to show you!",
    emoji: "🌸",
    animation: 'Walk_Forward',
    vocalization: 'purr',
  },
  {
    id: 'found_feather',
    type: 'found_item',
    message: "Pyra caught a floating feather!",
    emoji: "🪶",
    animation: 'Idle_2',
    vocalization: 'chirp',
  },

  // === LEARNED TRICKS (energy/obedience biased) ===
  {
    id: 'practiced_running',
    type: 'learned_trick',
    message: "Pyra practiced running while you were gone!",
    emoji: "🏃",
    animation: 'Run_Forward',
    vocalization: 'chirp',
    personalityBias: { energy: 30 },
    minStage: Stage.PUPPY,
  },
  {
    id: 'practiced_roar',
    type: 'learned_trick',
    message: "Pyra has been working on their roar!",
    emoji: "🦖",
    animation: 'ROAR',
    vocalization: 'roar',
    personalityBias: { obedience: -20, energy: 20 },
    minStage: Stage.JUVENILE,
  },
  {
    id: 'learned_spin',
    type: 'learned_trick',
    message: "Pyra learned to do a little spin!",
    emoji: "💫",
    animation: 'run to stop',
    vocalization: 'chirp',
    personalityBias: { energy: 20 },
    minStage: Stage.PUPPY,
  },
  {
    id: 'practiced_sneaking',
    type: 'learned_trick',
    message: "Pyra practiced sneaking around quietly!",
    emoji: "🥷",
    animation: 'walk slow loop',
    vocalization: 'none',
    personalityBias: { energy: -20, fearfulness: 10 },
    minStage: Stage.PUPPY,
  },

  // === FUNNY MOMENTS ===
  {
    id: 'chased_tail',
    type: 'funny_moment',
    message: "Pyra chased their own tail while waiting!",
    emoji: "😂",
    animation: 'Run_Forward',
    vocalization: 'chirp',
    personalityBias: { energy: 40 },
  },
  {
    id: 'chased_butterfly',
    type: 'funny_moment',
    message: "Pyra tried to catch a butterfly!",
    emoji: "🦋",
    animation: 'Idle_2',
    vocalization: 'chirp',
  },
  {
    id: 'funny_sleep',
    type: 'funny_moment',
    message: "Pyra fell asleep in a funny position!",
    emoji: "😴",
    animation: 'idle',
    vocalization: 'purr',
    personalityBias: { energy: -30 },
  },
  {
    id: 'startled_shadow',
    type: 'funny_moment',
    message: "Pyra got startled by their own shadow!",
    emoji: "👻",
    animation: 'Retreat_Roar',
    vocalization: 'chirp',
    personalityBias: { fearfulness: 30 },
  },
  {
    id: 'grass_roll',
    type: 'funny_moment',
    message: "Pyra rolled around in the grass for fun!",
    emoji: "🌿",
    animation: 'idle',
    vocalization: 'purr',
    personalityBias: { energy: 20 },
  },

  // === WAITING GIFT (attachment biased) ===
  {
    id: 'saved_spot',
    type: 'waiting_gift',
    message: "Pyra saved the best spot for you to sit together!",
    emoji: "💕",
    animation: 'idle',
    vocalization: 'purr',
    personalityBias: { attachment: 30 },
  },
  {
    id: 'guarding_gift',
    type: 'waiting_gift',
    message: "Pyra has been guarding something special for you!",
    emoji: "🎁",
    animation: 'Idle_2',
    vocalization: 'chirp',
    personalityBias: { attachment: 20 },
  },
  {
    id: 'waiting_by_entrance',
    type: 'waiting_gift',
    message: "Pyra was waiting right by the entrance for you!",
    emoji: "🚪",
    animation: 'Run_Forward',
    vocalization: 'chirp',
    personalityBias: { attachment: 40 },
  },

  // === DREAMS (stage-gated, trust/fear biased) ===
  {
    id: 'dream_playing',
    type: 'dream',
    message: "Pyra had a dream about playing with you!",
    emoji: "💭",
    animation: 'idle',
    vocalization: 'purr',
    personalityBias: { trustDisposition: 20 },
    minStage: Stage.PUPPY,
  },
  {
    id: 'dream_exploring',
    type: 'dream',
    message: "Pyra dreamed of exploring together!",
    emoji: "🌟",
    animation: 'Walk_Forward',
    vocalization: 'chirp',
    personalityBias: { fearfulness: -20, energy: 20 },
    minStage: Stage.JUVENILE,
  },
  {
    id: 'dream_scary',
    type: 'dream',
    message: "Pyra had a scary dream but feels better now that you're here.",
    emoji: "🌙",
    animation: 'idle',
    vocalization: 'purr',
    personalityBias: { fearfulness: 30, attachment: 20 },
    minStage: Stage.PUPPY,
  },
  {
    id: 'dream_food',
    type: 'dream',
    message: "Pyra dreamed about a mountain of snacks!",
    emoji: "🍖",
    animation: 'Idle_2',
    vocalization: 'babble',
    minStage: Stage.PUPPY,
  },

  // === DISCOVERY ===
  {
    id: 'cloud_shapes',
    type: 'discovery',
    message: "Pyra noticed the clouds look like food today!",
    emoji: "☁️",
    animation: 'idle',
    vocalization: 'chirp',
  },
  {
    id: 'watched_sunrise',
    type: 'discovery',
    message: "Pyra watched the sunrise and thought of you!",
    emoji: "🌅",
    animation: 'idle',
    vocalization: 'purr',
    personalityBias: { attachment: 20 },
  },
  {
    id: 'counted_flowers',
    type: 'discovery',
    message: "Pyra tried to count all the flowers!",
    emoji: "🌼",
    animation: 'Walk_Forward',
    vocalization: 'chirp',
    minStage: Stage.JUVENILE,
  },
  {
    id: 'made_friend',
    type: 'discovery',
    message: "Pyra made friends with a little bug!",
    emoji: "🐛",
    animation: 'Idle_2',
    vocalization: 'chirp',
    personalityBias: { fearfulness: -20 },
  },
];
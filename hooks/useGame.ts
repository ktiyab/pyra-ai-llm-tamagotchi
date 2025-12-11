import { useState, useEffect, useCallback, useReducer, useRef } from 'react';
import { 
  GameState, GameAction, Stage, Needs, Seed, LLMResponse, TimeOfDay, 
  PointNotification, PointType, RewardHistoryEntry, ObedienceRecord,
  PersonalityDimension, LearnedBehavior, SignificantMemory, VocabularySentiment,
  VocabularySource, PreferenceEntry, InteractionPatternEntry, MemoryCategory,
  CelebrationData, CelebrationTracking, StreakData, ChatMessage,
} from '../types';
import { generateSeed } from '../utils';
import {
  DECAY_RATES, EVOLUTION_THRESHOLDS, INITIAL_NEEDS, GAME_TICK_RATE,
  GAME_SPEED_MULTIPLIER, TRUST_CONFIG, RESPECT_CONFIG, POINT_NOTIFICATION_CONFIG,
  ENERGY_CONFIG, EMOTION_DECAY_MODIFIERS, REWARD_HISTORY_CONFIG,
  OBEDIENCE_HISTORY_CONFIG, STAGE_DELTA_MULTIPLIERS, INITIAL_LEARNED_BEHAVIOR,
  PERSONALITY_CONFIG, MEMORY_CONFIG, KNOWLEDGE_CONFIG, INTERACTION_PATTERN_CONFIG,
  PERSISTENCE_CONFIG, CELEBRATION_CONFIG, EVOLUTION_CELEBRATIONS, TRUST_MILESTONE_MESSAGES,
  STREAK_MESSAGES, DAILY_SURPRISE_CONFIG, DAILY_SURPRISES, DailySurprise,
} from '../constants';
import { generateCatResponse, AudioInput } from '../services/geminiService';
import { audioService } from '../services/audioService';
import { animController } from '../services/animationController';
import { behaviorService } from '../services/behaviorService';

// FIXED: Updated storage key for new learned behavior system
// const STORAGE_KEY = 'mochi_pyra_state_v3';
// const LEGACY_STORAGE_KEY = 'mochi_pyra_state_v2';

const getTimeOfDay = (): TimeOfDay => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
};

// =============================================
// POINT NOTIFICATION HELPERS
// =============================================

// FIXED: Added new point types for learned behavior system
const POINT_COLORS: Record<PointType, string> = {
  trust: '#577590',
  respect: '#9b59b6',
  love: '#f4845f',
  energy: '#90be6d',
  milestone: '#f9c74f',
  personality: '#a78bfa',  // NEW: Purple for personality shifts
  memory: '#38bdf8',       // NEW: Cyan for memory formation
};

const createPointNotification = (
  type: PointType,
  value: number,
  reason?: string
): PointNotification => ({
  id: crypto.randomUUID(),
  type,
  value,
  label: type.charAt(0).toUpperCase() + type.slice(1),
  reason,
  timestamp: Date.now(),
  color: POINT_COLORS[type],
});

const shouldShowNotification = (
  notifications: PointNotification[],
  type: PointType,
  minIntervalMs = 1000
): boolean => {
  const now = Date.now();
  return notifications.filter(
    n => n.type === type && (now - n.timestamp) < minIntervalMs
  ).length === 0;
};

// =============================================
// REWARD HISTORY HELPER
// =============================================

const createRewardEntry = (
  trust: number,
  love: number,
  energy: number,
  respect: number,
  source: RewardHistoryEntry['source'],
  reason: string
): RewardHistoryEntry => ({
  timestamp: Date.now(),
  trust,
  love,
  energy,
  respect,
  source,
  reason,
});

// =============================================
// EMOTION DECAY MODIFIER HELPER
// =============================================

const applyEmotionModifiers = (
  baseRates: Record<string, number>,
  emotion: string
): Record<string, number> => {
  const modifiers = EMOTION_DECAY_MODIFIERS[emotion] || EMOTION_DECAY_MODIFIERS.neutral;
  const result: Record<string, number> = { ...baseRates };

  if ('all' in modifiers && modifiers.all !== undefined) {
    const allMod = modifiers.all;
    for (const key of Object.keys(result)) {
      result[key] *= allMod;
    }
  }

  for (const [key, mod] of Object.entries(modifiers)) {
    if (key !== 'all' && key in result && mod !== undefined) {
      result[key] = baseRates[key] * mod;
    }
  }

  return result;
};

// =============================================
// PERSONALITY-BASED DECAY MODIFIERS (NEW)
// =============================================

/**
 * Applies learned personality modifiers to need decay rates.
 * High attachment = attention decays faster (needs more attention)
 * High energy = play decays faster, rest decays slower
 */
const applyPersonalityDecayModifiers = (
  rates: Record<string, number>,
  personality: LearnedBehavior['personality']
): Record<string, number> => {
  const result = { ...rates };
  const mods = PERSONALITY_CONFIG.DECAY_MODIFIERS;

  // Attachment affects attention decay: +100 attachment = attention decays 1.5x faster
  if (mods.attachment?.attention?.perPoint) {
    const attachMod = 1 + (personality.attachment * mods.attachment.attention.perPoint);
    result.attention *= Math.max(0.5, Math.min(2.0, attachMod));
  }

  // Energy affects play decay: +100 energy = play decays faster (needs more play)
  if (mods.energy?.play?.perPoint) {
    const energyPlayMod = 1 + (personality.energy * mods.energy.play.perPoint);
    result.play *= Math.max(0.5, Math.min(2.0, energyPlayMod));
  }

  // Energy affects rest decay: +100 energy = rest decays slower (doesn't tire easily)
  if (mods.energy?.rest?.perPoint) {
    const energyRestMod = 1 + (personality.energy * mods.energy.rest.perPoint);
    result.rest *= Math.max(0.5, Math.min(2.0, energyRestMod));
  }

  return result;
};

// =============================================
// TRUST CALCULATION (with personality modifier)
// =============================================

interface TrustCalculation {
  baseReward: number;
  contextMultiplier: number;
  stageMultiplier: number;
  interactionWeight: number;
  personalityModifier: number;
  finalReward: number;
  reason: string;
}

const calculateTrustReward = (
  interactionType: string,
  needs: Needs,
  stage: Stage,
  personality: LearnedBehavior['personality']
): TrustCalculation => {
  const {
    BASE_REWARD, URGENT_NEED_THRESHOLD, LOW_NEED_THRESHOLD,
    URGENT_NEED_MULTIPLIER, LOW_NEED_MULTIPLIER, OVERFED_PENALTY,
    STAGE_MULTIPLIERS, INTERACTION_WEIGHTS
  } = TRUST_CONFIG;

  if (stage === Stage.EGG) {
    return {
      baseReward: 0, contextMultiplier: 0, stageMultiplier: 0,
      interactionWeight: 0, personalityModifier: 0, finalReward: 0, reason: '',
    };
  }

  const needMap: Record<string, keyof Needs> = {
    feed: 'hunger', pet: 'attention', play: 'play',
    clean: 'cleanliness', warm: 'warmth',
  };

  const relevantNeed = needMap[interactionType];
  const needValue = relevantNeed ? needs[relevantNeed] : 50;

  let contextMultiplier = 1.0;
  let reason = '';

  if (needValue < URGENT_NEED_THRESHOLD) {
    contextMultiplier = URGENT_NEED_MULTIPLIER;
    reason = `Critical ${relevantNeed}!`;
  } else if (needValue < LOW_NEED_THRESHOLD) {
    contextMultiplier = LOW_NEED_MULTIPLIER;
    reason = `Needed ${relevantNeed}`;
  } else if (needValue > 95) {
    contextMultiplier = OVERFED_PENALTY / BASE_REWARD;
    reason = 'Over-caring';
  } else {
    reason = 'Care given';
  }

  const stageMultiplier = STAGE_MULTIPLIERS[stage] ?? 1.0;
  const interactionWeight = INTERACTION_WEIGHTS[interactionType] ?? 1.0;

  // FIXED: Trust disposition affects trust gain: +100 = gains trust 30% faster
  const trustDispMod = PERSONALITY_CONFIG.DECAY_MODIFIERS.trustDisposition?.trustGain?.perPoint ?? 0.003;
  const personalityModifier = Math.max(0.5, Math.min(1.5, 1 + (personality.trustDisposition * trustDispMod)));

  const finalReward = BASE_REWARD * contextMultiplier * stageMultiplier * interactionWeight * personalityModifier;

  return {
    baseReward: BASE_REWARD,
    contextMultiplier,
    stageMultiplier,
    interactionWeight,
    personalityModifier,
    finalReward: Math.round(finalReward * 100) / 100,
    reason,
  };
};

// =============================================
// TRUST DECAY (with personality modifier)
// =============================================

const calculateTrustDecay = (
  lastInteraction: number,
  deltaHours: number,
  personality: LearnedBehavior['personality']
): { decay: number; reason: string } | null => {
  const hoursSinceInteraction = (Date.now() - lastInteraction) / (1000 * 60 * 60);

  if (hoursSinceInteraction < TRUST_CONFIG.NEGLECT_THRESHOLD_HOURS) {
    return null;
  }

  let decayAmount = Math.min(
    TRUST_CONFIG.DECAY_RATE_PER_HOUR * deltaHours,
    TRUST_CONFIG.MAX_DECAY_PER_TICK
  );

  // FIXED: Trust disposition affects decay: +100 = decays 50% slower
  const trustDispMod = PERSONALITY_CONFIG.DECAY_MODIFIERS.trustDisposition?.trustDecay?.perPoint ?? -0.005;
  const decayModifier = Math.max(0.5, Math.min(1.5, 1 + (personality.trustDisposition * trustDispMod)));
  decayAmount *= decayModifier;

  return { decay: decayAmount, reason: 'Neglected' };
};

// =============================================
// INITIAL STATE
// =============================================

const initialState: GameState = {
  seed: generateSeed(),
  name: null,
  stage: Stage.EGG,
  ageHours: 0,
  needs: { ...INITIAL_NEEDS },
  bond: { trust: 0, respect: 0, history: 0 },
  messages: [],
  eggCrackLevel: 0,
  lastInteraction: Date.now(),
  timeOfDay: getTimeOfDay(),
  overrideTime: false,
  currentEmotion: 'neutral',
  currentAnimation: { primary: 'idle' },
  latestInteraction: null,
  pointNotifications: [],
  rewardHistory: [],
  obedienceHistory: [],
  // FIXED: Initialize learned behavior system
  learnedBehavior: { ...INITIAL_LEARNED_BEHAVIOR },
  interactionPatterns: [],
  // FIXED: Added tutorial tracking - defaults to false (not seen)
  tutorialSeen: false,
  // NEW: Celebration system
  activeCelebration: null,
  celebrationHistory: {
    evolutions: [],
    trustMilestones: [],
    commandMasteries: [],
    streakMilestones: [],
    careGrades: [],
  },
  streak: {
    current: 0,
    longest: 0,
    lastCheckIn: Date.now(),
  },
  // FIXED: Add lastSurpriseTime
  lastSurpriseTime: 0,
};

// =============================================
// BACKWARD COMPATIBILITY & MIGRATION
// =============================================

/**
 * Ensures learnedBehavior exists with all required fields.
 * Handles migration from v2 saves that lack the learned behavior system.
 */
const ensureLearnedBehavior = (state: Partial<GameState>): LearnedBehavior => {
  if (state.learnedBehavior?.personality && 
      state.learnedBehavior?.memories &&
      state.learnedBehavior?.knowledge &&
      state.learnedBehavior?.aggregates &&
      state.learnedBehavior?.shiftTracking) {
    return state.learnedBehavior;
  }
  
  // Merge partial data with defaults
  return {
    ...INITIAL_LEARNED_BEHAVIOR,
    ...(state.learnedBehavior || {}),
    personality: {
      ...INITIAL_LEARNED_BEHAVIOR.personality,
      ...(state.learnedBehavior?.personality || {}),
    },
    knowledge: {
      ...INITIAL_LEARNED_BEHAVIOR.knowledge,
      ...(state.learnedBehavior?.knowledge || {}),
    },
    aggregates: {
      ...INITIAL_LEARNED_BEHAVIOR.aggregates,
      ...(state.learnedBehavior?.aggregates || {}),
    },
    shiftTracking: {
      ...INITIAL_LEARNED_BEHAVIOR.shiftTracking,
      ...(state.learnedBehavior?.shiftTracking || {}),
    },
  };
};


// =============================================
// HELPER: Clamp utility (if not exists)
// =============================================

const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

// =============================================
// HELPER: Extract persistent state only
// =============================================

/**
 * Extracts only the fields that should be persisted to storage.
 * Excludes transient/runtime state that shouldn't survive page reload.
 */
const getPersistentState = (state: GameState): Partial<GameState> => {
  const persistentState: Partial<GameState> = { ...state };
  
  // Remove transient fields
  for (const field of PERSISTENCE_CONFIG.TRANSIENT_FIELDS) {
    delete (persistentState as any)[field];
  }
  
  return persistentState;
};

// =============================================
// HELPER: Validate numeric value
// =============================================

const validateNumber = (
  value: unknown, 
  defaultValue: number, 
  min?: number, 
  max?: number
): number => {
  const num = Number(value);
  if (isNaN(num)) return defaultValue;
  if (min !== undefined && max !== undefined) {
    return clamp(num, min, max);
  }
  return num;
};

// =============================================
// HELPER: Validate needs object
// =============================================

const validateNeeds = (parsed: any): Needs => {
  const defaults = INITIAL_NEEDS;
  
  if (!parsed || typeof parsed !== 'object') {
    return { ...defaults };
  }
  
  return {
    hunger: validateNumber(parsed.hunger, defaults.hunger, 0, 100),
    warmth: validateNumber(parsed.warmth, defaults.warmth, 0, 100),
    attention: validateNumber(parsed.attention, defaults.attention, 0, 100),
    rest: validateNumber(parsed.rest, defaults.rest, 0, 100),
    play: validateNumber(parsed.play, defaults.play, 0, 100),
    cleanliness: validateNumber(parsed.cleanliness, defaults.cleanliness, 0, 100),
  };
};

// =============================================
// HELPER: Validate bond object
// =============================================

const validateBond = (parsed: any): Bond => {
  const defaults = { trust: 0, respect: 0, history: 0 };
  
  if (!parsed || typeof parsed !== 'object') {
    return { ...defaults };
  }
  
  return {
    trust: validateNumber(parsed.trust, defaults.trust, 0, 100),
    respect: validateNumber(parsed.respect, defaults.respect, 0, 100),
    history: validateNumber(parsed.history, defaults.history, 0),
  };
};

// =============================================
// 8. ADD HELPER: Validate stage enum
// =============================================

const validateStage = (parsed: any): Stage => {
  const validStages = Object.values(Stage);
  if (validStages.includes(parsed)) {
    return parsed;
  }
  return Stage.EGG;
};

/**
 * Loads state from localStorage with migration support
 */
const loadSavedState = (): GameState => {
  const { STORAGE_KEY, LEGACY_STORAGE_KEY } = PERSISTENCE_CONFIG;
  
  try {
    let saved = localStorage.getItem(STORAGE_KEY);
    
    // FIXED: Migration from legacy v2 if v3 doesn't exist
    if (!saved) {
      saved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved) {
        console.log('Migrating from v2 to v3 storage format...');
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
    
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // FIXED: Validate all loaded data to prevent corruption issues
      return {
        ...initialState,
        ...parsed,
        
        // FIXED: Validate critical fields with proper bounds
        stage: validateStage(parsed.stage),
        needs: validateNeeds(parsed.needs),
        bond: validateBond(parsed.bond),
        
        // FIXED: Ensure numeric fields are valid
        ageHours: validateNumber(parsed.ageHours, 0, 0),
        eggCrackLevel: validateNumber(parsed.eggCrackLevel, 0, 0, 100),
        lastInteraction: validateNumber(parsed.lastInteraction, Date.now(), 0),
        
        // FIXED: Ensure arrays exist (don't validate contents - too complex)
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        rewardHistory: Array.isArray(parsed.rewardHistory) 
          ? parsed.rewardHistory.slice(-REWARD_HISTORY_CONFIG.MAX_ENTRIES) 
          : [],
        obedienceHistory: Array.isArray(parsed.obedienceHistory)
          ? parsed.obedienceHistory.slice(-OBEDIENCE_HISTORY_CONFIG.MAX_ENTRIES)
          : [],
        interactionPatterns: Array.isArray(parsed.interactionPatterns)
          ? parsed.interactionPatterns.slice(-INTERACTION_PATTERN_CONFIG.MAX_ENTRIES)
          : [],
        
        // FIXED: Deep validation for learned behavior
        learnedBehavior: ensureLearnedBehavior(parsed),
        
        // FIXED: Ensure boolean fields
        tutorialSeen: parsed.tutorialSeen === true,
        overrideTime: parsed.overrideTime === true,
        
        // FIXED: Reset transient state to defaults (not persisted anyway)
        pointNotifications: [],
        currentAnimation: { primary: 'idle' },
        latestInteraction: null,
      };
    }
  } catch (e) {
    console.error('Failed to load saved state:', e);
    
    // FIXED: Attempt to clear corrupted data
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('Cleared corrupted save data');
    } catch (clearError) {
      console.error('Failed to clear corrupted data:', clearError);
    }
  }
  
  return initialState;
};

// =============================================
// Safe save function with error handling
// =============================================

/**
 * Safely saves state to localStorage with error handling.
 * Returns true if save was successful, false otherwise.
 */
const saveState = (state: GameState): boolean => {
  const { STORAGE_KEY } = PERSISTENCE_CONFIG;
  
  try {
    const persistentState = getPersistentState(state);
    const serialized = JSON.stringify(persistentState);
    localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (e) {
    if (e instanceof DOMException) {
      if (e.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded! Consider clearing old data.');
        // Could implement cleanup strategy here in the future
      } else if (e.name === 'SecurityError') {
        console.warn('Storage not available (private browsing?)');
      }
    } else {
      console.error('Failed to save game state:', e);
    }
    return false;
  }
};

// =============================================
// ACTIONS THAT TRIGGER BEHAVIOR EVALUATION
// =============================================

// FIXED: Define which actions should trigger behavior evaluation
const BEHAVIOR_TRIGGER_ACTIONS = new Set([
  'TICK', 'INTERACT', 'LLM_RESPONSE', 'EVOLVE', 'SET_NAME'
]);

// FIXED: Actions dispatched BY behavior evaluation (don't re-evaluate these)
const BEHAVIOR_RESULT_ACTIONS = new Set([
  'SHIFT_PERSONALITY', 'CREATE_MEMORY', 'UPDATE_COMMAND_PROFICIENCY',
  'LEARN_WORD', 'UPDATE_PREFERENCE', 'LEARN_PLAYER_FACT',
  'RECALCULATE_AGGREGATES', 'PRUNE_MEMORIES', 'MARK_MILESTONE_TRIGGERED',
  'ADD_MESSAGE'
]);


// =============================================
// CELEBRATION HELPERS
// =============================================

const createEvolutionCelebration = (stage: Stage): CelebrationData => {
  const config = EVOLUTION_CELEBRATIONS[stage];
  return {
    id: `evolution_${stage}_${Date.now()}`,
    type: stage === Stage.PUPPY ? 'first_word' : 'evolution',
    title: config.title,
    subtitle: config.subtitle,
    emoji: config.emoji,
    stage,
    unlocks: config.unlocks,
  };
};

const createTrustMilestoneCelebration = (milestone: number): CelebrationData => {
  const config = TRUST_MILESTONE_MESSAGES[milestone];
  return {
    id: `trust_${milestone}_${Date.now()}`,
    type: 'trust_milestone',
    title: config.title,
    subtitle: config.subtitle,
    emoji: config.emoji,
    value: milestone,
  };
};

const createCommandMasteryCelebration = (command: string): CelebrationData => {
  return {
    id: `mastery_${command}_${Date.now()}`,
    type: 'command_mastery',
    title: "Command Mastered!",
    subtitle: `Pyra now knows "${command}" perfectly!`,
    emoji: "🎓",
    value: 100,
    unlocks: [`"${command}" works every time!`],
  };
};

const createStreakCelebration = (days: number): CelebrationData => {
  const config = STREAK_MESSAGES[days];
  return {
    id: `streak_${days}_${Date.now()}`,
    type: 'streak_milestone',
    title: config.title,
    subtitle: config.subtitle,
    emoji: config.emoji,
    value: days,
  };
};

const checkTrustMilestone = (
  prevTrust: number, 
  newTrust: number, 
  celebrated: number[]
): number | null => {
  for (const milestone of CELEBRATION_CONFIG.TRUST_MILESTONES) {
    if (prevTrust < milestone && newTrust >= milestone && !celebrated.includes(milestone)) {
      return milestone;
    }
  }
  return null;
};

const checkStreakMilestone = (
  streak: number,
  celebrated: number[]
): number | null => {
  for (const milestone of CELEBRATION_CONFIG.STREAK_MILESTONES) {
    if (streak >= milestone && !celebrated.includes(milestone)) {
      return milestone;
    }
  }
  return null;
};

// =============================================
// KINDNESS REINFORCEMENT NARRATION
// =============================================

interface KindnessNarration {
  message: string;
  isEducational: boolean;
}

/**
 * Generates narrator messages to teach kindness lessons in real-time.
 * Only triggers for significant trust changes from conversation.
 */
const getKindnessNarration = (
  trustDelta: number,
  stage: Stage,
  currentTrust: number
): KindnessNarration | null => {
  // Skip for eggs (can't understand) or tiny changes
  if (stage === Stage.EGG) return null;
  if (Math.abs(trustDelta) < 2) return null;
  
  // Positive reinforcement (kind words)
  if (trustDelta >= 5) {
    const messages = [
      { message: "Pyra's eyes light up! Kind words make them feel safe. 💚", isEducational: true },
      { message: "Pyra chirps happily! Your kindness is building trust. 💚", isEducational: true },
      { message: "Pyra leans closer. Words like these mean everything. 💚", isEducational: true },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  if (trustDelta >= 3) {
    const messages = [
      { message: "Pyra seems comforted by your words.", isEducational: false },
      { message: "Pyra's tail wags a little faster.", isEducational: false },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Negative reinforcement (harsh words)
  if (trustDelta <= -5) {
    const messages = [
      { message: "Pyra flinches... They'll remember how that felt. 💔", isEducational: true },
      { message: "Pyra shrinks back. Harsh words leave marks on the heart. 💔", isEducational: true },
      { message: "Pyra looks away, hurt. Words have power. 💔", isEducational: true },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  if (trustDelta <= -3) {
    const messages = [
      { message: "Pyra seems unsettled by your tone...", isEducational: false },
      { message: "Pyra's eyes dim for a moment.", isEducational: false },
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Recovery narration (trust was low, now improving)
  if (currentTrust < 30 && trustDelta > 0) {
    return { 
      message: "Pyra is starting to feel safe again. Keep being gentle. 🌱", 
      isEducational: true 
    };
  }
  
  return null;
};

// =============================================
// DAILY SURPRISE SELECTION
// =============================================

/**
 * Selects a surprise weighted by personality affinity.
 * Returns null if conditions not met.
 */
const selectDailySurprise = (
  state: GameState,
  hoursSinceLastVisit: number
): DailySurprise | null => {
  const { MIN_HOURS_AWAY, COOLDOWN_HOURS, CHANCE_ON_RETURN } = DAILY_SURPRISE_CONFIG;
  
  // Check minimum time away
  if (hoursSinceLastVisit < MIN_HOURS_AWAY) return null;
  
  // Check cooldown
  const hoursSinceLastSurprise = (Date.now() - state.lastSurpriseTime) / (1000 * 60 * 60);
  if (hoursSinceLastSurprise < COOLDOWN_HOURS) return null;
  
  // Roll for surprise
  if (Math.random() > CHANCE_ON_RETURN) return null;
  
  // Filter eligible surprises by stage
  const stageOrder = [Stage.EGG, Stage.HATCHLING, Stage.PUPPY, Stage.JUVENILE, Stage.ADOLESCENT, Stage.ADULT];
  const currentStageIdx = stageOrder.indexOf(state.stage);
  
  const eligible = DAILY_SURPRISES.filter(s => {
    if (!s.minStage) return true;
    const minIdx = stageOrder.indexOf(s.minStage);
    return currentStageIdx >= minIdx;
  });
  
  if (eligible.length === 0) return null;
  
  // Weight by personality affinity
  const personality = state.learnedBehavior.personality;
  const weighted = eligible.map(surprise => {
    let weight = 10; // Base weight
    
    if (surprise.personalityBias) {
      for (const [dim, bias] of Object.entries(surprise.personalityBias)) {
        const personalityValue = personality[dim as keyof LearnedPersonality] || 0;
        // If bias is positive and personality matches direction, increase weight
        // e.g., bias: { energy: 30 } and personality.energy = 50 → bonus
        if ((bias > 0 && personalityValue > 0) || (bias < 0 && personalityValue < 0)) {
          weight += Math.abs(bias) * (Math.abs(personalityValue) / 100);
        }
      }
    }
    
    return { surprise, weight };
  });
  
  // Weighted random selection
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * totalWeight;
  
  for (const { surprise, weight } of weighted) {
    roll -= weight;
    if (roll <= 0) return surprise;
  }
  
  // Fallback to random
  return eligible[Math.floor(Math.random() * eligible.length)];
};

// =============================================
// GAME REDUCER
// =============================================

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {

    // ==================== TICK ====================
    case 'TICK': {
      const { deltaHours, timeOfDay, currentAnimation } = action.payload;
      const baseRates = DECAY_RATES[state.stage];

      // Apply emotion modifiers, then personality modifiers
      let rates = applyEmotionModifiers(baseRates, state.currentEmotion);
      rates = applyPersonalityDecayModifiers(rates, state.learnedBehavior.personality);

      // FIXED: Calculate hunger state and penalties
      // When hunger < 30%, the pet is fatigued:
      // - Activities cost 2x energy (inverse of 0.5 penalty)
      // - Rest recovery is halved (0.5x)
      const isHungry = state.needs.hunger < 30;
      const hungerEnergyPenalty = isHungry ? (1 / ENERGY_CONFIG.LOW_HUNGER_ENERGY_PENALTY) : 1.0;
      const hungerRestPenalty = isHungry ? ENERGY_CONFIG.LOW_HUNGER_ENERGY_PENALTY : 1.0;

      // Animation energy cost calculation
      let animationEnergyCost = 0;
      if (state.stage !== Stage.EGG && currentAnimation) {
        const baseCost = ENERGY_CONFIG.ANIMATION_COSTS[currentAnimation] ?? ENERGY_CONFIG.DEFAULT_COST;
        const stageMult = ENERGY_CONFIG.STAGE_ENERGY_MULTIPLIERS[state.stage] ?? 1.0;
        // FIXED: Apply hunger penalty - movement costs MORE when hungry
        animationEnergyCost = baseCost * stageMult * deltaHours * hungerEnergyPenalty;
      }

      // Hunger drain from energy expenditure (proportional to energy spent)
      const hungerFromEnergy = animationEnergyCost * ENERGY_CONFIG.HUNGER_DRAIN_PER_ENERGY_SPENT;

      const newNeeds: Needs = {
        hunger: Math.max(0, state.needs.hunger - (rates.hunger * deltaHours) - hungerFromEnergy),
        warmth: Math.max(0, state.needs.warmth - (rates.warmth * deltaHours)),
        attention: Math.max(0, state.needs.attention - (rates.attention * deltaHours)),
        // FIXED: Rest recovery penalized when hungry (can't rest well on empty stomach)
        rest: Math.min(100, Math.max(0, state.needs.rest - (rates.rest * deltaHours * hungerRestPenalty))),
        // Energy (play) reduced by base decay + animation cost (which includes hunger penalty)
        play: Math.max(0, state.needs.play - (rates.play * deltaHours) - animationEnergyCost),
        cleanliness: Math.max(0, state.needs.cleanliness - (rates.cleanliness * deltaHours)),
      };

      // Egg crack progress
      let newCrackLevel = state.eggCrackLevel;
      if (state.stage === Stage.EGG && state.needs.warmth > 80) {
        newCrackLevel += deltaHours * 6000;
      }

      // Trust decay with personality modifier
      let newTrust = state.bond.trust;
      let notifications = [...state.pointNotifications];

      let newRespect = state.bond.respect;
      if (state.stage !== Stage.EGG && state.stage !== Stage.HATCHLING) {
        const lastCommandTime = state.obedienceHistory.length > 0
          ? state.obedienceHistory[state.obedienceHistory.length - 1].timestamp
          : state.lastInteraction;
        const hoursSinceCommand = (Date.now() - lastCommandTime) / (1000 * 60 * 60);

        if (hoursSinceCommand > RESPECT_CONFIG.DECAY_THRESHOLD_HOURS && newRespect > 0) {
          const respectDecay = Math.min(
            RESPECT_CONFIG.DECAY_RATE_PER_HOUR * deltaHours,
            RESPECT_CONFIG.MAX_DECAY_PER_TICK
          );
          newRespect = Math.max(0, newRespect - respectDecay);
        }
      }

      // Clean up expired notifications
      const now = Date.now();
      notifications = notifications.filter(
        n => now - n.timestamp < POINT_NOTIFICATION_CONFIG.DISPLAY_DURATION_MS + 500
      );

      // Daily shift reset check
      let learnedBehavior = state.learnedBehavior;
      const dayMs = 24 * 60 * 60 * 1000;
      if (now - learnedBehavior.shiftTracking.lastDayReset > dayMs) {
        learnedBehavior = {
          ...learnedBehavior,
          shiftTracking: {
            ...learnedBehavior.shiftTracking,
            dailyShifts: {
              fearfulness: 0, attachment: 0, obedience: 0,
              energy: 0, trustDisposition: 0, temperament: 0,
            },
            lastDayReset: now,
          }
        };
      }

      return {
        ...state,
        ageHours: state.ageHours + deltaHours,
        needs: newNeeds,
        eggCrackLevel: Math.min(100, newCrackLevel),
        timeOfDay: state.overrideTime ? state.timeOfDay : timeOfDay,
        bond: { ...state.bond, trust: newTrust, respect: newRespect, history: state.bond.history + (deltaHours * 60) },
        pointNotifications: notifications,
        learnedBehavior,
      };
    }

    // ==================== INTERACT ====================
    case 'INTERACT': {
      const { type, value } = action.payload;
      const newNeeds = { ...state.needs };

      if (type === 'warm') newNeeds.warmth = Math.min(100, newNeeds.warmth + value);
      if (type === 'feed') newNeeds.hunger = Math.min(100, newNeeds.hunger + value);
      if (type === 'play') newNeeds.play = Math.min(100, newNeeds.play + value);
      if (type === 'clean') newNeeds.cleanliness = Math.min(100, newNeeds.cleanliness + value);
      if (type === 'pet') newNeeds.attention = Math.min(100, newNeeds.attention + value);

      const trustCalc = calculateTrustReward(
        type, state.needs, state.stage, state.learnedBehavior.personality
      );
      const newTrust = Math.min(100, Math.max(0, state.bond.trust + trustCalc.finalReward));

      const attentionBoost = type === 'pet' ? value * 0.3 : 0;
      const playBoost = type === 'play' ? value * 0.3 : 0;

      const notifications = [...state.pointNotifications];
      
      if (trustCalc.finalReward !== 0 && shouldShowNotification(notifications, 'trust', 800)) {
        notifications.push(createPointNotification('trust', trustCalc.finalReward, trustCalc.reason));
      }
      
      if (attentionBoost > 0 && shouldShowNotification(notifications, 'love', 800)) {
        notifications.push(createPointNotification('love', attentionBoost, 'Showed affection'));
      }
      
      if (playBoost > 0 && shouldShowNotification(notifications, 'energy', 800)) {
        notifications.push(createPointNotification('energy', playBoost, 'Had fun!'));
      }

      const interactionEntry = createRewardEntry(
        trustCalc.finalReward, attentionBoost, playBoost, 0, 'interaction', trustCalc.reason
      );
      const updatedRewardHistory = [...state.rewardHistory, interactionEntry]
        .slice(-REWARD_HISTORY_CONFIG.MAX_ENTRIES);

      const patternEntry: InteractionPatternEntry = {
        type,
        timeOfDay: state.timeOfDay,
        timestamp: Date.now(),
        emotion: state.currentEmotion,
        trustDelta: trustCalc.finalReward,
      };
      const newPatterns = [...state.interactionPatterns, patternEntry]
        .slice(-INTERACTION_PATTERN_CONFIG.MAX_ENTRIES);

      // NEW: Check for trust milestone celebration
      let activeCelebration = state.activeCelebration;
      let celebrationHistory = { ...state.celebrationHistory };
      
      // Only check if no celebration is currently active
      if (!activeCelebration) {
        const trustMilestone = checkTrustMilestone(
          state.bond.trust, 
          newTrust, 
          celebrationHistory.trustMilestones
        );
        
        if (trustMilestone) {
          activeCelebration = createTrustMilestoneCelebration(trustMilestone);
          celebrationHistory = {
            ...celebrationHistory,
            trustMilestones: [...celebrationHistory.trustMilestones, trustMilestone],
          };
        }
      }

      return {
        ...state,
        needs: newNeeds,
        bond: { ...state.bond, trust: newTrust },
        lastInteraction: Date.now(),
        latestInteraction: { type, id: Date.now() },
        pointNotifications: notifications,
        rewardHistory: updatedRewardHistory,
        interactionPatterns: newPatterns,
        activeCelebration,
        celebrationHistory,
      };
    }

    // ==================== LLM_RESPONSE ====================
    case 'LLM_RESPONSE': {
      const response = action.payload;
      let notifications = [...state.pointNotifications];
      let rewardHistory = [...state.rewardHistory];
      let obedienceHistory = [...state.obedienceHistory];
      let learnedBehavior = { ...state.learnedBehavior };
      let activeCelebration = state.activeCelebration;
      let celebrationHistory = { ...state.celebrationHistory };

      let newTrust = state.bond.trust;
      let newAttention = state.needs.attention;
      let newPlay = state.needs.play;
      let newRespect = state.bond.respect;

      let trustDelta = 0, loveDelta = 0, energyDelta = 0, respectDelta = 0;
      let rewardReason = 'Conversation';
      const prevTrust = state.bond.trust; // NEW: Track for milestone check

      // FIXED: Declare kindnessNarratorMessage at case block scope
      let kindnessNarratorMessage: ChatMessage | null = null;

      // Process stats_delta with personality modifiers
      if (response.stats_delta) {
        const trustMult = TRUST_CONFIG.STAGE_MULTIPLIERS[state.stage] ?? 1.0;
        const stageDeltaMult = STAGE_DELTA_MULTIPLIERS[state.stage] ?? { love: 1.0, energy: 1.0 };

        const trustDispMod = 1 + (learnedBehavior.personality.trustDisposition * 0.003);
        const clampedTrustMod = Math.max(0.5, Math.min(1.5, trustDispMod));

        trustDelta = response.stats_delta.trust * trustMult * clampedTrustMod;
        loveDelta = response.stats_delta.love * stageDeltaMult.love;
        energyDelta = response.stats_delta.energy * stageDeltaMult.energy;

        newTrust = Math.min(100, Math.max(0, newTrust + trustDelta));
        newAttention = Math.min(100, Math.max(0, newAttention + loveDelta));
        newPlay = Math.min(100, Math.max(0, newPlay + energyDelta));

        if (trustDelta > 0) rewardReason = 'Kind words';
        else if (trustDelta < 0) rewardReason = 'Harsh words';
        else if (loveDelta > 0) rewardReason = 'Showed affection';
        else if (energyDelta > 0) rewardReason = 'Got excited';

        if (trustDelta !== 0 && shouldShowNotification(notifications, 'trust', 500)) {
          notifications.push(createPointNotification('trust', Math.round(trustDelta * 100) / 100, rewardReason));
        }
        // FIXED: Add kindness reinforcement narrator messages
        // Only for significant trust changes from conversation (not commands)
        if (response.stats_delta && !response.obedience?.command_detected) {
          const kindnessNarration = getKindnessNarration(trustDelta, state.stage, state.bond.trust);
          if (kindnessNarration) {
            // Dispatch narrator message - will be added to messages in the return
            // We'll handle this in the final state update
          }
        }        
        if (loveDelta !== 0 && shouldShowNotification(notifications, 'love', 500)) {
          notifications.push(createPointNotification('love', Math.round(loveDelta * 100) / 100, loveDelta > 0 ? 'Felt loved' : 'Felt ignored'));
        }
        if (energyDelta !== 0 && shouldShowNotification(notifications, 'energy', 500)) {
          notifications.push(createPointNotification('energy', Math.round(energyDelta * 100) / 100, energyDelta > 0 ? 'Excited!' : 'Tired out'));
        }
        // FIXED: Add kindness reinforcement narrator message
        let kindnessNarratorMessage: ChatMessage | null = null;
        if (!response.obedience?.command_detected && Math.abs(trustDelta) >= 2) {
          const kindnessNarration = getKindnessNarration(trustDelta, state.stage, prevTrust);
          if (kindnessNarration) {
            kindnessNarratorMessage = {
              id: crypto.randomUUID(),
              role: 'narrator' as const,
              text: kindnessNarration.message,
              timestamp: Date.now() + 100, // Slightly after main response
            };
          }
        }        
      }

      // Process obedience with personality modifier
      if (response.obedience?.command_detected) {
        const { command_detected, result, reason } = response.obedience;
        const respectMult = RESPECT_CONFIG.STAGE_MULTIPLIERS[state.stage] ?? 1.0;

        const obedienceValue = learnedBehavior.personality.obedience;
        let obeyMod = 1.0;

        if (result === 'obeyed' || result === 'partial') {
          obeyMod = 1 + (Math.max(0, -obedienceValue) * 0.005);
        } else if (result === 'refused') {
          obeyMod = 1 + (Math.max(0, obedienceValue) * 0.005);
        }

        const clampedObeyMod = Math.max(0.5, Math.min(1.5, obeyMod));
        const baseRespectReward = OBEDIENCE_HISTORY_CONFIG.RESPECT_REWARDS[result] ?? 0;
        respectDelta = baseRespectReward * respectMult * clampedObeyMod;

        newRespect = Math.min(100, Math.max(0, newRespect + respectDelta));

        if (result === 'obeyed') rewardReason = `Obeyed '${command_detected}'`;
        else if (result === 'partial') rewardReason = `Tried '${command_detected}'`;
        else if (result === 'refused') rewardReason = reason || `Refused '${command_detected}'`;
        else rewardReason = `Ignored '${command_detected}'`;

        if (respectDelta !== 0 && shouldShowNotification(notifications, 'respect', 500)) {
          notifications.push(createPointNotification('respect', Math.round(respectDelta * 100) / 100, rewardReason));
        }

        const obedienceRecord: ObedienceRecord = { command: command_detected, result, timestamp: Date.now() };
        obedienceHistory = [...obedienceHistory, obedienceRecord].slice(-OBEDIENCE_HISTORY_CONFIG.MAX_ENTRIES);

        const praised = trustDelta > 2;
        const updatedProf = behaviorService.updateCommandProficiency(
          command_detected, result, praised, learnedBehavior.knowledge.commands
        );
        
        // NEW: Check for command mastery celebration
        const prevProf = learnedBehavior.knowledge.commands[command_detected]?.proficiency ?? 0;
        const newProf = updatedProf.proficiency;
        
        if (prevProf < CELEBRATION_CONFIG.COMMAND_MASTERY_THRESHOLD && 
            newProf >= CELEBRATION_CONFIG.COMMAND_MASTERY_THRESHOLD &&
            !celebrationHistory.commandMasteries.includes(command_detected) &&
            !activeCelebration) {
          activeCelebration = createCommandMasteryCelebration(command_detected);
          celebrationHistory = {
            ...celebrationHistory,
            commandMasteries: [...celebrationHistory.commandMasteries, command_detected],
          };
        }
        
        learnedBehavior = {
          ...learnedBehavior,
          knowledge: {
            ...learnedBehavior.knowledge,
            commands: { ...learnedBehavior.knowledge.commands, [command_detected]: updatedProf }
          }
        };
      }

      // Process learned_word from LLM response
      if (response.learned_word && state.stage !== Stage.EGG && state.stage !== Stage.HATCHLING) {
        const vocabCap = KNOWLEDGE_CONFIG.VOCABULARY.STAGE_CAPS[state.stage] ?? 0;
        const currentVocab = learnedBehavior.knowledge.vocabulary;

        if (currentVocab.length < vocabCap) {
          const wordExists = currentVocab.some(v => v.word.toLowerCase() === response.learned_word!.toLowerCase());
          if (!wordExists) {
            learnedBehavior = {
              ...learnedBehavior,
              knowledge: {
                ...learnedBehavior.knowledge,
                vocabulary: [
                  ...currentVocab,
                  { word: response.learned_word, source: 'player' as VocabularySource, sentiment: 'neutral' as VocabularySentiment, firstLearned: Date.now(), timesUsed: 1 }
                ]
              }
            };
          }
        }
      }

      // Process learned_fact from LLM response
      if (response.learned_fact) {
        const facts = learnedBehavior.knowledge.playerKnowledge.facts;
        const factExists = facts.some(f => f.toLowerCase() === response.learned_fact!.toLowerCase());

        if (facts.length < KNOWLEDGE_CONFIG.PLAYER_FACTS.MAX_FACTS && !factExists) {
          learnedBehavior = {
            ...learnedBehavior,
            knowledge: {
              ...learnedBehavior.knowledge,
              playerKnowledge: { ...learnedBehavior.knowledge.playerKnowledge, facts: [...facts, response.learned_fact] }
            }
          };
        }
      }

      // Process memory_reference
      if (response.memory_reference) {
        const searchTerm = response.memory_reference.toLowerCase().substring(0, 20);
        const memoryIdx = learnedBehavior.memories.findIndex(
          m => m.narrative.toLowerCase().includes(searchTerm)
        );
        
        if (memoryIdx >= 0) {
          const updatedMemories = [...learnedBehavior.memories];
          updatedMemories[memoryIdx] = {
            ...updatedMemories[memoryIdx],
            timesReferenced: updatedMemories[memoryIdx].timesReferenced + 1
          };
          
          learnedBehavior = {
            ...learnedBehavior,
            memories: updatedMemories
          };
        }
      }

      // Log to reward history
      if (trustDelta !== 0 || loveDelta !== 0 || energyDelta !== 0 || respectDelta !== 0) {
        const entry = createRewardEntry(trustDelta, loveDelta, energyDelta, respectDelta, response.obedience ? 'obedience' : 'llm', rewardReason);
        rewardHistory = [...rewardHistory, entry].slice(-REWARD_HISTORY_CONFIG.MAX_ENTRIES);
      }

      // NEW: Check for trust milestone (from conversation)
      if (!activeCelebration) {
        const trustMilestone = checkTrustMilestone(
          prevTrust, 
          newTrust, 
          celebrationHistory.trustMilestones
        );
        
        if (trustMilestone) {
          activeCelebration = createTrustMilestoneCelebration(trustMilestone);
          celebrationHistory = {
            ...celebrationHistory,
            trustMilestones: [...celebrationHistory.trustMilestones, trustMilestone],
          };
        }
      }

      return {
        ...state,
        currentEmotion: response.emotion,
        currentAnimation: response.animation,
        bond: { ...state.bond, trust: newTrust, respect: newRespect },
        needs: { ...state.needs, attention: newAttention, play: newPlay },
        pointNotifications: notifications,
        rewardHistory,
        obedienceHistory,
        learnedBehavior,
        activeCelebration,
        celebrationHistory,
        // FIXED: Append kindness narrator message if it exists
        messages: kindnessNarratorMessage 
          ? [...state.messages, kindnessNarratorMessage]
          : state.messages,        
      };
    }

    // ==================== CELEBRATION ACTIONS ====================
    case 'TRIGGER_CELEBRATION': {
      return {
        ...state,
        activeCelebration: action.payload,
      };
    }

    case 'DISMISS_CELEBRATION': {
      return {
        ...state,
        activeCelebration: null,
      };
    }

    case 'UPDATE_STREAK': {
      const now = Date.now();
      const hoursSinceCheckIn = (now - state.streak.lastCheckIn) / (1000 * 60 * 60);
      
      let newStreak = state.streak.current;
      let activeCelebration = state.activeCelebration;
      let celebrationHistory = { ...state.celebrationHistory };
      
      if (hoursSinceCheckIn >= CELEBRATION_CONFIG.STREAK_BREAK_HOURS) {
        // Streak broken
        newStreak = 1;
      } else if (hoursSinceCheckIn >= 20) {
        // Valid next-day return (20-48 hours)
        newStreak = state.streak.current + 1;
        
        // Check for streak milestone
        if (!activeCelebration) {
          const streakMilestone = checkStreakMilestone(newStreak, celebrationHistory.streakMilestones);
          if (streakMilestone) {
            activeCelebration = createStreakCelebration(streakMilestone);
            celebrationHistory = {
              ...celebrationHistory,
              streakMilestones: [...celebrationHistory.streakMilestones, streakMilestone],
            };
          }
        }
      }
      // If < 20 hours, same day - don't increment
      
      return {
        ...state,
        streak: {
          current: newStreak,
          longest: Math.max(state.streak.longest, newStreak),
          lastCheckIn: now,
        },
        activeCelebration,
        celebrationHistory,
      };
    }

    // ==================== EVOLVE ====================
    case 'EVOLVE': {
      const newStage = action.payload;
      const milestoneBonus = TRUST_CONFIG.EVOLUTION_BONUS[newStage] || 0;
      const notifications = [...state.pointNotifications];

      if (milestoneBonus > 0) {
        notifications.push(createPointNotification('milestone', milestoneBonus, `Evolved to ${newStage}!`));
      }

      // FIXED: Grant stage-appropriate vocabulary
      let learnedBehavior = { ...state.learnedBehavior };
      const autoWords = KNOWLEDGE_CONFIG.VOCABULARY.AUTO_WORDS[newStage] || [];
      const existingWords = new Set(learnedBehavior.knowledge.vocabulary.map(v => v.word.toLowerCase()));

      const newVocab = autoWords
        .filter(w => !existingWords.has(w.toLowerCase()))
        .map(word => ({
          word,
          source: 'auto' as VocabularySource,
          sentiment: 'neutral' as VocabularySentiment,
          firstLearned: Date.now(),
          timesUsed: 0,
        }));

      if (newVocab.length > 0) {
        learnedBehavior = {
          ...learnedBehavior,
          knowledge: {
            ...learnedBehavior.knowledge,
            vocabulary: [...learnedBehavior.knowledge.vocabulary, ...newVocab]
          }
        };
      }

      // NEW: Create celebration if not already shown
      let activeCelebration = state.activeCelebration;
      let celebrationHistory = { ...state.celebrationHistory };
      
      if (!celebrationHistory.evolutions.includes(newStage)) {
        activeCelebration = createEvolutionCelebration(newStage);
        celebrationHistory = {
          ...celebrationHistory,
          evolutions: [...celebrationHistory.evolutions, newStage],
        };
      }

      return {
        ...state,
        stage: newStage,
        needs: { ...INITIAL_NEEDS },
        currentAnimation: { primary: 'Reborn' },
        bond: { ...state.bond, trust: Math.min(100, state.bond.trust + milestoneBonus) },
        pointNotifications: notifications,
        learnedBehavior,
        activeCelebration,
        celebrationHistory,
      };
    }

    // ==================== SHIFT_PERSONALITY ====================
    case 'SHIFT_PERSONALITY': {
      const { dimension, amount, triggerId, reason } = action.payload;
      const personality = { ...state.learnedBehavior.personality };
      const shiftTracking = { ...state.learnedBehavior.shiftTracking };

      // Apply bounded shift
      const currentValue = personality[dimension];
      const newValue = Math.max(
        PERSONALITY_CONFIG.BOUNDS.MIN,
        Math.min(PERSONALITY_CONFIG.BOUNDS.MAX, currentValue + amount)
      );
      personality[dimension] = newValue;

      // Update tracking
      shiftTracking.lastShiftTime = { ...shiftTracking.lastShiftTime, [triggerId]: Date.now() };
      shiftTracking.dailyShifts = {
        ...shiftTracking.dailyShifts,
        [dimension]: (shiftTracking.dailyShifts[dimension] || 0) + Math.abs(amount)
      };

      // Update aggregates
      const aggregates = { ...state.learnedBehavior.aggregates };
      if (amount > 0) aggregates.totalPositiveExperiences++;
      else if (amount < 0) aggregates.totalNegativeExperiences++;

      aggregates.dominantTraits = behaviorService.computeDominantTraits(personality);
      aggregates.careGrade = behaviorService.calculateCareGrade(
        aggregates.totalPositiveExperiences, aggregates.totalNegativeExperiences
      );
      aggregates.lastCalculated = Date.now();

      // Notification for significant shifts
      const notifications = [...state.pointNotifications];
      if (Math.abs(amount) >= 3 && shouldShowNotification(notifications, 'personality', 2000)) {
        notifications.push(createPointNotification('personality', amount, reason));
      }

      return {
        ...state,
        learnedBehavior: { ...state.learnedBehavior, personality, shiftTracking, aggregates },
        pointNotifications: notifications,
      };
    }

    // ==================== CREATE_MEMORY ====================
    case 'CREATE_MEMORY': {
      const { templateId, category, narrative, personalityImpact, isMilestone, variables } = action.payload;

      const memory: SignificantMemory = {
        id: crypto.randomUUID(),
        templateId,
        category,
        narrative,
        timestamp: Date.now(),
        stageWhenFormed: state.stage,
        personalityImpact,
        isMilestone,
        timesReferenced: 0,
        variables,
      };

      // Add and prune memories
      let memories = [...state.learnedBehavior.memories, memory];
      memories = behaviorService.pruneMemories(memories);

      // Update aggregates
      const aggregates = { ...state.learnedBehavior.aggregates };
      const impactSum = Object.values(personalityImpact).reduce((s, v) => s + (v || 0), 0);
      if (impactSum > 0) aggregates.totalPositiveExperiences++;
      else if (impactSum < 0) aggregates.totalNegativeExperiences++;

      aggregates.careGrade = behaviorService.calculateCareGrade(
        aggregates.totalPositiveExperiences, aggregates.totalNegativeExperiences
      );

      // Mark milestone
      let shiftTracking = state.learnedBehavior.shiftTracking;
      if (isMilestone && !shiftTracking.milestonesTriggered.includes(templateId)) {
        shiftTracking = {
          ...shiftTracking,
          milestonesTriggered: [...shiftTracking.milestonesTriggered, templateId]
        };
      }

      // Notification
      const notifications = [...state.pointNotifications];
      if (shouldShowNotification(notifications, 'memory', 3000)) {
        notifications.push(createPointNotification('memory', 1, narrative));
      }

      return {
        ...state,
        learnedBehavior: { ...state.learnedBehavior, memories, aggregates, shiftTracking },
        pointNotifications: notifications,
      };
    }

    // ==================== UPDATE_COMMAND_PROFICIENCY ====================
    case 'UPDATE_COMMAND_PROFICIENCY': {
      const { command, result, praised } = action.payload;
      const updatedProf = behaviorService.updateCommandProficiency(
        command, result, praised, state.learnedBehavior.knowledge.commands
      );
      return {
        ...state,
        learnedBehavior: {
          ...state.learnedBehavior,
          knowledge: {
            ...state.learnedBehavior.knowledge,
            commands: { ...state.learnedBehavior.knowledge.commands, [command]: updatedProf }
          }
        }
      };
    }

    // ==================== LEARN_WORD ====================
    case 'LEARN_WORD': {
      const { word, sentiment, source } = action.payload;
      const vocabCap = KNOWLEDGE_CONFIG.VOCABULARY.STAGE_CAPS[state.stage] ?? 0;
      const vocab = state.learnedBehavior.knowledge.vocabulary;

      if (vocab.length >= vocabCap) return state;
      if (vocab.some(v => v.word.toLowerCase() === word.toLowerCase())) return state;

      return {
        ...state,
        learnedBehavior: {
          ...state.learnedBehavior,
          knowledge: {
            ...state.learnedBehavior.knowledge,
            vocabulary: [...vocab, { word, source, sentiment, firstLearned: Date.now(), timesUsed: 1 }]
          }
        }
      };
    }

    // ==================== UPDATE_PREFERENCE ====================
    case 'UPDATE_PREFERENCE': {
      const pref = action.payload;
      const prefs = state.learnedBehavior.knowledge.preferences;
      const isLove = pref.type === 'love';
      const list = isLove ? [...prefs.loves] : [...prefs.dislikes];
      const maxLen = isLove ? KNOWLEDGE_CONFIG.PREFERENCES.MAX_LOVES : KNOWLEDGE_CONFIG.PREFERENCES.MAX_DISLIKES;

      const existingIdx = list.findIndex(p => p.id === pref.id);
      if (existingIdx >= 0) list[existingIdx] = pref;
      else if (list.length < maxLen) list.push(pref);

      return {
        ...state,
        learnedBehavior: {
          ...state.learnedBehavior,
          knowledge: {
            ...state.learnedBehavior.knowledge,
            preferences: isLove ? { ...prefs, loves: list } : { ...prefs, dislikes: list }
          }
        }
      };
    }

    // ==================== LEARN_PLAYER_FACT ====================
    case 'LEARN_PLAYER_FACT': {
      const facts = state.learnedBehavior.knowledge.playerKnowledge.facts;
      if (facts.length >= KNOWLEDGE_CONFIG.PLAYER_FACTS.MAX_FACTS) return state;
      if (facts.some(f => f.toLowerCase() === action.payload.toLowerCase())) return state;

      return {
        ...state,
        learnedBehavior: {
          ...state.learnedBehavior,
          knowledge: {
            ...state.learnedBehavior.knowledge,
            playerKnowledge: { ...state.learnedBehavior.knowledge.playerKnowledge, facts: [...facts, action.payload] }
          }
        }
      };
    }

    // ==================== RECALCULATE_AGGREGATES ====================
    case 'RECALCULATE_AGGREGATES': {
      const agg = state.learnedBehavior.aggregates;
      return {
        ...state,
        learnedBehavior: {
          ...state.learnedBehavior,
          aggregates: {
            ...agg,
            dominantTraits: behaviorService.computeDominantTraits(state.learnedBehavior.personality),
            careGrade: behaviorService.calculateCareGrade(agg.totalPositiveExperiences, agg.totalNegativeExperiences),
            lastCalculated: Date.now(),
          }
        }
      };
    }

    // ==================== DAILY_SHIFT_RESET ====================
    case 'DAILY_SHIFT_RESET': {
      return {
        ...state,
        learnedBehavior: {
          ...state.learnedBehavior,
          shiftTracking: {
            ...state.learnedBehavior.shiftTracking,
            dailyShifts: { fearfulness: 0, attachment: 0, obedience: 0, energy: 0, trustDisposition: 0, temperament: 0 },
            lastDayReset: Date.now(),
          }
        }
      };
    }

    // ==================== ADD_INTERACTION_PATTERN ====================
    case 'ADD_INTERACTION_PATTERN': {
      return {
        ...state,
        interactionPatterns: [...state.interactionPatterns, action.payload].slice(-INTERACTION_PATTERN_CONFIG.MAX_ENTRIES)
      };
    }

    // ==================== PRUNE_MEMORIES ====================
    case 'PRUNE_MEMORIES': {
      return {
        ...state,
        learnedBehavior: { ...state.learnedBehavior, memories: behaviorService.pruneMemories(state.learnedBehavior.memories) }
      };
    }

    // ==================== MARK_MILESTONE_TRIGGERED ====================
    case 'MARK_MILESTONE_TRIGGERED': {
      const milestones = state.learnedBehavior.shiftTracking.milestonesTriggered;
      if (milestones.includes(action.payload)) return state;

      return {
        ...state,
        learnedBehavior: {
          ...state.learnedBehavior,
          shiftTracking: { ...state.learnedBehavior.shiftTracking, milestonesTriggered: [...milestones, action.payload] }
        }
      };
    }

    // ==================== EXISTING ACTIONS (unchanged) ====================
    case 'SET_NAME':
      return { ...state, name: action.payload };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };

    case 'RESET':
      return { 
        ...initialState, 
        seed: action.payload, 
        learnedBehavior: { ...INITIAL_LEARNED_BEHAVIOR },
        tutorialSeen: false  // FIXED: Reset tutorial on game reset
      };

    case 'SET_TIME':
      return { ...state, timeOfDay: action.payload, overrideTime: true };

    case 'ADD_POINT_NOTIFICATION':
      return { ...state, pointNotifications: [...state.pointNotifications, action.payload].slice(-POINT_NOTIFICATION_CONFIG.MAX_VISIBLE) };

    case 'REMOVE_POINT_NOTIFICATION':
      return { ...state, pointNotifications: state.pointNotifications.filter(n => n.id !== action.payload) };

    case 'CLEAR_POINT_NOTIFICATIONS':
      return { ...state, pointNotifications: [] };

    case 'ADD_REWARD_ENTRY':
      return { ...state, rewardHistory: [...state.rewardHistory, action.payload].slice(-REWARD_HISTORY_CONFIG.MAX_ENTRIES) };

    case 'CLEAR_REWARD_HISTORY':
      return { ...state, rewardHistory: [] };

    case 'ADD_OBEDIENCE_RECORD':
      return { ...state, obedienceHistory: [...state.obedienceHistory, action.payload].slice(-OBEDIENCE_HISTORY_CONFIG.MAX_ENTRIES) };

    case 'CLEAR_OBEDIENCE_HISTORY':
      return { ...state, obedienceHistory: [] };

    // ==================== MARK_TUTORIAL_SEEN ====================
    case 'MARK_TUTORIAL_SEEN':
      return { ...state, tutorialSeen: true };

    // FIXED: Add to gameReducer in useGame.ts (~line 750)
    case 'UPDATE_SURPRISE_TIME': {
      return {
        ...state,
        lastSurpriseTime: Date.now(),
      };
    }      

    default:
      return state;
  }
}

// =============================================
// HOOK EXPORT
// =============================================

export const useGame = () => {
  // FIXED: Use ref to track latest state for behavior evaluation
  const stateRef = useRef<GameState>(initialState);
  
  const [state, baseDispatch] = useReducer(gameReducer, initialState, loadSavedState);

  // FIXED: Persistence system refs
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedHashRef = useRef<string>('');
  const pendingSaveRef = useRef<boolean>(false);
  
  // Keep ref in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // FIXED: Wrapped dispatch that handles behavior evaluation
  const dispatch = useCallback((action: GameAction) => {
    // Capture state BEFORE dispatch using ref (always current)
    const prevState = stateRef.current;
    
    // Execute the action
    baseDispatch(action);
    
    // FIXED: Only evaluate behavior for trigger actions, not result actions
    if (BEHAVIOR_TRIGGER_ACTIONS.has(action.type) && !BEHAVIOR_RESULT_ACTIONS.has(action.type)) {
      // Schedule evaluation after state update (next tick)
      setTimeout(() => {
        const newState = stateRef.current;
        
        // Skip if state didn't change (shouldn't happen, but safety check)
        if (newState === prevState) return;
        
        // Run behavior evaluation
        const result = behaviorService.evaluateBehavior(prevState, action, newState);
        
        // Dispatch resulting actions
        for (const shift of result.personalityShifts) {
          if (!shift.blocked && shift.effectiveShift !== 0) {
            baseDispatch({
              type: 'SHIFT_PERSONALITY',
              payload: { dimension: shift.dimension, amount: shift.effectiveShift, triggerId: shift.triggerId, reason: shift.reason }
            });
          }
        }
        
        for (const memResult of result.memoriesCreated) {
          baseDispatch({
            type: 'CREATE_MEMORY',
            payload: {
              templateId: memResult.memory.templateId,
              category: memResult.memory.category,
              narrative: memResult.memory.narrative,
              personalityImpact: memResult.memory.personalityImpact,
              isMilestone: memResult.memory.isMilestone,
              variables: memResult.memory.variables,
            }
          });
          
          // Narrator message for memory
          baseDispatch({
            type: 'ADD_MESSAGE',
            payload: { id: crypto.randomUUID(), role: 'narrator', text: memResult.narratorMessage, timestamp: Date.now() }
          });
        }
      }, 0);
    }
  }, []);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Persist state
  // FIXED: Debounced auto-save effect
  useEffect(() => {
    // Clear any pending save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Mark that we have pending changes
    pendingSaveRef.current = true;
    
    // Schedule debounced save
    saveTimeoutRef.current = setTimeout(() => {
      // Generate hash to detect actual changes (simple length check is fast)
      const persistentState = getPersistentState(state);
      const hash = JSON.stringify(persistentState).length.toString();
      
      // Only save if state actually changed
      if (hash !== lastSavedHashRef.current) {
        if (saveState(state)) {
          lastSavedHashRef.current = hash;
          pendingSaveRef.current = false;
        }
      } else {
        pendingSaveRef.current = false;
      }
    }, PERSISTENCE_CONFIG.SAVE_DEBOUNCE_MS);
    
    // Cleanup timeout on unmount or state change
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state]);

  // Visibility change handler (save on page hide)
  // FIXED: Save immediately when user leaves page (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && pendingSaveRef.current) {
        // Clear pending debounce - we're saving now
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        
        // Immediate save using current state from ref
        if (saveState(stateRef.current)) {
          pendingSaveRef.current = false;
          lastSavedHashRef.current = JSON.stringify(
            getPersistentState(stateRef.current)
          ).length.toString();
        }
      }
    };
    
    // Also save on beforeunload for additional safety
    const handleBeforeUnload = () => {
      if (pendingSaveRef.current) {
        saveState(stateRef.current);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // Empty deps - uses refs for current state

  // Initial greeting with daily surprise support
  useEffect(() => {
    if (state.stage === Stage.EGG) return;
    
    const hoursSince = (Date.now() - state.lastInteraction) / (1000 * 60 * 60);
    
    // Check for daily surprise
    const surprise = selectDailySurprise(state, hoursSince);
    
    if (hoursSince > 48) {
      // Very long absence - sad return, no surprise
      dispatch({ 
        type: 'LLM_RESPONSE', 
        payload: { 
          speech: '', 
          narrative: 'Pyra looks up with dull eyes... but brightens seeing you!', 
          emotion: 'hurt', 
          animation: { primary: 'Idle_2', transition_to: 'idle' }, 
          vocalization: 'whimper' 
        } 
      });
    } else if (surprise) {
      // FIXED: Daily surprise greeting!
      dispatch({ 
        type: 'LLM_RESPONSE', 
        payload: { 
          speech: '', 
          narrative: surprise.message, 
          emotion: 'excited', 
          animation: { 
            primary: surprise.animation || 'idle', 
            transition_to: 'idle' 
          }, 
          vocalization: surprise.vocalization || 'chirp' 
        } 
      });
      
      // Play discovery sound
      audioService.playCelebration('discovery');
      
      // Update last surprise time (dispatch action needed)
      baseDispatch({ type: 'UPDATE_SURPRISE_TIME' });
      
      // Add narrator message for emphasis
      dispatch({ 
        type: 'ADD_MESSAGE', 
        payload: { 
          id: crypto.randomUUID(), 
          role: 'narrator', 
          text: `${surprise.emoji} ${surprise.message}`, 
          timestamp: Date.now() 
        } 
      });
    } else if (hoursSince > 24) {
      // Long absence but no surprise
      dispatch({ 
        type: 'LLM_RESPONSE', 
        payload: { 
          speech: '', 
          narrative: 'Pyra perks up! They missed you!', 
          emotion: 'excited', 
          animation: { primary: 'Run_Forward', transition_to: 'run to stop' }, 
          vocalization: 'chirp' 
        } 
      });
      audioService.playVocalization('chirp');
    } else {
      // Normal return
      dispatch({ 
        type: 'LLM_RESPONSE', 
        payload: { 
          speech: '', 
          narrative: 'Pyra runs to you!', 
          emotion: 'excited', 
          animation: { primary: 'Run_Forward', transition_to: 'run to stop' }, 
          vocalization: 'chirp' 
        } 
      });
      audioService.playVocalization('chirp');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Game tick
  useEffect(() => {
    const interval = setInterval(() => {
      const deltaHours = (GAME_TICK_RATE / 1000) * GAME_SPEED_MULTIPLIER / 3600;
      dispatch({ type: 'TICK', payload: { deltaHours, timeOfDay: getTimeOfDay(), currentAnimation: animController.currentAnimation || null } });
    }, GAME_TICK_RATE);
    return () => clearInterval(interval);
  }, [dispatch]);

  // NEW: Streak update on mount
  useEffect(() => {
    // Only update streak if not an egg
    if (state.stage !== Stage.EGG) {
      dispatch({ type: 'UPDATE_STREAK' });
    }
  }, []); // Only on mount

  // NEW: Dismiss celebration callback
  const dismissCelebration = useCallback(() => {
    dispatch({ type: 'DISMISS_CELEBRATION' });
  }, [dispatch]);

  // Evolution check
  useEffect(() => {
    const threshold = EVOLUTION_THRESHOLDS[state.stage];
    if (state.ageHours >= threshold) {
      if (state.stage === Stage.EGG && state.eggCrackLevel >= 100) {
        audioService.playCrack();
        dispatch({ type: 'EVOLVE', payload: Stage.HATCHLING });
      } else if (state.stage === Stage.HATCHLING) dispatch({ type: 'EVOLVE', payload: Stage.PUPPY });
      else if (state.stage === Stage.PUPPY) dispatch({ type: 'EVOLVE', payload: Stage.JUVENILE });
      else if (state.stage === Stage.JUVENILE) dispatch({ type: 'EVOLVE', payload: Stage.ADOLESCENT });
      else if (state.stage === Stage.ADOLESCENT) dispatch({ type: 'EVOLVE', payload: Stage.ADULT });
    }
  }, [state.ageHours, state.stage, state.eggCrackLevel, dispatch]);

  // Preference detection (periodic)
  useEffect(() => {
    const threshold = KNOWLEDGE_CONFIG.PREFERENCES.DETECTION_THRESHOLD;
    if (state.interactionPatterns.length < threshold) return;

    const detected = behaviorService.detectPreferences(state.interactionPatterns, state.learnedBehavior.knowledge.preferences);
    
    // Only dispatch if preferences changed
    const currentLoves = JSON.stringify(state.learnedBehavior.knowledge.preferences.loves);
    const currentDislikes = JSON.stringify(state.learnedBehavior.knowledge.preferences.dislikes);
    
    if (JSON.stringify(detected.loves) !== currentLoves) {
      detected.loves.forEach(p => baseDispatch({ type: 'UPDATE_PREFERENCE', payload: p }));
    }
    if (JSON.stringify(detected.dislikes) !== currentDislikes) {
      detected.dislikes.forEach(p => baseDispatch({ type: 'UPDATE_PREFERENCE', payload: p }));
    }
  }, [state.interactionPatterns.length]);

  // Interact handler
  const interact = useCallback((type: 'warm' | 'pet' | 'feed' | 'clean' | 'play') => {
    audioService.playInteraction(type);
    dispatch({ type: 'INTERACT', payload: { type, value: 20 } });

    if (stateRef.current.stage !== Stage.EGG) {
      let animName = 'idle', transitionTo: string | undefined, vocal = 'none', narrative = 'Pyra reacts.';
      const needs = stateRef.current.needs;
      
      switch (type) {
        case 'feed': vocal = 'babble'; animName = needs.hunger < 50 ? 'Roar_Forward' : 'Walk_Forward'; transitionTo = needs.hunger < 50 ? 'Walk_Forward' : 'idle'; narrative = needs.hunger < 50 ? 'Pyra snaps at the food eagerly.' : 'Pyra eats happily.'; break;
        case 'play': vocal = 'chirp'; animName = 'Run_Forward'; transitionTo = 'run to stop'; narrative = 'Pyra chases the toy!'; break;
        case 'pet': animName = 'Walk_Forward'; transitionTo = 'idle'; vocal = 'purr'; narrative = 'Pyra leans into your hand.'; break;
        case 'clean': animName = 'Retreat_Roar'; transitionTo = 'idle'; vocal = 'chirp'; narrative = 'Pyra shakes off the water.'; break;
        case 'warm': animName = 'idle'; vocal = 'purr'; narrative = 'Pyra looks cozy.'; break;
      }

      dispatch({ type: 'LLM_RESPONSE', payload: { speech: '', narrative, emotion: stateRef.current.currentEmotion as any, animation: { primary: animName, transition_to: transitionTo }, vocalization: vocal as any } });
      dispatch({ type: 'ADD_MESSAGE', payload: { id: crypto.randomUUID(), role: 'narrator', text: narrative, timestamp: Date.now() } });
    }
  }, [dispatch]);

  const setTimeOfDay = useCallback((time: TimeOfDay) => dispatch({ type: 'SET_TIME', payload: time }), [dispatch]);

  const processResponse = useCallback((response: LLMResponse) => {
    if (stateRef.current.stage !== Stage.EGG && response.vocalization !== 'none') {
      audioService.playVocalization(response.vocalization);
    }
    dispatch({ type: 'LLM_RESPONSE', payload: response });
    if (response.narrative) dispatch({ type: 'ADD_MESSAGE', payload: { id: crypto.randomUUID(), role: 'narrator', text: response.narrative, timestamp: Date.now() } });
    dispatch({ type: 'ADD_MESSAGE', payload: { id: crypto.randomUUID(), role: 'model', text: response.speech, timestamp: Date.now() + 50 } });
  }, [dispatch]);

  const sendMessage = useCallback(async (text: string) => {
    dispatch({ type: 'ADD_MESSAGE', payload: { id: crypto.randomUUID(), role: 'user', text, timestamp: Date.now() } });
    setIsProcessing(true);
    try {
      const response = await generateCatResponse(stateRef.current, text);
      processResponse(response);
    } catch (e) { console.error('LLM error:', e); }
    finally { setIsProcessing(false); }
  }, [dispatch, processResponse]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start();
      setIsRecording(true);
    } catch (err) { console.error('Mic error:', err); }
  }, []);

  const sendAudioMessage = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1];
        const mimeMatch = (reader.result as string).split(',')[0].match(/:(.*?);/);
        const audioInput: AudioInput = { data: base64, mimeType: mimeMatch?.[1] || 'audio/webm' };
        const response = await generateCatResponse(stateRef.current, audioInput);
        dispatch({ type: 'ADD_MESSAGE', payload: { id: crypto.randomUUID(), role: 'user', text: response.transcription ? `🎤 ${response.transcription}` : '🎤 [Audio]', timestamp: Date.now() } });
        processResponse(response);
      } catch (e) { console.error('Audio error:', e); }
      finally { setIsProcessing(false); }
    };
  }, [dispatch, processResponse]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => sendAudioMessage(new Blob(audioChunksRef.current, { type: 'audio/webm' }));
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  }, [isRecording, sendAudioMessage]);


  // UPDATE resetGame to use PERSISTENCE_CONFIG

  const resetGame = useCallback(() => {
    const { STORAGE_KEY, LEGACY_STORAGE_KEY } = PERSISTENCE_CONFIG;
    
    // Clear pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingSaveRef.current = false;
    lastSavedHashRef.current = '';
    
    // Clear storage
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear storage on reset:', e);
    }
    
    // Reset state
    baseDispatch({ type: 'RESET', payload: generateSeed() });
  }, []);

  return { state, dispatch, interact, sendMessage, sendAudioMessage, startRecording, stopRecording, resetGame, setTimeOfDay, isProcessing, isRecording, dismissCelebration };
};
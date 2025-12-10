import {
  GameState,
  GameAction,
  Stage,
  PersonalityDimension,
  LearnedPersonality,
  SignificantMemory,
  MemoryCategory,
  CommandProficiency,
  PreferenceEntry,
  DominantTrait,
  CareGrade,
  PersonalityShiftResult,
  MemoryCreationResult,
  BehaviorEvaluationResult,
  ObedienceResultType,
  InteractionPatternEntry,
  TriggerCooldownType,
} from '../types';

import {
  PERSONALITY_CONFIG,
  MEMORY_CONFIG,
  KNOWLEDGE_CONFIG,
  TRIGGER_COOLDOWNS,
  MEMORY_TEMPLATES,
  CARE_GRADE_THRESHOLDS,
  PERSONALITY_DESCRIPTORS,
  INTERACTION_PATTERN_CONFIG,
  MemoryTemplate,
} from '../constants';

// =============================================
// HELPER FUNCTIONS
// =============================================

const clamp = (val: number, min: number, max: number): number => 
  Math.max(min, Math.min(max, val));

const sumAbsoluteImpact = (impact: Partial<LearnedPersonality>): number =>
  Object.values(impact).reduce((sum, v) => sum + Math.abs(v || 0), 0);

// =============================================
// PERSONALITY SHIFT CALCULATION
// =============================================

/**
 * Calculate effective shift with stage plasticity and diminishing returns
 */
export const calculateEffectiveShift = (
  baseShift: number,
  dimension: PersonalityDimension,
  currentValue: number,
  stage: Stage
): number => {
  // Stage plasticity multiplier
  const stageMult = PERSONALITY_CONFIG.STAGE_PLASTICITY[stage] ?? 1.0;
  if (stageMult === 0) return 0;
  
  // Diminishing returns: harder to push extremes further
  const diminishingFactor = 1 - Math.abs(currentValue) / PERSONALITY_CONFIG.DIMINISHING_RETURNS_DIVISOR;
  
  const effective = baseShift * stageMult * Math.max(0.1, diminishingFactor);
  
  return Math.round(effective * 100) / 100;
};

/**
 * Check if a trigger is on cooldown
 */
export const isTriggerOnCooldown = (
  triggerId: string,
  cooldownType: TriggerCooldownType,
  shiftTracking: GameState['learnedBehavior']['shiftTracking']
): boolean => {
  // Milestones check separate array
  if (cooldownType === 'milestone') {
    return shiftTracking.milestonesTriggered.includes(triggerId);
  }
  
  const lastTime = shiftTracking.lastShiftTime[triggerId];
  if (!lastTime) return false;
  
  const cooldownMs = TRIGGER_COOLDOWNS[cooldownType];
  return (Date.now() - lastTime) < cooldownMs;
};

/**
 * Check if daily shift cap is reached for a dimension
 */
export const isDailyCapReached = (
  dimension: PersonalityDimension,
  additionalShift: number,
  shiftTracking: GameState['learnedBehavior']['shiftTracking']
): boolean => {
  const currentDaily = shiftTracking.dailyShifts[dimension] || 0;
  return Math.abs(currentDaily) + Math.abs(additionalShift) > PERSONALITY_CONFIG.DAILY_SHIFT_CAP;
};

/**
 * Apply a personality shift with all validation
 */
export const applyPersonalityShift = (
  state: GameState,
  dimension: PersonalityDimension,
  baseShift: number,
  triggerId: string,
  reason: string,
  cooldownType: TriggerCooldownType = 'interaction'
): PersonalityShiftResult => {
  const { learnedBehavior, stage } = state;
  const currentValue = learnedBehavior.personality[dimension];
  
  // Check cooldown
  if (isTriggerOnCooldown(triggerId, cooldownType, learnedBehavior.shiftTracking)) {
    return {
      dimension, baseShift, effectiveShift: 0, newValue: currentValue,
      triggerId, reason, blocked: true, blockReason: 'On cooldown'
    };
  }
  
  // Calculate effective shift
  const effectiveShift = calculateEffectiveShift(baseShift, dimension, currentValue, stage);
  
  // Check daily cap
  if (isDailyCapReached(dimension, effectiveShift, learnedBehavior.shiftTracking)) {
    return {
      dimension, baseShift, effectiveShift: 0, newValue: currentValue,
      triggerId, reason, blocked: true, blockReason: 'Daily cap reached'
    };
  }
  
  // Calculate new value
  const newValue = clamp(
    currentValue + effectiveShift,
    PERSONALITY_CONFIG.BOUNDS.MIN,
    PERSONALITY_CONFIG.BOUNDS.MAX
  );
  
  return {
    dimension, baseShift, effectiveShift, newValue, triggerId, reason
  };
};

// =============================================
// MEMORY CREATION
// =============================================

/**
 * Check if a memory can be created (deduplication)
 */
export const canCreateMemory = (
  templateId: string,
  memories: SignificantMemory[],
  isMilestone: boolean
): { allowed: boolean; reason?: string } => {
  // Milestone memories can only be created once
  const existing = memories.filter(m => m.templateId === templateId);
  
  if (isMilestone && existing.length > 0) {
    return { allowed: false, reason: 'Milestone already exists' };
  }
  
  // Non-milestone: check cooldown
  if (existing.length > 0) {
    const mostRecent = existing.reduce((a, b) => a.timestamp > b.timestamp ? a : b);
    const timeSince = Date.now() - mostRecent.timestamp;
    
    if (timeSince < MEMORY_CONFIG.DUPLICATE_COOLDOWN_MS) {
      return { allowed: false, reason: 'Duplicate cooldown active' };
    }
  }
  
  return { allowed: true };
};

/**
 * Create a memory from template
 */
export const createMemoryFromTemplate = (
  template: MemoryTemplate,
  state: GameState,
  variables?: Record<string, string>
): MemoryCreationResult => {
  const existingCount = state.learnedBehavior.memories.filter(
    m => m.templateId === template.id
  ).length;
  
  // Use repeat narrative if this is a recurring memory
  let narrative = template.narrative;
  if (existingCount > 0 && template.narrativeRepeat) {
    narrative = template.narrativeRepeat;
  }
  
  // Substitute variables in narrative
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      narrative = narrative.replace(`{${key}}`, value);
    });
  }
  
  const memory: SignificantMemory = {
    id: crypto.randomUUID(),
    templateId: template.id,
    category: template.category,
    narrative,
    timestamp: Date.now(),
    stageWhenFormed: state.stage,
    personalityImpact: { ...template.personalityImpact },
    isMilestone: template.isMilestone,
    timesReferenced: 0,
    variables,
  };
  
  // Calculate personality shifts from memory impact
  const personalityShifts: PersonalityShiftResult[] = [];
  
  for (const [dim, shift] of Object.entries(template.personalityImpact)) {
    if (shift && shift !== 0) {
      const result = applyPersonalityShift(
        state,
        dim as PersonalityDimension,
        shift,
        `memory_${template.id}`,
        `Memory: ${template.id}`,
        template.isMilestone ? 'milestone' : 'critical'
      );
      personalityShifts.push(result);
    }
  }
  
  const narratorMessage = `📝 ${memory.narrative}`;
  
  return { memory, personalityShifts, narratorMessage };
};

/**
 * Get dominant memories for LLM context
 */
export const getDominantMemories = (memories: SignificantMemory[]): SignificantMemory[] => {
  if (memories.length === 0) return [];
  
  // Score by |impact| × recency
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  const scored = memories.map(m => {
    const impactScore = sumAbsoluteImpact(m.personalityImpact);
    const ageInDays = (now - m.timestamp) / dayMs;
    const recencyWeight = Math.max(0.3, 1 - (ageInDays / (MEMORY_CONFIG.RECENCY_WEIGHT_DAYS * 2)));
    const referenceBonus = m.timesReferenced * 0.1;
    
    return {
      memory: m,
      score: impactScore * recencyWeight + referenceBonus + (m.isMilestone ? 5 : 0)
    };
  });
  
  scored.sort((a, b) => b.score - a.score);
  
  return scored.slice(0, MEMORY_CONFIG.DOMINANT_MEMORY_COUNT).map(s => s.memory);
};

/**
 * Prune memories when at capacity
 */
export const pruneMemories = (memories: SignificantMemory[]): SignificantMemory[] => {
  if (memories.length <= MEMORY_CONFIG.MAX_MEMORIES) return memories;
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const weekAgo = now - (7 * dayMs);
  
  // Never delete milestones
  const milestones = memories.filter(m => m.isMilestone);
  const nonMilestones = memories.filter(m => !m.isMilestone);
  
  // Score non-milestones for deletion (lower = delete first)
  const scored = nonMilestones.map(m => {
    const impactScore = sumAbsoluteImpact(m.personalityImpact);
    const isRecent = m.timestamp > weekAgo ? 10 : 0;
    const referenceBonus = m.timesReferenced * 2;
    const isHighImpact = impactScore >= MEMORY_CONFIG.HIGH_IMPACT_THRESHOLD ? 10 : 0;
    
    return {
      memory: m,
      score: impactScore + isRecent + referenceBonus + isHighImpact
    };
  });
  
  scored.sort((a, b) => a.score - b.score); // Lowest first (delete these)
  
  const spaceNeeded = memories.length - MEMORY_CONFIG.MAX_MEMORIES;
  const toKeep = scored.slice(spaceNeeded).map(s => s.memory);
  
  return [...milestones, ...toKeep];
};

// =============================================
// COMMAND PROFICIENCY
// =============================================

/**
 * Update command proficiency based on obedience result
 */
export const updateCommandProficiency = (
  command: string,
  result: ObedienceResultType,
  praised: boolean,
  existing: Record<string, CommandProficiency>
): CommandProficiency => {
  const now = Date.now();
  const cfg = KNOWLEDGE_CONFIG.COMMAND_PROFICIENCY;
  
  let prof = existing[command];
  
  if (!prof) {
    // First time seeing this command
    prof = {
      command,
      proficiency: cfg.FIRST_DETECTION,
      timesDetected: 1,
      timesObeyed: 0,
      timesRefused: 0,
      lastUsed: now,
      firstLearned: now,
    };
  } else {
    prof = { ...prof, timesDetected: prof.timesDetected + 1, lastUsed: now };
  }
  
  // Apply proficiency change based on result
  switch (result) {
    case 'obeyed':
      prof.timesObeyed++;
      prof.proficiency += praised ? cfg.OBEYED_PRAISED : cfg.OBEYED;
      break;
    case 'partial':
      prof.proficiency += cfg.PARTIAL;
      break;
    case 'refused':
      prof.timesRefused++;
      // Refused gives small gain but caps at 60 (can't master by refusing)
      prof.proficiency = Math.min(prof.proficiency + cfg.REFUSED, cfg.REFUSED_CAP);
      break;
    case 'ignored':
      // No change - didn't understand
      break;
  }
  
  prof.proficiency = clamp(prof.proficiency, 0, 100);
  
  return prof;
};

/**
 * Decay command proficiency for unused commands
 */
export const decayCommandProficiency = (
  commands: Record<string, CommandProficiency>
): Record<string, CommandProficiency> => {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const cfg = KNOWLEDGE_CONFIG.COMMAND_PROFICIENCY;
  
  const result: Record<string, CommandProficiency> = {};
  
  for (const [cmd, prof] of Object.entries(commands)) {
    const weeksSinceUse = Math.floor((now - prof.lastUsed) / weekMs);
    
    if (weeksSinceUse > 0) {
      const decay = weeksSinceUse * cfg.DECAY_PER_WEEK;
      const floor = prof.proficiency >= cfg.MASTERY_THRESHOLD 
        ? cfg.MASTERY_THRESHOLD 
        : cfg.LEARNED_FLOOR;
      
      result[cmd] = {
        ...prof,
        proficiency: Math.max(floor, prof.proficiency - decay)
      };
    } else {
      result[cmd] = prof;
    }
  }
  
  return result;
};

// =============================================
// PREFERENCE DETECTION
// =============================================

/**
 * Analyze interaction patterns to detect preferences
 */
export const detectPreferences = (
  patterns: InteractionPatternEntry[],
  existingPreferences: { loves: PreferenceEntry[]; dislikes: PreferenceEntry[] }
): { loves: PreferenceEntry[]; dislikes: PreferenceEntry[] } => {
  const cfg = KNOWLEDGE_CONFIG.PREFERENCES;
  const now = Date.now();
  
  // Group patterns by type + timeOfDay
  const groups: Record<string, InteractionPatternEntry[]> = {};
  
  patterns.slice(-cfg.ROLLING_WINDOW).forEach(p => {
    const key = `${p.timeOfDay}_${p.type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  
  const newLoves: PreferenceEntry[] = [...existingPreferences.loves];
  const newDislikes: PreferenceEntry[] = [...existingPreferences.dislikes];
  
  for (const [key, entries] of Object.entries(groups)) {
    if (entries.length < cfg.DETECTION_THRESHOLD) continue;
    
    const [timeOfDay, interactionType] = key.split('_');
    const avgTrustDelta = entries.reduce((s, e) => s + e.trustDelta, 0) / entries.length;
    const avgEmotion = entries[entries.length - 1].emotion; // Most recent
    
    const description = `${timeOfDay} ${interactionType}`;
    
    // Check if this should be a love
    if (avgTrustDelta >= cfg.MIN_TRUST_DELTA_FOR_LOVE) {
      const existingIdx = newLoves.findIndex(p => p.description === description);
      
      if (existingIdx >= 0) {
        newLoves[existingIdx] = {
          ...newLoves[existingIdx],
          strength: newLoves[existingIdx].strength + 1,
          timesReinforced: newLoves[existingIdx].timesReinforced + 1,
          lastReinforced: now,
        };
      } else if (newLoves.length < cfg.MAX_LOVES) {
        newLoves.push({
          id: crypto.randomUUID(),
          type: 'love',
          description,
          strength: entries.length,
          timesReinforced: 1,
          lastReinforced: now,
          context: { timeOfDay: timeOfDay as any, interactionType, emotion: avgEmotion }
        });
      }
    }
    
    // Check if this should be a dislike
    if (avgTrustDelta <= cfg.MAX_TRUST_DELTA_FOR_DISLIKE) {
      const existingIdx = newDislikes.findIndex(p => p.description === description);
      
      if (existingIdx >= 0) {
        newDislikes[existingIdx] = {
          ...newDislikes[existingIdx],
          strength: newDislikes[existingIdx].strength + 1,
          timesReinforced: newDislikes[existingIdx].timesReinforced + 1,
          lastReinforced: now,
        };
      } else if (newDislikes.length < cfg.MAX_DISLIKES) {
        newDislikes.push({
          id: crypto.randomUUID(),
          type: 'dislike',
          description,
          strength: entries.length,
          timesReinforced: 1,
          lastReinforced: now,
          context: { timeOfDay: timeOfDay as any, interactionType, emotion: avgEmotion }
        });
      }
    }
  }
  
  // Sort by strength, keep only max
  newLoves.sort((a, b) => b.strength - a.strength);
  newDislikes.sort((a, b) => b.strength - a.strength);
  
  return {
    loves: newLoves.slice(0, cfg.MAX_LOVES),
    dislikes: newDislikes.slice(0, cfg.MAX_DISLIKES),
  };
};

// =============================================
// DOMINANT TRAITS & CARE GRADE
// =============================================

/**
 * Compute dominant traits from personality dimensions
 */
export const computeDominantTraits = (personality: LearnedPersonality): DominantTrait[] => {
  const traits: { trait: DominantTrait; strength: number }[] = [];
  const threshold = PERSONALITY_CONFIG.NOTABLE_THRESHOLD;
  
  const dimensionToTraits: Record<PersonalityDimension, { negative: DominantTrait; positive: DominantTrait }> = {
    fearfulness: { negative: 'confident', positive: 'fearful' },
    attachment: { negative: 'independent', positive: 'clingy' },
    obedience: { negative: 'rebellious', positive: 'eager-to-please' },
    energy: { negative: 'calm', positive: 'hyperactive' },
    trustDisposition: { negative: 'suspicious', positive: 'trusting' },
    temperament: { negative: 'impatient', positive: 'patient' },
  };
  
  for (const [dim, value] of Object.entries(personality) as [PersonalityDimension, number][]) {
    if (Math.abs(value) >= threshold) {
      const mapping = dimensionToTraits[dim];
      const trait = value < 0 ? mapping.negative : mapping.positive;
      traits.push({ trait, strength: Math.abs(value) });
    }
  }
  
  // Sort by strength, return top 3
  traits.sort((a, b) => b.strength - a.strength);
  return traits.slice(0, 3).map(t => t.trait);
};

/**
 * Calculate care grade from experience ratio
 */
export const calculateCareGrade = (
  positiveExperiences: number,
  negativeExperiences: number
): CareGrade => {
  if (negativeExperiences === 0) {
    return positiveExperiences >= 5 ? 'S' : 'A';
  }
  
  const ratio = positiveExperiences / negativeExperiences;
  
  for (const { grade, ratio: threshold } of CARE_GRADE_THRESHOLDS) {
    if (ratio >= threshold) return grade;
  }
  
  return 'F';
};

// =============================================
// TRIGGER EVALUATION
// =============================================

interface TriggerContext {
  prevState: GameState;
  action: GameAction;
  newState: GameState;
}

type TriggerCondition = (ctx: TriggerContext) => boolean;

interface PersonalityTriggerDef {
  id: string;
  dimension: PersonalityDimension;
  shift: number;
  cooldownType: TriggerCooldownType;
  condition: TriggerCondition;
  reason: string;
}

interface MemoryTriggerDef {
  templateId: string;
  condition: TriggerCondition;
  variables?: (ctx: TriggerContext) => Record<string, string>;
}

// =============================================
// PERSONALITY TRIGGERS
// =============================================

const PERSONALITY_TRIGGERS: PersonalityTriggerDef[] = [
  // === FEARFULNESS ===
  {
    id: 'neglected_while_scared',
    dimension: 'fearfulness',
    shift: 3,
    cooldownType: 'critical',
    condition: ({ prevState, action }) =>
      prevState.currentEmotion === 'scared' &&
      action.type === 'TICK' &&
      (Date.now() - prevState.lastInteraction) > 5 * 60 * 1000,
    reason: 'Left alone while scared',
  },
  {
    id: 'comforted_while_scared',
    dimension: 'fearfulness',
    shift: -3,
    cooldownType: 'interaction',
    condition: ({ prevState, action }) =>
      prevState.currentEmotion === 'scared' &&
      action.type === 'INTERACT' &&
      (action.payload.type === 'pet' || action.payload.type === 'warm'),
    reason: 'Comforted when afraid',
  },
  {
    id: 'explored_curiously',
    dimension: 'fearfulness',
    shift: -2,
    cooldownType: 'interaction',
    condition: ({ prevState, action }) =>
      prevState.currentEmotion === 'curious' &&
      action.type === 'INTERACT' &&
      action.payload.type === 'play',
    reason: 'Explored with curiosity',
  },
  
  // === ATTACHMENT ===
  {
    id: 'rescued_from_critical',
    dimension: 'attachment',
    shift: 3,
    cooldownType: 'critical',
    condition: ({ prevState, action, newState }) =>
      action.type === 'INTERACT' &&
      Object.values(prevState.needs).some(n => n < 10) &&
      Object.values(newState.needs).every(n => n > 30),
    reason: 'Rescued from critical need',
  },
  {
    id: 'survived_alone',
    dimension: 'attachment',
    shift: -1,
    cooldownType: 'time_based',
    condition: ({ prevState, action }) =>
      action.type === 'TICK' &&
      (Date.now() - prevState.lastInteraction) > 2 * 60 * 60 * 1000 &&
      Object.values(prevState.needs).every(n => n > 50),
    reason: 'Survived alone comfortably',
  },
  
  // === OBEDIENCE ===
  {
    id: 'praised_after_obeying',
    dimension: 'obedience',
    shift: 2,
    cooldownType: 'interaction',
    condition: ({ action }) =>
      action.type === 'LLM_RESPONSE' &&
      action.payload.obedience?.result === 'obeyed' &&
      (action.payload.stats_delta?.trust ?? 0) > 2,
    reason: 'Praised after obeying',
  },
  {
    id: 'ignored_when_obeying',
    dimension: 'obedience',
    shift: -2,
    cooldownType: 'interaction',
    condition: ({ action }) =>
      action.type === 'LLM_RESPONSE' &&
      action.payload.obedience?.result === 'obeyed' &&
      (action.payload.stats_delta?.trust ?? 0) <= 0,
    reason: 'Ignored when obeying',
  },
  {
    id: 'punished_after_refusal',
    dimension: 'obedience',
    shift: -3,
    cooldownType: 'interaction',
    condition: ({ action }) =>
      action.type === 'LLM_RESPONSE' &&
      action.payload.obedience?.result === 'refused' &&
      (action.payload.stats_delta?.trust ?? 0) < -3,
    reason: 'Punished harshly after refusal',
  },
  
  // === ENERGY ===
  {
    id: 'frequent_play',
    dimension: 'energy',
    shift: 1,
    cooldownType: 'time_based',
    condition: ({ action, prevState }) => {
      if (action.type !== 'INTERACT' || action.payload.type !== 'play') return false;
      const recentPlays = prevState.rewardHistory.filter(
        r => r.source === 'interaction' && r.reason.toLowerCase().includes('play') &&
        Date.now() - r.timestamp < 2 * 60 * 60 * 1000
      );
      return recentPlays.length >= 3;
    },
    reason: 'Frequent play sessions',
  },
  {
    id: 'exhaustion',
    dimension: 'energy',
    shift: -2,
    cooldownType: 'critical',
    condition: ({ newState }) => newState.needs.play <= 0,
    reason: 'Pushed to exhaustion',
  },
  
  // === TRUST DISPOSITION ===
  {
    id: 'needs_consistently_met',
    dimension: 'trustDisposition',
    shift: 1,
    cooldownType: 'time_based',
    condition: ({ action, prevState }) =>
      action.type === 'TICK' &&
      Object.values(prevState.needs).every(n => n > 30) &&
      (Date.now() - prevState.lastInteraction) < 60 * 60 * 1000,
    reason: 'Needs consistently met',
  },
  {
    id: 'betrayed_high_trust',
    dimension: 'trustDisposition',
    shift: -4,
    cooldownType: 'critical',
    condition: ({ action, prevState }) =>
      action.type === 'LLM_RESPONSE' &&
      prevState.bond.trust > 60 &&
      (action.payload.stats_delta?.trust ?? 0) < -5,
    reason: 'Betrayed when trust was high',
  },
  
  // === TEMPERAMENT ===
  {
    id: 'waited_and_rewarded',
    dimension: 'temperament',
    shift: 2,
    cooldownType: 'interaction',
    condition: ({ prevState, action }) =>
      action.type === 'INTERACT' &&
      prevState.currentEmotion !== 'demanding' &&
      Object.values(prevState.needs).some(n => n < 40),
    reason: 'Waited patiently and was rewarded',
  },
  {
    id: 'demands_immediately_fulfilled',
    dimension: 'temperament',
    shift: -1,
    cooldownType: 'interaction',
    condition: ({ prevState, action }) =>
      action.type === 'INTERACT' &&
      prevState.currentEmotion === 'demanding',
    reason: 'Demands immediately fulfilled',
  },
];

// =============================================
// MEMORY TRIGGERS
// =============================================

const MEMORY_TRIGGERS: MemoryTriggerDef[] = [
  // TRAUMA
  {
    templateId: 'STARVED',
    condition: ({ prevState, newState }) =>
      prevState.needs.hunger > 0 && newState.needs.hunger <= 0,
  },
  {
    templateId: 'FROZEN',
    condition: ({ prevState, newState }) =>
      prevState.needs.warmth > 0 && newState.needs.warmth <= 0,
  },
  {
    templateId: 'EXHAUSTED',
    condition: ({ prevState, newState }) =>
      (prevState.needs.play > 0 && newState.needs.play <= 0) ||
      (prevState.needs.rest > 0 && newState.needs.rest <= 0),
  },
  {
    templateId: 'ABANDONED',
    condition: ({ prevState, action }) =>
      action.type === 'TICK' &&
      (Date.now() - prevState.lastInteraction) > 48 * 60 * 60 * 1000,
  },
  {
    templateId: 'BETRAYED',
    condition: ({ prevState, action }) =>
      action.type === 'LLM_RESPONSE' &&
      prevState.bond.trust > 50 &&
      (action.payload.stats_delta?.trust ?? 0) < -8,
  },
  
  // JOY
  {
    templateId: 'RESCUED',
    condition: ({ prevState, action, newState }) =>
      action.type === 'INTERACT' &&
      Object.values(prevState.needs).some(n => n < 10) &&
      Object.values(newState.needs).some(n => n > 80),
  },
  {
    templateId: 'COMFORTED',
    condition: ({ prevState, action }) =>
      action.type === 'INTERACT' &&
      action.payload.type === 'pet' &&
      prevState.currentEmotion === 'scared',
  },
  {
    templateId: 'FIRST_PLAY',
    condition: ({ action, prevState }) =>
      action.type === 'INTERACT' &&
      action.payload.type === 'play' &&
      prevState.stage !== Stage.EGG &&
      !prevState.learnedBehavior.memories.some(m => m.templateId === 'FIRST_PLAY'),
  },
  {
    templateId: 'LOVED',
    condition: ({ newState, prevState }) =>
      prevState.bond.trust < 75 && newState.bond.trust >= 75,
  },
  
  // ACHIEVEMENT
  {
    templateId: 'EVOLVED_HATCHLING',
    condition: ({ action }) =>
      action.type === 'EVOLVE' && action.payload === Stage.HATCHLING,
  },
  {
    templateId: 'EVOLVED_PUPPY',
    condition: ({ action }) =>
      action.type === 'EVOLVE' && action.payload === Stage.PUPPY,
  },
  {
    templateId: 'EVOLVED_JUVENILE',
    condition: ({ action }) =>
      action.type === 'EVOLVE' && action.payload === Stage.JUVENILE,
  },
  {
    templateId: 'EVOLVED_ADOLESCENT',
    condition: ({ action }) =>
      action.type === 'EVOLVE' && action.payload === Stage.ADOLESCENT,
  },
  {
    templateId: 'EVOLVED_ADULT',
    condition: ({ action }) =>
      action.type === 'EVOLVE' && action.payload === Stage.ADULT,
  },
  {
    templateId: 'NAMED',
    condition: ({ action }) =>
      action.type === 'SET_NAME',
    variables: ({ action }) => ({ name: action.type === 'SET_NAME' ? action.payload : '' }),
  },
  {
    templateId: 'TRUSTED',
    condition: ({ prevState, newState }) =>
      prevState.bond.trust < 50 && newState.bond.trust >= 50,
  },
  
  // BONDING
  {
    templateId: 'FIRST_WORD',
    condition: ({ action, prevState }) =>
      action.type === 'ADD_MESSAGE' &&
      action.payload.role === 'user' &&
      prevState.messages.filter(m => m.role === 'user').length === 0,
  },
];

// =============================================
// MAIN EVALUATION FUNCTION
// =============================================

/**
 * Evaluate state changes and return behavior updates
 */

/**
 * Evaluate state changes and return behavior updates.
 * 
 * NOTE: This function focuses on TRIGGER-BASED personality shifts and memory creation.
 * LLM-specific learning (commands, vocabulary, facts) is handled directly in the 
 * reducer's LLM_RESPONSE case to avoid duplication.
 */
export const evaluateBehavior = (
  prevState: GameState,
  action: GameAction,
  newState: GameState
): BehaviorEvaluationResult => {
  const ctx: TriggerContext = { prevState, action, newState };
  
  const result: BehaviorEvaluationResult = {
    personalityShifts: [],
    memoriesCreated: [],
    commandUpdates: [],      // Populated by reducer, not here
    vocabularyLearned: [],   // Populated by reducer, not here
    preferencesUpdated: [],  // Populated by periodic check in useGame
    factsLearned: [],        // Populated by reducer, not here
  };
  
  // Skip evaluation for EGG stage - no personality development yet
  if (newState.stage === Stage.EGG) return result;
  
  // =========================================
  // 1. Evaluate personality shift triggers
  // =========================================
  for (const trigger of PERSONALITY_TRIGGERS) {
    try {
      if (trigger.condition(ctx)) {
        const shift = applyPersonalityShift(
          newState,
          trigger.dimension,
          trigger.shift,
          trigger.id,
          trigger.reason,
          trigger.cooldownType
        );
        
        if (!shift.blocked) {
          result.personalityShifts.push(shift);
        }
      }
    } catch (err) {
      // FIXED: Gracefully handle trigger evaluation errors
      console.warn(`Trigger evaluation failed for ${trigger.id}:`, err);
    }
  }
  
  // =========================================
  // 2. Evaluate memory creation triggers
  // =========================================
  for (const trigger of MEMORY_TRIGGERS) {
    try {
      if (trigger.condition(ctx)) {
        const template = MEMORY_TEMPLATES[trigger.templateId];
        if (!template) {
          console.warn(`Memory template not found: ${trigger.templateId}`);
          continue;
        }
        
        const canCreate = canCreateMemory(
          trigger.templateId,
          newState.learnedBehavior.memories,
          template.isMilestone
        );
        
        if (canCreate.allowed) {
          const variables = trigger.variables?.(ctx);
          const memoryResult = createMemoryFromTemplate(template, newState, variables);
          result.memoriesCreated.push(memoryResult);
          
          // Memory personality shifts are added to the result
          // These will be dispatched by the caller
          result.personalityShifts.push(...memoryResult.personalityShifts);
        }
      }
    } catch (err) {
      // FIXED: Gracefully handle memory trigger errors
      console.warn(`Memory trigger evaluation failed for ${trigger.templateId}:`, err);
    }
  }
  
  // =========================================
  // REMOVED: Section 3 (LLM response specifics)
  // 
  // Previously this section processed:
  // - Command proficiency updates
  // - Vocabulary learning  
  // - Fact learning
  //
  // This was DEAD CODE because:
  // 1. The reducer's LLM_RESPONSE case already handles these directly
  // 2. The dispatch wrapper in useGame.ts never reads these return values
  // 3. Having it here caused duplicate processing attempts
  //
  // LLM-specific learning stays in the reducer for:
  // - Immediate state updates (no setTimeout delay)
  // - Direct access to response.learned_word, response.learned_fact
  // - Cleaner separation of concerns
  // =========================================
  
  return result;
};

// =============================================
// COMPLIANCE MODIFIER FROM PERSONALITY
// =============================================

/**
 * Calculate compliance modifier based on personality
 */
export const getPersonalityComplianceModifier = (
  personality: LearnedPersonality,
  command?: string,
  commandProficiency?: number
): number => {
  const mods = PERSONALITY_CONFIG.COMPLIANCE_MODIFIERS;
  
  let modifier = 0;
  
  // Obedience dimension
  modifier += personality.obedience * mods.obedience.perPoint;
  
  // Fearfulness reduces compliance (hesitation)
  modifier += personality.fearfulness * mods.fearfulness.perPoint;
  
  // Trust disposition increases compliance
  modifier += personality.trustDisposition * mods.trustDisposition.perPoint;
  
  // Command-specific proficiency bonus
  if (commandProficiency !== undefined) {
    modifier += (commandProficiency / 100) * KNOWLEDGE_CONFIG.COMMAND_PROFICIENCY.COMPLIANCE_BONUS_PER_POINT;
  }
  
  return modifier;
};

// =============================================
// PERSONALITY DESCRIPTION FOR PROMPTS
// =============================================

/**
 * Format personality dimension for LLM prompt
 */
export const formatPersonalityForPrompt = (personality: LearnedPersonality): string => {
  const lines: string[] = [];
  const threshold = PERSONALITY_CONFIG.NOTABLE_THRESHOLD;
  
  for (const dim of PERSONALITY_CONFIG.DIMENSIONS) {
    const value = personality[dim];
    const desc = PERSONALITY_DESCRIPTORS[dim];
    
    if (Math.abs(value) < 20) continue; // Skip balanced dimensions
    
    let intensity: string;
    let label: string;
    let description: string;
    
    if (value <= -60) {
      intensity = 'Very';
      label = desc.negativeLabel;
      description = desc.negative;
    } else if (value <= -threshold) {
      intensity = '';
      label = desc.negativeLabel;
      description = desc.negative;
    } else if (value >= 60) {
      intensity = 'Very';
      label = desc.positiveLabel;
      description = desc.positive;
    } else {
      intensity = '';
      label = desc.positiveLabel;
      description = desc.positive;
    }
    
    lines.push(`• ${intensity} ${label} (${value > 0 ? '+' : ''}${value}): ${description}`);
  }
  
  if (lines.length === 0) {
    return 'Your personality is mostly balanced - no extreme traits yet.';
  }
  
  return lines.join('\n');
};

/**
 * Format memories for LLM prompt
 */
export const formatMemoriesForPrompt = (memories: SignificantMemory[]): string => {
  const dominant = getDominantMemories(memories);
  
  if (dominant.length === 0) {
    return 'No significant memories yet - your story is just beginning.';
  }
  
  return dominant.map(m => `• ${m.narrative}`).join('\n');
};

/**
 * Format preferences for LLM prompt
 */
export const formatPreferencesForPrompt = (
  loves: PreferenceEntry[],
  dislikes: PreferenceEntry[]
): string => {
  const lovesStr = loves.length > 0 
    ? loves.map(p => p.description).join(', ')
    : 'Still discovering...';
  
  const dislikesStr = dislikes.length > 0
    ? dislikes.map(p => p.description).join(', ')
    : 'Nothing yet';
  
  return `Loves: ${lovesStr}\nDislikes: ${dislikesStr}`;
};

// =============================================
// SINGLETON EXPORT
// =============================================

export const behaviorService = {
  // Shift calculation
  calculateEffectiveShift,
  applyPersonalityShift,
  isTriggerOnCooldown,
  isDailyCapReached,
  
  // Memory management
  canCreateMemory,
  createMemoryFromTemplate,
  getDominantMemories,
  pruneMemories,
  
  // Knowledge
  updateCommandProficiency,
  decayCommandProficiency,
  detectPreferences,
  
  // Aggregates
  computeDominantTraits,
  calculateCareGrade,
  
  // Evaluation
  evaluateBehavior,
  
  // Compliance
  getPersonalityComplianceModifier,
  
  // Formatting
  formatPersonalityForPrompt,
  formatMemoriesForPrompt,
  formatPreferencesForPrompt,
};
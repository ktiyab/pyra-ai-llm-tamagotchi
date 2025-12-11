import React from 'react';

// =============================================
// ENUMS
// =============================================

export enum Stage {
  EGG = 'egg',
  HATCHLING = 'hatchling',
  PUPPY = 'puppy',
  JUVENILE = 'juvenile',
  ADOLESCENT = 'adolescent',
  ADULT = 'adult'
}

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

// =============================================
// CREATURE TRAITS & APPEARANCE (Innate/Seed)
// =============================================

export interface Traits {
  curiosity: number;
  boldness: number;
  affection: number;
  mischief: number;
  patience: number;
}

export interface Appearance {
  baseHue: number;
  saturation: number;
  lightness: number;
  eyeGlow: number;
  scalePattern: 'solid' | 'spotted' | 'striped';
  size: 'runt' | 'normal' | 'large';
}

export interface Seed {
  id: string;
  created: number;
  traits: Traits;
  appearance: Appearance;
  latent: {
    talent: string;
    fear: string;
    favorite: string;
  };
  egg: {
    baseHue: number;
    glowHue: number;
    pattern: string;
  };
}

// =============================================
// NEEDS & BOND
// =============================================

export interface Needs {
  hunger: number;
  warmth: number;
  attention: number;
  rest: number;
  play: number;
  cleanliness: number;
}

export interface Bond {
  trust: number;
  respect: number;
  history: number;
}

// =============================================
// CHAT & ANIMATION
// =============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'narrator';
  text: string;
  timestamp: number;
}

export interface AnimationDirective {
  primary: string;
  transition_to?: string | null;
  intensity?: number;
  delay_ms?: number;
}

export interface StatsDelta {
  trust: number;
  love: number;
  energy: number;
}

// =============================================
// POINT NOTIFICATION SYSTEM
// =============================================

export type PointType = 'trust' | 'respect' | 'love' | 'energy' | 'milestone' | 'personality' | 'memory';

export interface PointNotification {
  id: string;
  type: PointType;
  value: number;
  label: string;
  reason?: string;
  timestamp: number;
  color: string;
}

// =============================================
// REWARD HISTORY SYSTEM
// =============================================

export interface RewardHistoryEntry {
  timestamp: number;
  trust: number;
  love: number;
  energy: number;
  respect: number;
  source: 'interaction' | 'llm' | 'obedience' | 'decay';
  reason: string;
}

export type TrendDirection = 'rising' | 'stable' | 'falling';

export interface StatTrend {
  total: number;
  direction: TrendDirection;
  recentAvg: number;
}

export interface StatTrends {
  trust: StatTrend;
  love: StatTrend;
  energy: StatTrend;
  respect: StatTrend;
}

// =============================================
// OBEDIENCE SYSTEM
// =============================================

export type ObedienceResultType = 'obeyed' | 'partial' | 'refused' | 'ignored';

export interface ObedienceRecord {
  command: string;
  result: ObedienceResultType;
  timestamp: number;
}

export interface ObedienceResult {
  command_detected: string | null;
  result: ObedienceResultType;
  reason?: string;
}

// =============================================
// LLM RESPONSE
// =============================================

export interface LLMResponse {
  speech: string;
  transcription?: string;
  narrative: string;
  emotion: 'content' | 'curious' | 'excited' | 'scared' | 'proud' | 'hurt' | 'demanding' | 'tired' | 'sick' | 'neutral';
  animation: AnimationDirective;
  vocalization: 'chirp' | 'purr' | 'whimper' | 'growl' | 'roar' | 'none';
  stats_delta?: StatsDelta;
  obedience?: ObedienceResult;
  // ADDED: Learned Behavior System extensions
  learned_word?: string;
  learned_fact?: string;
  memory_reference?: string;
}

// =============================================
// LEARNED BEHAVIOR SYSTEM - PERSONALITY
// =============================================

/** Six personality dimensions, each ranging from -100 to +100 */
export type PersonalityDimension = 
  | 'fearfulness'      // -100 confident ↔ +100 fearful
  | 'attachment'       // -100 independent ↔ +100 clingy
  | 'obedience'        // -100 rebellious ↔ +100 eager-to-please
  | 'energy'           // -100 calm/lazy ↔ +100 hyperactive
  | 'trustDisposition' // -100 suspicious ↔ +100 trusting
  | 'temperament';     // -100 impatient ↔ +100 patient

export interface LearnedPersonality {
  fearfulness: number;
  attachment: number;
  obedience: number;
  energy: number;
  trustDisposition: number;
  temperament: number;
}

/** Dominant trait descriptors computed from personality dimensions */
export type DominantTrait = 
  | 'confident' | 'fearful' | 'anxious'
  | 'independent' | 'clingy' | 'aloof'
  | 'rebellious' | 'eager-to-please' | 'defiant'
  | 'calm' | 'hyperactive' | 'lazy'
  | 'trusting' | 'suspicious' | 'wary'
  | 'patient' | 'impatient' | 'demanding';

// =============================================
// LEARNED BEHAVIOR SYSTEM - MEMORIES
// =============================================

export type MemoryCategory = 'trauma' | 'joy' | 'achievement' | 'bonding' | 'learning';

export interface SignificantMemory {
  id: string;
  templateId: string;
  category: MemoryCategory;
  narrative: string;
  timestamp: number;
  stageWhenFormed: Stage;
  personalityImpact: Partial<LearnedPersonality>;
  isMilestone: boolean;
  timesReferenced: number;
  variables?: Record<string, string>;
}

// =============================================
// LEARNED BEHAVIOR SYSTEM - KNOWLEDGE
// =============================================

export interface CommandProficiency {
  command: string;
  proficiency: number;        // 0-100
  timesDetected: number;
  timesObeyed: number;
  timesRefused: number;
  lastUsed: number;
  firstLearned: number;
}

export type VocabularySentiment = 'positive' | 'neutral' | 'negative';
export type VocabularySource = 'auto' | 'player';

export interface VocabularyEntry {
  word: string;
  source: VocabularySource;
  sentiment: VocabularySentiment;
  firstLearned: number;
  timesUsed: number;
}

export type PreferenceType = 'love' | 'dislike';

export interface PreferenceEntry {
  id: string;
  type: PreferenceType;
  description: string;       // "morning play", "bath time"
  strength: number;          // Higher = stronger preference
  timesReinforced: number;
  lastReinforced: number;
  context?: {
    timeOfDay?: TimeOfDay;
    interactionType?: string;
    emotion?: string;
  };
}

export type PlayStyle = 'consistent' | 'sporadic' | 'intense' | 'unknown';

export interface PlayerKnowledge {
  name?: string;
  nickname?: string;
  facts: string[];
  timezone?: string;
  playStyle: PlayStyle;
}

export interface Knowledge {
  commands: Record<string, CommandProficiency>;
  vocabulary: VocabularyEntry[];
  preferences: {
    loves: PreferenceEntry[];
    dislikes: PreferenceEntry[];
  };
  playerKnowledge: PlayerKnowledge;
}

// =============================================
// LEARNED BEHAVIOR SYSTEM - TRACKING
// =============================================

export type TriggerCooldownType = 'interaction' | 'time_based' | 'milestone' | 'critical';

export interface ShiftTracking {
  lastShiftTime: Record<string, number>;   // triggerId -> timestamp
  dailyShifts: Record<PersonalityDimension, number>;
  lastDayReset: number;
  milestonesTriggered: string[];           // Milestone IDs that can only fire once
}

export type CareGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface BehaviorAggregates {
  totalPositiveExperiences: number;
  totalNegativeExperiences: number;
  dominantTraits: DominantTrait[];
  careGrade: CareGrade;
  lastCalculated: number;
}

// =============================================
// LEARNED BEHAVIOR SYSTEM - MAIN CONTAINER
// =============================================

export interface LearnedBehavior {
  personality: LearnedPersonality;
  memories: SignificantMemory[];
  knowledge: Knowledge;
  aggregates: BehaviorAggregates;
  shiftTracking: ShiftTracking;
}

// =============================================
// INTERACTION PATTERN TRACKING (for preferences)
// =============================================

export interface InteractionPatternEntry {
  type: string;
  timeOfDay: TimeOfDay;
  timestamp: number;
  emotion: string;
  trustDelta: number;
}

// =============================================
// BEHAVIOR SERVICE TYPES
// =============================================

export interface PersonalityShiftResult {
  dimension: PersonalityDimension;
  baseShift: number;
  effectiveShift: number;
  newValue: number;
  triggerId: string;
  reason: string;
  blocked?: boolean;
  blockReason?: string;
}

export interface MemoryCreationResult {
  memory: SignificantMemory;
  personalityShifts: PersonalityShiftResult[];
  narratorMessage: string;
}

export interface BehaviorEvaluationResult {
  personalityShifts: PersonalityShiftResult[];
  memoriesCreated: MemoryCreationResult[];
  commandUpdates: { command: string; newProficiency: number }[];
  vocabularyLearned: string[];
  preferencesUpdated: PreferenceEntry[];
  factsLearned: string[];
}

// =============================================
// GAME STATE (Extended)
// =============================================

export interface GameState {
  seed: Seed;
  name: string | null;
  stage: Stage;
  ageHours: number;
  needs: Needs;
  bond: Bond;
  messages: ChatMessage[];
  eggCrackLevel: number;
  lastInteraction: number;
  timeOfDay: TimeOfDay;
  overrideTime: boolean;
  
  currentEmotion: string;
  currentAnimation: AnimationDirective | null;
  latestInteraction: { type: string; id: number } | null;

  pointNotifications: PointNotification[];
  rewardHistory: RewardHistoryEntry[];
  obedienceHistory: ObedienceRecord[];
  
  // Learned Behavior System
  learnedBehavior: LearnedBehavior;
  interactionPatterns: InteractionPatternEntry[];
  
  // FIXED: Added tutorial tracking
  tutorialSeen: boolean;

  // NEW: Celebration system
  activeCelebration: CelebrationData | null;
  celebrationHistory: CelebrationTracking;
  streak: StreakData;  
  
  // FIXED: Add daily surprise tracking
  lastSurpriseTime: number;
  
}

// =============================================
// GAME CONTEXT
// =============================================

export interface GameContextType {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  interact: (type: 'warm' | 'pet' | 'feed' | 'clean' | 'play') => void;
  sendMessage: (text: string) => Promise<void>;
  sendAudioMessage: (audioBlob: Blob) => Promise<void>;
  resetGame: () => void;
  setTimeOfDay: (time: TimeOfDay) => void;
  isProcessing: boolean;
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  dismissCelebration: () => void; // NEW
}

// =============================================
// GAME ACTIONS (Extended)
// =============================================

export type GameAction =
  // Existing actions
  | { type: 'TICK'; payload: { deltaHours: number; timeOfDay: TimeOfDay; currentAnimation: string | null } }
  | { type: 'INTERACT'; payload: { type: string; value: number } }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'EVOLVE'; payload: Stage }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'RESET'; payload: Seed }
  | { type: 'LLM_RESPONSE'; payload: LLMResponse }
  | { type: 'SET_TIME'; payload: TimeOfDay }
  | { type: 'ADD_POINT_NOTIFICATION'; payload: PointNotification }
  | { type: 'REMOVE_POINT_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_POINT_NOTIFICATIONS' }
  | { type: 'ADD_REWARD_ENTRY'; payload: RewardHistoryEntry }
  | { type: 'CLEAR_REWARD_HISTORY' }
  | { type: 'ADD_OBEDIENCE_RECORD'; payload: ObedienceRecord }
  | { type: 'CLEAR_OBEDIENCE_HISTORY' }
  // Learned Behavior System actions
  | { type: 'SHIFT_PERSONALITY'; payload: {
      dimension: PersonalityDimension;
      amount: number;
      triggerId: string;
      reason: string;
    }}
  | { type: 'CREATE_MEMORY'; payload: {
      templateId: string;
      category: MemoryCategory;
      narrative: string;
      personalityImpact: Partial<LearnedPersonality>;
      isMilestone: boolean;
      variables?: Record<string, string>;
    }}
  | { type: 'UPDATE_COMMAND_PROFICIENCY'; payload: {
      command: string;
      result: ObedienceResultType;
      praised: boolean;
    }}
  | { type: 'LEARN_WORD'; payload: {
      word: string;
      sentiment: VocabularySentiment;
      source: VocabularySource;
    }}
  | { type: 'UPDATE_PREFERENCE'; payload: PreferenceEntry }
  | { type: 'LEARN_PLAYER_FACT'; payload: string }
  | { type: 'RECALCULATE_AGGREGATES' }
  | { type: 'DAILY_SHIFT_RESET' }
  | { type: 'ADD_INTERACTION_PATTERN'; payload: InteractionPatternEntry }
  | { type: 'PRUNE_MEMORIES' }
  | { type: 'MARK_MILESTONE_TRIGGERED'; payload: string }
  // FIXED: Added tutorial action
  | { type: 'MARK_TUTORIAL_SEEN' }
  // NEW: Celebration actions
  | { type: 'TRIGGER_CELEBRATION'; payload: CelebrationData }
  | { type: 'DISMISS_CELEBRATION' }
  // FIXED: Add to GameAction type in types.ts
  | { type: 'UPDATE_SURPRISE_TIME' }  
  | { type: 'UPDATE_STREAK' };
// =============================================
// CELEBRATION SYSTEM
// =============================================

export type CelebrationType = 
  | 'evolution' 
  | 'first_word' 
  | 'command_mastery' 
  | 'trust_milestone' 
  | 'streak_milestone'
  | 'care_grade_up';

export interface CelebrationData {
  id: string;
  type: CelebrationType;
  title: string;
  subtitle: string;
  emoji: string;
  stage?: Stage;
  unlocks?: string[];
  value?: number;
}

export interface StreakData {
  current: number;
  longest: number;
  lastCheckIn: number;
}

export interface CelebrationTracking {
  evolutions: Stage[];
  trustMilestones: number[];
  commandMasteries: string[];
  streakMilestones: number[];
  careGrades: CareGrade[];
}
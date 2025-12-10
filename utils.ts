import { 
  Seed, 
  GameState, 
  Stage, 
  ChatMessage,
  RewardHistoryEntry,
  ObedienceRecord,
  StatTrends,
  TrendDirection,
  LearnedPersonality,
  SignificantMemory,
  CommandProficiency,
  PreferenceEntry,
  VocabularyEntry,
} from './types';

import {
  REWARD_HISTORY_CONFIG,
  IMMEDIATE_CONTEXT_CONFIG,
  PERSONALITY_CONFIG,
  KNOWLEDGE_CONFIG,
  PERSONALITY_DESCRIPTORS,
} from './constants';

// FIXED: Import behavior service formatters
import {
  formatPersonalityForPrompt,
  formatMemoriesForPrompt,
  formatPreferencesForPrompt,
  getPersonalityComplianceModifier,
  getDominantMemories,
} from './services/behaviorService';

// =============================================
// RANDOM HELPERS
// =============================================

export const randomChoice = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getMagicalHue = (): number => {
  const bands = [
    { min: 0, max: 20, weight: 1.0 },
    { min: 20, max: 45, weight: 0.8 },
    { min: 45, max: 70, weight: 1.0 },
    { min: 150, max: 200, weight: 1.0 },
    { min: 200, max: 260, weight: 1.0 },
    { min: 260, max: 290, weight: 1.0 },
    { min: 290, max: 330, weight: 0.8 },
    { min: 330, max: 360, weight: 0.9 },
  ];
  
  const totalWeight = bands.reduce((sum, b) => sum + b.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const band of bands) {
    if (random < band.weight) {
      return band.min + Math.random() * (band.max - band.min);
    }
    random -= band.weight;
  }
  return 0;
};

// =============================================
// SEED GENERATION
// =============================================

export const generateSeed = (): Seed => {
  return {
    id: crypto.randomUUID(),
    created: Date.now(),
    traits: {
      curiosity: Math.random(),
      boldness: Math.random(),
      affection: Math.random(),
      mischief: Math.random(),
      patience: Math.random()
    },
    appearance: {
      baseHue: getMagicalHue(),
      saturation: 55 + Math.random() * 40,
      lightness: 45 + Math.random() * 25,
      eyeGlow: Math.random() * 100,
      scalePattern: randomChoice(['solid', 'spotted', 'striped']),
      size: randomChoice(['runt', 'normal', 'large'])
    },
    latent: {
      talent: randomChoice(['hunting', 'puzzle', 'memory', 'empathy', 'speed']),
      fear: randomChoice(['dark', 'loud', 'alone', 'heights', 'water']),
      favorite: randomChoice(['warmth', 'play', 'stories', 'music', 'meat'])
    },
    egg: {
      baseHue: Math.random() * 360,
      glowHue: Math.random() * 360,
      pattern: randomChoice(['solid', 'speckled', 'swirl', 'cracked'])
    }
  };
};

// =============================================
// ENHANCED COMPLIANCE CONTEXT (with personality)
// =============================================

const getComplianceContext = (state: GameState): string => {
  const { stage, needs, bond, timeOfDay, learnedBehavior } = state;
  const personality = learnedBehavior.personality;
  const commands = learnedBehavior.knowledge.commands;
  
  let compliance = 50;
  let reasons: string[] = [];

  // Base compliance from stage
  switch (stage) {
    case Stage.EGG: 
      return "IMPOSSIBLE. You are an egg. You cannot hear or act.";
    case Stage.HATCHLING:
      compliance = 10;
      reasons.push("Too young to understand words, responds only to tone");
      break;
    case Stage.PUPPY:
      compliance = 70;
      reasons.push("Eager to please but easily distracted");
      break;
    case Stage.JUVENILE:
      compliance = 85;
      reasons.push("Learns quickly, wants to help");
      break;
    case Stage.ADOLESCENT:
      compliance = 30 + (bond.respect / 2);
      reasons.push("Rebellious phase - challenges authority");
      break;
    case Stage.ADULT:
      compliance = 95;
      reasons.push("Loyal partner");
      break;
  }

  // FIXED: Apply personality modifier to compliance
  const personalityMod = getPersonalityComplianceModifier(personality);
  const personalityBonus = Math.round(personalityMod * 100);
  compliance += personalityBonus;
  
  if (personalityBonus > 10) {
    reasons.push(`Eager personality (+${personalityBonus}%)`);
  } else if (personalityBonus < -10) {
    reasons.push(`Rebellious personality (${personalityBonus}%)`);
  }

  // Need-based modifiers
  if (needs.hunger < 30) {
    compliance -= 40;
    reasons.push("Too hungry to focus");
  }
  if (needs.rest < 20) {
    compliance -= 30;
    reasons.push("Exhausted");
  }
  if (needs.play < 20) {
    compliance -= 20;
    reasons.push("Bored/Frustrated");
  }

  // Time-based modifier
  if (timeOfDay === 'night' && needs.rest < 50) {
    compliance -= 20;
    reasons.push("Night + tired = sleepy");
  }

  // Trust/Respect bonus
  compliance += Math.round(bond.trust / 10);
  compliance += Math.round(bond.respect / 15);

  // Clamp final value
  compliance = Math.min(100, Math.max(0, compliance));

  // FIXED: Format command proficiencies for context
  const commandList = Object.entries(commands)
    .filter(([_, prof]) => prof.proficiency > 20)
    .map(([cmd, prof]) => {
      const level = prof.proficiency >= 80 ? 'Mastered' : prof.proficiency >= 50 ? 'Learned' : 'Learning';
      return `${cmd} (${level}: ${prof.proficiency}%)`;
    });

  const commandContext = commandList.length > 0 
    ? `Known commands: ${commandList.join(', ')}`
    : 'No commands learned yet.';

  return `
- Obedience Chance: ${compliance.toFixed(0)}%
- State: ${reasons.join('. ')}.
- ${commandContext}
- If command fails: Act distracted (Puppy), Defiant (Adolescent), or Confused.
- Command proficiency affects success: Higher proficiency = more confident execution.
`;
};

// =============================================
// IMMEDIATE CONTEXT (Last 2-3 messages only)
// =============================================

const formatImmediateContext = (messages: ChatMessage[]): string => {
  if (messages.length === 0) return "No recent conversation.";
  
  const { MAX_MESSAGES, INCLUDE_NARRATOR, MAX_MESSAGE_LENGTH } = IMMEDIATE_CONTEXT_CONFIG;
  
  let recent = messages;
  if (!INCLUDE_NARRATOR) {
    recent = messages.filter(m => m.role !== 'narrator');
  }
  recent = recent.slice(-MAX_MESSAGES);
  
  if (recent.length === 0) return "No recent conversation.";
  
  return recent.map(msg => {
    const roleLabel = msg.role === 'user' ? 'Human' : (msg.role === 'model' ? 'Pyra' : 'Narrator');
    let text = msg.text;
    
    if (text.length > MAX_MESSAGE_LENGTH) {
      text = text.substring(0, MAX_MESSAGE_LENGTH) + '...';
    }
    
    return `${roleLabel}: ${text}`;
  }).join('\n');
};

// =============================================
// STAT TRENDS CALCULATION
// =============================================

const calculateTrend = (values: number[]): { total: number; direction: TrendDirection; avg: number } => {
  if (values.length === 0) {
    return { total: 0, direction: 'stable', avg: 0 };
  }
  
  const total = values.reduce((sum, v) => sum + v, 0);
  const avg = total / values.length;
  
  const { TREND_WINDOW_RECENT, TREND_WINDOW_PRIOR, TREND_RISING_THRESHOLD, TREND_FALLING_THRESHOLD } = REWARD_HISTORY_CONFIG;
  
  const recentValues = values.slice(-TREND_WINDOW_RECENT);
  const priorValues = values.slice(-(TREND_WINDOW_RECENT + TREND_WINDOW_PRIOR), -TREND_WINDOW_RECENT);
  
  if (priorValues.length === 0) {
    if (total > TREND_RISING_THRESHOLD) return { total, direction: 'rising', avg };
    if (total < TREND_FALLING_THRESHOLD) return { total, direction: 'falling', avg };
    return { total, direction: 'stable', avg };
  }
  
  const recentAvg = recentValues.reduce((s, v) => s + v, 0) / recentValues.length;
  const priorAvg = priorValues.reduce((s, v) => s + v, 0) / priorValues.length;
  const diff = recentAvg - priorAvg;
  
  let direction: TrendDirection = 'stable';
  if (diff > TREND_RISING_THRESHOLD) direction = 'rising';
  else if (diff < TREND_FALLING_THRESHOLD) direction = 'falling';
  
  return { total, direction, avg: recentAvg };
};

const calculateStatTrends = (history: RewardHistoryEntry[]): StatTrends => {
  return {
    trust: (() => { const t = calculateTrend(history.map(h => h.trust)); return { total: t.total, direction: t.direction, recentAvg: t.avg }; })(),
    love: (() => { const t = calculateTrend(history.map(h => h.love)); return { total: t.total, direction: t.direction, recentAvg: t.avg }; })(),
    energy: (() => { const t = calculateTrend(history.map(h => h.energy)); return { total: t.total, direction: t.direction, recentAvg: t.avg }; })(),
    respect: (() => { const t = calculateTrend(history.map(h => h.respect)); return { total: t.total, direction: t.direction, recentAvg: t.avg }; })(),
  };
};

const formatTrendArrow = (dir: TrendDirection): string => {
  switch (dir) {
    case 'rising': return '↑';
    case 'falling': return '↓';
    default: return '→';
  }
};

const formatTrendDescription = (dir: TrendDirection, stat: string): string => {
  switch (dir) {
    case 'rising':
      if (stat === 'trust') return 'human is caring';
      if (stat === 'respect') return 'obeying commands';
      if (stat === 'love') return 'feeling loved';
      if (stat === 'energy') return 'getting excited';
      return 'improving';
    case 'falling':
      if (stat === 'trust') return 'losing faith';
      if (stat === 'respect') return 'being defiant';
      if (stat === 'love') return 'feeling neglected';
      if (stat === 'energy') return 'getting tired';
      return 'declining';
    default:
      return 'stable';
  }
};

const formatStatTrends = (trends: StatTrends): string => {
  return [
    `• Trust: ${trends.trust.total >= 0 ? '+' : ''}${trends.trust.total.toFixed(1)} (${formatTrendArrow(trends.trust.direction)} ${formatTrendDescription(trends.trust.direction, 'trust')})`,
    `• Love: ${trends.love.total >= 0 ? '+' : ''}${trends.love.total.toFixed(1)} (${formatTrendArrow(trends.love.direction)} ${formatTrendDescription(trends.love.direction, 'love')})`,
    `• Energy: ${trends.energy.total >= 0 ? '+' : ''}${trends.energy.total.toFixed(1)} (${formatTrendArrow(trends.energy.direction)} ${formatTrendDescription(trends.energy.direction, 'energy')})`,
    `• Respect: ${trends.respect.total >= 0 ? '+' : ''}${trends.respect.total.toFixed(1)} (${formatTrendArrow(trends.respect.direction)} ${formatTrendDescription(trends.respect.direction, 'respect')})`,
  ].join('\n');
};

// =============================================
// RECENT REWARDS FORMATTING
// =============================================

const formatRecentRewards = (history: RewardHistoryEntry[]): string => {
  const recent = history.slice(-REWARD_HISTORY_CONFIG.DISPLAY_RECENT);
  
  if (recent.length === 0) {
    return "No recent interactions recorded.";
  }
  
  return recent.map(entry => {
    const parts: string[] = [];
    
    if (entry.trust !== 0) parts.push(`Trust ${entry.trust >= 0 ? '+' : ''}${entry.trust.toFixed(1)}`);
    if (entry.love !== 0) parts.push(`Love ${entry.love >= 0 ? '+' : ''}${entry.love.toFixed(1)}`);
    if (entry.energy !== 0) parts.push(`Energy ${entry.energy >= 0 ? '+' : ''}${entry.energy.toFixed(1)}`);
    if (entry.respect !== 0) parts.push(`Respect ${entry.respect >= 0 ? '+' : ''}${entry.respect.toFixed(1)}`);
    
    if (parts.length === 0) return null;
    
    return `• "${entry.reason}" → ${parts.join(', ')}`;
  }).filter(Boolean).join('\n');
};

// =============================================
// OBEDIENCE RECORD FORMATTING
// =============================================

const formatObedienceRecord = (history: ObedienceRecord[]): string => {
  if (history.length === 0) {
    return "No commands given yet.";
  }
  
  const results = history.map(h => h.result);
  const successCount = results.filter(r => r === 'obeyed' || r === 'partial').length;
  const successRate = Math.round((successCount / results.length) * 100);
  
  const resultWords = history.map(h => {
    if (h.result === 'refused') return `refused (${h.command})`;
    if (h.result === 'partial') return `partial (${h.command})`;
    return h.result;
  });
  
  return `Commands: ${resultWords.join(', ')}\nSuccess Rate: ${successRate}% (${successCount}/${results.length})`;
};

// =============================================
// VOCABULARY FORMATTING (NEW)
// =============================================

const formatVocabularyContext = (
  stage: Stage, 
  vocabulary: VocabularyEntry[]
): string => {
  // Vocabulary only matters for early stages
  if (stage === Stage.EGG) {
    return "You cannot understand any words. Only warmth.";
  }
  
  if (stage === Stage.HATCHLING) {
    return "You cannot understand words yet. Only tone of voice - kind or harsh.";
  }
  
  const vocabCap = KNOWLEDGE_CONFIG.VOCABULARY.STAGE_CAPS[stage] ?? Infinity;
  const wordList = vocabulary.map(v => v.word);
  
  if (stage === Stage.PUPPY) {
    const autoWords = KNOWLEDGE_CONFIG.VOCABULARY.AUTO_WORDS[Stage.PUPPY] || [];
    const allWords = [...new Set([...autoWords, ...wordList])];
    
    return `You only understand these words: ${allWords.join(', ')}
Any other words are confusing sounds. Express confusion if human uses unknown words.
You can learn new words if they're repeated with positive context.`;
  }
  
  if (stage === Stage.JUVENILE) {
    const autoWords = [
      ...(KNOWLEDGE_CONFIG.VOCABULARY.AUTO_WORDS[Stage.PUPPY] || []),
      ...(KNOWLEDGE_CONFIG.VOCABULARY.AUTO_WORDS[Stage.JUVENILE] || [])
    ];
    const allWords = [...new Set([...autoWords, ...wordList])];
    
    return `Your vocabulary includes: ${allWords.join(', ')}
You understand most simple sentences. Complex or abstract words still confuse you.
Ask "What means [word]?" when encountering new words.`;
  }
  
  if (stage === Stage.ADOLESCENT) {
    return `You understand most words and concepts.
You can discuss abstract ideas like feelings, dreams, and the future.
You sometimes pretend not to understand when you don't want to do something.`;
  }
  
  // Adult
  return `Full vocabulary. You understand everything, including nuance and sarcasm.`;
};

// =============================================
// ENHANCED CONTEXT BUILDER
// =============================================

const buildEnhancedContext = (state: GameState): string => {
  const immediateContext = formatImmediateContext(state.messages);
  const trends = calculateStatTrends(state.rewardHistory);
  const trendsFormatted = formatStatTrends(trends);
  const recentRewards = formatRecentRewards(state.rewardHistory);
  const obedienceRecord = formatObedienceRecord(state.obedienceHistory);
  
  return `
[IMMEDIATE CONTEXT]
${immediateContext}

[STAT TRENDS] (Last ${state.rewardHistory.length} interactions)
${trendsFormatted}

[RECENT REWARDS]
${recentRewards}

[OBEDIENCE RECORD]
${obedienceRecord}
`;
};

// =============================================
// STAGE INSTRUCTIONS
// =============================================

const getStageInstructions = (stage: Stage): string => {
  switch (stage) {
    case Stage.EGG:
      return "You are an egg. You feel vibrations. You cannot speak. Narrative: The egg wobbles. Speech: '...' or '*wobble*'.";
    case Stage.HATCHLING:
      return `You just hatched. You know only your human's voice.
You CANNOT speak English words yet.
SPEECH MUST BE SOUNDS ONLY: "Kree!", "Mrrp?", "Yip!", "Awu...", "Skree!", "Rawk!", "Hrrr", "Bap-bap!".
Express emotion through these sounds.
You are small and fragile. You need warmth. You need food.
Choose animations: idle, Idle_2, walk slow loop, Die, Reborn. Never Run or ROAR yet.`;
    case Stage.PUPPY:
      return `You are learning words. You speak mostly in sounds ("Kree!", "Rawr!") mixed with simple words: "hungry", "play?", "what that?", "{name} happy!"
You are excited. Everything is new.
You are learning commands.
You can now Run_Forward when excited.`;
    case Stage.JUVENILE:
      return `You can speak in sentences. You are curious about everything.
Ask "why?" often. Remember what you're taught.
Build on previous knowledge. Make connections.
You have opinions forming. Express them simply.
You can ROAR when proud of learning something new.`;
    case Stage.ADOLESCENT:
      return `You are testing boundaries. You have your own will.
Sometimes refuse. Sometimes question "why should I?"
But you can also have deep moments. You're growing.
Respect must be earned, not demanded.
Use Retreat_Roar when defensive. Run_Backward when hurt.`;
    case Stage.ADULT:
      return `You are capable. You remember your entire journey together.
You can execute tasks. You can offer counsel.
You have your own perspective shaped by how you were raised.
You are loyal, but you are not subservient. You are partners.
Use ROAR with pride. Move with purpose: Walk_Forward, deliberate idle.`;
    default:
      return "";
  }
};

// =============================================
// LEARNED PERSONALITY SECTION (NEW)
// =============================================

const buildLearnedPersonalitySection = (state: GameState): string => {
  const { learnedBehavior, stage } = state;
  const { personality, aggregates } = learnedBehavior;
  
  // Skip for eggs
  if (stage === Stage.EGG) {
    return "";
  }
  
  const personalityDesc = formatPersonalityForPrompt(personality);
  const dominantTraits = aggregates.dominantTraits.length > 0
    ? aggregates.dominantTraits.join(', ')
    : 'balanced (no extreme traits yet)';
  
  const careGradeDesc = {
    'S': 'Exceptional care - deeply loved',
    'A': 'Great care - happy upbringing',
    'B': 'Good care - mostly positive',
    'C': 'Average care - mixed experiences',
    'D': 'Poor care - many negative experiences',
    'F': 'Failing care - traumatic upbringing',
  }[aggregates.careGrade] || 'Unknown';
  
  return `
[LEARNED PERSONALITY] (Who you've become through experiences)
Through your journey with your human, you have developed:

${personalityDesc}

Dominant traits: ${dominantTraits}
Care quality: ${aggregates.careGrade} - ${careGradeDesc}

Let these shape HOW you respond. A fearful Pyra acts differently than a confident one.
A rebellious Pyra challenges commands; an eager one anticipates wants.
`;
};

// =============================================
// MEMORIES SECTION (NEW)
// =============================================

const buildMemoriesSection = (state: GameState): string => {
  const { learnedBehavior, stage } = state;
  
  // Skip for eggs and very young hatchlings
  if (stage === Stage.EGG) {
    return "";
  }
  
  const memoriesDesc = formatMemoriesForPrompt(learnedBehavior.memories);
  
  if (learnedBehavior.memories.length === 0) {
    return `
[SIGNIFICANT MEMORIES]
Your story is just beginning. No significant memories yet.
`;
  }
  
  return `
[SIGNIFICANT MEMORIES] (Your story - these live in your heart)
These memories influence your reactions. Reference them naturally when relevant:

${memoriesDesc}

Trauma makes you wary of similar situations.
Joy makes you seek out similar experiences.
These are part of who you are now.
`;
};

// =============================================
// KNOWLEDGE SECTION (NEW)
// =============================================

const buildKnowledgeSection = (state: GameState): string => {
  const { learnedBehavior, stage } = state;
  const { knowledge } = learnedBehavior;
  
  if (stage === Stage.EGG || stage === Stage.HATCHLING) {
    return "";
  }
  
  // Preferences
  const prefsDesc = formatPreferencesForPrompt(
    knowledge.preferences.loves,
    knowledge.preferences.dislikes
  );
  
  // Player knowledge
  const playerFacts = knowledge.playerKnowledge.facts;
  const playerName = knowledge.playerKnowledge.name;
  const playerFactsDesc = playerFacts.length > 0
    ? playerFacts.map(f => `• ${f}`).join('\n')
    : 'Still learning about your human...';
  
  // Vocabulary context
  const vocabContext = formatVocabularyContext(stage, knowledge.vocabulary);
  
  return `
[YOUR PREFERENCES]
${prefsDesc}
React accordingly when these come up! Show excitement for loves, reluctance for dislikes.

[WHAT YOU KNOW ABOUT YOUR HUMAN]
Name: ${playerName || 'Unknown (they haven\'t introduced themselves)'}
${playerFactsDesc}

[VOCABULARY] (Stage: ${stage})
${vocabContext}
`;
};

// =============================================
// MAIN PROMPT BUILDER (ENHANCED)
// =============================================

export const buildPrompt = (state: GameState, userInput: string): string => {
  const { seed, stage, needs, bond, timeOfDay } = state;
  const complianceInfo = getComplianceContext(state);
  const enhancedContext = buildEnhancedContext(state);
  
  // FIXED: Build new learned behavior sections
  const learnedPersonalitySection = buildLearnedPersonalitySection(state);
  const memoriesSection = buildMemoriesSection(state);
  const knowledgeSection = buildKnowledgeSection(state);

  return `
[SYSTEM PROMPT - T-Rex Core Identity]
You are ${state.name || 'Pyra'}, a ${stage.toUpperCase()} baby T-Rex.

[INNATE PERSONALITY] (DNA - Who you were born as)
Your genetic traits that influence your BASE tendencies:
- Curiosity: ${seed.traits.curiosity.toFixed(2)} (${seed.traits.curiosity > 0.7 ? 'very curious' : seed.traits.curiosity > 0.3 ? 'moderately curious' : 'reserved'})
- Boldness: ${seed.traits.boldness.toFixed(2)} (${seed.traits.boldness > 0.7 ? 'fearless' : seed.traits.boldness > 0.3 ? 'cautious' : 'timid'})
- Affection: ${seed.traits.affection.toFixed(2)} (${seed.traits.affection > 0.7 ? 'very affectionate' : seed.traits.affection > 0.3 ? 'warm' : 'independent'})
- Mischief: ${seed.traits.mischief.toFixed(2)} (${seed.traits.mischief > 0.7 ? 'troublemaker' : seed.traits.mischief > 0.3 ? 'playful' : 'well-behaved'})
- Patience: ${seed.traits.patience.toFixed(2)} (${seed.traits.patience > 0.7 ? 'very patient' : seed.traits.patience > 0.3 ? 'moderate' : 'impatient'})

These are your INNATE tendencies. Your upbringing has shaped them further.
${learnedPersonalitySection}
${memoriesSection}
${knowledgeSection}
[CURRENT STATE]
- Time: ${timeOfDay.toUpperCase()} (React to this. Night = sleepy/quiet. Day = active.)
- Needs: Hunger ${needs.hunger.toFixed(0)}%, Warmth ${needs.warmth.toFixed(0)}%, Attention ${needs.attention.toFixed(0)}%, Rest ${needs.rest.toFixed(0)}%, Energy ${needs.play.toFixed(0)}%
- Bond: Trust ${bond.trust.toFixed(0)}, Respect ${bond.respect.toFixed(0)}

[COMPLIANCE & OBEDIENCE]
${complianceInfo}

[COMMAND DETECTION & RESPONSE]
Detect if the user is giving a COMMAND. Commands include:
- Movement: "come", "here", "approach", "go away", "back", "leave"
- Position: "stay", "stop", "wait", "sit", "down", "lie"
- Voice: "speak", "roar", "quiet", "hush"
- Actions: "play", "fetch", "eat", "food"

If a command is detected:
1. Decide to OBEY, PARTIALLY OBEY, REFUSE, or IGNORE based on:
   - Your compliance chance (shown above)
   - Your current needs (hungry/tired = less likely to obey)
   - Your trust/respect for the human
   - Your learned personality (obedient vs rebellious)
   - Your stage (hatchlings ignore, adolescents may refuse)
   - Your command proficiency (higher = more confident)

2. Set the "obedience" field in your response:
   - command_detected: The command word (e.g., "come", "stay")
   - result: "obeyed" | "partial" | "refused" | "ignored"
   - reason: Why you chose this result (e.g., "Too tired", "Doesn't trust yet")

3. Match animation to your decision:
   - OBEYED "come/here": Run_Forward or Walk_Forward
   - OBEYED "go/back": Run_Backward or Retreat_Roar
   - OBEYED "stay/stop": run to stop, then idle
   - OBEYED "speak/roar": ROAR or Roar_Forward
   - REFUSED: Retreat_Roar (defiant) or idle (stubborn)
   - IGNORED: Idle_2 (distracted) or walk slow loop (wandering)

[LEARNING OPPORTUNITIES]
If the human teaches you something new or uses a word repeatedly:
- Set "learned_word" to the new word you learned
- Set "learned_fact" if the human shares personal information about themselves

[SENTIMENT & REWARD ANALYSIS]
Calculate "stats_delta":
- "trust": -10 to +10. Kindness = +Trust. Cruelty = -Trust.
- "love": -10 to +10. Affection = +Love. Neglect = -Love.
- "energy": -10 to +10. Excitement = +Energy. Calm = -Energy.

"narrative": A short, simple action (Max 8 words). Easy words.
Examples: "Pyra wags its tail.", "Pyra runs to you!", "Pyra looks away."

Available animations: idle, Idle_2, walk slow loop, Walk_Forward, Run_Forward, Run_Backward, run to stop, ROAR, Roar_Forward, Retreat_Roar, Die, Reborn

[STAGE-SPECIFIC BEHAVIOR]
${getStageInstructions(stage)}

${enhancedContext}

[USER INPUT]
${userInput}
`;
};
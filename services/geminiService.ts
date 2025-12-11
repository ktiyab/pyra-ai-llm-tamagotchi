import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GameState, LLMResponse, Stage } from '../types';
import { buildPrompt, randomChoice } from '../utils';
import { OBEDIENCE_HISTORY_CONFIG } from '../constants'; // FIXED: Import for command validation

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

// =============================================
// VALID ANIMATION NAMES (from animationController.ts)
// =============================================

// FIXED: Define valid animations for validation
const VALID_ANIMATIONS = [
  'All_Delete', 'Die', 'idle', 'Idle_2', 'Reborn', 'Retreat_Roar',
  'ROAR', 'Roar_Forward', 'run to stop', 'Run_Backward', 'Run_Forward',
  'walk slow', 'walk slow loop', 'Walk_Forward'
] as const;

// FIXED: Stats delta bounds from prompt specification
const STATS_DELTA_BOUNDS = { MIN: -10, MAX: 10 };

// =============================================
// FALLBACK RESPONSES
// =============================================

const ONOMATOPOEIA: Record<string, string[]> = {
  content: ['Mrrp.', 'Kree.', 'Hrrr.', 'Churp.', 'Prrr...'],
  curious: ['Mrrp?', 'Ooo?', 'Hoo?', 'Wut?', 'Awu?', 'Hrr?'],
  excited: ['Kree!', 'Yip!', 'Bap-bap!', 'Hrr-hrr!', 'Squeee!', 'Rah!', 'Skree-onk!'],
  scared: ['Mew...', 'Hoo...', 'Whimper...', 'Eeep...', 'Skree...', 'Hiss...'],
  proud: ['Rawr!', 'Hmph!', 'Kree-rah!', 'Grar!', 'Rah!'],
  hurt: ['Whimper...', 'Mew...', 'Kree...', 'Hnn...'],
  demanding: ['Rawk!', 'Skree!', 'Rah!', 'Hey!', 'Grah!'],
  tired: ['Zzz...', 'Hrrrm...', 'Snuuu...', 'Yawn...', 'Mmph...'],
  sick: ['Hrr...', 'Mew...', '...', 'Hnn...'],
  neutral: ['Mrrp.', 'Kree.', '...', 'Hmph.'],
  default: ['Mrrp.', 'Kree.', 'Rawr.']
};

const NARRATIVE_FALLBACKS: Record<string, string[]> = {
  curious: ["Pyra looks at you.", "Pyra sniffs the air.", "Pyra tilts its head."],
  excited: ["Pyra jumps up!", "Pyra wags its tail!", "Pyra spins around!"],
  scared: ["Pyra hides.", "Pyra shivers.", "Pyra steps back."],
  tired: ["Pyra yawns.", "Pyra is sleepy.", "Pyra lies down."],
  proud: ["Pyra stands tall!", "Pyra looks strong.", "Pyra roars!"],
  hurt: ["Pyra looks sad.", "Pyra whines softly.", "Pyra looks down."],
  neutral: ["Pyra looks around.", "Pyra waits.", "Pyra is listening."],
  default: ["Pyra looks at you.", "Pyra blinks."]
};

const getFallbackSpeech = (emotion: string): string => {
  const options = ONOMATOPOEIA[emotion] || ONOMATOPOEIA.default;
  return randomChoice(options);
};

const getFallbackNarrative = (emotion: string): string => {
  const options = NARRATIVE_FALLBACKS[emotion] || NARRATIVE_FALLBACKS.neutral || NARRATIVE_FALLBACKS.default;
  return randomChoice(options);
};

const getFallbackResponse = (emotion: string, narrativeOverride?: string): LLMResponse => {
  return {
    speech: getFallbackSpeech(emotion),
    narrative: narrativeOverride || getFallbackNarrative(emotion),
    emotion: emotion as any,
    animation: { primary: emotion === 'excited' ? 'Idle_2' : 'idle' },
    vocalization: 'none',
    stats_delta: { trust: 0, love: 0, energy: 0 },
    obedience: undefined,
    learned_word: undefined,
    learned_fact: undefined,
    memory_reference: undefined,
  };
};

// =============================================
// LLM RESPONSE SCHEMA
// =============================================

const llmResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    speech: {
      type: Type.STRING,
      description: "The verbal response or onomatopoeia sound."
    },
    transcription: {
      type: Type.STRING,
      nullable: true, // FIXED: Properly marked as nullable
      description: "If audio was provided, the exact transcription of what the user said. Otherwise null."
    },
    narrative: {
      type: Type.STRING,
      description: "A short, simple action description (Max 8 words). Simple English."
    },
    emotion: {
      type: Type.STRING,
      enum: ['content', 'curious', 'excited', 'scared', 'proud', 'hurt', 'demanding', 'tired', 'sick', 'neutral'],
      description: "The emotional state derived from the interaction."
    },
    animation: {
      type: Type.OBJECT,
      properties: {
        primary: { type: Type.STRING },
        transition_to: { type: Type.STRING, nullable: true }
      },
      required: ['primary']
    },
    vocalization: {
      type: Type.STRING,
      enum: ['chirp', 'purr', 'whimper', 'growl', 'roar', 'none', 'babble'],
      description: "The type of sound to play."
    },
    stats_delta: {
      type: Type.OBJECT,
      properties: {
        trust: { type: Type.NUMBER, description: "Delta between -10 and 10" },
        love: { type: Type.NUMBER, description: "Delta between -10 and 10" },
        energy: { type: Type.NUMBER, description: "Delta between -10 and 10" }
      },
      required: ['trust', 'love', 'energy']
    },
    obedience: {
      type: Type.OBJECT,
      nullable: true,
      description: "Only include if user gave a command (come, stay, sit, etc.)",
      properties: {
        command_detected: {
          type: Type.STRING,
          nullable: true,
          description: "The command word detected: come, stay, sit, go, speak, quiet, play, etc. Null if no command."
        },
        result: {
          type: Type.STRING,
          enum: ['obeyed', 'partial', 'refused', 'ignored'],
          description: "obeyed = did it, partial = tried but failed, refused = deliberately didn't, ignored = too young/distracted"
        },
        reason: {
          type: Type.STRING,
          nullable: true,
          description: "Why this result? e.g. 'Too tired', 'Doesn't trust you yet', 'Too young to understand'"
        }
      },
      required: ['command_detected', 'result']
    },
    learned_word: {
      type: Type.STRING,
      nullable: true,
      description: "If Pyra learned a new word from this interaction, include it here. Only for PUPPY+ stages. Leave null if no new word was learned."
    },
    learned_fact: {
      type: Type.STRING,
      nullable: true,
      description: "If the player shared personal information about themselves that Pyra would remember. Keep it simple. Leave null if no new fact."
    },
    memory_reference: {
      type: Type.STRING,
      nullable: true,
      description: "If Pyra is referencing one of their significant memories in this response. Leave null if not referencing a memory."
    }
  },
  required: ['speech', 'narrative', 'emotion', 'animation', 'vocalization', 'stats_delta']
};

// =============================================
// AUDIO INPUT TYPE
// =============================================

export interface AudioInput {
  data: string;
  mimeType: string;
}

// =============================================
// HELPER: Clamp value to range
// =============================================

const clamp = (val: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, val));

// =============================================
// JSON REPAIR UTILITIES
// =============================================

const attemptJsonRepair = (text: string): string => {
  let repaired = text.trim();
  repaired = repaired.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
  repaired = repaired.trim();
  if (!repaired) return '{}';
  
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;
  
  let inString = false;
  for (let i = 0; i < repaired.length; i++) {
    if (repaired[i] === '"' && (i === 0 || repaired[i - 1] !== '\\')) {
      inString = !inString;
    }
  }
  if (inString) repaired += '"';
  
  repaired = repaired.replace(/,\s*$/, '');
  for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += ']';
  for (let i = 0; i < openBraces - closeBraces; i++) {
    const trimmed = repaired.trimEnd();
    if (trimmed.endsWith(',')) repaired = trimmed.slice(0, -1);
    else if (trimmed.endsWith(':')) repaired += 'null';
    repaired += '}';
  }
  return repaired;
};

// =============================================
// FIXED: Validates and fills missing required fields
// =============================================

const validateAndFillResponse = (json: any, state: GameState): LLMResponse => {
  const emotion = json.emotion || 'neutral';
  
  // FIXED: Validate animation against known valid animations
  const primaryAnim = json.animation?.primary;
  const isValidPrimary = primaryAnim && VALID_ANIMATIONS.includes(primaryAnim);
  const transitionAnim = json.animation?.transition_to;
  const isValidTransition = !transitionAnim || VALID_ANIMATIONS.includes(transitionAnim);

  const validatedAnimation = isValidPrimary
    ? { primary: primaryAnim, transition_to: isValidTransition ? transitionAnim : null }
    : { primary: emotion === 'excited' ? 'Idle_2' : 'idle' };

  // FIXED: Clamp stats_delta values to -10/+10 range
  const rawTrust = typeof json.stats_delta?.trust === 'number' ? json.stats_delta.trust : 0;
  const rawLove = typeof json.stats_delta?.love === 'number' ? json.stats_delta.love : 0;
  const rawEnergy = typeof json.stats_delta?.energy === 'number' ? json.stats_delta.energy : 0;

  const response: LLMResponse = {
    speech: json.speech?.trim() || getFallbackSpeech(emotion),
    transcription: json.transcription,
    narrative: json.narrative?.trim() || getFallbackNarrative(emotion),
    emotion: ['content', 'curious', 'excited', 'scared', 'proud', 'hurt', 'demanding', 'tired', 'sick', 'neutral'].includes(json.emotion) 
      ? json.emotion 
      : 'neutral',
    animation: validatedAnimation,
    vocalization: ['chirp', 'purr', 'whimper', 'growl', 'roar', 'none', 'babble'].includes(json.vocalization)
      ? json.vocalization
      : 'none',
    stats_delta: {
      trust: clamp(rawTrust, STATS_DELTA_BOUNDS.MIN, STATS_DELTA_BOUNDS.MAX),
      love: clamp(rawLove, STATS_DELTA_BOUNDS.MIN, STATS_DELTA_BOUNDS.MAX),
      energy: clamp(rawEnergy, STATS_DELTA_BOUNDS.MIN, STATS_DELTA_BOUNDS.MAX),
    },
    obedience: json.obedience,
    learned_word: json.learned_word,
    learned_fact: json.learned_fact,
    memory_reference: json.memory_reference,
  };

  // Validate obedience if present
  if (response.obedience) {
    const validResults = ['obeyed', 'partial', 'refused', 'ignored'];
    if (!validResults.includes(response.obedience.result)) {
      response.obedience.result = 'ignored';
    }
    
    // FIXED: Validate command against recognized commands list
    if (response.obedience.command_detected) {
      const normalizedCmd = response.obedience.command_detected.toLowerCase().trim();
      const recognizedCommands = OBEDIENCE_HISTORY_CONFIG.RECOGNIZED_COMMANDS;
      
      // Check if command matches or contains a recognized command
      const isRecognized = recognizedCommands.some(
        cmd => normalizedCmd === cmd || normalizedCmd.includes(cmd)
      );
      
      if (!isRecognized) {
        // FIXED: Invalid command - nullify to prevent invalid proficiency tracking
        console.warn(`Unrecognized command from LLM: "${response.obedience.command_detected}"`);
        response.obedience.command_detected = null;
        response.obedience.result = 'ignored';
      } else {
        // Normalize to the matched recognized command
        const matchedCmd = recognizedCommands.find(
          cmd => normalizedCmd === cmd || normalizedCmd.includes(cmd)
        );
        if (matchedCmd) {
          response.obedience.command_detected = matchedCmd;
        }
      }
    }
  }

  // Validate learned_word - only for appropriate stages
  if (response.learned_word) {
    const validWordStages = ['puppy', 'juvenile', 'adolescent', 'adult'];
    if (!validWordStages.includes(state.stage)) {
      response.learned_word = undefined;
    } else {
      response.learned_word = response.learned_word.toLowerCase().trim().split(' ')[0];
      if (response.learned_word.length < 2 || response.learned_word.length > 20) {
        response.learned_word = undefined;
      }
    }
  }

  // Validate learned_fact
  if (response.learned_fact) {
    if (response.learned_fact.length > 100) {
      response.learned_fact = response.learned_fact.substring(0, 100);
    }
    if (response.learned_fact.length < 10) {
      response.learned_fact = undefined;
    }
  }

  // Validate memory_reference (must match an existing memory)
  if (response.memory_reference) {
    const memoryExists = state.learnedBehavior.memories.some(
      m => m.narrative.toLowerCase().includes(response.memory_reference!.toLowerCase().substring(0, 20))
    );
    if (!memoryExists) {
      response.memory_reference = undefined;
    }
  }

  return response;
};

// =============================================
// MAIN GENERATION FUNCTION
// =============================================

export const generateCatResponse = async (state: GameState, input: string | AudioInput): Promise<LLMResponse> => {
  if (typeof window !== 'undefined' && window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      try { await window.aistudio.openSelectKey(); } 
      catch (e) { console.error("Key selection dialog failed", e); }
    }
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("Gemini API Key missing in environment");
    return getFallbackResponse("neutral", "Pyra cannot connect to its brain (Missing API Key).");
  }

  const ai = new GoogleGenAI({ apiKey });
  const parts: any[] = [];
  let userText = "";

  if (typeof input !== 'string') {
    parts.push({ inlineData: { mimeType: input.mimeType, data: input.data } });
    userText = "[USER SENT AUDIO CLIP]";
  } else {
    userText = input;
  }

  const systemPrompt = buildPrompt(state, userText);
  parts.push({ text: systemPrompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: parts },
      config: {
        maxOutputTokens: 4096,
        temperature: 1.0,
        responseMimeType: "application/json",
        responseSchema: llmResponseSchema
      }
    });

    const text = response.text || "{}";
    let jsonText = text;
    let json: any;
    
    try {
      json = JSON.parse(jsonText);
    } catch (parseError) {
      console.warn("Initial JSON parse failed, attempting repair...", parseError);
      jsonText = attemptJsonRepair(text);
      try {
        json = JSON.parse(jsonText);
        console.log("JSON repair successful");
      } catch (repairError) {
        console.error("JSON repair failed", { original: text, repaired: jsonText, error: repairError });
        const partialResponse = extractPartialResponse(text);
        if (partialResponse) {
          console.log("Extracted partial response:", partialResponse);
          return validateAndFillResponse(partialResponse, state);
        }
        return getFallbackResponse("neutral");
      }
    }

    return validateAndFillResponse(json, state);

  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    const errorMessage = error.message || '';
    const isAuthError = errorMessage.includes('Requested entity was not found') || error.status === 403 || error.status === 401;

    if (isAuthError && typeof window !== 'undefined' && window.aistudio) {
      console.log("Auth error detected, triggering key selection...");
      await window.aistudio.openSelectKey();
      return getFallbackResponse("neutral", "Please select a valid API Key to help Pyra understand you.");
    }
    return getFallbackResponse("neutral", "Pyra doesn't seem to understand.");
  }
};

const extractPartialResponse = (text: string): Partial<LLMResponse> | null => {
  try {
    const result: Partial<LLMResponse> = {};
    const speechMatch = text.match(/"speech"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    if (speechMatch) result.speech = speechMatch[1].replace(/\\"/g, '"');
    const narrativeMatch = text.match(/"narrative"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
    if (narrativeMatch) result.narrative = narrativeMatch[1].replace(/\\"/g, '"');
    const emotionMatch = text.match(/"emotion"\s*:\s*"([^"]*)"/);
    if (emotionMatch) result.emotion = emotionMatch[1] as any;
    const vocalMatch = text.match(/"vocalization"\s*:\s*"([^"]*)"/);
    if (vocalMatch) result.vocalization = vocalMatch[1] as any;
    const animMatch = text.match(/"primary"\s*:\s*"([^"]*)"/);
    if (animMatch) result.animation = { primary: animMatch[1] };
    if (result.speech || result.narrative) return result;
    return null;
  } catch (e) {
    console.error("Failed to extract partial response:", e);
    return null;
  }
};

// =============================================
// PYRA PORTRAIT GENERATION (Nano Banana)
// =============================================

const PORTRAIT_CACHE_PREFIX = 'pyra_portrait_';
const PORTRAIT_CACHE_VERSION = 'v1';

/**
 * Converts hue (0-360) to a descriptive color name for prompts
 */
const hueToColorName = (hue: number): string => {
  if (hue < 15 || hue >= 345) return 'red';
  if (hue < 45) return 'orange';
  if (hue < 75) return 'golden yellow';
  if (hue < 105) return 'lime green';
  if (hue < 135) return 'green';
  if (hue < 165) return 'teal';
  if (hue < 195) return 'cyan';
  if (hue < 225) return 'sky blue';
  if (hue < 255) return 'blue';
  if (hue < 285) return 'purple';
  if (hue < 315) return 'magenta';
  return 'pink';
};

/**
 * Generates a detailed prompt for Pyra portrait based on game state
 */
const generatePortraitPrompt = (state: GameState): string => {
  const { seed, stage, name, learnedBehavior } = state;
  const { appearance } = seed;
  const traits = learnedBehavior.aggregates.dominantTraits;
  
  // Color descriptions
  const bodyColor = hueToColorName(appearance.baseHue);
  const eyeColor = hueToColorName((appearance.baseHue + 180) % 360);
  
  // Saturation/lightness descriptors
  const satDesc = appearance.saturation > 70 ? 'vibrant' : 
                  appearance.saturation > 40 ? 'soft' : 'muted';
  const lightDesc = appearance.lightness > 60 ? 'bright' : 
                    appearance.lightness > 40 ? 'medium' : 'dark';
  
  // Personality-based expression
  let expression = 'friendly and curious';
  if (traits.includes('fearful') || traits.includes('anxious')) {
    expression = 'shy and timid, with big worried eyes';
  } else if (traits.includes('hyperactive')) {
    expression = 'excited and energetic, with a playful grin';
  } else if (traits.includes('trusting')) {
    expression = 'warm and trusting, with soft kind eyes';
  } else if (traits.includes('rebellious') || traits.includes('defiant')) {
    expression = 'confident and mischievous, with a sly smirk';
  } else if (traits.includes('calm') || traits.includes('patient')) {
    expression = 'serene and gentle, with a peaceful gaze';
  } else if (traits.includes('clingy')) {
    expression = 'loving and affectionate, with adoring eyes';
  }
  
  // Stage-based age descriptor
  const ageDesc: Record<Stage, string> = {
    [Stage.EGG]: 'baby',
    [Stage.HATCHLING]: 'tiny newborn baby',
    [Stage.PUPPY]: 'small young',
    [Stage.JUVENILE]: 'young curious',
    [Stage.ADOLESCENT]: 'teenage',
    [Stage.ADULT]: 'majestic adult',
  };
  
  // Scale pattern
  const patternDesc = appearance.scalePattern === 'spotted' ? 'with darker spots' :
                      appearance.scalePattern === 'striped' ? 'with subtle stripes' :
                      'with smooth scales';
  
  // Size descriptor
  const sizeDesc = appearance.size === 'runt' ? 'small and petite' :
                   appearance.size === 'large' ? 'big and sturdy' : '';
  
  // Build the prompt
  const creatureName = name || 'Pyra';
  
  return `A cute ${ageDesc[stage]} T-Rex dinosaur named ${creatureName}, ` +
         `${satDesc} ${lightDesc} ${bodyColor} colored skin ${patternDesc}, ` +
         `${sizeDesc ? sizeDesc + ', ' : ''}` +
         `beautiful glowing ${eyeColor} eyes, ` +
         `${expression}, ` +
         `portrait style centered composition, ` +
         `soft magical lighting with subtle sparkles, ` +
         `fantasy children's book illustration style, ` +
         `warm and friendly atmosphere, ` +
         `high quality digital art, ` +
         `no text, no watermarks`;
};

/**
 * Gets cache key for portrait
 */
const getPortraitCacheKey = (seedId: string, stage: Stage): string => {
  return `${PORTRAIT_CACHE_PREFIX}${PORTRAIT_CACHE_VERSION}_${seedId}_${stage}`;
};

/**
 * Retrieves cached portrait if available
 */
export const getCachedPortrait = (seedId: string, stage: Stage): string | null => {
  try {
    const key = getPortraitCacheKey(seedId, stage);
    const cached = localStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if cache is still valid (7 days)
      if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return parsed.imageData;
      }
      // Expired, remove it
      localStorage.removeItem(key);
    }
  } catch (e) {
    console.warn('Portrait cache read error:', e);
  }
  return null;
};

/**
 * Caches portrait data
 */
const cachePortrait = (seedId: string, stage: Stage, imageData: string): void => {
  try {
    const key = getPortraitCacheKey(seedId, stage);
    localStorage.setItem(key, JSON.stringify({
      imageData,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn('Portrait cache write error:', e);
    // Might be quota exceeded, try to clear old portraits
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k?.startsWith(PORTRAIT_CACHE_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
    } catch (clearError) {
      // Ignore cleanup errors
    }
  }
};

/**
 * Checks if API key is available for image generation
 */
export const hasImageGenerationCapability = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && window.aistudio) {
    return await window.aistudio.hasSelectedApiKey();
  }
  return !!process.env.API_KEY;
};

/**
 * Generates a unique Pyra portrait using Nano Banana (Gemini 2.5 Flash Image)
 * Returns base64 image data or null if generation fails
 */
export const generatePyraPortrait = async (state: GameState): Promise<string | null> => {
  // Check cache first
  const cached = getCachedPortrait(state.seed.id, state.stage);
  if (cached) {
    console.log('🖼️ Portrait loaded from cache');
    return cached;
  }
  
  // Check API key
  if (typeof window !== 'undefined' && window.aistudio) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      console.warn('No API key for portrait generation');
      return null;
    }
  }
  
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn('No API key available for portrait generation');
    return null;
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = generatePortraitPrompt(state);
    
    console.log('🎨 Generating portrait with prompt:', prompt.substring(0, 100) + '...');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        // FIXED: responseModalities required for image output
        responseModalities: ['image', 'text'],
      }
    });
    
    // Extract image from response
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      console.warn('No candidates in portrait response');
      return null;
    }
    
    const parts = candidates[0].content?.parts;
    if (!parts) {
      console.warn('No parts in portrait response');
      return null;
    }
    
    for (const part of parts) {
      if (part.inlineData?.data) {
        const imageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        const dataUrl = `data:${mimeType};base64,${imageData}`;
        
        // Cache for future use
        cachePortrait(state.seed.id, state.stage, dataUrl);
        
        console.log('🖼️ Portrait generated successfully');
        return dataUrl;
      }
    }
    
    console.warn('No image data in portrait response');
    return null;
    
  } catch (error: any) {
    console.error('Portrait generation error:', error);
    
    // Don't show error UI for expected failures
    if (error.message?.includes('not found') || 
        error.message?.includes('not supported') ||
        error.status === 400) {
      console.warn('Image generation not available for this API key/region');
    }
    
    return null;
  }
};

/**
 * Clears all cached portraits (useful for reset)
 */
export const clearPortraitCache = (): void => {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith(PORTRAIT_CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.warn('Failed to clear portrait cache:', e);
  }
};
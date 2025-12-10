import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GameState, LLMResponse } from '../types';
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
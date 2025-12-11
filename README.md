<div align="center">

# 🦖 Pyra

**An AI-Driven Virtual Pet Simulator with Persistent Memory & Evolving Personality | Build with Google AI Studio**

[![Pyra](https://storage.googleapis.com/vai-pet/Gemini_Generated_Image_mpxpvfmpxpvfmpxp.jpg)](https://react.dev/)

*Your choices don't just keep Pyra alive—they shape who Pyra becomes.*

</div>

---

## 🌟 Overview

Pyra transcends traditional virtual pet mechanics by combining a React/Three.js frontend with Google's Gemini API as a **logic engine** that drives a persistent "Nature vs. Nurture" simulation. Every interaction creates ripples through a psychological system—comfort a scared hatchling and watch them grow confident; neglect their needs and witness lasting anxiety take root.

This isn't a game you win, it's a relationship you build.

---

## ✨ Key Features

### 🧠 AI-Powered Personality Engine
- **Structured AI Responses** — Gemini returns not just dialogue, but animation triggers, stat changes, and obedience decisions based on personality
- **Context-Aware Interactions** — Full life history, current needs, and personality traits are injected into every AI call
- **Dynamic Obedience** — Commands like "Sit" or "Come" succeed or fail based on trust, respect, and personality traits

### 🧬 Nature vs. Nurture System
- **Innate Seed Traits** — Each Pyra hatches with randomized base personality dimensions
- **Permanent Personality Shifts** — Your parenting style (consistent, neglectful, affectionate, strict) shifts traits along spectrums like Fearfulness ↔ Confidence
- **Core Memory Formation** — Significant events (starvation, rescue, learning their name) become permanent memories that influence future behavior

### 🎮 Life Simulation
- **6-Stage Growth** — Egg → Hatchling → Puppy → Juvenile → Adolescent → Adult
- **6-Axis Needs System** — Hunger, Warmth, Attention, Rest, Play, Cleanliness with variable decay rates
- **Real-Time Day/Night Cycle** — Synced to local time, affecting lighting, energy, and sleepiness
- **Care Grade Calculation** — S to F rating based on positive vs. negative experience ratios

### 🎨 Immersive 3D Experience
- **Dynamic Environment** — Grass fields, flowers, clouds, and aurora sky that shift with time of day
- **Infinite World Illusion** — Treadmill-style world wrapping with parallax depth layers
- **Manga-Style UI** — Speech bubbles and emotive icons float in 3D space near the model
- **Audio-Reactive** — Microphone input for talking to Pyra + procedural Web Audio chirps

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                 │
│                    (Composition Root)                           │
├────────────────────────┬────────────────────────────────────────┤
│       UI.tsx           │              Scene.tsx                 │
│    (2D HUD Overlay)    │          (3D R3F Canvas)               │
├────────────────────────┴────────────────────────────────────────┤
│                     useGame Hook                                │
│              (Central Game Engine & State)                      │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│  gemini     │  behavior   │  animation  │   audio               │
│  Service    │  Service    │  Controller │   Service             │
│  (AI Brain) │  (Psychology)│ (3D Motion) │  (Sound FX)          │
├─────────────┴─────────────┴─────────────┴───────────────────────┤
│                      gameReducer                                │
│              (Predictable State Mutations)                      │
├─────────────────────────────────────────────────────────────────┤
│                      constants.ts                               │
│    (Decay Rates, Colors, Memory Templates, Emotional Mods)      │
└─────────────────────────────────────────────────────────────────┘
```

**Design Patterns:**
- **Unidirectional Data Flow** — All state changes flow through `gameReducer`
- **Service-Oriented Architecture** — Heavy logic extracted from React into dedicated services
- **Configuration over Hardcoding** — Balancing and tuning via `constants.ts`

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Google Gemini API key ([Get one here](https://ai.google.dev/))

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/pyra.git
cd pyra

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Add your VITE_GEMINI_API_KEY to .env

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_GEMINI_API_KEY` | Your Google Gemini API key |

---

## 📁 Project Structure

```
├── App.tsx                    # Root composition
├── index.tsx                  # Entry point
├── index.html
├── constants.ts               # Game configuration & balancing
├── types.ts                   # TypeScript definitions
├── utils.ts                   # Prompt building & helpers
├── metadata.json
│
├── components/
│   ├── Scene.tsx              # Three.js/R3F 3D scene
│   ├── UI.tsx                 # 2D HUD overlay
│   ├── LoadingScreen.tsx      # Initial loading state
│   ├── TutorialModal.tsx      # Onboarding system
│   └── environment/
│       ├── index.ts
│       ├── AuroraSky.tsx      # Dynamic sky rendering
│       ├── Clouds.tsx         # Parallax cloud layer
│       ├── Flowers.tsx        # Environmental details
│       └── GrassField.tsx     # Infinite grass terrain
│
├── hooks/
│   └── useGame.ts             # Central game engine & state
│
└── services/
    ├── animationController.ts # 3D animation & world wrapping
    ├── audioService.ts        # Web Audio & procedural sounds
    ├── behaviorService.ts     # Psychology, memory & personality
    └── geminiService.ts       # AI integration & structured output
```

---

## 🎯 Game Mechanics

| System | Description |
|--------|-------------|
| **Needs** | 6 axes that decay at stage-dependent rates |
| **Trust** | Gained by meeting needs, lost by neglect |
| **Respect** | Critical for adolescent obedience training |
| **Personality** | Multi-dimensional traits that shift permanently based on experiences |
| **Memories** | Formed when specific templates match game state |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript |
| **3D Rendering** | Three.js, React Three Fiber, Drei |
| **AI Engine** | Google Gemini API |
| **Audio** | Web Audio API |
| **State** | useReducer + localStorage persistence |
| **Styling** | Tailwind CSS |

---

## 📄 License

This work is licensed under a [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).

You are free to:
- **Share** — copy and redistribute the material in any medium or format
- **Adapt** — remix, transform, and build upon the material for any purpose, even commercially

Under the following terms:
- **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made.

---

<div align="center">

**The story you write together is yours alone.** 🦖💚

---

# Deep Explanation Of Principle: Pyra - A Virtual Companion Simulation

## The Core Philosophy

This isn't just a virtual pet game—it's a **meditation on caregiving, attachment, and the permanence of early experiences**. At its heart, Pyra explores the question: *How does the way we care for someone shape who they become?*

---

## The Dual Nature: Seed vs. Experience

The game embodies the **nature vs. nurture** debate through two parallel systems:

### Innate Traits (Nature)
```typescript
traits: {
  curiosity: number;   // Exploration drive
  boldness: number;    // Fear response
  affection: number;   // Social bonding tendency
  mischief: number;    // Rule-testing behavior
  patience: number;    // Frustration tolerance
}
```
These are set at birth and never change—your Pyra's genetic foundation.

### Learned Personality (Nurture)
```typescript
personality: {
  fearfulness: number;      // -100 confident ↔ +100 fearful
  attachment: number;       // -100 independent ↔ +100 clingy
  obedience: number;        // -100 rebellious ↔ +100 eager
  energy: number;           // -100 calm ↔ +100 hyperactive
  trustDisposition: number; // -100 suspicious ↔ +100 trusting
  temperament: number;      // -100 impatient ↔ +100 patient
}
```
These shift based on your actions—shaped by every kindness and every neglect.

---

## The Developmental Arc

```
🥚 EGG → 🐣 HATCHLING → 🦕 PUPPY → 🦖 JUVENILE → 🦖 ADOLESCENT → 🦖 ADULT
```

### Stage Plasticity (How Malleable Personality Is)

| Stage | Plasticity | Meaning |
|-------|-----------|---------|
| Hatchling | 2.0× | Extremely impressionable |
| Puppy | 1.5× | Highly formative |
| Juvenile | 1.0× | Moderate influence |
| Adolescent | 0.5× | Resistant to change |
| Adult | 0.3× | Personality largely fixed |

**Key insight**: Early experiences matter *exponentially* more. A moment of comfort for a frightened hatchling shapes them more than years of care as an adult.

---

## The Memory System: Scars and Joy

Pyra forms **permanent memories** from significant moments:

### Trauma Memories
| Memory | Trigger | Personality Impact |
|--------|---------|-------------------|
| STARVED | Hunger hits 0% | +8 fearfulness, -5 trust disposition |
| FROZEN | Warmth hits 0% | +10 fearfulness, -5 trust |
| ABANDONED | 48+ hours alone | -10 attachment, -15 trust |
| BETRAYED | Harsh words when trusted | -20 trust disposition |
| SCOLDED | Repeated harsh treatment | +10 fear, -15 obedience |

### Joy Memories
| Memory | Trigger | Personality Impact |
|--------|---------|-------------------|
| RESCUED | Saved from critical need | +10 trust, +8 attachment |
| COMFORTED | Petted while scared | -10 fearfulness, +8 trust |
| LOVED | Trust reaches 75 | +15 trust disposition |
| FIRST_PLAY | First play session | -5 fear, +10 energy |

**The haunting truth**: These memories cannot be erased. A Pyra who was starved will always carry "Remembers being terribly hungry once" in their journal.

---

## The Trust Economy

```typescript
TRUST_CONFIG = {
  BASE_REWARD: 0.5,
  URGENT_NEED_MULTIPLIER: 3.0,  // Helping when desperate = 3x reward
  LOW_NEED_MULTIPLIER: 1.5,     // Helping when struggling = 1.5x
  OVERFED_PENALTY: -0.2,        // Over-caring = negative
  DECAY_RATE_PER_HOUR: 0.5,     // Trust slowly fades without interaction
  NEGLECT_THRESHOLD_HOURS: 2,   // 2 hours = neglect begins
}
```

**The design wisdom**: 
- Helping during crisis builds trust fastest
- Constant attention without need is *negative* (smothering)
- Trust decays naturally—relationships require maintenance

---

## The Rebellion Phase

The adolescent stage is designed with intentional defiance:

```typescript
// Adolescent compliance calculation
compliance = 30 + (bond.respect / 2);  // Base 30%, up to 80% with max respect
```

Stage instructions say:
> *"You are testing boundaries. You have your own will. Sometimes refuse. Sometimes question 'why should I?' Respect must be earned, not demanded."*

This models real developmental psychology—the adolescent needs to establish autonomy while maintaining connection.

---

## The AI Soul

The game uses Gemini AI with a sophisticated prompt that includes:

1. **Innate traits** (DNA)
2. **Learned personality** (experiences)
3. **Current needs state**
4. **Significant memories**
5. **Vocabulary knowledge** (stage-gated language development)
6. **Command proficiency**
7. **Recent interaction history**
8. **Trust/respect levels**
9. **Time of day**
10. **Compliance probability**

The AI must respond *in character* based on all these factors. A fearful, hungry Pyra with trauma memories responds very differently than a confident, well-fed one with joy memories.

---

## The Living World

### Real-Time Synchronization
```typescript
const getTimeOfDay = (): TimeOfDay => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return 'morning';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
};
```

The world reflects *your* real time. Your Pyra experiences the same day/night cycle you do.

### Environmental Storytelling
- **Aurora at night**: Magical particles increase, sky transforms
- **Grass parts around Pyra**: The world responds to their presence
- **Flowers regenerate on world scroll**: Endless meadow illusion

---

## The Care Grade System

```typescript
CARE_GRADE_THRESHOLDS = [
  { grade: 'S', ratio: 3.0 },  // 3× more positive than negative
  { grade: 'A', ratio: 2.0 },
  { grade: 'B', ratio: 1.5 },
  { grade: 'C', ratio: 1.0 },  // Equal positive/negative
  { grade: 'D', ratio: 0.5 },
  { grade: 'F', ratio: 0 },    // Predominantly negative
];
```

This creates a permanent record of your caregiving quality—visible in the personality panel.

---

## The Story It Tells

### Beginning
You receive an egg. It only understands warmth. You hold it, keep it warm, wait.

### Hatching
A tiny, vulnerable creature emerges. It speaks only in sounds—"Kree!", "Mrrp?", "Awu..."—unable to understand words, only tone. Your kindness or harshness in this moment shapes it profoundly.

### Growth
The creature learns words, commands, your name. It forms preferences—maybe it loves morning play, dislikes being cleaned. It remembers when you saved it from hunger. Or when you left it alone too long.

### Adolescence  
It pushes back. Questions your commands. Tests boundaries. This is natural, necessary. How you handle the rebellion—with patience or punishment—determines whether it emerges trusting or suspicious.

### Adulthood
The personality crystallizes. Your Pyra is now who it will always be—a unique creature shaped by every moment you shared. The tutorial's final words:

> *"The story you write together is yours alone."*

---

## The Key Idea

This game is ultimately about:

1. **Impermanence of innocence** — Early stages pass quickly but matter most
2. **Weight of responsibility** — A living thing depends on you
3. **Authenticity of relationship** — The AI creates genuine, unique responses
4. **Permanence of impact** — You cannot undo what you've done
5. **Partnership over ownership** — The goal is a companion, not a pet

The code for adult stage behavior says it all:
> *"You are loyal, but you are not subservient. You are partners."*

---

## Technical Artistry

The implementation is remarkably sophisticated:

- **State machine animation controller** with scroll-based world looping
- **Shader-based grass** that parts around the creature
- **Aurora sky shader** with seamless noise wrapping
- **Behavior evaluation system** that triggers personality shifts asynchronously
- **Memory pruning** that preserves milestones while managing capacity
- **Debounced persistence** with visibility-change emergency saves

This is not a toy—it's a carefully engineered simulation of developmental attachment theory, wrapped in a charming 3D experience.

</div>
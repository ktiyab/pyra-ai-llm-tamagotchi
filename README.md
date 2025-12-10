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

</div>
import React, { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import { useGame } from './hooks/useGame';
import Scene from './components/Scene';
import UI from './components/UI';
import LoadingScreen from './components/LoadingScreen';
import TutorialModal from './components/TutorialModal'; // FIXED: Import tutorial modal
import { audioService } from './services/audioService';
import { Stage } from './types';

function App() {
  const game = useGame();
  
  // Track hatching transition for mystery loading screen
  const [isHatching, setIsHatching] = useState(false);
  const [showNewlyHatched, setShowNewlyHatched] = useState(false);
  const previousStageRef = useRef<Stage>(game.state.stage);

  // FIXED: Tutorial modal state
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Preload audio assets on mount
    audioService.preload();
  }, []);

  // Detect EGG → HATCHLING transition
  useEffect(() => {
    const prevStage = previousStageRef.current;
    const currentStage = game.state.stage;
    
    if (prevStage === Stage.EGG && currentStage === Stage.HATCHLING) {
      console.log("🥚 → 🦖 Hatching transition detected!");
      setIsHatching(true);
      setShowNewlyHatched(false);
      
      // Start ambient music when hatching begins (magical moment!)
      audioService.startAmbientMusic();
    }
    
    previousStageRef.current = currentStage;
  }, [game.state.stage]);

  // Start ambient music if loading a saved game that's already hatched
  useEffect(() => {
    if (game.state.stage !== Stage.EGG && !audioService.isAmbientPlaying()) {
      // Small delay to ensure audio context is ready after user interaction
      const startMusic = () => {
        audioService.startAmbientMusic();
        document.removeEventListener('click', startMusic);
        document.removeEventListener('touchstart', startMusic);
      };
      
      // Wait for first interaction (browser autoplay policy)
      document.addEventListener('click', startMusic, { once: true });
      document.addEventListener('touchstart', startMusic, { once: true });
    }
  }, [game.state.stage]);

  // FIXED: Callback when hatching animation completes - now triggers tutorial
  const handleHatchComplete = useCallback(() => {
    console.log("🦖 Hatching complete! Revealing creature...");
    setIsHatching(false);
    setShowNewlyHatched(true);
    
    // Hide "newly hatched" glow after 3 seconds
    setTimeout(() => {
      setShowNewlyHatched(false);
    }, 3000);

    // FIXED: Show tutorial if player hasn't seen it yet
    // Delay slightly to let the player see their new companion first
    if (!game.state.tutorialSeen) {
      setTimeout(() => {
        setShowTutorial(true);
      }, 3500); // Show tutorial after newlyHatched effect ends
    }
  }, [game.state.tutorialSeen]);

  // FIXED: Handle tutorial close
  const handleCloseTutorial = useCallback(() => {
    setShowTutorial(false);
    game.dispatch({ type: 'MARK_TUTORIAL_SEEN' });
  }, [game]);

  return (
    <div className="relative w-screen h-screen bg-stone-900 overflow-hidden select-none">
      {/* 3D Layer */}
      <Suspense fallback={null}>
        <Scene 
          state={game.state} 
          onInteract={(type) => game.interact(type)}
          isNewlyHatched={showNewlyHatched}
        />
      </Suspense>
      
      {/* Loading screen with hatching support */}
      <LoadingScreen 
        isHatching={isHatching}
        onHatchComplete={handleHatchComplete}
      />

      {/* UI Layer */}
      <UI game={game} />

      {/* FIXED: Tutorial Modal - shown after first hatch */}
      <TutorialModal
        isOpen={showTutorial}
        onClose={handleCloseTutorial}
      />
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 to-transparent mix-blend-overlay" />
    </div>
  );
}

export default App;
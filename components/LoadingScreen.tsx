import React, { useState, useEffect, useCallback } from 'react';
import { useProgress, useGLTF } from '@react-three/drei';
import { TREX_MODEL_URL } from '../constants';

// Preload T-Rex model at app start
useGLTF.preload(TREX_MODEL_URL);

// --- Props Interface ---
interface LoadingScreenProps {
  isHatching?: boolean;
  onHatchComplete?: () => void;
}

// --- Animated Egg SVG Component ---
const AnimatedEgg: React.FC<{ isHatching?: boolean }> = ({ isHatching }) => (
  <svg
    width="80"
    height="100"
    viewBox="0 0 64 80"
    xmlns="http://www.w3.org/2000/svg"
    className={`animated-egg ${isHatching ? 'hatching' : ''}`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="eggGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f9c74f" />
        <stop offset="50%" stopColor="#f4845f" />
        <stop offset="100%" stopColor="#ea580c" />
      </linearGradient>
      
      <radialGradient id="innerGlow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stopColor="#fff7ed" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#fff7ed" stopOpacity="0" />
      </radialGradient>
      
      <radialGradient id="outerAura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#ea580c" stopOpacity="0.4" />
        <stop offset="70%" stopColor="#ea580c" stopOpacity="0.1" />
        <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
      </radialGradient>

      <linearGradient id="highlightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
    </defs>
    
    {/* Layer 1: Outer magical aura */}
    <ellipse
      cx="32"
      cy="44"
      rx="28"
      ry="34"
      fill="url(#outerAura)"
      className="aura-breathe"
    />
    
    {/* Layer 2: Main egg body */}
    <ellipse
      cx="32"
      cy="44"
      rx="22"
      ry="28"
      fill="url(#eggGradient)"
      stroke="#c2410c"
      strokeWidth="1.5"
    />
    
    {/* Layer 3: Inner life glow */}
    <ellipse
      cx="32"
      cy="40"
      rx="14"
      ry="18"
      fill="url(#innerGlow)"
      className="glow-pulse"
    />
    
    {/* Layer 4: Specular highlight */}
    <ellipse
      cx="24"
      cy="32"
      rx="8"
      ry="10"
      fill="url(#highlightGradient)"
    />
    
    {/* Layer 5: Crack lines - more visible during hatching */}
    <g 
      stroke="#92400e" 
      strokeWidth={isHatching ? "2" : "1"} 
      strokeLinecap="round" 
      fill="none" 
      opacity={isHatching ? "0.8" : "0.5"}
      className={isHatching ? 'cracks-intense' : ''}
    >
      <path d="M 26 58 Q 28 54 25 50" />
      <path d="M 38 56 Q 40 52 37 49" />
      <path d="M 32 60 L 33 55" />
      {/* Additional cracks during hatching */}
      {isHatching && (
        <>
          <path d="M 20 45 Q 22 40 18 35" />
          <path d="M 44 42 Q 46 38 42 33" />
          <path d="M 28 30 L 32 25" />
        </>
      )}
    </g>
  </svg>
);

// --- Mystery Text Messages ---
const HATCHING_MESSAGES = [
  "Something stirs within...",
  "A new life awakens...",
  "The shell begins to crack...",
  "Magic is happening...",
  "Your companion emerges..."
];

// --- Main Loading Screen Component ---
const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  isHatching = false, 
  onHatchComplete 
}) => {
  const { progress, active } = useProgress();
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  
  // Hatching-specific state
  const [hatchProgress, setHatchProgress] = useState(0);
  const [hatchMessage, setHatchMessage] = useState(HATCHING_MESSAGES[0]);
  const [messageIndex, setMessageIndex] = useState(0);

  // Reset state when hatching starts
  useEffect(() => {
    if (isHatching) {
      setVisible(true);
      setFadeOut(false);
      setHatchProgress(0);
      setMessageIndex(0);
      setHatchMessage(HATCHING_MESSAGES[0]);
      setMinTimeElapsed(false);
    }
  }, [isHatching]);

  // Minimum display time
  useEffect(() => {
    const duration = isHatching ? 3500 : 1500; // Longer for hatching mystery
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, duration);
    return () => clearTimeout(timer);
  }, [isHatching]);

  // Hatching progress animation (fake progress for suspense)
  useEffect(() => {
    if (!isHatching) return;
    
    const interval = setInterval(() => {
      setHatchProgress(prev => {
        const next = prev + (Math.random() * 8 + 2); // Random increment 2-10%
        return Math.min(100, next);
      });
    }, 150);
    
    return () => clearInterval(interval);
  }, [isHatching]);

  // Cycle through mystery messages during hatching
  useEffect(() => {
    if (!isHatching) return;
    
    const interval = setInterval(() => {
      setMessageIndex(prev => {
        const next = (prev + 1) % HATCHING_MESSAGES.length;
        setHatchMessage(HATCHING_MESSAGES[next]);
        return next;
      });
    }, 800);
    
    return () => clearInterval(interval);
  }, [isHatching]);

  // Handle completion
  useEffect(() => {
    const isComplete = isHatching 
      ? (hatchProgress >= 100 && minTimeElapsed)
      : (progress >= 100 && !active && minTimeElapsed);
    
    if (isComplete) {
      setFadeOut(true);
      const timer = setTimeout(() => {
        setVisible(false);
        if (isHatching && onHatchComplete) {
          onHatchComplete();
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [progress, active, minTimeElapsed, isHatching, hatchProgress, onHatchComplete]);

  if (!visible) return null;

  const displayProgress = isHatching ? hatchProgress : progress;
  const displayText = isHatching ? hatchMessage : `Loading World ${progress.toFixed(0)}%`;

  return (
    <div
      className={`loading-screen ${fadeOut ? 'fade-out' : ''} ${isHatching ? 'hatching-mode' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(displayProgress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={isHatching ? "Egg hatching" : "Loading game world"}
    >
      <style>{`
        .loading-screen {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
          background: #1c1917;
          transition: opacity 0.6s ease-out;
        }
        
        .loading-screen.fade-out {
          opacity: 0;
          pointer-events: none;
        }
        
        /* Hatching mode - more dramatic background */
        .loading-screen.hatching-mode {
          background: radial-gradient(ellipse at center, #2d1f1a 0%, #1c1917 70%);
        }
        
        /* Egg wobble animation */
        .animated-egg {
          transform-origin: center bottom;
          animation: eggWobble 2s ease-in-out infinite;
          filter: drop-shadow(0 4px 20px rgba(234, 88, 12, 0.4));
        }
        
        /* Intense wobble during hatching */
        .animated-egg.hatching {
          animation: eggWobbleIntense 0.3s ease-in-out infinite;
          filter: drop-shadow(0 4px 30px rgba(234, 88, 12, 0.7));
        }
        
        @keyframes eggWobble {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        
        @keyframes eggWobbleIntense {
          0%, 100% { transform: rotate(-6deg) scale(1.02); }
          25% { transform: rotate(4deg) scale(0.98); }
          50% { transform: rotate(-5deg) scale(1.03); }
          75% { transform: rotate(6deg) scale(0.99); }
        }
        
        /* Inner glow pulse animation */
        .glow-pulse {
          transform-origin: center center;
          animation: glowPulse 1.5s ease-in-out infinite;
        }
        
        .hatching .glow-pulse {
          animation: glowPulseIntense 0.5s ease-in-out infinite;
        }
        
        @keyframes glowPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.85); }
          50% { opacity: 0.9; transform: scale(1.1); }
        }
        
        @keyframes glowPulseIntense {
          0%, 100% { opacity: 0.5; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        /* Outer aura breathe animation */
        .aura-breathe {
          transform-origin: center center;
          animation: auraBreathe 3s ease-in-out infinite;
        }
        
        .hatching .aura-breathe {
          animation: auraBreatheIntense 1s ease-in-out infinite;
        }
        
        @keyframes auraBreathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        
        @keyframes auraBreatheIntense {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.4); opacity: 1; }
        }
        
        /* Crack lines pulse during hatching */
        .cracks-intense {
          animation: cracksPulse 0.2s ease-in-out infinite;
        }
        
        @keyframes cracksPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        
        /* Progress bar container */
        .progress-container {
          width: 320px;
          height: 14px;
          background: #44403c;
          border-radius: 7px;
          overflow: hidden;
          box-shadow: 
            inset 0 2px 4px rgba(0, 0, 0, 0.3),
            0 0 20px rgba(234, 88, 12, 0.2);
        }
        
        .hatching-mode .progress-container {
          box-shadow: 
            inset 0 2px 4px rgba(0, 0, 0, 0.3),
            0 0 30px rgba(234, 88, 12, 0.4);
        }
        
        /* Progress bar fill */
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #ea580c, #f97316, #fb923c);
          border-radius: 7px;
          transition: width 0.3s ease-out;
          box-shadow: 0 0 12px rgba(249, 115, 22, 0.6);
          position: relative;
        }
        
        .hatching-mode .progress-bar {
          background: linear-gradient(90deg, #dc2626, #ea580c, #f97316);
          box-shadow: 0 0 20px rgba(249, 115, 22, 0.8);
        }
        
        /* Animated shine on progress bar */
        .progress-bar::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.3) 0%,
            rgba(255, 255, 255, 0) 100%
          );
          border-radius: 7px 7px 0 0;
        }
        
        /* Loading text */
        .loading-text {
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 1.35rem;
          font-weight: 700;
          color: #faf3e0;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-shadow: 0 2px 8px rgba(234, 88, 12, 0.4);
          margin-top: 4px;
          min-height: 2em;
          text-align: center;
        }
        
        /* Mystery text animation during hatching */
        .hatching-mode .loading-text {
          animation: textGlow 0.8s ease-in-out infinite;
          text-transform: none;
          letter-spacing: 0.05em;
          font-style: italic;
        }
        
        @keyframes textGlow {
          0%, 100% { 
            text-shadow: 0 2px 8px rgba(234, 88, 12, 0.4);
            opacity: 0.9;
          }
          50% { 
            text-shadow: 0 2px 20px rgba(234, 88, 12, 0.8);
            opacity: 1;
          }
        }
        
        /* Subtle floating particles */
        .loading-screen::before,
        .loading-screen::after {
          content: '';
          position: absolute;
          width: 4px;
          height: 4px;
          background: #f9c74f;
          border-radius: 50%;
          opacity: 0.6;
          animation: float 4s ease-in-out infinite;
        }
        
        .loading-screen::before {
          top: 35%;
          left: 30%;
          animation-delay: 0s;
        }
        
        .loading-screen::after {
          top: 45%;
          right: 32%;
          animation-delay: 2s;
        }
        
        /* More particles during hatching */
        .hatching-mode::before,
        .hatching-mode::after {
          width: 6px;
          height: 6px;
          animation: floatIntense 2s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 0.8; }
        }
        
        @keyframes floatIntense {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-30px) scale(1.5); opacity: 1; }
        }
      `}</style>

      {/* Animated Egg */}
      <AnimatedEgg isHatching={isHatching} />

      {/* Progress Bar */}
      <div className="progress-container">
        <div 
          className="progress-bar" 
          style={{ width: `${Math.max(2, displayProgress)}%` }} 
        />
      </div>

      {/* Loading/Hatching Text */}
      <div className="loading-text">
        {displayText}
      </div>
    </div>
  );
};

export default LoadingScreen;
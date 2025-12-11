import React, { useEffect, useState, useCallback } from 'react';
import { CelebrationData } from '../types';

interface CelebrationModalProps {
  celebration: CelebrationData | null;
  onDismiss: () => void;
}

// =============================================
// CONFETTI PARTICLE SYSTEM
// =============================================

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  scale: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
}

const CONFETTI_COLORS = [
  '#f97316', '#eab308', '#22c55e', '#3b82f6', 
  '#a855f7', '#ec4899', '#14b8a6', '#f43f5e'
];

const Confetti: React.FC<{ active: boolean }> = ({ active }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }

    // Generate particles
    const newParticles: Particle[] = [];
    for (let i = 0; i < 60; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        rotation: Math.random() * 360,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        scale: 0.5 + Math.random() * 0.5,
        velocityX: (Math.random() - 0.5) * 3,
        velocityY: 2 + Math.random() * 3,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }
    setParticles(newParticles);

    // Animate particles
    const interval = setInterval(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.velocityX,
        y: p.y + p.velocityY,
        rotation: p.rotation + p.rotationSpeed,
        velocityY: p.velocityY + 0.1, // Gravity
      })).filter(p => p.y < 120)); // Remove off-screen
    }, 50);

    return () => clearInterval(interval);
  }, [active]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute w-3 h-3"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: `rotate(${p.rotation}deg) scale(${p.scale})`,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
};

// =============================================
// CELEBRATION MODAL
// =============================================

const CelebrationModal: React.FC<CelebrationModalProps> = ({ celebration, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (celebration) {
      // Trigger entrance animation
      requestAnimationFrame(() => {
        setIsVisible(true);
        setShowConfetti(true);
      });

      // Auto-dismiss after delay (longer for evolutions)
      const duration = celebration.type === 'evolution' ? 8000 : 5000;
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setShowConfetti(false);
    }
  }, [celebration]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setShowConfetti(false);
    setTimeout(onDismiss, 300); // Wait for exit animation
  }, [onDismiss]);

  // Handle click outside or escape
  useEffect(() => {
    if (!celebration) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleDismiss();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [celebration, handleDismiss]);

  if (!celebration) return null;

  const isEvolution = celebration.type === 'evolution' || celebration.type === 'first_word';
  const hasUnlocks = celebration.unlocks && celebration.unlocks.length > 0;

  return (
    <div 
      className={`fixed inset-0 z-[500] flex items-center justify-center p-4 pointer-events-auto
        transition-all duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleDismiss}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 transition-all duration-500
        ${isEvolution ? 'bg-gradient-to-b from-purple-900/90 via-indigo-900/90 to-black/90' : 'bg-black/80'}
        backdrop-blur-md`} 
      />

      {/* Confetti */}
      <Confetti active={showConfetti} />

      {/* Modal Content */}
      <div
        className={`relative max-w-md w-full transition-all duration-500 ease-out
          ${isVisible ? 'scale-100 translate-y-0' : 'scale-75 translate-y-8'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glowing background effect */}
        <div className={`absolute inset-0 rounded-3xl blur-2xl opacity-50
          ${isEvolution ? 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500' : 'bg-orange-500/50'}`} 
        />

        {/* Card */}
        <div className="relative bg-stone-900/95 border border-white/20 rounded-3xl overflow-hidden shadow-2xl">
          
          {/* Emoji Banner */}
          <div className={`relative py-8 flex items-center justify-center
            ${isEvolution 
              ? 'bg-gradient-to-r from-orange-600/30 via-pink-600/30 to-purple-600/30' 
              : 'bg-gradient-to-r from-orange-600/20 to-amber-600/20'}`}>
            
            {/* Animated emoji */}
            <div className="relative">
              <span className={`text-8xl block animate-bounce drop-shadow-2xl
                ${isEvolution ? 'animate-[bounce_0.5s_ease-in-out_infinite]' : ''}`}>
                {celebration.emoji}
              </span>
              
              {/* Sparkle effects around emoji */}
              <div className="absolute -inset-4 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-300 rounded-full animate-ping" />
                <div className="absolute top-1/4 right-0 w-1.5 h-1.5 bg-pink-300 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                <div className="absolute bottom-1/4 left-0 w-2 h-2 bg-cyan-300 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
                <div className="absolute bottom-0 right-1/4 w-1.5 h-1.5 bg-purple-300 rounded-full animate-ping" style={{ animationDelay: '0.9s' }} />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 text-center space-y-4">
            {/* Title */}
            <h1 className={`font-black tracking-tight
              ${isEvolution ? 'text-4xl' : 'text-3xl'}
              bg-gradient-to-r from-orange-200 via-amber-200 to-yellow-200 
              bg-clip-text text-transparent`}>
              {celebration.title}
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-stone-300">
              {celebration.subtitle}
            </p>

            {/* Unlocks (for evolutions) */}
            {hasUnlocks && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-stone-500 uppercase tracking-wider mb-3">
                  ✨ New Abilities Unlocked
                </p>
                <div className="space-y-2">
                  {celebration.unlocks!.map((unlock, i) => (
                    <div 
                      key={i}
                      className="flex items-center justify-center gap-2 text-stone-200 
                        animate-in fade-in slide-in-from-bottom duration-300"
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      <span className="text-green-400">✓</span>
                      <span>{unlock}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dismiss hint */}
            <p className="text-xs text-stone-600 pt-4">
              Tap anywhere to continue
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CelebrationModal;
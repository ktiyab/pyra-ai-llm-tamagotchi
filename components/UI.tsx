import React, { useState, useRef, useEffect } from 'react';
import { GameState, Stage, GameContextType, TimeOfDay, PointNotification, LearnedPersonality, SignificantMemory, PersonalityDimension, CareGrade } from '../types';
import { audioService } from '../services/audioService';
import { POINT_NOTIFICATION_CONFIG, PERSONALITY_CONFIG, PERSONALITY_DESCRIPTORS } from '../constants';

interface UIProps {
  game: GameContextType;
}

// --- Icons (Raw SVG for zero dependencies) ---
const Icons = {
  Heart: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
  ),
  Meat: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 5c-1.5 0-2.8 0.6-3.8 1.5l-8 8.1c-1.6 1.6-1.6 4.1 0 5.7l0 0c1.6 1.6 4.1 1.6 5.7 0l8.1-8c0.9-1 1.5-2.2 1.5-3.8 0-2.5-2-4.5-4.5-4.5-0.4 0-0.7 0-1 0.1L15 2 13 4l4.4 4.4c0.1 0.3 0.1 0.7 0.1 1 0 1.3-1 2.3-2.3 2.3-0.4 0-0.7-0.1-1-0.2l-1.9 1.9c1.6 1.6 4.1 1.6 5.7 0l0 0c1.6-1.6 1.6-4.1 0-5.7L19 5Z"/></svg>
  ),
  Ball: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
  ),
  Flame: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.1.2-2.2.5-3.3.3-1.09.533-2.167-.5-3.2"/></svg>
  ),
  Sparkles: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/></svg>
  ),
  Send: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
  ),
  Mic: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6"/></svg>
  ),
  ChevronUp: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m18 15-6-6-6 6"/></svg>
  ),
  HandHeart: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 20.4a1 1 0 0 1-1.3 0l-1-1.1c-1.6-1.7-2.7-2.9-2.7-4.4 0-1.1.9-2 2-2 .6 0 1.2.2 1.6.7l.4.5.4-.5c.4-.4 1-.7 1.6-.7 1.1 0 2 .9 2 2 0 1.5-1.1 2.7-2.7 4.4l-1 1.1z" /><path d="M17 21h4a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-3l-2.5-4.2a2 2 0 0 0-3.4 2l1.9 3.2" /><path d="M3 12h1" /></svg>
  ),
  Volume2: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="20" height="20"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
  ),
  VolumeX: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="20" height="20"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>
  ),
  RotateCcw: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="20" height="20"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
  ),
  Brain: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
  ),
  Book: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
  ),
  X: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
};

// --- Helpers ---
const getStatDescriptor = (value: number) => {
  if (value >= 96) return "Full";
  if (value >= 81) return "Great";
  if (value >= 61) return "Good";
  if (value >= 41) return "Okay";
  if (value >= 21) return "Low";
  return "Very Low";
};

// =============================================
// CARE GRADE COLORS & LABELS
// =============================================
const CARE_GRADE_CONFIG: Record<CareGrade, { color: string; bg: string; label: string }> = {
  'S': { color: '#fbbf24', bg: 'bg-amber-500/20', label: 'Exceptional' },
  'A': { color: '#22c55e', bg: 'bg-green-500/20', label: 'Great' },
  'B': { color: '#3b82f6', bg: 'bg-blue-500/20', label: 'Good' },
  'C': { color: '#a1a1aa', bg: 'bg-zinc-500/20', label: 'Average' },
  'D': { color: '#f97316', bg: 'bg-orange-500/20', label: 'Poor' },
  'F': { color: '#ef4444', bg: 'bg-red-500/20', label: 'Failing' },
};

// =============================================
// POINT TOAST COMPONENT
// =============================================
interface PointToastProps {
  notification: PointNotification;
  index: number;
  onComplete: (id: string) => void;
}

const PointToast: React.FC<PointToastProps> = ({ notification, index, onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  const isPositive = notification.value > 0;
  const displayValue = isPositive ? `+${notification.value.toFixed(1)}` : notification.value.toFixed(1);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    const exitTimer = setTimeout(() => setIsExiting(true), POINT_NOTIFICATION_CONFIG.DISPLAY_DURATION_MS);
    const removeTimer = setTimeout(() => onComplete(notification.id), POINT_NOTIFICATION_CONFIG.DISPLAY_DURATION_MS + POINT_NOTIFICATION_CONFIG.FADE_DURATION_MS);
    return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); };
  }, [notification.id, onComplete]);

  const yOffset = index * POINT_NOTIFICATION_CONFIG.STACK_OFFSET_PX;

  return (
    <div
      className={`fixed z-[200] pointer-events-none select-none transition-all duration-500 ease-out
        ${isVisible && !isExiting ? 'opacity-100 translate-x-0' : 'opacity-0'}
        ${isExiting ? '-translate-y-8' : ''} ${!isVisible && !isExiting ? 'translate-x-8' : ''}`}
      style={{ 
        // FIXED: Moved to top-right to avoid overlap with 3D speech/emote bubbles
        top: `${80 + yOffset}px`, 
        right: '20px',
        transform: isExiting ? 'translateY(-32px) scale(0.9)' : isVisible ? 'translateY(0)' : 'translateY(16px)'
      }}
    >
      {/* FIXED: Compact layout for right-side positioning */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-xl border-2 transition-all duration-300
        ${isPositive ? 'bg-emerald-950/80 border-emerald-500/50 shadow-emerald-500/20' : 'bg-red-950/80 border-red-500/50 shadow-red-500/20'}`}>
        <div className={`text-xl font-black ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>{isPositive ? '↑' : '↓'}</div>
        <div className={`text-2xl font-black tracking-tight ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>{displayValue}</div>
        <div className="flex flex-col">
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: notification.color }}>{notification.label}</span>
          {notification.reason && <span className="text-[10px] text-white/60 italic max-w-[100px] truncate">{notification.reason}</span>}
        </div>
      </div>
    </div>
  );
};

const PointNotifications: React.FC<{ notifications: PointNotification[]; onRemove: (id: string) => void }> = ({ notifications, onRemove }) => {
  const visibleNotifications = notifications.slice(-POINT_NOTIFICATION_CONFIG.MAX_VISIBLE);
  return <>{visibleNotifications.map((n, i) => <PointToast key={n.id} notification={n} index={i} onComplete={onRemove} />)}</>;
};

// =============================================
// PERSONALITY DIMENSION BAR
// =============================================
interface PersonalityBarProps {
  dimension: PersonalityDimension;
  value: number;
}

const PersonalityBar: React.FC<PersonalityBarProps> = ({ dimension, value }) => {
  const desc = PERSONALITY_DESCRIPTORS[dimension];
  const percentage = ((value + 100) / 200) * 100;
  const isNotable = Math.abs(value) >= PERSONALITY_CONFIG.NOTABLE_THRESHOLD;
  
  const getColor = () => {
    if (value <= -60) return '#ef4444';
    if (value <= -30) return '#f97316';
    if (value < 30) return '#a1a1aa';
    if (value < 60) return '#22c55e';
    return '#3b82f6';
  };

  const label = value < 0 ? desc.negativeLabel : desc.positiveLabel;

  return (
    <div className="group relative">
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="text-stone-500 uppercase tracking-wider">{dimension}</span>
        <span className={`font-bold ${isNotable ? 'text-white' : 'text-stone-500'}`} style={{ color: isNotable ? getColor() : undefined }}>
          {value > 0 ? '+' : ''}{value}
        </span>
      </div>
      <div className="h-1.5 w-full bg-stone-800 rounded-full overflow-hidden relative">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-stone-600 z-10" />
        <div
          className="absolute top-0 bottom-0 rounded-full transition-all duration-500"
          style={{
            left: value < 0 ? `${percentage}%` : '50%',
            width: `${Math.abs(value) / 2}%`,
            backgroundColor: getColor(),
            boxShadow: isNotable ? `0 0 8px ${getColor()}60` : 'none',
          }}
        />
      </div>
      <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-stone-900/95 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 text-xs">
        <div className="font-bold" style={{ color: getColor() }}>{label}</div>
        <div className="text-stone-400 mt-1">{value < 0 ? desc.negative : desc.positive}</div>
      </div>
    </div>
  );
};

// =============================================
// PERSONALITY PANEL
// =============================================
interface PersonalityPanelProps {
  personality: LearnedPersonality;
  dominantTraits: string[];
  careGrade: CareGrade;
  onOpenMemories: () => void;
}

const PersonalityPanel: React.FC<PersonalityPanelProps> = ({ personality, dominantTraits, careGrade, onOpenMemories }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const gradeConfig = CARE_GRADE_CONFIG[careGrade];

  return (
    <div className="bg-stone-900/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-2">
          <Icons.Brain className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">Personality</span>
        </div>
        <div className="flex items-center gap-2">
          {/* FIXED: Added label inline to explain care grade meaning */}
          <div className={`px-2 py-0.5 rounded text-xs font-black ${gradeConfig.bg} flex items-center gap-1`} style={{ color: gradeConfig.color }}>
            <span>{careGrade}</span>
            <span className="font-medium opacity-80">·</span>
            <span className="font-medium">{gradeConfig.label}</span>
          </div>
          {isExpanded ? <Icons.ChevronUp className="w-4 h-4 text-stone-500" /> : <Icons.ChevronDown className="w-4 h-4 text-stone-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {dominantTraits.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dominantTraits.map(trait => (
                <span key={trait} className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-[10px] text-purple-300 font-medium capitalize">
                  {trait}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {(Object.keys(personality) as PersonalityDimension[]).map(dim => (
              <PersonalityBar key={dim} dimension={dim} value={personality[dim]} />
            ))}
          </div>

          <button onClick={onOpenMemories} className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors">
            <Icons.Book className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-stone-300">View Memories</span>
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================
// OBEDIENCE HISTORY PANEL (Training/Commands)
// =============================================

interface ObedienceHistoryPanelProps {
  obedienceHistory: ObedienceRecord[];
  stage: Stage;
}

const ObedienceHistoryPanel: React.FC<ObedienceHistoryPanelProps> = ({ obedienceHistory, stage }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isEgg = stage === Stage.EGG;
  const isHatchling = stage === Stage.HATCHLING;
  const canUnderstandCommands = !isEgg && !isHatchling;
  
  const recentCommands = obedienceHistory.slice(-5);
  const successCount = recentCommands.filter(r => r.result === 'obeyed' || r.result === 'partial').length;
  const successRate = recentCommands.length > 0 ? Math.round((successCount / recentCommands.length) * 100) : 0;
  
  const getResultDisplay = (result: 'obeyed' | 'partial' | 'refused' | 'ignored') => {
    switch (result) {
      case 'obeyed': return { icon: '✓', color: 'text-green-400', label: 'obeyed' };
      case 'partial': return { icon: '~', color: 'text-yellow-400', label: 'tried' };
      case 'refused': return { icon: '✗', color: 'text-red-400', label: 'refused' };
      case 'ignored': return { icon: '?', color: 'text-stone-500', label: 'ignored' };
    }
  };
  
  const getCommandHints = (): string[] => {
    switch (stage) {
      case Stage.PUPPY: return ['come', 'sit', 'stay'];
      case Stage.JUVENILE: return ['come', 'sit', 'stay', 'speak', 'fetch'];
      case Stage.ADOLESCENT: return ['come', 'sit', 'stay', 'speak', 'quiet'];
      case Stage.ADULT: return ['come', 'sit', 'stay', 'speak', 'fetch', 'quiet'];
      default: return [];
    }
  };

  return (
    <div className="bg-stone-900/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
      <button 
        onClick={() => setIsExpanded(!isExpanded)} 
        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">🎓</span>
          <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">Training</span>
        </div>
        <div className="flex items-center gap-2">
          {canUnderstandCommands && recentCommands.length > 0 && (
            <span className={`text-xs font-bold ${
              successRate >= 70 ? 'text-green-400' : 
              successRate >= 40 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {successRate}%
            </span>
          )}
          {isExpanded ? <Icons.ChevronUp className="w-4 h-4 text-stone-500" /> : <Icons.ChevronDown className="w-4 h-4 text-stone-500" />}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-3">
          {isEgg && (
            <div className="text-xs text-stone-500 italic text-center py-2">
              The egg cannot hear commands yet...
            </div>
          )}
          
          {isHatchling && (
            <div className="text-xs text-stone-500 italic text-center py-2">
              Pyra is too young to understand commands. Wait until Puppy stage.
            </div>
          )}
          
          {canUnderstandCommands && (
            <>
              {recentCommands.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[10px] text-stone-500 uppercase tracking-wider">Recent Commands</div>
                  {recentCommands.map((record, idx) => {
                    const display = getResultDisplay(record.result);
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-2 py-1.5">
                        <span className="text-stone-300">"{record.command}"</span>
                        <span className={`${display.color} font-medium`}>
                          {display.icon} {display.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-stone-500 italic text-center py-2">
                  No commands given yet. Try talking to Pyra!
                </div>
              )}
              
              <div className="pt-2 border-t border-white/5">
                <div className="text-[10px] text-stone-500 uppercase tracking-wider mb-1.5">Try saying in chat:</div>
                <div className="flex flex-wrap gap-1.5">
                  {getCommandHints().map(cmd => (
                    <span key={cmd} className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-[10px] text-purple-300">
                      "Pyra, {cmd}!"
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================
// MEMORY JOURNAL MODAL - FIXED
// =============================================
interface MemoryJournalProps {
  memories: SignificantMemory[];
  isOpen: boolean;
  onClose: () => void;
}

const MemoryJournal: React.FC<MemoryJournalProps> = ({ memories, isOpen, onClose }) => {
  // FIXED: Add keyboard handler for Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categorized = {
    achievement: memories.filter(m => m.category === 'achievement'),
    joy: memories.filter(m => m.category === 'joy'),
    trauma: memories.filter(m => m.category === 'trauma'),
    bonding: memories.filter(m => m.category === 'bonding'),
    learning: memories.filter(m => m.category === 'learning'),
  };

  const categoryConfig = {
    achievement: { icon: '🏆', label: 'Milestones', color: 'text-amber-400' },
    joy: { icon: '☀️', label: 'Happy Memories', color: 'text-green-400' },
    trauma: { icon: '🌧️', label: 'Difficult Memories', color: 'text-red-400' },
    bonding: { icon: '💕', label: 'Bonding Moments', color: 'text-pink-400' },
    learning: { icon: '📚', label: 'Things Learned', color: 'text-blue-400' },
  };

  const formatTimestamp = (ts: number) => {
    const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return `${Math.floor(days / 7)} weeks ago`;
  };

  return (
    // FIXED: Added pointer-events-auto to make modal interactive
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      {/* FIXED: Added onClick stopPropagation to prevent backdrop close when clicking modal content */}
      <div 
        className="relative w-full max-w-lg max-h-[80vh] bg-stone-900/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Icons.Book className="w-6 h-6 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Memory Journal</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <Icons.X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {memories.length === 0 ? (
            <div className="text-center py-8 text-stone-500 italic">
              No memories yet. Your story is just beginning...
            </div>
          ) : (
            Object.entries(categorized).map(([cat, mems]) => {
              if (mems.length === 0) return null;
              const config = categoryConfig[cat as keyof typeof categoryConfig];
              
              return (
                <div key={cat}>
                  <div className={`flex items-center gap-2 mb-2 ${config.color}`}>
                    <span>{config.icon}</span>
                    <span className="text-sm font-bold uppercase tracking-wider">{config.label}</span>
                    <span className="text-xs text-stone-500">({mems.length})</span>
                  </div>
                  <div className="space-y-2">
                    {mems.map(mem => (
                      <div key={mem.id} className="p-3 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-stone-200">{mem.narrative}</p>
                          {mem.isMilestone && <span className="text-amber-400">⭐</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-stone-500">
                          <span>{formatTimestamp(mem.timestamp)}</span>
                          <span>•</span>
                          <span className="capitalize">{mem.stageWhenFormed}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================
// MOOD INDICATOR
// =============================================
const MoodIndicator = ({ emotion }: { emotion: string }) => {
  const getMoodColor = (e: string) => {
    switch (e) {
      case 'excited': case 'proud': case 'content': return '#f4845f';
      case 'curious': case 'neutral': return '#577590';
      case 'scared': case 'hurt': case 'sick': return '#a78bfa';
      case 'tired': return '#64748b';
      case 'demanding': return '#e07a5f';
      default: return '#577590';
    }
  };
  const color = getMoodColor(emotion);

  return (
    <div className="relative group cursor-help">
      <div className="w-6 h-6 rounded-full transition-colors duration-1000 shadow-[0_0_12px_currentColor]" style={{ backgroundColor: color, color }}>
        <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: color }} />
      </div>
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-stone-900/95 border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        <div className="text-xs text-stone-300">Mood: <span className="font-bold text-white capitalize">{emotion}</span></div>
      </div>
    </div>
  );
};

// =============================================
// STAT ROW
// =============================================
const StatRow = ({ emoji, label, value, colorBase, tooltipText, isTrust = false }: { emoji?: string; label: string; value: number; colorBase: string; tooltipText: string; isTrust?: boolean }) => {
  const descriptor = getStatDescriptor(value);
  const isCritical = value < 20;

  return (
    <div className="group relative flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between text-xs mb-1">
        <div className="flex items-center gap-2">
          {emoji && <span className={`text-base transition-all duration-500 ${isCritical ? 'animate-pulse' : ''}`}>{emoji}</span>}
          <span className="font-bold tracking-wider text-stone-400 group-hover:text-stone-200 transition-colors uppercase text-[10px]">{label}</span>
        </div>
        <span className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: colorBase }}>{descriptor}</span>
      </div>
      <div className="h-2 w-full bg-stone-800/50 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm">
        <div className={`h-full rounded-full transition-all duration-700 ease-out relative ${isCritical ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.max(5, value)}%`, backgroundColor: isCritical ? '#ef4444' : colorBase, boxShadow: `0 0 10px ${isCritical ? '#ef4444' : colorBase}40` }}>
          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/30" />
        </div>
      </div>
      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 w-48 p-3 bg-stone-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 pointer-events-none z-50">
        <div className="text-xs font-bold text-white mb-1">{label}: <span style={{ color: colorBase }}>{descriptor}</span></div>
        <div className="text-[10px] text-stone-400 leading-relaxed italic">"{tooltipText}"</div>
      </div>
    </div>
  );
};

// =============================================
// STATS PANEL
// =============================================
const StatsPanel = ({ game, onOpenMemories }: { game: GameContextType; onOpenMemories: () => void }) => {
  const { state } = game;
  const [isExpanded, setIsExpanded] = useState(false);
  const isEgg = state.stage === Stage.EGG;
  const isSleeping = state.timeOfDay === 'night' || state.currentEmotion === 'tired';

  return (
    <div className={`pointer-events-auto transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
      ${isExpanded ? 'h-auto' : 'h-[68px] md:h-auto'} w-full md:w-[260px] bg-stone-900/70 backdrop-blur-xl border border-white/10 rounded-b-[20px] md:rounded-[24px] shadow-2xl overflow-hidden flex flex-col`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-5 cursor-pointer md:cursor-default shrink-0" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${isSleeping ? 'bg-amber-400' : 'bg-green-400'} animate-pulse`} />
            <div className={`absolute inset-0 rounded-full ${isSleeping ? 'bg-amber-400' : 'bg-green-400'} animate-ping opacity-40`} />
          </div>
          <div>
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-orange-500 leading-none">
              {state.name || (isEgg ? 'Mystery Egg' : 'Pyra')}
            </h1>
            <div className="text-[10px] text-stone-400 uppercase tracking-widest font-bold mt-0.5 opacity-60">{state.stage}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MoodIndicator emotion={state.currentEmotion} />
          <div className="md:hidden text-stone-500">{isExpanded ? <Icons.ChevronUp className="w-4 h-4" /> : <Icons.ChevronDown className="w-4 h-4" />}</div>
        </div>
      </div>

      {/* Stats Content */}
      <div className={`flex flex-col gap-4 px-5 pb-5 pt-1 transition-all duration-500
        ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 md:opacity-100 md:translate-y-0 hidden md:flex'}`}>
        
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <StatRow emoji="🔥" label="Warmth" value={state.needs.warmth} colorBase="#f9c74f" tooltipText={state.needs.warmth < 30 ? "Brrr! It's cold." : "Cozy and warm."} />

        {isEgg ? (
          <StatRow emoji="✨" label="Growth" value={state.eggCrackLevel} colorBase="#a78bfa" tooltipText="Life stirs inside..." />
        ) : (
          <>
            <StatRow emoji="🍖" label="Hunger" value={state.needs.hunger} colorBase="#f9c74f" tooltipText={state.needs.hunger < 30 ? "Running on empty!" : "Belly full."} />
            <StatRow emoji="❤️" label="Love" value={state.needs.attention} colorBase="#f4845f" tooltipText="Heart needs filling." />
            <StatRow emoji="⚽" label="Energy" value={state.needs.play} colorBase="#90be6d" tooltipText={state.needs.play < 30 ? "Needs to play!" : "Feeling energetic."} />
            <StatRow emoji="🛡️" label="Trust" value={state.bond.trust} colorBase="#577590" tooltipText="Trust grows slowly." isTrust />
            <StatRow emoji="👑" label="Respect" value={state.bond.respect} colorBase="#9b59b6" tooltipText="Earned through training." isTrust />

            {/* Personality Panel */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <PersonalityPanel
              personality={state.learnedBehavior.personality}
              dominantTraits={state.learnedBehavior.aggregates.dominantTraits}
              careGrade={state.learnedBehavior.aggregates.careGrade}
              onOpenMemories={onOpenMemories}
            />
            {/* FIXED: Added Obedience History Panel for training discoverability */}
            <ObedienceHistoryPanel
              obedienceHistory={state.obedienceHistory}
              stage={state.stage}
            />            
          </>
        )}
      </div>
    </div>
  );
};

// =============================================
// ACTION BUTTON
// =============================================
interface ActionButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
  cooldownSeconds?: number;
  disabled?: boolean;
  urgent?: boolean;
  tooltipText?: string;
}

const ActionButton = ({ onClick, icon, label, color, cooldownSeconds = 0, disabled = false, urgent = false, tooltipText }: ActionButtonProps) => {
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (disabled || cooldownRemaining > 0) return;
    onClick();
    if (cooldownSeconds > 0) {
      setCooldownRemaining(cooldownSeconds);
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
      cooldownTimer.current = setInterval(() => {
        setCooldownRemaining(prev => {
          if (prev <= 1) { if (cooldownTimer.current) clearInterval(cooldownTimer.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  };

  useEffect(() => { return () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); }; }, []);

  const isCooldown = cooldownRemaining > 0;
  const progress = cooldownSeconds > 0 ? 1 - (cooldownRemaining / cooldownSeconds) : 1;

  const getBackgroundStyle = () => {
    if (isCooldown) return { background: `conic-gradient(from 0deg, ${color}CC ${progress * 100}%, rgba(255,255,255,0.1) 0)`, borderColor: 'transparent' };
    if (urgent) return { background: `${color}20`, boxShadow: `0 0 15px ${color}40`, borderColor: `${color}40` };
    return { background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.1)' };
  };

  return (
    <div className="relative group w-12 h-12 flex items-center justify-center">
      <div className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-2 bg-stone-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-xl opacity-0 ${!isCooldown && 'group-hover:opacity-100'} transition-all duration-200 pointer-events-none z-50 w-max max-w-[140px] text-center`}>
        <div className="text-xs font-bold" style={{ color }}>{label}</div>
        {tooltipText && <div className="text-[10px] text-stone-400 mt-0.5">{tooltipText}</div>}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-stone-900/95" />
      </div>
      <button onClick={handleClick} disabled={disabled || isCooldown}
        className={`absolute inset-0 w-full h-full rounded-full flex items-center justify-center z-10 p-0 transition-all duration-200 border
          ${isCooldown ? 'cursor-not-allowed' : 'cursor-pointer hover:border-opacity-50 hover:bg-white/15 active:scale-95'} ${urgent ? 'animate-pulse' : ''}`}
        style={getBackgroundStyle()}>
        <div className={`transition-all duration-300 ${isCooldown ? 'grayscale opacity-40 scale-90' : 'grayscale-0 opacity-100 scale-100'}`}
          style={{ color: isCooldown ? undefined : (urgent ? color : '#faf3e0') }}>{icon}</div>
      </button>
      <span className={`absolute left-1/2 -translate-x-1/2 top-full mt-1.5 text-[10px] font-medium tracking-wide uppercase whitespace-nowrap pointer-events-none max-w-[64px] truncate md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 ${isCooldown ? 'text-stone-500' : 'text-stone-400'}`}>
        {isCooldown ? `${cooldownRemaining}s` : label}
      </span>
    </div>
  );
};

// =============================================
// ACTION BAR
// =============================================
const ActionBar = ({ game }: { game: GameContextType }) => {
  const { state, interact } = game;
  const isEgg = state.stage === Stage.EGG;
  if (isEgg) return null;

  let contextualAction = null;
  const isSad = ['sad', 'scared', 'hurt'].includes(state.currentEmotion);
  if (isSad) {
    contextualAction = (
      <ActionButton key="comfort" label="Comfort" icon={<Icons.HandHeart className="w-6 h-6" />} color="#f8a5c2" onClick={() => interact('pet')} urgent tooltipText="Pyra needs comfort." cooldownSeconds={15} />
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-4 px-4 pt-3 pb-7 bg-stone-900/70 backdrop-blur-xl border border-white/10 rounded-[32px] shadow-2xl shadow-black/40 transition-all duration-300">
      <ActionButton label="Feed" icon={<Icons.Meat className="w-6 h-6" />} color="#f9c74f" onClick={() => interact('feed')} cooldownSeconds={30} urgent={state.needs.hunger < 30} tooltipText={state.needs.hunger < 30 ? "Hungry!" : "Give a snack."} />
      <ActionButton label="Clean" icon={<Icons.Sparkles className="w-6 h-6" />} color="#38bdf8" onClick={() => interact('clean')} cooldownSeconds={5} urgent={state.needs.cleanliness < 40} tooltipText={state.needs.cleanliness < 40 ? "Messy!" : "Keep tidy."} />
      <ActionButton label="Love" icon={<Icons.Heart className="w-6 h-6" />} color="#f4845f" onClick={() => interact('pet')} cooldownSeconds={10} urgent={state.needs.attention < 30} tooltipText="Show affection." />
      <ActionButton label="Play" icon={<Icons.Ball className="w-6 h-6" />} color="#90be6d" onClick={() => interact('play')} cooldownSeconds={45} urgent={state.needs.play < 30} tooltipText="Play fetch!" />
      {/* FIXED: Added Warm button - warmth decays post-hatch but had no UI to replenish */}
      <ActionButton label="Warm" icon={<Icons.Flame className="w-6 h-6" />} color="#f97316" onClick={() => interact('warm')} cooldownSeconds={20} urgent={state.needs.warmth < 30} tooltipText={state.needs.warmth < 30 ? "Cold!" : "Keep cozy."} />
      {contextualAction && (
        <>
          <div className="w-px h-8 bg-white/10 mx-1" />
          <div className="animate-in slide-in-from-right fade-in duration-300">{contextualAction}</div>
        </>
      )}
    </div>
  );
};

// =============================================
// MAIN UI COMPONENT
// =============================================
const UI: React.FC<UIProps> = ({ game }) => {
  const { state, interact, sendMessage, resetGame, isProcessing, startRecording, stopRecording, isRecording, dispatch } = game;
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(!audioService.isAmbientPlaying());
  const [showMemories, setShowMemories] = useState(false);

  useEffect(() => { if (state.stage === Stage.HATCHLING) setIsMuted(false); }, [state.stage]);

  const toggleSound = () => {
    if (isMuted) { audioService.startAmbientMusic(); setIsMuted(false); }
    else { audioService.stopAmbientMusic(); setIsMuted(true); }
  };

  const handleRemoveNotification = (id: string) => dispatch({ type: 'REMOVE_POINT_NOTIFICATION', payload: id });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [state.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isProcessing) { sendMessage(chatInput.trim()); setChatInput(''); }
  };

  const isEgg = state.stage === Stage.EGG;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-0 md:p-6 overflow-hidden">
      
      {/* Point Notifications */}
      <PointNotifications notifications={state.pointNotifications} onRemove={handleRemoveNotification} />
      
      {/* Memory Journal Modal - FIXED: Now properly interactive */}
      <MemoryJournal memories={state.learnedBehavior.memories} isOpen={showMemories} onClose={() => setShowMemories(false)} />

      {/* TOP AREA */}
      <div className="pointer-events-auto w-full flex flex-col md:flex-row items-start justify-between gap-4 relative z-50">
        <StatsPanel game={game} onOpenMemories={() => setShowMemories(true)} />

        {/* Control Buttons */}
        <div className="flex items-center gap-2 p-2 bg-black/30 backdrop-blur-xl border border-white/10 rounded-full shadow-lg">
          <button onClick={toggleSound} className="group p-2.5 rounded-full bg-transparent hover:bg-orange-500/20 border border-transparent hover:border-orange-500/50 transition-all" title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <Icons.VolumeX className="w-5 h-5 text-stone-500 group-hover:text-orange-400 transition-colors" /> : <Icons.Volume2 className="w-5 h-5 text-orange-400 group-hover:text-orange-300 transition-colors" />}
          </button>
          <div className="hidden md:block w-px h-5 bg-white/10" />
          <button onClick={resetGame} className="hidden md:flex group p-2.5 rounded-full bg-transparent hover:bg-red-500/20 border border-transparent hover:border-red-500/50 transition-all" title="Reset">
            <Icons.RotateCcw className="w-5 h-5 text-stone-500 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* BOTTOM AREA */}
      <div className="flex flex-col-reverse md:flex-row items-end justify-between w-full gap-4 mt-auto pointer-events-auto p-4 md:p-0">
        
        {/* Action Bar */}
        <div className="w-full md:w-auto flex justify-center md:justify-start">
          {isEgg ? (
            <button onMouseDown={() => interact('warm')} className="relative group overflow-hidden bg-gradient-to-br from-orange-600 to-red-600 text-white font-bold py-4 px-12 rounded-full shadow-2xl shadow-orange-900/50 transform active:scale-95 transition-all border border-orange-400/50">
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-2"><Icons.Flame className="w-6 h-6 animate-pulse" /><span>Hold to Warm</span></div>
            </button>
          ) : (
            <ActionBar game={game} />
          )}
        </div>

        {/* Chat */}
        <div className="flex flex-col w-full md:w-[400px] h-[250px] md:h-[300px] gap-2">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide mask-gradient-b">
            {state.messages.length === 0 && <div className="text-center text-stone-500 text-lg mt-10 italic opacity-50">The bond begins with a single word...</div>}
            {state.messages.map((msg) => {
              if (msg.role === 'narrator') {
                return (
                  <div key={msg.id} className="flex justify-center my-2">
                    <div className="bg-indigo-900/30 backdrop-blur-md border border-indigo-500/20 text-indigo-200 text-base md:text-lg italic px-4 py-2 rounded-full shadow-lg text-center">{msg.text}</div>
                  </div>
                );
              }
              return (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-5 py-3 rounded-2xl text-lg shadow-md backdrop-blur-sm border 
                    ${msg.role === 'user' ? 'bg-orange-500/90 text-white rounded-br-sm border-orange-400/50' : 'bg-stone-800/60 text-stone-100 rounded-bl-sm border-white/10'}`}>
                    {msg.text}
                  </div>
                </div>
              );
            })}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 bg-stone-800/40 border border-white/5 px-3 py-2 rounded-2xl rounded-bl-none">
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSend} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center bg-black/60 backdrop-blur-xl border border-white/10 rounded-full p-2 shadow-xl focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/30 transition-all">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={isEgg ? "Sing to the egg..." : `Talk to ${state.name || 'Pyra'}...`} className="flex-1 bg-transparent text-stone-100 placeholder-stone-500 focus:outline-none text-lg px-4" />
              <button type="button" onClick={isRecording ? stopRecording : startRecording} disabled={isProcessing}
                className={`p-2 rounded-full mr-1 transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-transparent text-stone-400 hover:text-white'}`}>
                <Icons.Mic className="w-5 h-5" />
              </button>
              <button type="submit" disabled={isProcessing || (!chatInput.trim() && !isRecording)} className="p-3 rounded-full bg-stone-700/50 text-stone-400 hover:bg-orange-500 hover:text-white disabled:opacity-30 disabled:hover:bg-stone-700/50 disabled:hover:text-stone-400 transition-all">
                <Icons.Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UI;
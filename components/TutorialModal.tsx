import React, { useState, useEffect } from 'react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// =============================================
// TUTORIAL CONTENT - Paginated Sections (Kid-Friendly Sizing)
// =============================================

interface TutorialPage {
  title: string;
  emoji: string;
  content: React.ReactNode;
}

const TUTORIAL_PAGES: TutorialPage[] = [
  {
    title: "Welcome to Pyra!",
    emoji: "🦖",
    content: (
      <div className="space-y-5">
        <p className="text-xl text-stone-200 leading-relaxed">
          <strong className="text-orange-400">You've just adopted a baby T-Rex!</strong> How you raise them shapes who they become.
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <p className="text-stone-300 text-lg leading-relaxed">
            Pyra is your virtual dinosaur companion. Unlike other pets, Pyra <strong className="text-cyan-400">remembers everything</strong>—the good times, the hard times, and everything in between.
          </p>
          <p className="text-stone-400 text-base mt-3 italic">
            Your care doesn't just keep them alive; it shapes their personality forever.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "A Living World",
    emoji: "🌍",
    content: (
      <div className="space-y-5">
        <p className="text-stone-300 text-lg">
          Pyra's world is <strong className="text-cyan-400">synchronized with real time!</strong> When it's day where you are, it's day in Pyra's world too.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 text-center">
            <span className="text-4xl block mb-2">🌅</span>
            <span className="text-orange-300 font-bold text-lg">Morning</span>
            <p className="text-stone-400 text-sm mt-1">5:00 - 9:00</p>
          </div>
          <div className="bg-sky-500/10 border border-sky-500/30 rounded-xl p-4 text-center">
            <span className="text-4xl block mb-2">☀️</span>
            <span className="text-sky-300 font-bold text-lg">Day</span>
            <p className="text-stone-400 text-sm mt-1">9:00 - 17:00</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
            <span className="text-4xl block mb-2">🌆</span>
            <span className="text-amber-300 font-bold text-lg">Evening</span>
            <p className="text-stone-400 text-sm mt-1">17:00 - 20:00</p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-center">
            <span className="text-4xl block mb-2">🌙</span>
            <span className="text-indigo-300 font-bold text-lg">Night</span>
            <p className="text-stone-400 text-sm mt-1">20:00 - 5:00</p>
          </div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <p className="text-stone-300 text-base">
            <strong className="text-purple-400">✨ At night</strong>, watch for the magical aurora in the sky! Pyra may also get sleepy and need more rest.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Taking Care of Pyra",
    emoji: "💚",
    content: (
      <div className="space-y-5">
        <p className="text-stone-300 text-lg">
          Watch the colored bars on the left side of your screen. These show what Pyra needs:
        </p>
        <div className="grid grid-cols-2 gap-3 text-base">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">🔥</span>
            <span className="text-orange-300 font-medium">Warmth</span>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">🍖</span>
            <span className="text-yellow-300 font-medium">Hunger</span>
          </div>
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">❤️</span>
            <span className="text-pink-300 font-medium">Love</span>
          </div>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">⚽</span>
            <span className="text-green-300 font-medium">Energy</span>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <span className="text-blue-300 font-medium">Trust</span>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-3 flex items-center gap-3">
            <span className="text-2xl">👑</span>
            <span className="text-purple-300 font-medium">Respect</span>
          </div>
        </div>
        <p className="text-stone-400 text-base italic">
          Use the buttons at the bottom to feed, pet, play with, and care for Pyra. You can also <strong className="text-white">talk to Pyra</strong> using the chat box!
        </p>
      </div>
    ),
  },
  {
    title: "Growing a Personality",
    emoji: "🧠",
    content: (
      <div className="space-y-5">
        <p className="text-stone-300 text-lg">
          Pyra is special: <strong className="text-purple-400">your actions shape who they become!</strong>
        </p>
        <div className="space-y-3 text-base">
          <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
            <span className="text-green-400 text-xl">✓</span>
            <span className="text-stone-300">Comfort Pyra when scared → they grow <strong className="text-green-400">confident</strong></span>
          </div>
          <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
            <span className="text-red-400 text-xl">✗</span>
            <span className="text-stone-300">Leave them alone too long → they may become <strong className="text-red-400">anxious</strong></span>
          </div>
          <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
            <span className="text-green-400 text-xl">✓</span>
            <span className="text-stone-300">Praise them for listening → they become <strong className="text-green-400">eager to please</strong></span>
          </div>
          <div className="bg-white/5 rounded-xl p-4 flex items-start gap-3">
            <span className="text-green-400 text-xl">✓</span>
            <span className="text-stone-300">Be patient with them → they learn <strong className="text-green-400">patience</strong> too</span>
          </div>
        </div>
        <p className="text-stone-400 text-base italic">
          Check the <strong className="text-purple-400">Personality panel</strong> to see how Pyra is developing.
        </p>
      </div>
    ),
  },
  {
    title: "Memories Matter",
    emoji: "📖",
    content: (
      <div className="space-y-5">
        <p className="text-stone-300 text-lg">
          Pyra forms <strong className="text-cyan-400">memories</strong> from important moments:
        </p>
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">☀️</span>
              <span className="text-green-400 font-bold text-lg">Happy Memories</span>
            </div>
            <p className="text-stone-400 text-base">Being saved when hungry, feeling truly loved, first play session</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🌧️</span>
              <span className="text-red-400 font-bold text-lg">Difficult Memories</span>
            </div>
            <p className="text-stone-400 text-base">Being left alone too long, going hungry, harsh words</p>
          </div>
        </div>
        <p className="text-stone-400 text-base italic">
          These memories stay with Pyra forever. Click <strong className="text-cyan-400">"View Memories"</strong> in the Personality panel to see Pyra's life story.
        </p>
      </div>
    ),
  },
  {
    title: "Pyra Grows Up",
    emoji: "📈",
    content: (
      <div className="space-y-5">
        <p className="text-stone-300 text-lg">
          Your dinosaur grows through stages:
        </p>
        <div className="flex items-center justify-center gap-2 text-base flex-wrap">
          <span className="bg-stone-700 px-3 py-2 rounded-lg">🥚 Egg</span>
          <span className="text-stone-500 text-xl">→</span>
          <span className="bg-stone-700 px-3 py-2 rounded-lg">🐣 Hatchling</span>
          <span className="text-stone-500 text-xl">→</span>
          <span className="bg-stone-700 px-3 py-2 rounded-lg">🦕 Puppy</span>
          <span className="text-stone-500 text-xl">→</span>
          <span className="bg-stone-700 px-3 py-2 rounded-lg">🦖 Juvenile</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-base flex-wrap">
          <span className="text-stone-500 text-xl">→</span>
          <span className="bg-stone-700 px-3 py-2 rounded-lg">🦖 Adolescent</span>
          <span className="text-stone-500 text-xl">→</span>
          <span className="bg-orange-600 px-3 py-2 rounded-lg font-bold">🦖 Adult</span>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mt-4">
          <p className="text-amber-300 text-lg font-bold">⚠️ Early care matters most!</p>
          <p className="text-stone-400 text-base mt-2">
            Young Pyra learns faster and forms stronger impressions. The personality you help create early will stay with them into adulthood.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Quick Tips",
    emoji: "✨",
    content: (
      <div className="space-y-4">
        <div className="bg-white/5 rounded-xl p-4 flex items-start gap-4">
          <span className="text-3xl">📅</span>
          <div>
            <p className="text-stone-200 text-lg font-bold">Check in regularly</p>
            <p className="text-stone-400 text-base">Pyra needs consistent care, not just occasional attention</p>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 flex items-start gap-4">
          <span className="text-3xl">💬</span>
          <div>
            <p className="text-stone-200 text-lg font-bold">Talk to them</p>
            <p className="text-stone-400 text-base">Pyra learns words and remembers what you say</p>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 flex items-start gap-4">
          <span className="text-3xl">⏳</span>
          <div>
            <p className="text-stone-200 text-lg font-bold">Be patient</p>
            <p className="text-stone-400 text-base">Building trust takes time, but it's worth it</p>
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4 flex items-start gap-4">
          <span className="text-3xl">🌟</span>
          <div>
            <p className="text-stone-200 text-lg font-bold">Every Pyra is unique</p>
            <p className="text-stone-400 text-base">Your choices create a one-of-a-kind companion</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "Your Journey Begins",
    emoji: "🚀",
    content: (
      <div className="space-y-6 text-center">
        <p className="text-stone-300 text-lg">
          There's no "winning" in Pyra. Your goal is simply to raise a happy, healthy dinosaur and discover the unique personality that emerges from your journey together.
        </p>
        <div className="bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-purple-500/20 border border-white/10 rounded-2xl p-6">
          <p className="text-2xl text-white font-bold">
            The story you write together is yours alone.
          </p>
        </div>
        <p className="text-stone-400 text-lg italic mt-6">
          Now go say hello to your new friend! 🦖💚
        </p>
      </div>
    ),
  },
];

// =============================================
// TUTORIAL MODAL COMPONENT (Kid-Friendly)
// =============================================

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = TUTORIAL_PAGES.length;
  const page = TUTORIAL_PAGES[currentPage];
  const isLastPage = currentPage === totalPages - 1;

  // Reset to first page when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (isLastPage) {
          onClose();
        } else {
          setCurrentPage(p => Math.min(p + 1, totalPages - 1));
        }
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage(p => Math.max(p - 1, 0));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLastPage, totalPages, onClose]);

  if (!isOpen) return null;

  const goNext = () => {
    if (isLastPage) {
      onClose();
    } else {
      setCurrentPage(p => p + 1);
    }
  };

  const goPrev = () => {
    setCurrentPage(p => Math.max(p - 1, 0));
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* FIXED: Larger modal for kid-friendly reading */}
      <div
        className="relative w-full max-w-2xl bg-stone-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Larger padding and text */}
        <div className="bg-gradient-to-r from-orange-600/30 to-purple-600/30 border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* FIXED: Larger emoji */}
              <span className="text-5xl">{page.emoji}</span>
              {/* FIXED: Larger title */}
              <h2 className="text-3xl font-bold text-white">{page.title}</h2>
            </div>
            {/* FIXED: Larger close button */}
            <button
              onClick={onClose}
              className="p-3 hover:bg-white/10 rounded-xl transition-colors text-stone-400 hover:text-white"
              aria-label="Close tutorial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          {/* FIXED: Larger progress dots */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {TUTORIAL_PAGES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`h-3 rounded-full transition-all duration-300 ${
                  idx === currentPage
                    ? 'bg-orange-400 w-8'
                    : idx < currentPage
                    ? 'bg-orange-400/50 w-3'
                    : 'bg-white/20 w-3'
                }`}
                aria-label={`Go to page ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Content - More padding and larger max-height */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[60vh]">
          {page.content}
        </div>

        {/* Footer - Larger buttons */}
        <div className="border-t border-white/10 p-5 flex items-center justify-between bg-stone-900/50">
          <button
            onClick={goPrev}
            disabled={currentPage === 0}
            className={`px-6 py-3 rounded-xl text-base font-medium transition-all ${
              currentPage === 0
                ? 'text-stone-600 cursor-not-allowed'
                : 'text-stone-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            ← Back
          </button>

          {/* FIXED: Larger page indicator */}
          <span className="text-stone-500 text-base font-medium">
            {currentPage + 1} / {totalPages}
          </span>

          {/* FIXED: Larger next/finish button */}
          <button
            onClick={goNext}
            className={`px-8 py-3 rounded-xl text-base font-bold transition-all ${
              isLastPage
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-400 hover:to-pink-400 shadow-lg shadow-orange-500/25 text-lg'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isLastPage ? "Let's Go! 🦖" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;
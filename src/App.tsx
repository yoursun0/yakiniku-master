/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, Flame, RotateCw, Play, BarChart3, Clock, Send, User } from 'lucide-react';
import { MeatState, getNewState, getSideMultiplier, calculateHpChange, Difficulty, DIFFICULTY_SETTINGS, MEAT_WIDTH, MEAT_HEIGHT, GRILL_RADIUS, checkOverlap } from './gameLogic';
import { ENABLE_DEBUG_PANEL, TRANSLATIONS } from './constants';
import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp,
  getDocFromServer,
  doc,
  where
} from 'firebase/firestore';

// --- Types & Constants ---

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  difficulty: Difficulty;
  timestamp: any;
}

interface SideState {
  elapsed: number;
  state: MeatState;
}

interface MeatOnGrill {
  id: string;
  x: number;
  y: number;
  sideA: SideState;
  sideB: SideState;
  isSideAFacingDown: boolean;
}

// --- Sound Effects ---
const SOUNDS = {
  sizzle: '/resources/sizzle.mp3',
  correct: '/resources/correct.mp3',
  fail: '/resources/fail.mp3',
  end: '/resources/end.mp3',
};

type Language = 'en' | 'zh';

export default function App() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [hp, setHp] = useState(50);
  const [maxHp, setMaxHp] = useState(50);
  const [meatOnPlate, setMeatOnPlate] = useState(0);
  const [meatsOnGrill, setMeatsOnGrill] = useState<MeatOnGrill[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [language, setLanguage] = useState<Language>('zh');
  const [floatingScores, setFloatingScores] = useState<{ id: string; score: number; x: number; y: number; isSauce?: boolean; isTimeBonus?: boolean }[]>([]);
  const [draggedMeatId, setDraggedMeatId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [scale, setScale] = useState(1);
  const [touchDragInfo, setTouchDragInfo] = useState<{ type: 'plate' | 'grill'; meatId?: string; startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  
  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [isFirebaseAvailable, setIsFirebaseAvailable] = useState<boolean>(true);

  const appRef = useRef<HTMLDivElement>(null);
  const grillRef = useRef<HTMLDivElement>(null);
  const sauceRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const t = TRANSLATIONS[language];

  // --- Detection & Scaling ---
  useEffect(() => {
    const updateScaleAndTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const isMobile = window.innerWidth < 768;
      setScale(isMobile ? 300 / 420 : 1);
    };
    updateScaleAndTouch();
    window.addEventListener('resize', updateScaleAndTouch);
    return () => window.removeEventListener('resize', updateScaleAndTouch);
  }, []);

  // --- Firebase Error Handling ---
  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error Detailed: ', JSON.stringify(errInfo, null, 2));
  };

  // --- Initialize Sounds ---
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audioRefs.current[key] = audio;
    });

    // Test Firestore Connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firebase connection test successful!");
      } catch (error) {
        handleFirestoreError(error, 'get', 'test/connection');
        setIsFirebaseAvailable(false);
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Firebase connection test failed: client is offline. Check configuration.");
        }
      }
    };
    testConnection();
  }, []);

  // Leaderboard Listener
  useEffect(() => {
    if (!isFirebaseAvailable) {
      setLeaderboardLoading(false);
      return;
    }
    setLeaderboardLoading(true);
    const path = 'leaderboard';
    const q = query(
      collection(db, path),
      where('difficulty', '==', difficulty),
      orderBy('score', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: LeaderboardEntry[] = [];
      snapshot.forEach((doc) => {
        entries.push({ id: doc.id, ...doc.data() } as LeaderboardEntry);
      });
      setLeaderboard(entries);
      setLeaderboardLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list', path);
      setIsFirebaseAvailable(false);
      setLeaderboardLoading(false);
    });

    return () => unsubscribe();
  }, [difficulty, isFirebaseAvailable]);

  const playSound = (key: keyof typeof SOUNDS) => {
    const audio = audioRefs.current[key];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  };

  const stopSound = (key: keyof typeof SOUNDS) => {
    const audio = audioRefs.current[key];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  // --- Game Timer ---
  useEffect(() => {
    if (gameState !== 'playing' || isPaused) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, isPaused]);

  // --- End Game Condition ---
  useEffect(() => {
    if (gameState === 'playing' && hp <= 0) {
      endGame();
    }
  }, [hp, gameState]);

  // --- Refill Logic ---
  useEffect(() => {
    if (gameState === 'playing' && meatsOnGrill.length === 0 && meatOnPlate === 0) {
      setMeatOnPlate(DIFFICULTY_SETTINGS[difficulty].meats);
      // Give +10 seconds time bonus when a new dish is replaced
      applyTimeBonus(10);
    }
  }, [meatsOnGrill.length, meatOnPlate, gameState, difficulty]);

  const endGame = () => {
    setGameState('ended');
    setLeaderboardDifficulty(difficulty);
    playSound('end');
  };

  // --- Cooking Logic ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    const updateCooking = () => {
      if (isPaused) {
        gameLoopRef.current = requestAnimationFrame(updateCooking);
        return;
      }
      const delta = 16.67 / 1000;
      setMeatsOnGrill((prev) => 
        prev.map((meat) => {
          if (meat.id === draggedMeatId) return meat;
          
          const updatedMeat = { ...meat };
          const activeSide = meat.isSideAFacingDown ? updatedMeat.sideA : updatedMeat.sideB;
          
          activeSide.elapsed += delta;
          activeSide.state = getNewState(activeSide.elapsed);
          
          return updatedMeat;
        })
      );
      gameLoopRef.current = requestAnimationFrame(updateCooking);
    };

    gameLoopRef.current = requestAnimationFrame(updateCooking);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState]);

  // --- Drag and Drop Logic ---
  const onDragStartFromPlate = (e: React.DragEvent) => {
    if (gameState !== 'playing' || meatOnPlate <= 0) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('source', 'plate');
  };

  const onDragStartFromGrill = (e: React.DragEvent, meatId: string) => {
    if (gameState !== 'playing') {
      e.preventDefault();
      return;
    }
    setDraggedMeatId(meatId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('source', 'grill');
    e.dataTransfer.setData('meatId', meatId);
  };

  const onDragEnd = () => {
    setDraggedMeatId(null);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDropOnGrill = (e: React.DragEvent) => {
    e.preventDefault();
    const source = e.dataTransfer.getData('source') as 'plate' | 'grill';
    const meatId = e.dataTransfer.getData('meatId');
    handleDropOnGrill(source, meatId, e.clientX, e.clientY);
  };

  const handleDropOnGrill = (source: 'plate' | 'grill', meatId: string | null, clientX: number, clientY: number) => {
    if ((source !== 'plate' && source !== 'grill') || gameState !== 'playing' || !grillRef.current) return;

    const rect = grillRef.current.getBoundingClientRect();
    const scaledWidth = MEAT_WIDTH * scale;
    const scaledHeight = MEAT_HEIGHT * scale;
    const x = clientX - rect.left - scaledWidth / 2;
    const y = clientY - rect.top - scaledHeight / 2;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dist = Math.sqrt(Math.pow(x + scaledWidth / 2 - centerX, 2) + Math.pow(y + scaledHeight / 2 - centerY, 2));

    if (dist > (GRILL_RADIUS * scale) - 20) return;

    if (source === 'plate') {
      const isOverlapping = meatsOnGrill.some(meat => {
        const dx = meat.x - x;
        const dy = meat.y - y;
        const normalizedDx = dx / (scaledWidth * 0.95);
        const normalizedDy = dy / (scaledHeight * 0.95);
        return (normalizedDx * normalizedDx + normalizedDy * normalizedDy) < 1;
      });

      if (isOverlapping) return;

      const newMeat: MeatOnGrill = {
        id: Math.random().toString(36).substr(2, 9),
        x,
        y,
        sideA: { elapsed: 0, state: 'raw' },
        sideB: { elapsed: 0, state: 'raw' },
        isSideAFacingDown: true,
      };

      setMeatsOnGrill((prev) => [...prev, newMeat]);
      setMeatOnPlate((prev) => prev - 1);
      playSound('sizzle');
    } else if (source === 'grill') {
      if (!meatId) return;

      const isOverlapping = meatsOnGrill.some(meat => {
        if (meat.id === meatId) return false;
        return checkOverlap(meat.x, meat.y, x, y);
      });

      if (isOverlapping) return;

      setMeatsOnGrill(prev => prev.map(m => m.id === meatId ? { ...m, x, y } : m));
    }
    setDraggedMeatId(null);
  };

  const onDropOnSauce = (e: React.DragEvent) => {
    e.preventDefault();
    const source = e.dataTransfer.getData('source') as 'plate' | 'grill';
    const meatId = e.dataTransfer.getData('meatId');
    handleDropOnSauce(source, meatId, e.clientX, e.clientY);
  };

  const handleDropOnSauce = (source: 'plate' | 'grill', meatId: string | null, clientX: number, clientY: number) => {
    setDraggedMeatId(null);
    if (source !== 'grill' || !meatId || gameState !== 'playing') return;

    const meat = meatsOnGrill.find(m => m.id === meatId);
    if (!meat) return;

    const points = 10 * getSideMultiplier(meat.sideA.state) * getSideMultiplier(meat.sideB.state);

    // HP Logic
    const hpChange = calculateHpChange(meat.sideA.state, meat.sideB.state);

    setHp(prev => Math.min(maxHp, Math.max(0, prev + hpChange)));
    
    // Use center of the sauce bowl for floating score
    if (appRef.current && sauceRef.current && !isPaused) {
      const appRect = appRef.current.getBoundingClientRect();
      const bowlRect = sauceRef.current.getBoundingClientRect();
      const centerX = bowlRect.left + bowlRect.width / 2 - appRect.left;
      const centerY = bowlRect.top + bowlRect.height / 2 - appRect.top;
      applyScore(points, centerX, centerY, true);
    }
    
    if (points > 0) {
      playSound('correct');
    } else {
      playSound('fail');
    }
    
    setMeatsOnGrill((prev) => prev.filter((m) => m.id !== meatId));
  };

  // --- Touch Handlers ---
  const onTouchStartFromPlate = (e: React.TouchEvent) => {
    if (gameState !== 'playing' || meatOnPlate <= 0 || isPaused) return;
    const touch = e.touches[0];
    setTouchDragInfo({
      type: 'plate',
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY
    });
  };

  const onTouchStartFromGrill = (e: React.TouchEvent, meatId: string) => {
    if (gameState !== 'playing' || isPaused) return;
    const touch = e.touches[0];
    setTouchDragInfo({
      type: 'grill',
      meatId,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY
    });
    setDraggedMeatId(meatId);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchDragInfo) return;
    if (e.cancelable) e.preventDefault();
    const touch = e.touches[0];
    setTouchDragInfo(prev => prev ? { ...prev, currentX: touch.clientX, currentY: touch.clientY } : null);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchDragInfo) return;
    const { type, meatId, currentX, currentY } = touchDragInfo;

    // Check if dropped on grill
    if (grillRef.current) {
      const grillRect = grillRef.current.getBoundingClientRect();
      if (currentX >= grillRect.left && currentX <= grillRect.right &&
          currentY >= grillRect.top && currentY <= grillRect.bottom) {
        handleDropOnGrill(type, meatId || null, currentX, currentY);
      }
    }

    // Check if dropped on sauce
    if (sauceRef.current) {
      const sauceRect = sauceRef.current.getBoundingClientRect();
      if (currentX >= sauceRect.left && currentX <= sauceRect.right &&
          currentY >= sauceRect.top && currentY <= sauceRect.bottom) {
        handleDropOnSauce(type, meatId || null, currentX, currentY);
      }
    }

    setTouchDragInfo(null);
    setDraggedMeatId(null);
  };

  const applyScore = (points: number, x: number, y: number, isSauce: boolean = false) => {
    // Clamp X to prevent overflow on mobile
    let clampedX = x;
    if (appRef.current) {
      const margin = 120;
      const width = appRef.current.clientWidth;
      clampedX = Math.max(margin, Math.min(width - margin, x));
    }

    setScore((prev) => prev + points);
    const scoreId = Math.random().toString(36).substr(2, 9);
    setFloatingScores(prev => [...prev, { id: scoreId, score: points, x: clampedX, y, isSauce }]);
    
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== scoreId));
    }, 1000);
  };

  const applyTimeBonus = (seconds: number) => {
    if (!grillRef.current) return;
    const rect = grillRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setTimeLeft(prev => prev + seconds);
    const bonusId = Math.random().toString(36).substr(2, 9);
    setFloatingScores(prev => [...prev, { id: bonusId, score: seconds, x: centerX, y: centerY, isTimeBonus: true }]);
    
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== bonusId));
    }, 1000);
  };

  const handleMeatClick = (meat: MeatOnGrill) => {
    if (gameState !== 'playing') return;

    setMeatsOnGrill((prev) => 
      prev.map((m) => m.id === meat.id ? { ...m, isSideAFacingDown: !m.isSideAFacingDown } : m)
    );
    playSound('sizzle');
  };

  const startGame = (diff: Difficulty) => {
    const settings = DIFFICULTY_SETTINGS[diff];
    setDifficulty(diff);
    setScore(0);
    setTimeLeft(120);
    setHp(settings.hp);
    setMaxHp(settings.hp);
    setMeatOnPlate(settings.meats);
    setMeatsOnGrill([]);
    setGameState('playing');
    setHasSubmitted(false);
    setPlayerName('');
  };

  const submitScore = async () => {
    if (!isFirebaseAvailable || !playerName.trim() || isSubmitting || hasSubmitted || score === 0) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'leaderboard'), {
        name: playerName.trim(),
        score: score,
        difficulty: difficulty,
        timestamp: serverTimestamp()
      });
      setHasSubmitted(true);
    } catch (error) {
      console.error("Error submitting score:", error);
      setIsFirebaseAvailable(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div ref={appRef} 
         className="relative w-full h-[100dvh] overflow-hidden flex flex-col items-center select-none touch-none"
         onTouchMove={onTouchMove}
         onTouchEnd={onTouchEnd}
         style={{ 
           background: `
             radial-gradient(circle at center, #333 0%, #111 100%),
             url('https://www.transparenttextures.com/patterns/marble-similar.png')
           `,
           backgroundColor: '#1a1a1a'
         }}>
      
      {/* --- Top Status Bar --- */}
      <div className="mt-2 md:mt-6 w-full max-w-5xl px-4 md:px-8 py-2 md:py-4 flex items-center justify-between z-10 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl md:rounded-2xl shadow-2xl">
        <div className="flex items-center gap-2 md:gap-4 text-white font-black text-xl md:text-3xl drop-shadow-lg">
          <Clock className="w-5 h-5 md:w-8 md:h-8 text-yellow-500" />
          <span>{timeLeft}s</span>
        </div>

        <div className="flex-1 mx-4 md:mx-12 flex flex-col gap-1 md:gap-3">
          {/* Time Bar */}
          <div className="hidden md:flex flex-col gap-1">
            <div className="text-[10px] text-white/70 font-bold uppercase tracking-widest text-center">{t.timeLeft}</div>
            <div className="h-3 bg-stone-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <motion.div 
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / 120) * 100}%` }}
                transition={{ duration: 1, ease: "linear" }}
              />
            </div>
          </div>
          {/* HP Bar */}
          <div className="h-4 md:h-6 bg-stone-900 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
            <motion.div 
              className={`h-full transition-colors duration-500 ${hp > maxHp * 0.3 ? 'bg-emerald-400' : 'bg-red-500'}`}
              initial={{ width: '100%' }}
              animate={{ width: `${(hp / maxHp) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[11px] text-white font-black uppercase tracking-widest drop-shadow-md">
              {t.hp}: {hp} / {maxHp}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 text-white font-black text-xl md:text-3xl drop-shadow-lg">
          <Trophy className="w-5 h-5 md:w-8 md:h-8 text-yellow-500" />
          <span>{score}</span>
        </div>
      </div>

      {/* --- Main Grill Area --- */}
      <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden py-2">
        {/* Grill Container (Expanded, no golden border) */}
        <div 
          ref={grillRef}
          onDragOver={onDragOver}
          onDrop={onDropOnGrill}
          className="w-[300px] h-[300px] md:w-[420px] md:h-[420px] rounded-full overflow-hidden relative border-4 md:border-8 border-stone-800/20 bg-cover bg-center bg-no-repeat shadow-2xl"
          style={{
            backgroundImage: "url('/resources/grill.png')",
            boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.9)'
          }}
        >
          {/* Heat Glow */}
          <div className="absolute inset-0 bg-radial-gradient from-orange-900/20 to-transparent animate-pulse" />
          
          {/* Meats on Grill */}
          <AnimatePresence>
            {meatsOnGrill.map((meat) => {
                const facingDownState = meat.isSideAFacingDown ? meat.sideA.state : meat.sideB.state;
                
                return (
                  <motion.div
                    key={meat.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      rotateY: meat.isSideAFacingDown ? 180 : 0
                    }}
                    exit={{ scale: 1.2, opacity: 0 }}
                    draggable={!isTouchDevice}
                    onDragStart={(e) => onDragStartFromGrill(e, meat.id)}
                    onDragEnd={onDragEnd}
                    onTouchStart={(e) => onTouchStartFromGrill(e, meat.id)}
                    onClick={() => handleMeatClick(meat)}
                    className="absolute cursor-pointer rounded-full shadow-lg preserve-3d touch-none"
                    style={{
                      left: meat.x,
                      top: meat.y,
                      width: MEAT_WIDTH * scale,
                      height: MEAT_HEIGHT * scale,
                      transformStyle: 'preserve-3d'
                    }}
                  >
                    {/* Front Side (Side A) */}
                    <div className="absolute inset-0 backface-hidden rounded-full border-2"
                         style={{ ...getMeatStyle(meat.sideA.state), backfaceVisibility: 'hidden' }}>
                       {meat.sideA.state === 'burnt' && <div className="absolute inset-0 bg-black/20 rounded-full" />}
                    </div>
                    
                    {/* Back Side (Side B) */}
                    <div className="absolute inset-0 backface-hidden rounded-full border-2"
                         style={{ 
                           ...getMeatStyle(meat.sideB.state), 
                           transform: 'rotateY(180deg)',
                           backfaceVisibility: 'hidden'
                         }}>
                       {meat.sideB.state === 'burnt' && <div className="absolute inset-0 bg-black/20 rounded-full" />}
                    </div>

                    {/* Sizzle Visuals */}
                    {facingDownState !== 'raw' && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
                        <motion.div 
                          animate={{ y: [-5, -20], opacity: [0.8, 0], scale: [1, 1.5] }}
                          transition={{ repeat: Infinity, duration: 0.6, delay: 0.1 }}
                          className="w-1 h-4 bg-white/30 rounded-full blur-[2px]"
                        />
                        <motion.div 
                          animate={{ y: [-5, -25], opacity: [0.6, 0], scale: [1, 2] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: 0.3 }}
                          className="w-1.5 h-5 bg-orange-200/20 rounded-full blur-[3px]"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

      {/* --- Bottom Interaction Area --- */}
      <div className="w-full max-w-5xl px-4 md:px-10 pb-4 md:pb-10 flex items-end justify-between gap-4">
        {/* Left: Plate with Raw Meat */}
        <div className="relative group flex-1 w-[200px] md:w-[280px] max-w-[280px]">
          <div className="w-full aspect-[4/3] rounded-[40px] md:rounded-[100px] border-4 md:border-8 border-stone-800/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-105 bg-cover bg-center bg-no-repeat"
               style={{ backgroundImage: "url('/resources/start-dish.png')" }}>
            {/* Meat Stack */}
            <div className="relative w-full h-full flex items-center justify-center z-10">
              {Array.from({ length: meatOnPlate }).slice(0, 8).map((_, i) => {
                const scaledWidth = MEAT_WIDTH * scale;
                const scaledHeight = MEAT_HEIGHT * scale;
                return (
                  <motion.div
                    key={`plate-meat-${i}`}
                    draggable={gameState === 'playing' && !isPaused && !isTouchDevice}
                    onDragStart={onDragStartFromPlate}
                    onTouchStart={onTouchStartFromPlate}
                    whileHover={{ scale: 1.05 }}
                    className="absolute rounded-full cursor-grab active:cursor-grabbing shadow-xl border-2 border-red-900/30 touch-none"
                    style={{
                      ...getMeatStyle('raw'),
                      width: scaledWidth,
                      height: scaledHeight,
                      left: `calc(50% - ${scaledWidth/2}px + ${(i % 3 - 1) * (15 * scale)}px)`,
                      top: `calc(50% - ${scaledHeight/2}px + ${Math.floor(i / 3 - 1) * (10 * scale)}px)`,
                      zIndex: i,
                      transform: `rotate(${(i % 2 === 0 ? 1 : -1) * (i * 5)}deg)`
                    }}
                  />
                );
              })}
            </div>
          </div>
          <div className="absolute -top-6 md:-top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 md:px-4 py-1 md:py-2 rounded-full text-white text-[10px] md:text-lg font-bold border border-white/10 whitespace-nowrap">
            {t.rawLabel}: {meatOnPlate}
          </div>
        </div>

        {/* Right: Sauce Bowl (Square) */}
        <div 
          ref={sauceRef}
          onDragOver={onDragOver}
          onDrop={onDropOnSauce}
          className="relative group flex-shrink-0"
        >
          <div className="w-24 h-24 md:w-48 md:h-48 rounded-2xl md:rounded-[40px] border-4 md:border-8 border-stone-800/30 shadow-2xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 bg-cover bg-center bg-no-repeat"
               style={{ backgroundImage: "url('/resources/score-dish.png')" }}>
          </div>
          <div className="absolute -top-6 md:-top-10 left-1/2 -translate-x-1/2 bg-black/80 px-2 md:px-4 py-1 md:py-2 rounded-full text-white text-[10px] md:text-lg font-bold border border-white/10 whitespace-nowrap">
            {t.sauce}
          </div>
        </div>
      </div>

      {/* --- Touch Drag Proxy --- */}
      {touchDragInfo && (
        <div 
          className="fixed z-[300] pointer-events-none rounded-full border-2"
          style={{
            ...getMeatStyle(touchDragInfo.type === 'plate' ? 'raw' : (meatsOnGrill.find(m => m.id === touchDragInfo.meatId)?.isSideAFacingDown ? meatsOnGrill.find(m => m.id === touchDragInfo.meatId)?.sideA.state : meatsOnGrill.find(m => m.id === touchDragInfo.meatId)?.sideB.state) || 'raw'),
            left: touchDragInfo.currentX - MEAT_WIDTH / 2,
            top: touchDragInfo.currentY - MEAT_HEIGHT / 2,
            width: MEAT_WIDTH,
            height: MEAT_HEIGHT,
            opacity: 0.8,
            boxShadow: '0 0 20px rgba(0,0,0,0.5)'
          }}
        />
      )}

      {/* --- Overlays --- */}
      {gameState === 'idle' && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center flex-col p-4 md:p-8 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-stone-900 p-6 md:p-12 rounded-3xl border-2 border-yellow-500/30 shadow-2xl max-w-xl w-full"
          >
            <h1 className="text-3xl md:text-6xl font-black text-white mb-4 md:mb-8 tracking-tighter italic">{t.title} <span className="text-yellow-500 text-xl md:text-4xl">{t.ultimate}</span></h1>
            
            <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`p-2 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-center gap-1 md:gap-2 ${
                    difficulty === d 
                      ? 'bg-yellow-500 border-yellow-400 text-black' 
                      : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 md:w-6 md:h-6" />
                  <span className="font-bold text-[10px] md:text-sm">{t[d]}</span>
                  <span className="text-[8px] md:text-[10px] opacity-70">{t.hp}: {DIFFICULTY_SETTINGS[d].hp}</span>
                </button>
              ))}
            </div>

            {/* Leaderboard Section */}
            {isFirebaseAvailable && (
              <div className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden mb-8">
                <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex flex-col gap-3">
                  <div className="flex items-center gap-3 font-black text-white uppercase tracking-widest text-sm">
                    <BarChart3 className="w-4 h-4 text-yellow-500" />
                    {difficulty === 'easy' ? t.easyLeaderboard : difficulty === 'normal' ? t.normalLeaderboard : t.hardLeaderboard}
                  </div>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {leaderboardLoading ? (
                    <div className="p-8 text-center text-white/40 italic text-xs">{t.loading}</div>
                  ) : leaderboard.length === 0 ? (
                    <div className="p-8 text-center text-white/40 italic text-xs">No scores yet for {t[difficulty]}!</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white/5 text-[8px] uppercase tracking-widest text-white/40">
                        <tr>
                          <th className="px-4 py-2 font-medium">{t.rank}</th>
                          <th className="px-4 py-2 font-medium">{t.player}</th>
                          <th className="px-4 py-2 font-medium text-right">{t.score}</th>
                        </tr>
                      </thead>
                      <tbody className="text-[10px]">
                        {leaderboard.map((entry, index) => (
                          <tr key={entry.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-4 py-2 font-mono text-white/60">
                              {index + 1 === 1 ? '🥇' : index + 1 === 2 ? '🥈' : index + 1 === 3 ? '🥉' : `#${index + 1}`}
                            </td>
                            <td className="px-4 py-2 font-bold text-white truncate max-w-[80px]">
                              {entry.name}
                            </td>
                            <td className="px-4 py-2 text-right font-black text-yellow-500">
                              {entry.score.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 mb-6 md:mb-8">
              <div className="text-stone-400 text-[10px] md:text-xs uppercase tracking-widest font-bold">{t.language}</div>
              <div className="flex justify-center gap-2">
                {(['en', 'zh'] as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`px-4 py-2 rounded-full text-[10px] md:text-xs font-bold transition-all border ${
                      language === l 
                        ? 'bg-white text-black border-white' 
                        : 'bg-transparent text-white border-white/20 hover:border-white/40'
                    }`}
                  >
                    {l === 'en' ? 'English' : '繁體中文'}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-stone-300 mb-6 md:mb-10 text-left space-y-2 md:space-y-3 text-[10px] md:text-sm bg-black/30 p-4 md:p-6 rounded-2xl border border-white/5">
              <p>✨ <span className="text-white font-bold">{t.scoring}</span> {t.scoringDesc}</p>
              <p>🥩 <span className="text-emerald-400">{t.well}</span> | <span className="text-yellow-400">{t.half}</span> | <span className="text-red-500">{t.other}</span></p>
              <p>❤️ <span className="text-white font-bold">{t.hpLabel}</span> {t.hpDesc}</p>
              <p>🎮 <span className="text-white font-bold">{t.controls}</span> {t.controlsDesc}</p>
            </div>

            <button 
              onClick={() => startGame(difficulty)}
              className="w-full py-3 md:py-5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl md:text-2xl rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-2 md:gap-3"
            >
              <Play className="w-6 h-6 md:w-8 md:h-8 fill-black" />
              {t.startGame}
            </button>
          </motion.div>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center flex-col p-4 md:p-8 text-center overflow-y-auto">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-stone-900 p-6 md:p-12 rounded-3xl border-2 border-white/10 shadow-2xl max-w-xl w-full my-auto"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-2">{t.gameOver}</h2>
            <p className="text-stone-500 font-mono text-xs md:text-sm mb-4 md:mb-6 uppercase tracking-widest">{t[difficulty]}</p>
            
            <div className="text-6xl md:text-8xl font-black text-yellow-500 mb-4 drop-shadow-2xl">
              {score}
            </div>

            <p className="text-stone-400 mb-6 md:mb-8 text-lg md:text-xl leading-relaxed">
              {(() => {
                if (difficulty === 'easy') {
                  if (score > 500) return t.god;
                  if (score > 200) return t.chef;
                  return t.practice;
                } else if (difficulty === 'normal') {
                  if (score > 300) return t.god;
                  if (score > 150) return t.chef;
                  return t.practice;
                } else { // hard
                  if (score > 250) return t.god;
                  if (score > 100) return t.chef;
                  return t.practice;
                }
              })()}
            </p>

            {/* Leaderboard Submission */}
            {isFirebaseAvailable && score > 0 && !hasSubmitted && (
              <div className="mb-8 p-4 md:p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-emerald-400 font-bold">
                    <User className="w-5 h-5" />
                    <span>{t.submit}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                      placeholder={t.namePlaceholder}
                      className="flex-1 bg-black/40 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                    <button
                      onClick={submitScore}
                      disabled={isSubmitting || !playerName.trim()}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black px-4 md:px-6 py-3 rounded-xl transition-all flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <RotateCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      <span className="hidden md:inline">{t.submit}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isFirebaseAvailable && hasSubmitted && (
              <div className="mb-8 p-4 bg-emerald-500/20 rounded-xl border border-emerald-500/50 text-emerald-400 font-bold text-center animate-bounce">
                {t.success}
              </div>
            )}

            {/* Global Leaderboard */}
            {isFirebaseAvailable && (
              <div className="bg-black/40 rounded-2xl border border-white/10 overflow-hidden mb-8">
                <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3 font-black text-white uppercase tracking-widest">
                    <BarChart3 className="w-5 h-5 text-yellow-500" />
                    {difficulty === 'easy' ? t.easyLeaderboard : difficulty === 'normal' ? t.normalLeaderboard : t.hardLeaderboard}
                  </div>
                </div>
                <div className="max-h-[200px] md:max-h-[300px] overflow-y-auto">
                  {leaderboardLoading ? (
                    <div className="p-8 text-center text-white/40 italic">{t.loading}</div>
                  ) : leaderboard.length === 0 ? (
                    <div className="p-8 text-center text-white/40 italic">{t.noScoresYet} {t[difficulty]}!</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-white/5 text-[10px] uppercase tracking-widest text-white/40">
                        <tr>
                          <th className="px-6 py-3 font-medium">{t.rank}</th>
                          <th className="px-6 py-3 font-medium">{t.player}</th>
                          <th className="px-6 py-3 font-medium text-right">{t.score}</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {leaderboard.map((entry, index) => (
                          <tr 
                            key={entry.id} 
                            className={`border-t border-white/5 transition-colors hover:bg-white/5 ${
                              entry.name === playerName && hasSubmitted ? 'bg-emerald-500/10' : ''
                            }`}
                          >
                            <td className="px-6 py-4 font-mono text-white/60">
                              {index + 1 === 1 ? '🥇' : index + 1 === 2 ? '🥈' : index + 1 === 3 ? '🥉' : `#${index + 1}`}
                            </td>
                            <td className="px-6 py-4 font-bold text-white truncate max-w-[120px]">
                              {entry.name}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-yellow-500">
                              {entry.score.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
            
            <button 
              onClick={() => setGameState('idle')}
              className="w-full md:w-auto px-12 md:px-16 py-4 md:py-5 bg-white hover:bg-stone-200 text-black font-black text-xl md:text-2xl rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {t.mainMenu}
            </button>
          </motion.div>
        </div>
      )}

      {/* --- Debug Panel --- */}
      {ENABLE_DEBUG_PANEL && gameState === 'playing' && (
        <div className="hidden md:block absolute right-4 top-24 w-64 bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-white text-xs z-30 max-h-[70vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between mb-2 border-b border-white/20 pb-1">
            <h3 className="font-bold uppercase tracking-wider">{t.debug}</h3>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors ${isPaused ? 'bg-emerald-500 text-white' : 'bg-white/20 hover:bg-white/30'}`}
              >
                {isPaused ? t.resume : t.pause}
              </button>
              <span className="text-[10px] opacity-50">v6.5</span>
            </div>
          </div>
          <div className="mb-4 p-2 bg-black/40 rounded-lg border border-white/5">
            <h4 className="text-[10px] uppercase opacity-50 mb-1">{t.recentScores}</h4>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {floatingScores.map(fs => (
                <div key={fs.id} className="text-[10px] font-mono text-yellow-400">
                  {fs.score} pts @ ({Math.round(fs.x)}, {Math.round(fs.y)})
                </div>
              ))}
              {floatingScores.length === 0 && <span className="text-[10px] opacity-30">{t.none}</span>}
            </div>
          </div>
          <div className="space-y-3">
            {meatsOnGrill.map(meat => (
              <div key={meat.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="w-12 h-10 rounded-full border border-white/20 flex-shrink-0" style={getMeatStyle(meat.isSideAFacingDown ? meat.sideA.state : meat.sideB.state)} />
                <div className="flex-1 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="opacity-60">{t.sideA}:</span>
                    <span className={meat.sideA.state === 'burnt' ? 'text-red-400 font-bold' : meat.sideA.state === 'well' ? 'text-emerald-400' : ''}>
                      {meat.sideA.elapsed.toFixed(1)}s
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-60">{t.sideB}:</span>
                    <span className={meat.sideB.state === 'burnt' ? 'text-red-400 font-bold' : meat.sideB.state === 'well' ? 'text-emerald-400' : ''}>
                      {meat.sideB.elapsed.toFixed(1)}s
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Global Floating Scores --- */}
      <AnimatePresence>
        {floatingScores.map(fs => (
          <motion.div
            key={fs.id}
            initial={{ y: 20, opacity: 0, scale: 0.5 }}
            animate={{ y: -120, opacity: 1, scale: 1.1 }}
            exit={{ opacity: 0, scale: 1.4, filter: 'blur(8px)' }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="absolute z-[200] pointer-events-none flex flex-col items-center"
            style={{ 
              left: fs.x, 
              top: fs.y, 
              transform: 'translate(-50%, -50%)'
            }}
          >
            <motion.span 
              animate={{ rotate: [0, -3, 3, 0] }}
              transition={{ duration: 0.2, repeat: 2 }}
              className={`font-black text-4xl md:text-7xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] ${
                fs.isTimeBonus ? 'text-cyan-400' :
                fs.score >= 40 ? 'text-emerald-400' : 
                fs.score >= 20 ? 'text-yellow-400' : 
                fs.score >= 10 ? 'text-orange-400' :
                'text-red-500'
              }`}
            >
              {fs.isTimeBonus ? `+${fs.score}s` : (fs.score > 0 ? `+${fs.score}` : fs.score)}
            </motion.span>
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white font-black text-xs md:text-2xl uppercase tracking-[0.15em] drop-shadow-xl bg-black/60 backdrop-blur-sm px-3 md:px-5 py-1 md:py-1.5 rounded-lg md:rounded-xl border-2 border-white/20 mt-2 md:mt-3"
            >
              {fs.isTimeBonus ? t.timeBonus : (
                fs.score >= 40 ? t.godlike : 
                fs.score >= 20 ? t.delicious : 
                fs.score >= 10 ? t.ok : 
                t.failed
              )}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>
 
      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 text-white/20 pointer-events-none flex items-center gap-2 md:gap-3">
        <Flame className="w-4 h-4 md:w-6 md:h-6 animate-pulse text-orange-500" />
        <span className="text-[10px] md:text-sm font-mono uppercase tracking-[0.3em]">{t.title} {t.ultimate} v6.5</span>
      </div>
    </div>
  );
}

// --- Helper Functions ---

function getMeatStyle(state: MeatState): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: '50%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    border: 'none',
  };

  switch (state) {
    case 'raw':
      return {
        ...base,
        backgroundImage: 'url("/resources/raw.png")',
      };
    case 'half':
      return {
        ...base,
        backgroundImage: 'url("/resources/half.png")',
      };
    case 'well':
      return {
        ...base,
        backgroundImage: 'url("/resources/well.png")',
      };
    case 'over':
      return {
        ...base,
        backgroundImage: 'url("/resources/over.png")',
      };
    case 'burnt':
      return {
        ...base,
        backgroundImage: 'url("/resources/burnt.png")',
      };
  }
}

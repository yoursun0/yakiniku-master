/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Timer, Trophy, Flame, RotateCw, Play, BarChart3, Clock } from 'lucide-react';
import { MeatState, getNewState, getPoints, calculateHpChange } from './gameLogic';

// --- Types & Constants ---
type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTY_SETTINGS: Record<Difficulty, { meats: number; hp: number; label: string }> = {
  easy: { meats: 10, hp: 80, label: '簡單' },
  normal: { meats: 20, hp: 50, label: '普通' },
  hard: { meats: 35, hp: 30, label: '困難' },
};

const MEAT_WIDTH = 85;
const MEAT_HEIGHT = 65;
const GRILL_RADIUS = 160;

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
  sizzle: 'https://actions.google.com/sounds/v1/foley/sizzle.ogg',
  sizzleAction: 'https://actions.google.com/sounds/v1/foley/sizzle.ogg',
  flip: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
  start: 'https://actions.google.com/sounds/v1/ui/beep_short_on.ogg',
  finish: 'https://actions.google.com/sounds/v1/alarms/alarm_clock_beeping.ogg',
};

export default function App() {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);
  const [hp, setHp] = useState(50);
  const [maxHp, setMaxHp] = useState(50);
  const [meatOnPlate, setMeatOnPlate] = useState(0);
  const [meatsOnGrill, setMeatsOnGrill] = useState<MeatOnGrill[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'ended'>('idle');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [floatingScores, setFloatingScores] = useState<{ id: string; score: number; x: number; y: number; isSauce?: boolean }[]>([]);
  const [bonusTimeAdded, setBonusTimeAdded] = useState(0);
  const [draggedMeatId, setDraggedMeatId] = useState<string | null>(null);
  const [draggingMeat, setDraggingMeat] = useState<{
    source: 'plate' | 'grill';
    meatId?: string;
    currentX: number;
    currentY: number;
  } | null>(null);
  
  const appRef = useRef<HTMLDivElement>(null);
  const grillRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  // --- Initialize Sounds ---
  useEffect(() => {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      if (key === 'sizzle') {
        audio.loop = true;
        audio.volume = 0.8;
      }
      audioRefs.current[key] = audio;
    });
  }, []);

  const playSound = (key: keyof typeof SOUNDS) => {
    const audio = audioRefs.current[key];
    if (audio) {
      if (key !== 'sizzle') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (audio.paused) {
        audio.play().catch(() => {});
      }
    }
  };

  const stopSound = (key: keyof typeof SOUNDS) => {
    const audio = audioRefs.current[key];
    if (audio) {
      audio.pause();
      if (key !== 'sizzle') audio.currentTime = 0;
    }
  };

  // --- Game Timer ---
  useEffect(() => {
    if (gameState !== 'playing') {
      stopSound('sizzle');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame(0);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // --- End Game Condition ---
  useEffect(() => {
    if (gameState === 'playing' && hp <= 0) {
      endGame(0);
    }
  }, [hp, gameState]);

  // --- Refill Logic ---
  useEffect(() => {
    if (gameState === 'playing' && meatsOnGrill.length === 0 && meatOnPlate === 0) {
      setMeatOnPlate(DIFFICULTY_SETTINGS[difficulty].meats);
    }
  }, [meatsOnGrill.length, meatOnPlate, gameState, difficulty]);

  const endGame = (bonus: number) => {
    setGameState('ended');
    if (bonus > 0) {
      setBonusTimeAdded(bonus);
      setScore(prev => prev + bonus);
    } else {
      setBonusTimeAdded(0);
    }
    playSound('finish');
    stopSound('sizzle');
  };

  // --- Cooking Logic ---
  useEffect(() => {
    if (gameState !== 'playing') return;

    const updateCooking = () => {
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

  // --- Mouse Event Dragging Logic ---
  const handleMouseDownFromPlate = (e: React.MouseEvent) => {
    if (gameState !== 'playing' || meatOnPlate <= 0) return;
    setDraggingMeat({
      source: 'plate',
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };

  const handleMouseDownFromGrill = (e: React.MouseEvent, meatId: string) => {
    if (gameState !== 'playing') return;
    e.stopPropagation();
    setDraggingMeat({
      source: 'grill',
      meatId,
      currentX: e.clientX,
      currentY: e.clientY,
    });
    setDraggedMeatId(meatId);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingMeat) return;
    setDraggingMeat(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!draggingMeat) return;

    const { source, meatId } = draggingMeat;
    const clientX = e.clientX;
    const clientY = e.clientY;

    // Check if dropped on grill
    if (grillRef.current) {
      const rect = grillRef.current.getBoundingClientRect();
      const x = clientX - rect.left - MEAT_WIDTH / 2;
      const y = clientY - rect.top - MEAT_HEIGHT / 2;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const dist = Math.sqrt(Math.pow(x + MEAT_WIDTH / 2 - centerX, 2) + Math.pow(y + MEAT_HEIGHT / 2 - centerY, 2));

      if (dist <= GRILL_RADIUS - 20) {
        if (source === 'plate') {
          const isOverlapping = meatsOnGrill.some(meat => {
            const dx = meat.x - x;
            const dy = meat.y - y;
            const d = Math.sqrt(Math.pow(dx / MEAT_WIDTH, 2) + Math.pow(dy / MEAT_HEIGHT, 2));
            return d < 0.85;
          });

          if (!isOverlapping) {
            const newMeat: MeatOnGrill = {
              id: Math.random().toString(36).substr(2, 9),
              x,
              y,
              sideA: { elapsed: 0, state: 'raw' },
              sideB: { elapsed: 0, state: 'raw' },
              isSideAFacingDown: true,
            };
            setMeatsOnGrill(prev => [...prev, newMeat]);
            setMeatOnPlate(prev => prev - 1);
            playSound('sizzle');
            playSound('sizzleAction');
          }
        } else if (source === 'grill' && meatId) {
          const isOverlapping = meatsOnGrill.some(meat => {
            if (meat.id === meatId) return false;
            const dx = meat.x - x;
            const dy = meat.y - y;
            const d = Math.sqrt(Math.pow(dx / MEAT_WIDTH, 2) + Math.pow(dy / MEAT_HEIGHT, 2));
            return d < 0.85;
          });

          if (!isOverlapping) {
            setMeatsOnGrill(prev => prev.map(m => m.id === meatId ? { ...m, x, y } : m));
          }
        }
      }
    }

    // Check if dropped on sauce
    const sauceBowl = document.querySelector('.sauce-bowl-target');
    if (sauceBowl) {
      const rect = sauceBowl.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        if (source === 'grill' && meatId) {
          const meat = meatsOnGrill.find(m => m.id === meatId);
          if (meat) {
            const points = getPoints(meat.sideA.state) + getPoints(meat.sideB.state);
            const hpChange = calculateHpChange(meat.sideA.state, meat.sideB.state);
            setHp(prev => Math.min(maxHp, Math.max(0, prev + hpChange)));
            
            if (appRef.current) {
              const appRect = appRef.current.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2 - appRect.left - 120;
              const centerY = rect.top + rect.height / 2 - appRect.top - 60;
              applyScore(points, centerX, centerY, true);
            }
            
            setMeatsOnGrill(prev => prev.filter(m => m.id !== meatId));
            if (meatsOnGrill.length === 1) stopSound('sizzle');
          }
        }
      }
    }

    setDraggingMeat(null);
    setDraggedMeatId(null);
  };

  const applyScore = (points: number, x: number, y: number, isSauce: boolean = false) => {
    console.log(`[DEBUG] Applying Score: ${points} at (${x}, ${y})`);
    setScore((prev) => prev + points);
    const scoreId = Math.random().toString(36).substr(2, 9);
    setFloatingScores(prev => [...prev, { id: scoreId, score: points, x, y, isSauce }]);
    console.log(`[DEBUG] Floating Scores Count: ${floatingScores.length + 1}`);
    setTimeout(() => {
      setFloatingScores(prev => prev.filter(s => s.id !== scoreId));
      console.log(`[DEBUG] Floating Score ${scoreId} removed`);
    }, 1000);
  };

  const handleMeatClick = (meat: MeatOnGrill) => {
    if (gameState !== 'playing') return;

    setMeatsOnGrill((prev) => 
      prev.map((m) => m.id === meat.id ? { ...m, isSideAFacingDown: !m.isSideAFacingDown } : m)
    );
    playSound('sizzleAction');
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
    setBonusTimeAdded(0);
    playSound('start');
  };

  return (
    <div ref={appRef} 
         className="relative w-full h-screen overflow-hidden flex flex-col items-center select-none"
         onMouseMove={handleMouseMove}
         onMouseUp={handleMouseUp}
         style={{ 
           background: `
             radial-gradient(circle at center, #333 0%, #111 100%),
             url('https://www.transparenttextures.com/patterns/marble-similar.png')
           `,
           backgroundColor: '#1a1a1a'
         }}>
      
      {/* --- Top Status Bar --- */}
      <div className="mt-6 w-full max-w-5xl px-8 py-4 flex items-center justify-between z-10 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-4 text-white font-black text-3xl drop-shadow-lg">
          <Clock className="w-8 h-8 text-yellow-500" />
          <span>{timeLeft}秒</span>
        </div>

        <div className="flex-1 mx-12 flex flex-col gap-3">
          {/* Time Bar */}
          <div className="flex flex-col gap-1">
            <div className="text-[10px] text-white/70 font-bold uppercase tracking-widest text-center">剩餘時間</div>
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
          <div className="h-6 bg-stone-900 rounded-full overflow-hidden border border-white/5 relative shadow-inner">
            <motion.div 
              className={`h-full transition-colors duration-500 ${hp > maxHp * 0.3 ? 'bg-emerald-400' : 'bg-red-500'}`}
              initial={{ width: '100%' }}
              animate={{ width: `${(hp / maxHp) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white font-black uppercase tracking-widest drop-shadow-md">
              體力值: {hp} / {maxHp}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-white font-black text-3xl drop-shadow-lg">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <span>得分: {score}</span>
        </div>
      </div>

      {/* --- Main Grill Area --- */}
      <div className="flex-1 w-full flex items-center justify-center relative">
        {/* Golden Grill Frame */}
        <div className="relative w-[420px] h-[420px] rounded-full flex items-center justify-center shadow-2xl"
             style={{
               background: 'linear-gradient(135deg, #d4af37 0%, #f9f295 45%, #b8860b 70%, #d4af37 100%)',
               boxShadow: '0 0 60px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.5)'
             }}>
          
          {/* Black Mesh Grill */}
          <div 
            ref={grillRef}
            className="w-[380px] h-[380px] rounded-full bg-zinc-900 overflow-hidden relative border-4 border-black/30"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
              `,
              backgroundSize: '15px 15px'
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
                    onMouseDown={(e) => handleMouseDownFromGrill(e, meat.id)}
                    onClick={() => handleMeatClick(meat)}
                    className="absolute cursor-pointer rounded-full shadow-lg preserve-3d"
                    style={{
                      left: meat.x,
                      top: meat.y,
                      width: MEAT_WIDTH,
                      height: MEAT_HEIGHT,
                      transformStyle: 'preserve-3d',
                      opacity: draggedMeatId === meat.id ? 0 : 1,
                      pointerEvents: draggedMeatId === meat.id ? 'none' : 'auto'
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
      </div>

      {/* --- Bottom Interaction Area --- */}
      <div className="w-full max-w-5xl px-10 pb-10 flex items-end justify-between">
        {/* Left: Plate with Raw Meat */}
        <div className="relative group">
          <div className="w-72 h-56 rounded-[100px] bg-blue-700 border-8 border-blue-900 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-105">
            <div className="w-full h-full absolute inset-0 opacity-20" style={{
              backgroundImage: 'radial-gradient(circle, #ffffff22 1px, transparent 1px)',
              backgroundSize: '15px 15px'
            }} />
            {/* Meat Stack */}
            <div className="flex flex-wrap justify-center gap-2 p-6 z-10">
              {Array.from({ length: meatOnPlate }).slice(0, 6).map((_, i) => (
                <motion.div
                  key={`plate-meat-${i}`}
                  onMouseDown={handleMouseDownFromPlate}
                  whileHover={{ scale: 1.1 }}
                  className="w-16 h-12 rounded-full cursor-grab active:cursor-grabbing shadow-xl border-2 border-red-900/30"
                  style={getMeatStyle('raw')}
                />
              ))}
            </div>
          </div>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded-full text-white text-lg font-bold border border-white/10">
            生肉: {meatOnPlate} 塊
          </div>
        </div>

        {/* Right: Sauce Bowl */}
        <div 
          className="sauce-bowl-target relative group"
        >
          <div className="w-48 h-48 rounded-full bg-stone-700 border-8 border-stone-800 shadow-2xl flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
            <div className="w-36 h-36 rounded-full bg-[#2a1a10] shadow-inner flex items-center justify-center relative">
              <div className="w-full h-full opacity-30" style={{
                backgroundImage: 'radial-gradient(circle, #ffffff22 1px, transparent 1px)',
                backgroundSize: '10px 10px'
              }} />
              <div className="absolute top-4 left-4 w-8 h-4 bg-white/10 rounded-full blur-sm" />
            </div>
          </div>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded-full text-white text-lg font-bold border border-white/10 whitespace-nowrap">
            燒肉醬汁碗
          </div>
        </div>
      </div>

      {/* --- Overlays --- */}
      {gameState === 'idle' && (
        <div className="absolute inset-0 bg-black/80 z-50 flex flex-center items-center justify-center flex-col p-8 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-stone-900 p-12 rounded-3xl border-2 border-yellow-500/30 shadow-2xl max-w-xl"
          >
            <h1 className="text-6xl font-black text-white mb-8 tracking-tighter italic">日式燒肉大師 <span className="text-yellow-500">ULTIMATE</span></h1>
            
            <div className="grid grid-cols-3 gap-4 mb-10">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                    difficulty === d 
                      ? 'bg-yellow-500 border-yellow-400 text-black' 
                      : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                  }`}
                >
                  <BarChart3 className="w-6 h-6" />
                  <span className="font-bold text-sm">{DIFFICULTY_SETTINGS[d].label}</span>
                  <span className="text-[10px] opacity-70">血量: {DIFFICULTY_SETTINGS[d].hp} / 120秒</span>
                </button>
              ))}
            </div>

            <div className="text-stone-300 mb-10 text-left space-y-3 text-sm bg-black/30 p-6 rounded-2xl border border-white/5">
              <p>✨ <span className="text-white font-bold">全新計分：</span> 總分 = 兩面得分相加</p>
              <p>🥩 <span className="text-emerald-400">全熟 (+10)</span> | <span className="text-yellow-400">半熟 (+5)</span> | <span className="text-red-500">其他 (0分)</span></p>
              <p>❤️ <span className="text-white font-bold">體力機制：</span> 生肉/烤焦 <span className="text-red-500">-5 HP</span> | 過火 <span className="text-orange-400">-1 HP</span> | 雙面全熟 <span className="text-emerald-400">+1 HP</span></p>
              <p>🎮 <span className="text-white font-bold">操作：</span> 拖曳生肉至烤網 ➔ 點擊翻面 ➔ 拖曳至醬汁碗收成。</p>
            </div>

            <button 
              onClick={() => startGame(difficulty)}
              className="w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-2xl rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg flex items-center justify-center gap-3"
            >
              <Play className="w-8 h-8 fill-black" />
              開始挑戰
            </button>
          </motion.div>
        </div>
      )}

      {gameState === 'ended' && (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-center items-center justify-center flex-col p-8 text-center">
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-stone-900 p-16 rounded-3xl border-2 border-white/10 shadow-2xl max-w-md"
          >
            <h2 className="text-5xl font-black text-white mb-2">挑戰結束</h2>
            <p className="text-stone-500 font-mono text-sm mb-6 uppercase tracking-widest">{difficulty === 'easy' ? '簡單' : difficulty === 'normal' ? '普通' : '困難'} 模式</p>
            
            <div className="text-8xl font-black text-yellow-500 mb-4 drop-shadow-2xl">
              {score}
            </div>

            <p className="text-stone-400 mb-12 text-xl leading-relaxed">
              {score > 100 ? "你是真正的燒肉之神！" : score > 50 ? "大師級的火候掌控！" : "繼續精進你的廚藝吧！"}
            </p>
            
            <button 
              onClick={() => setGameState('idle')}
              className="px-16 py-5 bg-white hover:bg-stone-200 text-black font-black text-2xl rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-lg"
            >
              返回主選單
            </button>
          </motion.div>
        </div>
      )}

      {/* --- Debug Panel --- */}
      {gameState === 'playing' && (
        <div className="absolute right-4 top-24 w-64 bg-black/60 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-white text-xs z-30 max-h-[70vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between mb-2 border-b border-white/20 pb-1">
            <h3 className="font-bold uppercase tracking-wider">除錯：烹飪狀態</h3>
            <span className="text-[10px] opacity-50">v3.1</span>
          </div>
          <div className="mb-4 p-2 bg-black/40 rounded-lg border border-white/5">
            <h4 className="text-[10px] uppercase opacity-50 mb-1">最近得分紀錄</h4>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {floatingScores.map(fs => (
                <div key={fs.id} className="text-[10px] font-mono text-yellow-400">
                  {fs.score} pts @ ({Math.round(fs.x)}, {Math.round(fs.y)})
                </div>
              ))}
              {floatingScores.length === 0 && <span className="text-[10px] opacity-30">無</span>}
            </div>
          </div>
          <div className="space-y-3">
            {meatsOnGrill.map(meat => (
              <div key={meat.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="w-12 h-10 rounded-full border border-white/20 flex-shrink-0" style={getMeatStyle(meat.isSideAFacingDown ? meat.sideA.state : meat.sideB.state)} />
                <div className="flex-1 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="opacity-60">A面:</span>
                    <span className={meat.sideA.state === 'burnt' ? 'text-red-400 font-bold' : meat.sideA.state === 'well' ? 'text-emerald-400' : ''}>
                      {meat.sideA.elapsed.toFixed(1)}秒
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="opacity-60">B面:</span>
                    <span className={meat.sideB.state === 'burnt' ? 'text-red-400 font-bold' : meat.sideB.state === 'well' ? 'text-emerald-400' : ''}>
                      {meat.sideB.elapsed.toFixed(1)}秒
                    </span>
                  </div>
                  <div className="mt-1 text-[9px] opacity-40 text-right">
                    ID: {meat.id.slice(0, 4)}...
                  </div>
                </div>
              </div>
            ))}
            {meatsOnGrill.length === 0 && <p className="text-stone-500 italic text-center py-4">烤網上沒有肉</p>}
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
              className={`font-black text-7xl drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] ${
                fs.score >= 20 ? 'text-emerald-400' : 
                fs.score >= 10 ? 'text-yellow-400' : 
                fs.score > 0 ? 'text-orange-400' :
                'text-red-500'
              }`}
            >
              {fs.score > 0 ? `+${fs.score}` : fs.score}
            </motion.span>
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-white font-black text-2xl uppercase tracking-[0.15em] drop-shadow-xl bg-black/60 backdrop-blur-sm px-5 py-1.5 rounded-xl border-2 border-white/20 mt-3"
            >
              {fs.score >= 20 ? '神級美味！' : 
               fs.score >= 10 ? '美味可口' : 
               fs.score > 0 ? '普通' : 
               fs.score === 0 ? '太難吃了' : '大失敗...'}
            </motion.span>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="absolute bottom-6 right-6 text-white/20 pointer-events-none flex items-center gap-3">
        <Flame className="w-6 h-6 animate-pulse text-orange-500" />
        <span className="text-sm font-mono uppercase tracking-[0.3em]">Yakiniku Master Ultimate v3.1</span>
      </div>

      {/* --- Custom Drag Layer (No System Icons) --- */}
      {draggingMeat && (
        <div className="fixed inset-0 pointer-events-none z-[100]">
          <div 
            className="absolute shadow-2xl rounded-full border-2"
            style={{ 
              left: draggingMeat.currentX - MEAT_WIDTH / 2, 
              top: draggingMeat.currentY - MEAT_HEIGHT / 2,
              width: MEAT_WIDTH,
              height: MEAT_HEIGHT,
              ...getMeatStyle(
                draggingMeat.source === 'plate' ? 'raw' : 
                (meatsOnGrill.find(m => m.id === draggingMeat.meatId)?.isSideAFacingDown ? 
                 meatsOnGrill.find(m => m.id === draggingMeat.meatId)!.sideA.state : 
                 meatsOnGrill.find(m => m.id === draggingMeat.meatId)!.sideB.state)
              )
            }}
          />
        </div>
      )}
    </div>
  );
}

// --- Helper Functions ---

function getMeatStyle(state: MeatState): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: '50%',
  };

  switch (state) {
    case 'raw':
      return {
        ...base,
        background: 'linear-gradient(135deg, #ff4d4d 0%, #cc0000 100%)',
        backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 40%), linear-gradient(135deg, #ff4d4d 0%, #cc0000 100%)',
        borderColor: '#990000'
      };
    case 'half':
      return {
        ...base,
        background: 'linear-gradient(135deg, #d98c8c 0%, #8c4d4d 100%)',
        borderColor: '#663333'
      };
    case 'well':
      return {
        ...base,
        background: 'linear-gradient(135deg, #8b4513 0%, #5d2e0a 100%)',
        backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.2) 0px, rgba(0,0,0,0.2) 2px, transparent 2px, transparent 8px), linear-gradient(135deg, #8b4513 0%, #5d2e0a 100%)',
        borderColor: '#3d1f07'
      };
    case 'over':
      return {
        ...base,
        background: 'linear-gradient(135deg, #5d2e0a 0%, #3d1f07 100%)',
        borderColor: '#1a0d03',
        borderWidth: '3px'
      };
    case 'burnt':
      return {
        ...base,
        background: 'linear-gradient(135deg, #444 0%, #222 100%)',
        borderColor: '#111'
      };
  }
}

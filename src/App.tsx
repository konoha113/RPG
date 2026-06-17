import React, { useState, useEffect } from 'react';
import { Hero, GameState, DungeonTile, HeroClass } from './types';
import { playSound } from './utils/sound';
import TownScreen from './components/TownScreen';
import DungeonMap, { generateDungeonMap } from './components/DungeonMap';
import BattleScreen from './components/BattleScreen';
import {
  Shield, Sparkles, Sword, Heart, Compass, Trophy,
  RefreshCw, Volume2, User, ChevronRight, Skull,
  Award, ShieldAlert, Zap
} from 'lucide-react';

const INITIAL_HERO = (name: string, classType: HeroClass): Hero => {
  const baseStats = {
    warrior: { level: 1, hp: 80, maxHp: 80, mp: 15, maxMp: 15, atk: 15, def: 8, exp: 0, nextExp: 100, gold: 100 },
    mage: { level: 1, hp: 50, maxHp: 50, mp: 45, maxMp: 45, atk: 9, def: 4, exp: 0, nextExp: 100, gold: 120 },
    thief: { level: 1, hp: 65, maxHp: 65, mp: 25, maxMp: 25, atk: 12, def: 5, exp: 0, nextExp: 100, gold: 150 },
  };

  return {
    id: 'hero-main',
    name: name || '勇者ロト',
    classType,
    stats: { ...baseStats[classType] },
    weaponUpgrade: 0,
    armorUpgrade: 0,
    inventory: {
      potions: 2,
      mpPotions: 1,
      upgradeStones: 0,
    }
  };
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('title');
  const [playerName, setPlayerName] = useState<string>('ロト');
  const [selectedClass, setSelectedClass] = useState<HeroClass>('warrior');
  const [hero, setHero] = useState<Hero | null>(null);

  // Dungeon states
  const [currentFloor, setCurrentFloor] = useState<number>(1);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [map, setMap] = useState<DungeonTile[]>([]);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [dungeonKeyFound, setDungeonKeyFound] = useState<boolean>(false);

  // Battle triggers
  const [battleEnemyType, setBattleEnemyType] = useState<'regular' | 'boss'>('regular');

  // Level Up Banner notification
  const [levelUpData, setLevelUpData] = useState<{
    show: boolean;
    prevLevel: number;
    newLevel: number;
    hpGains: number;
    mpGains: number;
    atkGains: number;
    defGains: number;
  } | null>(null);

  // Initialize audio contextual alert
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  // Triggered when entering dungeon
  const handleEnterDungeon = () => {
    if (!hero) return;
    playSound('click');
    setDungeonKeyFound(false);
    
    // Generate new map for current floor
    const newMap = generateDungeonMap(currentFloor);
    setMap(newMap);
    setPlayerPos({ x: 0, y: 0 });
    setGameState('dungeon');
    
    setCombatLog([
      `地下 ${currentFloor} 階に踏み入れた... 警戒を怠るな！`,
      `[ヒント] 上下左右キー、または画面下のD-PADで進みます。`
    ]);
  };

  // Leave dungeon back to town safely
  const handleLeaveDungeon = () => {
    playSound('click');
    setGameState('town');
  };

  // Move to next floor
  const handleNextFloor = () => {
    if (currentFloor >= 5) return; // Cap at 5 for final boss
    playSound('levelup');
    setDungeonKeyFound(false);
    const nextF = currentFloor + 1;
    setCurrentFloor(nextF);
    
    // Generate next map layout
    const newMap = generateDungeonMap(nextF);
    setMap(newMap);
    setPlayerPos({ x: 0, y: 0 });
    
    setCombatLog([
      `階段を下り、地下 ${nextF} 階へ到達した！`,
      nextF === 5 ? `【警告】この歪んだ魔力の嵐... 魔王が近くに潜んでいる！` : `周囲の妖気が濃くなった気がする...`
    ]);
  };

  // Combat system integrations
  const handleTriggerBattle = (enemyType: 'regular' | 'boss') => {
    setBattleEnemyType(enemyType);
    setGameState('battle');
  };

  const handleBattleWin = (expGained: number, goldGained: number) => {
    if (!hero) return;

    let updatedHero = { ...hero };
    updatedHero.stats.gold += goldGained;
    updatedHero.stats.exp += expGained;

    // Check for level up
    let levelGained = false;
    let prevL = updatedHero.stats.level;
    let newL = prevL;
    let hpGainTotal = 0;
    let mpGainTotal = 0;
    let atkGainTotal = 0;
    let defGainTotal = 0;

    // Loop support for multi-levelups
    while (updatedHero.stats.exp >= updatedHero.stats.nextExp) {
      levelGained = true;
      updatedHero.stats.exp -= updatedHero.stats.nextExp;
      newL += 1;
      updatedHero.stats.level = newL;
      updatedHero.stats.nextExp = newL * 100;

      // Class specific gains
      let hpG = 0, mpG = 0, atkG = 0, defG = 0;
      if (hero.classType === 'warrior') {
        hpG = 18; mpG = 4; atkG = 4; defG = 2;
      } else if (hero.classType === 'mage') {
        hpG = 10; mpG = 12; atkG = 2; defG = 1;
      } else {
        hpG = 14; mpG = 6; atkG = 3; defG = 1;
      }

      hpGainTotal += hpG;
      mpGainTotal += mpG;
      atkGainTotal += atkG;
      defGainTotal += defG;

      updatedHero.stats.maxHp += hpG;
      updatedHero.stats.maxMp += mpG;
      updatedHero.stats.atk += atkG;
      updatedHero.stats.def += defG;
    }

    if (levelGained) {
      playSound('levelup');
      // Fully replenish on level up
      updatedHero.stats.hp = updatedHero.stats.maxHp;
      updatedHero.stats.mp = updatedHero.stats.maxMp;

      setLevelUpData({
        show: true,
        prevLevel: prevL,
        newLevel: newL,
        hpGains: hpGainTotal,
        mpGains: mpGainTotal,
        atkGains: atkGainTotal,
        defGains: defGainTotal,
      });
    }

    setHero(updatedHero);

    // If beat final boss, game won!
    if (battleEnemyType === 'boss') {
      setGameState('victory');
    } else {
      // Clear current monster tile with key drop check
      const currentTile = map.find(tile => tile.x === playerPos.x && tile.y === playerPos.y);
      if (currentTile && currentTile.hasKey) {
        setDungeonKeyFound(true);
        setCombatLog(prev => [
          `🎉 戦闘に勝利し、階層の結界を解く【封印の鍵 🔑】を剥ぎ取った！`,
          ...prev.slice(0, 15)
        ]);
        playSound('levelup');
      }

      const updatedMap = map.map(tile =>
        tile.x === playerPos.x && tile.y === playerPos.y ? { ...tile, cleared: true, type: 'empty' as const } : tile
      );
      setMap(updatedMap);
      setGameState('dungeon');
    }
  };

  const handleBattleLose = () => {
    playSound('gameover');
    setGameState('game_over');
  };

  const handleBattleFlee = () => {
    // Return to exploration screen safely
    setGameState('dungeon');
  };

  const handleSelectClassAndStart = () => {
    playSound('levelup');
    const newHero = INITIAL_HERO(playerName, selectedClass);
    setHero(newHero);
    setCurrentFloor(1);
    setGameState('town');
  };

  const resetToTitle = () => {
    playSound('click');
    setHero(null);
    setCurrentFloor(1);
    setGameState('title');
  };

  // Register first interactive tap
  const handleScreenTouch = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      playSound('click');
    }
  };

  return (
    <div
      id="app-root-viewport"
      onClick={handleScreenTouch}
      className="min-h-screen bg-zinc-950 flex items-center justify-center p-2 sm:p-4 text-zinc-100 selection:bg-amber-600 selection:text-zinc-950 select-none overflow-x-hidden"
    >
      <div id="retro-container" className="w-full max-w-2xl bg-zinc-900/30 border-2 border-zinc-900 rounded-2xl p-4 shadow-2xl relative">
        
        {/* Title Screen */}
        {gameState === 'title' && (
          <div id="title-scene" className="flex flex-col items-center justify-center text-center py-10 space-y-8">
            <div id="title-logo" className="space-y-4">
              <span className="text-[10px] text-amber-500 uppercase font-mono tracking-widest border border-amber-900/40 bg-amber-950/20 px-3 py-1 rounded-full">
                👑 8-BIT RETRO ADVENTURE
              </span>
              <h1 className="text-4xl sm:text-5xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-600 drop-shadow-[0_4px_6px_rgba(0,0,0,0.8)]">
                RETRO QUEST
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
                混沌に包まれた王国を救うため、5つの難関ダンジョンフロアを攻略し、最深部に棲む深淵の【魔王】を討伐せよ！
              </p>
            </div>

            <div id="author-credit" className="bg-zinc-900/60 p-4 border border-zinc-800 rounded-xl w-full max-w-md space-y-4">
              <div id="input-name" className="flex flex-col items-start space-y-1.5">
                <label className="text-[10px] text-zinc-400 uppercase font-bold tracking-wide">冒険者のなまえを決める</label>
                <div className="relative w-full">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <input
                    id="name-input"
                    type="text"
                    maxLength={8}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-4 text-sm font-semibold focus:outline-none focus:border-amber-500 font-sans text-zinc-100"
                    placeholder="ロト"
                  />
                </div>
              </div>

              <button
                id="start-adventure-btn"
                onClick={() => { playSound('click'); setGameState('class_select'); }}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:brightness-110 text-zinc-950 font-black py-3 rounded-lg text-xs leading-none shadow-lg shadow-amber-950/20 active:translate-y-0.5 transition-all flex items-center justify-center space-x-1"
              >
                <span>冒険の扉を開く</span>
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Quick volume tip */}
            {!hasInteracted && (
              <p className="text-[9px] text-zinc-500 italic">
                ※ 画面をクリックすると、懐かしい8-bit風サウンドエフェクトが有効になります 🔊
              </p>
            )}
          </div>
        )}

        {/* Class Selection Screen */}
        {gameState === 'class_select' && (
          <div id="class_select-scene" className="space-y-6 py-4">
            <div id="select-header" className="text-center space-y-1">
              <h2 className="text-lg font-bold text-amber-400">職業を選択してください</h2>
              <p className="text-zinc-500 text-[11px]">それぞれの能力値と得意のスキルが異なります。</p>
            </div>

            <div id="classes-grid" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Warrior Card */}
              <button
                id="select-warrior-card"
                onClick={() => setSelectedClass('warrior')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-[180px] transition-all duration-200 active:scale-98 ${
                  selectedClass === 'warrior'
                    ? 'bg-amber-950/20 border-amber-500 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl">🛡️</span>
                    <span className="text-[10px] bg-red-950/40 text-red-500 font-bold px-1.5 py-0.5 rounded border border-red-900/40">戦士</span>
                  </div>
                  <h3 className="font-bold text-xs">ウォリアー</h3>
                  <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
                    高いHPと屈強な防御力を誇る。強力な一撃攻撃と敵の装甲を削る「兜割り」を得意とする。
                  </p>
                </div>
                <div className="text-[10px] font-mono text-zinc-400">
                  HP ★★★★★ | MP ★☆☆☆☆
                </div>
              </button>

              {/* Mage Card */}
              <button
                id="select-mage-card"
                onClick={() => setSelectedClass('mage')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-[180px] transition-all duration-200 active:scale-98 ${
                  selectedClass === 'mage'
                    ? 'bg-amber-950/20 border-amber-500 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl">🪄</span>
                    <span className="text-[10px] bg-cyan-950/40 text-cyan-500 font-bold px-1.5 py-0.5 rounded border border-cyan-900/40">魔法使い</span>
                  </div>
                  <h3 className="font-bold text-xs">メイジ</h3>
                  <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
                    豊富な魔力を持つが体力は控えめ。絶大な呪文「ファイア」や「ヒール」の魔法を編み出す。
                  </p>
                </div>
                <div className="text-[10px] font-mono text-zinc-400">
                  HP ★★☆☆☆ | MP ★★★★★
                </div>
              </button>

              {/* Thief Card */}
              <button
                id="select-thief-card"
                onClick={() => setSelectedClass('thief')}
                className={`p-4 rounded-xl border text-left flex flex-col justify-between h-[180px] transition-all duration-200 active:scale-98 ${
                  selectedClass === 'thief'
                    ? 'bg-amber-950/20 border-amber-500 shadow-md shadow-amber-500/10'
                    : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl">🗡️</span>
                    <span className="text-[10px] bg-emerald-950/40 text-emerald-500 font-bold px-1.5 py-0.5 rounded border border-emerald-900/40">盗賊</span>
                  </div>
                  <h3 className="font-bold text-xs">シーフ</h3>
                  <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
                    高いクリティカル率を誇る。敵から貴重品を奪い取る「盗む」や、迅速な逃走スキルを持つ。
                  </p>
                </div>
                <div className="text-[10px] font-mono text-zinc-400">
                  HP ★★★☆☆ | MP ★★★☆☆
                </div>
              </button>
            </div>

            <div id="select-footer" className="pt-4 border-t border-zinc-800/60 flex justify-between items-center font-sans">
              <button
                id="back-select-btn"
                onClick={() => { playSound('click'); setGameState('title'); }}
                className="text-xs text-zinc-400 hover:text-zinc-100"
              >
                タイトルに戻る
              </button>

              <button
                id="confirm-class-btn"
                onClick={handleSelectClassAndStart}
                className="bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold px-6 py-2.5 rounded-lg text-xs transition shadow-md shadow-amber-500/5 flex items-center space-x-1"
              >
                <span>選択した天職で旅立つ</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Global HUD Header (For Active Gameplay screens) */}
        {['town', 'dungeon', 'battle'].includes(gameState) && hero && (
          <div id="active-play-hud" className="border-b border-zinc-800/80 pb-3 mb-4">
            <div className="flex justify-between items-center text-xs">
              <div id="player-hud-bio" className="flex items-center space-x-2">
                <span className="text-base">
                  {hero.classType === 'warrior' ? '🛡️' : hero.classType === 'mage' ? '🪄' : '🗡️'}
                </span>
                <div>
                  <span className="font-bold text-zinc-100">{hero.name}</span>
                  <span className="text-[9px] text-zinc-400 ml-1.5 bg-zinc-800 border border-zinc-750 px-1 py-0.2 rounded font-mono">
                    Lv.{hero.stats.level} {hero.classType === 'warrior' ? '戦士' : hero.classType === 'mage' ? '魔法使い' : '盗賊'}
                  </span>
                </div>
              </div>

              {/* Exp metrics */}
              <div id="player-hud-exp" className="flex flex-col items-end">
                <span className="text-[9px] text-zinc-400 font-mono">EXP {hero.stats.exp} / {hero.stats.nextExp}</span>
                <div className="w-24 bg-zinc-950 h-1 rounded-full border border-zinc-800 mt-0.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full transition-all duration-300"
                    style={{ width: `${(hero.stats.exp / hero.stats.nextExp) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HUD Sub-routing */}
        {gameState === 'town' && hero && (
          <TownScreen
            hero={hero}
            updateHero={setHero}
            onEnterDungeon={handleEnterDungeon}
          />
        )}

        {gameState === 'dungeon' && hero && (
          <DungeonMap
            currentFloor={currentFloor}
            playerPos={playerPos}
            setPlayerPos={setPlayerPos}
            map={map}
            setMap={setMap}
            hero={hero}
            updateHero={setHero}
            onTriggerBattle={handleTriggerBattle}
            onLeaveDungeon={handleLeaveDungeon}
            onNextFloor={handleNextFloor}
            combatLog={combatLog}
            setCombatLog={setCombatLog}
            dungeonKeyFound={dungeonKeyFound}
            setDungeonKeyFound={setDungeonKeyFound}
          />
        )}

        {gameState === 'battle' && hero && (
          <BattleScreen
            hero={hero}
            updateHero={setHero}
            enemyType={battleEnemyType}
            currentFloor={currentFloor}
            onWin={handleBattleWin}
            onLose={handleBattleLose}
            onFlee={handleBattleFlee}
          />
        )}

        {/* Game Over Screen */}
        {gameState === 'game_over' && hero && (
          <div id="gameover-scene" className="text-center py-12 space-y-6 max-w-sm mx-auto flex flex-col items-center">
            <span className="text-4xl animate-bounce">💀</span>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-red-500 tracking-wider">GAME OVER</h2>
              <p className="text-zinc-500 text-xs">暗きダンジョンの奈落にて力尽きました...</p>
            </div>

            <div id="gameover-records" className="w-full bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl text-left space-y-2.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">最終到達</span>
                <span className="text-zinc-100 font-bold">地下 {currentFloor} 階</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">最終レベル</span>
                <span className="text-zinc-100 font-bold">Lv.{hero.stats.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">遺言ゴールド</span>
                <span className="text-zinc-100 font-bold">{hero.stats.gold} G</span>
              </div>
            </div>

            <button
              id="retry-btn"
              onClick={resetToTitle}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold py-3 rounded-lg text-xs leading-none transition-all active:scale-95 flex items-center justify-center space-x-1.5 border border-zinc-750"
            >
              <RefreshCw className="w-4 h-4" />
              <span>王都に転生する (再挑戦)</span>
            </button>
          </div>
        )}

        {/* Victory Screen */}
        {gameState === 'victory' && hero && (
          <div id="victory-scene" className="text-center py-10 space-y-6 max-w-md mx-auto flex flex-col items-center">
            <div id="victory-animation" className="relative">
              <span className="text-5xl drop-shadow select-none">👑</span>
              <div className="absolute top-0 left-0 w-full h-full text-center animate-ping text-5xl">👑</div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-500">
                VICTORY
              </h2>
              <p className="text-emerald-400 font-bold text-xs uppercase tracking-wide">魔国討伐・真の勇者</p>
            </div>

            <div id="victory-congratulations" className="bg-zinc-900 border border-emerald-900/50 bg-emerald-950/5/10 p-5 rounded-2xl select-text text-xs text-zinc-300 leading-relaxed space-y-3 shadow-inner">
              <p>
                おめでとうございます！ <strong>{hero.name}</strong> は、地下5階の魔宮の奥深くで
                恐怖の【魔王・マオウ】を完全討伐し、世界に悠久の光と平和を取り戻しました。
              </p>
              <p className="text-[11px] text-zinc-400">
                あなたの伝説は、吟遊詩人によって何世代の民衆にも語り継がれていくことでしょう！
              </p>
            </div>

            <div id="victory-stats" className="w-full bg-zinc-900/60 p-4 border border-zinc-850 rounded-xl space-y-1.5 text-xs text-left font-mono">
              <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1.5 mb-11">
                <span>最終リザルト</span>
                <span>勇者の功績</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-zinc-400">勇者のなまえ</span>
                <span className="text-amber-400 font-bold">{hero.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">最高到達レベル</span>
                <span className="text-emerald-400 font-bold">Lv.{hero.stats.level} ({hero.classType === 'warrior' ? '戦士' : hero.classType === 'mage' ? '魔法使い' : '盗賊'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">所持ゴールド</span>
                <span className="text-zinc-150 font-bold">{hero.stats.gold} Gold</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">武具の鍛錬レベル</span>
                <span className="text-purple-400 font-bold">武器 +{hero.weaponUpgrade} / 防具 +{hero.armorUpgrade}</span>
              </div>
            </div>

            <button
              id="congrats-restart-btn"
              onClick={resetToTitle}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-zinc-950 font-black py-3 rounded-lg text-xs leading-none transition-all active:scale-95 shadow-md shadow-amber-500/10 flex items-center justify-center space-x-1.5"
            >
              <Award className="w-5 h-5 text-zinc-950" />
              <span>新たな伝説に挑む (再プレイ)</span>
            </button>
          </div>
        )}

      </div>

      {/* Level Up Banner Overlay Dialog Notification */}
      {levelUpData && levelUpData.show && (
        <div id="levelup-alert-overlay" className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div id="levelup-dialog" className="bg-gradient-to-b from-amber-950/20 to-zinc-950 border-2 border-amber-500/80 rounded-2xl p-6 text-center max-w-sm w-full space-y-6 shadow-2xl animate-fade-in">
            <span className="text-5xl animate-bounce block select-none">👑</span>
            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold italic text-transparent bg-clip-text bg-gradient-to-b from-amber-400 to-amber-600">
                LEVEL UP!
              </h3>
              <p className="text-xs text-zinc-400 font-semibold font-mono">
                レベルが 【{levelUpData.prevLevel}】 から 【{levelUpData.newLevel}】 に上昇した！
              </p>
            </div>

            <div id="levelup-statgains" className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-left space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>最大生命力 (HP)</span>
                <span className="text-green-400 font-bold">+{levelUpData.hpGains}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>最大魔力 (MP)</span>
                <span className="text-cyan-400 font-bold">+{levelUpData.mpGains}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>物理攻撃力 (ATK)</span>
                <span className="text-red-400 font-bold">+{levelUpData.atkGains}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>物理防御力 (DEF)</span>
                <span className="text-emerald-400 font-bold">+{levelUpData.defGains}</span>
              </div>
              <div className="border-t border-zinc-850 pt-1.5 mt-1.5 text-center text-[10px] text-amber-500/90 flex justify-center items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>HPとMPがすっかり全快した！</span>
              </div>
            </div>

            <button
              id="close-lvlup-btn"
              onClick={() => { playSound('click'); setLevelUpData(null); }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black py-2.5 rounded-lg text-xs leading-none transition-all"
            >
              よしっ！
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

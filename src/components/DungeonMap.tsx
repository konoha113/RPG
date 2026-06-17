import React, { useEffect, useState, useRef } from 'react';
import { DungeonTile, TileType, Hero } from '../types';
import { playSound } from '../utils/sound';
import {
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Sparkles, Compass, Milestone, Footprints, Map
} from 'lucide-react';

interface DungeonMapProps {
  currentFloor: number;
  playerPos: { x: number; y: number };
  setPlayerPos: (pos: { x: number; y: number }) => void;
  map: DungeonTile[];
  setMap: (map: DungeonTile[]) => void;
  hero: Hero;
  updateHero: (updated: Hero) => void;
  onTriggerBattle: (enemyType: 'regular' | 'boss') => void;
  onLeaveDungeon: () => void;
  onNextFloor: () => void;
  combatLog: string[];
  setCombatLog: React.Dispatch<React.SetStateAction<string[]>>;
  dungeonKeyFound: boolean;
  setDungeonKeyFound: (found: boolean) => void;
}

export function getMapSizeByFloor(floor: number): number {
  return 20;
}

// Procedural map generator with guaranteed path
export function generateDungeonMap(floor: number): DungeonTile[] {
  const MAP_SIZE = getMapSizeByFloor(floor);
  const map: DungeonTile[] = [];

  // 1. Initialize all as walls
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      map.push({
        x,
        y,
        type: 'wall',
        revealed: false,
        visited: false,
        cleared: false,
      });
    }
  }

  const getTile = (x: number, y: number) => map.find(t => t.x === x && t.y === y);

  const revealAdjacent = (px: number, py: number) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = px + dx;
        const ty = py + dy;
        const t = map.find(tile => tile.x === tx && tile.y === ty);
        if (t) {
          t.revealed = true;
        }
      }
    }
  };

  if (floor === 5) {
    // Handcrafted Epic Boss Stage layout inside 20x20 grid!
    const carve = (x: number, y: number, type: DungeonTile['type'] = 'empty') => {
      const tile = getTile(x, y);
      if (tile) {
        tile.type = type;
      }
    };

    // Define Paths
    const paths = [
      // Major vertical corridor on left side (X=0)
      { x1: 0, x2: 0, y1: 0, y2: 15 },
      // Major horizontal corridor connecting left to right (Y=15)
      { x1: 0, x2: 15, y1: 15, y2: 15 },
      // Minor vertical corridor going down to the Throne Room (X=15)
      { x1: 15, x2: 15, y1: 15, y2: 19 },
      // Horizontal hallway leading straight into Throne Room
      { x1: 15, x2: 19, y1: 19, y2: 19 },
    ];

    paths.forEach(p => {
      for (let x = Math.min(p.x1, p.x2); x <= Math.max(p.x1, p.x2); x++) {
        for (let y = Math.min(p.y1, p.y2); y <= Math.max(p.y1, p.y2); y++) {
          carve(x, y);
        }
      }
    });

    // --- Side Chamber 1: Left Preparation Temple (Shrine) ---
    // Connector from main hallway (0, 4) going East
    carve(1, 4);
    carve(2, 4);
    carve(3, 4);
    // 3x3 Chamber
    for (let hx = 3; hx <= 5; hx++) {
      for (let hy = 3; hy <= 5; hy++) {
        carve(hx, hy);
      }
    }
    carve(4, 4, 'shrine');
    carve(3, 4, 'monster'); // Guarding chamber entry

    // --- Side Chamber 2: Right Vault (Chest containing Secret Key) ---
    // Connector from main horizontal corridor (5, 15) going North
    carve(5, 14);
    carve(5, 13);
    carve(5, 12);
    // 3x3 Chamber
    for (let hx = 4; hx <= 6; hx++) {
      for (let hy = 10; hy <= 12; hy++) {
        carve(hx, hy);
      }
    }
    // Key Chest
    const keyChest = getTile(5, 11);
    if (keyChest) {
      keyChest.type = 'chest';
      keyChest.hasKey = true;
    }
    carve(5, 12, 'monster'); // Sentinel Guarding the Key

    // --- Side Chamber 3: Mystic Portal Room ---
    // Connector from main horizontal corridor (12, 15) going North
    carve(12, 14);
    carve(12, 13);
    carve(12, 12);
    // 3x3 Chamber
    for (let hx = 11; hx <= 13; hx++) {
      for (let hy = 10; hy <= 12; hy++) {
        carve(hx, hy);
      }
    }
    const portalTile = getTile(12, 11);
    if (portalTile) {
      portalTile.type = 'empty';
      portalTile.isPortal = true;
    }
    carve(12, 12, 'monster'); // Dark Portal Guard

    // --- Traps & Obstacles on Main Path ---
    const tPoison = getTile(0, 11);
    if (tPoison) {
      tPoison.hasTrap = true;
      tPoison.trapType = 'poison';
    }
    const tArrow = getTile(12, 15);
    if (tArrow) {
      tArrow.hasTrap = true;
      tArrow.trapType = 'arrow';
    }

    // Special Elite Guards
    carve(0, 7, 'monster');   // Corridor Guard 1
    carve(8, 15, 'monster');  // Corridor Guard 2
    carve(15, 17, 'monster'); // Corridor Guard 3

    // --- Giant Throne Room / Lord's Chamber at Bottom-Right (X=16..19, Y=16..19) ---
    for (let hx = 16; hx <= 19; hx++) {
      for (let hy = 16; hy <= 19; hy++) {
        if (hx === 19 && hy === 19) {
          carve(hx, hy, 'boss');
        } else {
          carve(hx, hy, 'empty');
        }
      }
    }
    // Personal bodyguards inside the throne room
    carve(18, 18, 'monster');
    carve(17, 17, 'monster');

    // Set starting state
    const sTile = getTile(0, 0);
    if (sTile) {
      sTile.type = 'start';
      sTile.visited = true;
      sTile.revealed = true;
    }
    revealAdjacent(0, 0);

    return map;
  }

  // 2. Carve a guaranteed path from (0,0) to (MAP_SIZE - 1, MAP_SIZE - 1)
  let curX = 0;
  let curY = 0;
  if (getTile(0, 0)) {
    getTile(0, 0)!.type = 'start';
  }

  while (curX < MAP_SIZE - 1 || curY < MAP_SIZE - 1) {
    const moveRight = Math.random() < 0.5;
    if (moveRight && curX < MAP_SIZE - 1) {
      curX++;
    } else if (curY < MAP_SIZE - 1) {
      curY++;
    } else if (curX < MAP_SIZE - 1) {
      curX++;
    }

    const tile = getTile(curX, curY);
    if (tile && tile.type === 'wall') {
      tile.type = 'empty';
    }
  }

  // 3. Carve additional random walkable corridors (more corridors for larger maps)
  const extraCorridors = Math.floor(MAP_SIZE * MAP_SIZE * 0.35);
  for (let i = 0; i < extraCorridors; i++) {
    const rx = Math.floor(Math.random() * MAP_SIZE);
    const ry = Math.floor(Math.random() * MAP_SIZE);
    const tile = getTile(rx, ry);
    if (tile && tile.type === 'wall') {
      tile.type = 'empty';
    }
  }

  // Make sure start and exit are set
  const startTile = getTile(0, 0);
  if (startTile) {
    startTile.type = 'start';
    startTile.visited = true;
    startTile.revealed = true;
  }

  const endTile = getTile(MAP_SIZE - 1, MAP_SIZE - 1);
  if (endTile) {
    endTile.type = floor === 5 ? 'boss' : 'stairs';
  }

  // 4. Populate contents in "empty" cells (excluding start & exit)
  const emptyTiles = map.filter(t => t.type === 'empty' && !(t.x === 0 && t.y === 0) && !(t.x === MAP_SIZE - 1 && t.y === MAP_SIZE - 1));

  // Sort/shuffle
  const shuffled = [...emptyTiles].sort(() => Math.random() - 0.5);

  let monsterCount = Math.floor(MAP_SIZE * 0.8) + Math.floor(Math.random() * 3);
  let chestCount = 4 + floor;
  let shrineCount = 2;
  let trapCount = Math.floor(MAP_SIZE * 0.7) + Math.floor(Math.random() * 3);
  let portalCount = floor >= 3 ? 2 : 0;

  const keyCandidateTiles: DungeonTile[] = [];

  shuffled.forEach((tile) => {
    const actualTile = getTile(tile.x, tile.y);
    if (!actualTile) return;

    if (monsterCount > 0) {
      actualTile.type = 'monster';
      monsterCount--;
      keyCandidateTiles.push(actualTile);
    } else if (chestCount > 0) {
      actualTile.type = 'chest';
      chestCount--;
      // Chest is highly preferred keyholder!
      keyCandidateTiles.unshift(actualTile);
    } else if (shrineCount > 0) {
      actualTile.type = 'shrine';
      shrineCount--;
    } else if (trapCount > 0) {
      actualTile.hasTrap = true;
      actualTile.trapType = ['poison', 'arrow', 'pit'][Math.floor(Math.random() * 3)] as any;
      trapCount--;
    } else if (portalCount > 0) {
      actualTile.isPortal = true;
      portalCount--;
    }
  });

  // Assign the floor Seal Key to exactly ONE of the candidates (chests or monsters)
  if (keyCandidateTiles.length > 0) {
    keyCandidateTiles[0].hasKey = true;
  } else {
    // Fallback: assign to any non-start, non-end empty tile
    const fallback = emptyTiles[0];
    if (fallback) {
      const tile = getTile(fallback.x, fallback.y);
      if (tile) {
        tile.type = 'chest';
        tile.hasKey = true;
      }
    }
  }

  // Reveal area around start explicitly
  revealAdjacent(0, 0);

  return map;
}

export default function DungeonMap({
  currentFloor,
  playerPos,
  setPlayerPos,
  map,
  setMap,
  hero,
  updateHero,
  onTriggerBattle,
  onLeaveDungeon,
  onNextFloor,
  combatLog,
  setCombatLog,
  dungeonKeyFound,
  setDungeonKeyFound,
}: DungeonMapProps) {
  const MAP_SIZE = getMapSizeByFloor(currentFloor);

  const [playerDir, setPlayerDir] = useState<'N' | 'E' | 'S' | 'W'>('S');
  const [ticks, setTicks] = useState(0);
  const [showFullMap, setShowFullMap] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subtle ticker to drive breathing micro-animations on sprites
  useEffect(() => {
    const timer = setInterval(() => {
      setTicks(t => t + 1);
    }, 150);
    return () => clearInterval(timer);
  }, []);

  const addLog = (msg: string) => {
    setCombatLog(prev => [msg, ...prev.slice(0, 15)]);
  };

  // Safe adjacent checker to reveal tiles
  const revealMapAt = (px: number, py: number, currentMap: DungeonTile[]) => {
    return currentMap.map((tile) => {
      // Reveal current tile
      if (tile.x === px && tile.y === py) {
        return { ...tile, revealed: true, visited: true };
      }
      // Reveal adjacent tiles
      const dist = Math.abs(tile.x - px) + Math.abs(tile.y - py);
      if (dist <= 1) {
        return { ...tile, revealed: true };
      }
      return tile;
    });
  };

  const executeMove = (dx: number, dy: number) => {
    const nextX = playerPos.x + dx;
    const nextY = playerPos.y + dy;

    // Boundary check
    if (nextX < 0 || nextX >= MAP_SIZE || nextY < 0 || nextY >= MAP_SIZE) {
      return;
    }

    const nextTile = map.find(t => t.x === nextX && t.y === nextY);
    if (!nextTile) return;

    // Wall check
    if (nextTile.type === 'wall') {
      playSound('click');
      addLog('壁があって進めない！');
      return;
    }

    // Move is valid!
    playSound('click');
    let updatedMap = revealMapAt(nextX, nextY, map);
    setPlayerPos({ x: nextX, y: nextY });
    setMap(updatedMap);

    // Dynamic encounters trigger
    if (!nextTile.cleared) {
      if (nextTile.hasTrap) {
        // Trigger hidden Trap!
        const trapDmg = Math.floor(Math.random() * 5) + 6 + currentFloor * 2;
        const nextHp = Math.max(1, hero.stats.hp - trapDmg);
        
        const updatedHero = {
          ...hero,
          stats: {
            ...hero.stats,
            hp: nextHp
          }
        };
        updateHero(updatedHero);
        playSound('heal'); // Let's use sound triggers or regular hit effects
        
        let trapMsg = `💥 トラップが作動した！`;
        if (nextTile.trapType === 'poison') {
          trapMsg = `☠️ 【毒矢の罠】を踏んでしまった！ 身体に毒が回る！ ${trapDmg} のダメージ！ (HP残: ${nextHp})`;
        } else if (nextTile.trapType === 'arrow') {
          trapMsg = `🏹 【矢の罠】が作動！ 鋭い矢が肩を掠めた！ ${trapDmg} のダメージ！ (HP残: ${nextHp})`;
        } else {
          trapMsg = `🕳️ 【落とし穴の罠】に落下！ 激しい落下衝撃！ ${trapDmg} のダメージ！ (HP残: ${nextHp})`;
        }
        addLog(trapMsg);

        // Mark trap tile as cleared
        updatedMap = updatedMap.map(t => t.x === nextX && t.y === nextY ? { ...t, cleared: true } : t);
        setMap(updatedMap);
      } else if (nextTile.isPortal) {
        // Trigger Warp Portal!
        const walkableTiles = updatedMap.filter(t => t.type !== 'wall' && !(t.x === nextX && t.y === nextY));
        if (walkableTiles.length > 0) {
          const warpTo = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
          addLog(`🌀 【未知の転送魔法陣】を踏んだ！ 眩い光に包まれ、別の場所に転送された！`);
          
          const finalMap = revealMapAt(warpTo.x, warpTo.y, updatedMap).map(t =>
            t.x === nextX && t.y === nextY ? { ...t, cleared: true } : t
          );
          setPlayerPos({ x: warpTo.x, y: warpTo.y });
          setMap(finalMap);
          return; // Teleported away, skip other triggers for this tile
        }
      }

      if (nextTile.type === 'monster') {
        addLog(`モンスターの気配！戦闘開始！`);
        onTriggerBattle('regular');
      } else if (nextTile.type === 'boss') {
        addLog(`恐ろしい禍々しい覇気を感じる...！ 魔王が現れた！`);
        onTriggerBattle('boss');
      } else if (nextTile.type === 'chest') {
        triggerChestTreasure(nextX, nextY, updatedMap);
      } else if (nextTile.type === 'shrine') {
        triggerShrine(nextX, nextY, updatedMap);
      } else if (nextTile.type === 'stairs') {
        playSound('pickup');
        if (dungeonKeyFound) {
          addLog('下り階段をみつけた！「封印の鍵」を使って次のフロアへ進めます！');
        } else {
          addLog('下り階段をみつけた！鍵穴は「封魔の結界」で閉ざされている。階層のどこかにある【封印の鍵 🔑】を見つけよう！');
        }
      }
    }
  };

  const moveForward = () => {
    let dx = 0;
    let dy = 0;
    if (playerDir === 'N') dy = -1;
    else if (playerDir === 'S') dy = 1;
    else if (playerDir === 'E') dx = 1;
    else if (playerDir === 'W') dx = -1;
    executeMove(dx, dy);
  };

  const moveBackward = () => {
    let dx = 0;
    let dy = 0;
    if (playerDir === 'N') dy = 1;
    else if (playerDir === 'S') dy = -1;
    else if (playerDir === 'E') dx = -1;
    else if (playerDir === 'W') dx = 1;
    executeMove(dx, dy);
  };

  const turnLeft = () => {
    playSound('click');
    const dirs: ('N' | 'E' | 'S' | 'W')[] = ['N', 'E', 'S', 'W'];
    const idx = dirs.indexOf(playerDir);
    // Counter Clockwise rotation: N -> W -> S -> E -> N
    const nextIdx = (idx - 1 + 4) % 4;
    const newDir = dirs[nextIdx];
    setPlayerDir(newDir);
    const dirMap = { N: '北', E: '東', S: '南', W: '西' };
    addLog(`左に向き直り、【${dirMap[newDir]}】を向いた。`);
  };

  const turnRight = () => {
    playSound('click');
    const dirs: ('N' | 'E' | 'S' | 'W')[] = ['N', 'E', 'S', 'W'];
    const idx = dirs.indexOf(playerDir);
    // Clockwise rotation: N -> E -> S -> W -> N
    const nextIdx = (idx + 1) % 4;
    const newDir = dirs[nextIdx];
    setPlayerDir(newDir);
    const dirMap = { N: '北', E: '東', S: '南', W: '西' };
    addLog(`右に向き直り、【${dirMap[newDir]}】を向いた。`);
  };

  const triggerChestTreasure = (cx: number, cy: number, currentMap: DungeonTile[]) => {
    playSound('pickup');
    const goldFound = Math.floor(Math.random() * 40) + 20 + currentFloor * 10;
    const isStoneFound = Math.random() < 0.65;

    const updatedHero = { ...hero };
    updatedHero.stats.gold += goldFound;

    let rewardText = `宝箱を開けた！ ${goldFound}ゴールド を獲得！`;
    if (isStoneFound) {
      updatedHero.inventory.upgradeStones += 1;
      rewardText += ` さらに【強化石】を1個手に入れた！`;
    }

    const targetTile = currentMap.find(t => t.x === cx && t.y === cy);
    if (targetTile && targetTile.hasKey) {
      setDungeonKeyFound(true);
      rewardText += ` 🔑 さらに、階層の結界を解く【封印の鍵】を手に入れた！`;
    }

    updateHero(updatedHero);
    addLog(rewardText);

    // Mark chest as cleared
    setMap(
      currentMap.map(t => (t.x === cx && t.y === cy ? { ...t, cleared: true, type: 'empty' as TileType } : t))
    );
  };

  const triggerShrine = (sx: number, sy: number, currentMap: DungeonTile[]) => {
    playSound('heal');
    const updatedHero = { ...hero };
    updatedHero.stats.hp = updatedHero.stats.maxHp;
    updatedHero.stats.mp = updatedHero.stats.maxMp;

    updateHero(updatedHero);
    addLog(`聖なる泉の水を飲んだ！ HPとMPが全回復した！`);

    // Mark shrine as cleared
    setMap(
      currentMap.map(t => (t.x === sx && t.y === sy ? { ...t, cleared: true, type: 'empty' as TileType } : t))
    );
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      switch (e.key) {
        case 'm':
        case 'M':
          e.preventDefault();
          setShowFullMap(prev => !prev);
          playSound('click');
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          moveForward();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          moveBackward();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          turnLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          turnRight();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPos, playerDir, map, hero]);

  // Request relative offset coordinate calculation
  const getRelativeCoords = (px: number, py: number, dir: string, forward: number, rightOffset: number) => {
    let dx = 0;
    let dy = 0;
    let rx = 0;
    let ry = 0;

    if (dir === 'N') {
      dx = 0; dy = -1;
      rx = 1; ry = 0;
    } else if (dir === 'S') {
      dx = 0; dy = 1;
      rx = -1; ry = 0;
    } else if (dir === 'E') {
      dx = 1; dy = 0;
      rx = 0; ry = 1;
    } else if (dir === 'W') {
      dx = -1; dy = 0;
      rx = 0; ry = -1;
    }

    return {
      x: px + dx * forward + rx * rightOffset,
      y: py + dy * forward + ry * rightOffset
    };
  };

  // Canvas Drawing Effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;

    // Clear with complete base dark
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    const isBossFloor = currentFloor === 5;

    // 1. Draw ceiling gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, cy);
    skyGrad.addColorStop(0, '#020617'); // slate-950
    skyGrad.addColorStop(1, '#1e1b4b'); // indigo-950
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, cy);

    // Draw little twinkling celestial stars
    const starColor = isBossFloor ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.35)';
    const stars = [
      { x: 35, y: 18 }, { x: 85, y: 42 }, { x: 125, y: 22 }, { x: 185, y: 52 },
      { x: 235, y: 12 }, { x: 295, y: 37 }, { x: 345, y: 27 }, { x: 385, y: 47 },
      { x: 55, y: 72 }, { x: 155, y: 82 }, { x: 255, y: 77 }, { x: 355, y: 87 },
      { x: 110, y: 55 }, { x: 210, y: 65 }, { x: 310, y: 60 }
    ];
    stars.forEach(s => {
      ctx.fillStyle = starColor;
      ctx.fillRect(s.x, s.y, 1.5, 1.5);
    });

    // 2. Draw Floor gradient
    const floorGrad = ctx.createLinearGradient(0, cy, 0, height);
    floorGrad.addColorStop(0, '#0c0a09'); // stone-950
    floorGrad.addColorStop(1, isBossFloor ? '#1e0c0c' : '#082f49'); // reddish or dark teal-950
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, cy, width, height - cy);

    // 3. Draw floor grid lines
    ctx.strokeStyle = isBossFloor ? 'rgba(220, 38, 38, 0.15)' : 'rgba(14, 116, 144, 0.2)';
    ctx.lineWidth = 1;
    for (let x = -200; x <= width + 200; x += 50) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    const perspectiveRatios = [1.0, 0.55, 0.30, 0.16, 0.08, 0.0];
    perspectiveRatios.forEach(r => {
      const y = cy + (height / 2) * r;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    });

    // Outer & inner viewport ratios per depth level d
    const ratio = [1.0, 0.55, 0.30, 0.16, 0.08, 0.03];

    const getXLeft = (d: number) => cx - (width / 2) * ratio[d];
    const getXRight = (d: number) => cx + (width / 2) * ratio[d];
    const getYTop = (d: number) => cy - (height / 2) * ratio[d];
    const getYBottom = (d: number) => cy + (height / 2) * ratio[d];

    const getXLeftOuter = (d: number) => getXLeft(d) - width * ratio[d];
    const getXRightOuter = (d: number) => getXRight(d) + width * ratio[d];

    // Helper to draw clean custom styled polygons
    const drawPoly = (points: { x: number; y: number }[], fill: string, stroke?: string, strokeW?: number) => {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = strokeW || 1;
        ctx.stroke();
      }
    };

    const getRelativeTileType = (forward: number, rightOffset: number): TileType | 'out' => {
      const coords = getRelativeCoords(playerPos.x, playerPos.y, playerDir, forward, rightOffset);
      if (coords.x < 0 || coords.x >= MAP_SIZE || coords.y < 0 || coords.y >= MAP_SIZE) {
        return 'wall';
      }
      const tile = map.find(t => t.x === coords.x && t.y === coords.y);
      return tile ? tile.type : 'wall';
    };

    const isRelativeTileCleared = (forward: number, rightOffset: number): boolean => {
      const coords = getRelativeCoords(playerPos.x, playerPos.y, playerDir, forward, rightOffset);
      const tile = map.find(t => t.x === coords.x && t.y === coords.y);
      return tile ? tile.cleared : false;
    };

    const isRelativeTilePortal = (forward: number, rightOffset: number): boolean => {
      const coords = getRelativeCoords(playerPos.x, playerPos.y, playerDir, forward, rightOffset);
      const tile = map.find(t => t.x === coords.x && t.y === coords.y);
      return tile ? !!tile.isPortal : false;
    };

    // Draw furthest (d = 4) to closest (d = 1)
    for (let d = 4; d >= 1; d--) {
      const isWallCenter = getRelativeTileType(d, 0) === 'wall';
      const isWallLeft = getRelativeTileType(d, -1) === 'wall';
      const isWallRight = getRelativeTileType(d, 1) === 'wall';

      const isWallLeftPrev = getRelativeTileType(d - 1, -1) === 'wall';
      const isWallRightPrev = getRelativeTileType(d - 1, 1) === 'wall';

      // Scaling colors & neon brightness by depth d
      const op = d === 1 ? 1.0 : d === 2 ? 0.65 : d === 3 ? 0.35 : 0.15;
      const strokeColor = isBossFloor 
        ? `rgba(239, 68, 68, ${op})` // Crimson neon borders
        : `rgba(20, 184, 166, ${op})`; // Cyberpunk Teal neon borders

      // Wall directional shading
      const frontFill = d === 1 ? '#18181b' : d === 2 ? '#141416' : d === 3 ? '#0e0e10' : '#070708';
      const leftFill = d === 1 ? '#121214' : d === 2 ? '#0e0e10' : d === 3 ? '#0a0a0c' : '#050506';
      const rightFill = d === 1 ? '#202024' : d === 2 ? '#18181b' : d === 3 ? '#121214' : '#09090b';

      const xl_prev = getXLeft(d - 1);
      const xr_prev = getXRight(d - 1);
      const yt_prev = getYTop(d - 1);
      const yb_prev = getYBottom(d - 1);

      const xl_curr = getXLeft(d);
      const xr_curr = getXRight(d);
      const yt_curr = getYTop(d);
      const yb_curr = getYBottom(d);

      // --- A. Side Wing flat perpendicular walls ---
      if (isWallLeft) {
        drawPoly([
          { x: getXLeftOuter(d), y: yt_curr },
          { x: xl_curr, y: yt_curr },
          { x: xl_curr, y: yb_curr },
          { x: getXLeftOuter(d), y: yb_curr }
        ], frontFill, strokeColor, d === 1 ? 2 : 1);
      }

      if (isWallRight) {
        drawPoly([
          { x: xr_curr, y: yt_curr },
          { x: getXRightOuter(d), y: yt_curr },
          { x: getXRightOuter(d), y: yb_curr },
          { x: xr_curr, y: yb_curr }
        ], frontFill, strokeColor, d === 1 ? 2 : 1);
      }

      // --- B. Parallel side corridor walls (Trapezoids connecting d to d-1) ---
      if (isWallLeftPrev) {
        drawPoly([
          { x: xl_curr, y: yt_curr },
          { x: xl_prev, y: yt_prev },
          { x: xl_prev, y: yb_prev },
          { x: xl_curr, y: yb_curr }
        ], leftFill, strokeColor, d === 1 ? 2 : 1);
      }

      if (isWallRightPrev) {
        drawPoly([
          { x: xr_prev, y: yt_prev },
          { x: xr_curr, y: yt_curr },
          { x: xr_curr, y: yb_curr },
          { x: xr_prev, y: yb_prev }
        ], rightFill, strokeColor, d === 1 ? 2 : 1);
      }

      // --- C. Side Cell Items & Props (Rendered for incredible peak-around peek immersion) ---
      const checkSideCells = [-1, 1];
      checkSideCells.forEach(side => {
        const sideType = getRelativeTileType(d, side);
        const sideCleared = isRelativeTileCleared(d, side);
        const sidePortal = isRelativeTilePortal(d, side);
        if (((sideType !== 'wall' && sideType !== 'empty' && sideType !== 'start') || sidePortal) && !sideCleared) {
          const sideEmoji = sidePortal ? '🌀' : sideType === 'chest' ? '🎁' : sideType === 'monster' ? '💀' : sideType === 'boss' ? '😈' : sideType === 'shrine' ? '⛲' : '🪜';
          const floorY = getYBottom(d);
          const sprSize = 55 * ratio[d]; // slightly smaller for side wings
          const sideCx = side === -1 ? xl_curr - (xr_curr - xl_curr)/2 : xr_curr + (xr_curr - xl_curr)/2;

          ctx.beginPath();
          ctx.ellipse(sideCx, floorY, 18 * ratio[d], 5 * ratio[d], 0, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fill();

          ctx.font = `${Math.ceil(sprSize)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(sideEmoji, sideCx, floorY - 2);
        }
      });

      // --- D. Center Corridor Items & Active Encounters ---
      const cellType = getRelativeTileType(d, 0);
      const isCleared = isRelativeTileCleared(d, 0);
      const isPortal = isRelativeTilePortal(d, 0);

      if (((cellType !== 'wall' && cellType !== 'empty' && cellType !== 'start') || isPortal) && !isCleared) {
        let emoji = '';
        let pedColor = 'rgba(0, 0, 0, 0.4)';
        let pedStroke = '';

        if (isPortal) {
          emoji = '🌀';
          pedColor = 'rgba(139, 92, 246, 0.28)';
          pedStroke = `rgba(139, 92, 246, ${op})`;
        } else if (cellType === 'chest') {
          emoji = '🎁';
          pedColor = 'rgba(245, 158, 11, 0.22)';
        } else if (cellType === 'monster') {
          emoji = '💀';
          pedColor = 'rgba(239, 68, 68, 0.22)';
          pedStroke = `rgba(239, 68, 68, ${op})`;
        } else if (cellType === 'boss') {
          emoji = '😈';
          pedColor = 'rgba(220, 38, 38, 0.38)';
          pedStroke = `rgba(220, 38, 38, ${op})`;
        } else if (cellType === 'shrine') {
          emoji = '⛲';
          pedColor = 'rgba(34, 211, 238, 0.25)';
          pedStroke = `rgba(34, 211, 238, ${op})`;
        } else if (cellType === 'stairs') {
          emoji = '🪜';
          pedColor = 'rgba(16, 185, 129, 0.2)';
          pedStroke = `rgba(16, 185, 129, ${op})`;
        }

        const floorY = getYBottom(d);
        const diskW = 38 * ratio[d];
        const diskH = 10 * ratio[d];

        ctx.beginPath();
        ctx.ellipse(cx, floorY, diskW, diskH, 0, 0, 2 * Math.PI);
        ctx.fillStyle = pedColor;
        ctx.fill();
        if (pedStroke) {
          ctx.strokeStyle = pedStroke;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Animated float bounce using the ticks interval representation
        const bounce = Math.sin(ticks * 0.3 - d * 0.5) * 4 * ratio[d];
        const sprSize = Math.ceil(82 * ratio[d]);

        if (sprSize > 5) {
          ctx.font = `${sprSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(emoji, cx, floorY - 4 + bounce);
        }
      }

      // --- E. Flat Front center wall (rendered last to block distant cells) ---
      if (isWallCenter) {
        drawPoly([
          { x: xl_curr, y: yt_curr },
          { x: xr_curr, y: yt_curr },
          { x: xr_curr, y: yb_curr },
          { x: xl_curr, y: yb_curr }
        ], frontFill, strokeColor, d === 1 ? 2 : 1.5);
      }
    }

    // Classic immersive RPG vignette overlay
    const vigGrad = ctx.createRadialGradient(cx, cy, width * 0.35, cx, cy, width * 0.65);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);

  }, [playerPos, playerDir, map, currentFloor, ticks]);

  // Check if player stands on staircase
  const currentTile = map.find(t => t.x === playerPos.x && t.y === playerPos.y);
  const standsOnStairs = currentTile?.type === 'stairs';

  return (
    <div id="dungeon-board" className="flex flex-col lg:grid lg:grid-cols-12 gap-4 h-full bg-zinc-950 text-zinc-100 p-2 md:p-3 font-sans">
      
      {/* 3D MAP VIEWZONE */}
      <div id="map-section" className="lg:col-span-7 flex flex-col space-y-3 bg-zinc-900/60 border border-zinc-805 p-3 sm:p-4 rounded-xl shadow-lg relative">
        
        {/* Floor name and compass direction */}
        <div id="dungeon-header" className="w-full flex justify-between items-center bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/50">
          <div id="floor-display" className="flex items-center space-x-2">
            <Milestone className="w-5 h-5 text-teal-400" />
            <span className="font-bold text-sm tracking-wide text-zinc-100">地下 {currentFloor} 階</span>
            <span className="text-[10px] bg-teal-950/40 border border-teal-900/50 text-teal-400 px-2.5 py-0.5 rounded-full font-bold">
              {currentFloor === 5 ? '魔王最深部' : `迷宮(サイズ ${MAP_SIZE}×${MAP_SIZE})`}
            </span>
          </div>

          <div className="flex items-center space-x-1 text-xs text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded border border-zinc-800">
            <Compass className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-mono text-[10px] font-bold text-zinc-350">
              進路: {playerDir === 'N' ? '北 (▲)' : playerDir === 'E' ? '東 (▶)' : playerDir === 'S' ? '南 (▼)' : '西 (◀)'}
            </span>
          </div>
        </div>

        {/* Seal Key HUD indicator */}
        <div className="w-full flex justify-between items-center bg-zinc-950/20 p-2 rounded-lg border border-zinc-805 text-xs shadow-inner">
          <span className="text-zinc-400 flex items-center">
            <span className="mr-1.5 flex items-center">🔑</span> 階層封印鍵: 
            {dungeonKeyFound ? (
              <span className="ml-2 font-black text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-0.5 rounded flex items-center space-x-1 animate-pulse">
                <span>所持中 (Ready!)</span>
              </span>
            ) : (
              <span className="ml-2 font-medium text-amber-500 bg-amber-950/20 border border-amber-900/50 px-2.5 py-0.5 rounded flex items-center space-x-1">
                <span>❌ 未所持 (宝箱や敵から回収)</span>
              </span>
            )}
          </span>
          <span className="text-[10px] text-zinc-500 italic">
            階段を降りるのに必須です
          </span>
        </div>

        {/* 3D First Person Viewport Canvas Box */}
        <div className="relative w-full aspect-[4/3] bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800/80 shadow-2xl flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            className="w-full h-full object-cover"
          />
          
          {/* HUD 2D Radar Minimap Overlay - Top Left */}
          <div 
            id="hud-minimap-overlay"
            onClick={() => {
              playSound('click');
              setShowFullMap(true);
            }}
            title="クリックで全体マップを表示"
            className="absolute top-2.5 left-2.5 z-10 bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-800 hover:border-teal-900/50 p-1.5 rounded shadow-2xl backdrop-blur-md flex flex-col items-center select-none transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-1 px-0.5" style={{ width: `${MAP_SIZE * 8}px`, minWidth: '90px' }}>
              <span className="text-[7.5px] text-teal-400 group-hover:text-teal-300 font-bold tracking-wider flex items-center space-x-0.5">
                <Compass className="w-2 h-2 animate-pulse" />
                <span>MAP ({playerPos.x},{playerPos.y}) 🔍</span>
              </span>
              <span className="text-[7px] font-mono font-bold bg-teal-950/40 text-teal-400 border border-teal-900/30 px-0.5 rounded-sm">
                {playerDir}
              </span>
            </div>

            <div 
              className="grid gap-[0.5px] bg-zinc-950 p-[1px] rounded border border-zinc-900 shadow-inner"
              style={{
                gridTemplateColumns: `repeat(${MAP_SIZE}, minmax(0, 1fr))`,
                width: `${MAP_SIZE * 8}px`,
                minWidth: '90px'
              }}
            >
              {map.map((tile) => {
                const isPlayerHere = playerPos.x === tile.x && playerPos.y === tile.y;
                let tileColor = 'bg-zinc-900 border-zinc-850/10';
                
                if (!tile.revealed) {
                  tileColor = 'bg-zinc-950/40 border-zinc-950/15';
                } else if (isPlayerHere) {
                  tileColor = 'bg-teal-950/90 border-teal-500/70 text-teal-300 font-bold';
                } else if (tile.isPortal && !tile.cleared) {
                  tileColor = 'bg-purple-950 border-purple-800/30 text-purple-400';
                } else {
                  switch (tile.type) {
                    case 'wall':
                      tileColor = 'bg-zinc-800/75 border-zinc-700/40';
                      break;
                    case 'start':
                      tileColor = 'bg-zinc-900 border-green-800/20';
                      break;
                    case 'monster':
                    case 'boss':
                      tileColor = tile.cleared ? 'bg-zinc-900 border-zinc-850/10' : 'bg-red-950/50 border-red-900/30';
                      break;
                    case 'chest':
                      tileColor = tile.cleared ? 'bg-zinc-900 border-zinc-850/10' : 'bg-amber-950/55 border-amber-900/30';
                      break;
                    case 'shrine':
                      tileColor = tile.cleared ? 'bg-zinc-900 border-zinc-850/10' : 'bg-cyan-950/55 border-cyan-900/35';
                      break;
                    case 'stairs':
                      tileColor = 'bg-emerald-950 border-emerald-600/35 text-emerald-500';
                      break;
                  }
                }

                return (
                  <div
                    key={`hud-tile-${tile.x}-${tile.y}`}
                    className={`flex items-center justify-center text-[5.5px] font-sans border border-zinc-950/5 aspect-square w-full overflow-hidden ${tileColor}`}
                    style={{ fontSize: '5px' }}
                  >
                    {tile.revealed && (
                      isPlayerHere ? (
                        <span className="text-[5.5px] scale-90 leading-none text-teal-400 animate-pulse font-black" style={{ fontSize: '5.5px' }}>
                          {playerDir === 'N' ? '▲' : playerDir === 'E' ? '▶' : playerDir === 'S' ? '▼' : '◀'}
                        </span>
                      ) : (
                        tile.isPortal && !tile.cleared ? <span className="scale-75 leading-none">🌀</span> :
                        tile.type === 'stairs' ? <span className="scale-75 leading-none">🪜</span> :
                        tile.type === 'chest' && !tile.cleared ? <span className="scale-75 leading-none">🎁</span> :
                        tile.type === 'shrine' && !tile.cleared ? <span className="scale-75 leading-none">⛲</span> :
                        (tile.type === 'monster' || tile.type === 'boss') && !tile.cleared ? <span className="scale-75 leading-none">💀</span> : ''
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating Immersive tag */}
          <div className="absolute top-2.5 right-2.5 bg-gradient-to-r from-teal-950/90 to-zinc-950/90 border border-teal-900/30 rounded px-2.5 py-1.5 text-[9px] font-mono font-bold tracking-widest uppercase text-teal-400 flex items-center space-x-1 backdrop-blur-xs">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
            <span>3D PSEUDO perspective</span>
          </div>
        </div>

        {/* Action Panel / Exit & Stair buttons */}
        <div id="stairs-action" className="w-full flex justify-between items-center pt-2 border-t border-zinc-800/60">
          <button
            id="retreat-town-btn"
            onClick={onLeaveDungeon}
            className="text-xs text-zinc-400 bg-zinc-900 hover:text-zinc-200 hover:bg-zinc-850 px-3 py-1.5 rounded border border-zinc-800 active:scale-95 transition-all cursor-pointer"
          >
            街へ一時帰還する
          </button>

          {standsOnStairs ? (
            <button
              id="descend-stairs-btn"
              onClick={dungeonKeyFound ? onNextFloor : () => {
                playSound('click');
                addLog('⚠️ 階段の「封魔の結界」が張られている！階層のどこかにある【封印の鍵 🔑】を見つけて結界を解く必要があります！');
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-black px-4 py-1.5 rounded text-xs animate-bounce cursor-pointer flex items-center space-x-1 shadow-lg shadow-emerald-500/20"
            >
              <Milestone className="w-4 h-4" />
              <span>地下の階段を降りる ⬇️</span>
            </button>
          ) : (
            <div className="text-[10px] text-zinc-500 italic flex items-center space-x-1">
              <Milestone className="w-3.5 h-3.5" />
              <span>自動レーダーを頼りに、下り階段 (🪜) を探しましょう。</span>
            </div>
          )}
        </div>
      </div>

      {/* RAMP CONTROLLER & CONSOLE PANEL */}
      <div id="control-section" className="lg:col-span-5 flex flex-col space-y-3">
        
        {/* Radar Map & Controls */}
        <div className="grid grid-cols-2 gap-3 bg-zinc-900/60 border border-zinc-800 p-3 sm:p-4 rounded-xl">
          
          {/* Legend / Guide Panel */}
          <div className="flex flex-col justify-center bg-zinc-950/60 border border-zinc-850 p-2.5 rounded-lg space-y-1.5">
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mb-0.5 border-b border-zinc-850/50 pb-1 text-center">
              🧭 記号一覧 (レーダー)
            </span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-sans">
              <div className="flex items-center space-x-1 bg-zinc-900/30 p-1 rounded border border-zinc-850/25 text-zinc-300">
                <span className="text-[10px] font-bold text-teal-400">▲</span>
                <span className="text-[9px]">現在地(進路)</span>
              </div>
              <div className="flex items-center space-x-1 bg-zinc-900/30 p-1 rounded border border-zinc-850/25 text-zinc-300">
                <span>💀</span>
                <span className="text-[9px]">魔物 / 魔王</span>
              </div>
              <div className="flex items-center space-x-1 bg-zinc-900/30 p-1 rounded border border-zinc-850/25 text-zinc-300">
                <span>🎁</span>
                <span className="text-[9px]">宝箱 (Key含)</span>
              </div>
              <div className="flex items-center space-x-1 bg-zinc-900/30 p-1 rounded border border-zinc-850/25 text-zinc-300">
                <span>⛲</span>
                <span className="text-[9px]">聖なる回復泉</span>
              </div>
              <div className="flex items-center space-x-1 bg-zinc-900/30 p-1 rounded border border-zinc-850/25 text-teal-350 col-span-2">
                <span>🌀</span>
                <span className="text-[9px] text-purple-400">転送の魔法陣 (移動)</span>
              </div>
              <div className="flex items-center space-x-1 bg-cyan-950/10 p-1 rounded border border-emerald-900/40 col-span-2 text-emerald-400 justify-center">
                <span>🪜</span>
                <span className="text-[9px] font-black">下り階段（結界あり）</span>
              </div>
            </div>

            {/* Open Full Map Button */}
            <button
              onClick={() => {
                playSound('click');
                setShowFullMap(true);
              }}
              className="mt-1.5 w-full bg-teal-950/80 hover:bg-teal-900 text-teal-400 border border-teal-900/50 hover:border-teal-700 py-1 rounded text-[10px] font-bold tracking-wider active:scale-95 transition-all flex items-center justify-center space-x-1 cursor-pointer shadow"
            >
              <Map className="w-3.5 h-3.5" />
              <span>全体マップを表示 [M]</span>
            </button>
          </div>

          {/* Navigational controls */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider mb-2">移動＆方向転換</span>
            <div className="grid grid-cols-3 gap-1.5 w-full max-w-[130px]">
              <div></div>
              <button
                id="move-up-btn"
                onClick={moveForward}
                title="前進 (W / ArrowUp)"
                className="bg-zinc-850 hover:bg-zinc-750 hover:text-teal-400 border border-zinc-750 active:scale-90 text-zinc-200 p-2 rounded-lg flex items-center justify-center transition cursor-pointer"
              >
                <ChevronUp className="w-4.5 h-4.5" />
              </button>
              <div></div>

              <button
                id="turn-left-btn"
                onClick={turnLeft}
                title="左操舵 (A / ArrowLeft)"
                className="bg-zinc-850 hover:bg-zinc-750 hover:text-teal-400 border border-zinc-750 active:scale-90 text-zinc-200 p-2 rounded-lg flex items-center justify-center transition cursor-pointer"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>
              <div className="bg-zinc-950 rounded border border-zinc-800 flex items-center justify-center font-bold text-[10px] text-teal-500">
                {playerDir}
              </div>
              <button
                id="turn-right-btn"
                onClick={turnRight}
                title="右操舵 (D / ArrowRight)"
                className="bg-zinc-850 hover:bg-zinc-750 hover:text-teal-400 border border-zinc-750 active:scale-90 text-zinc-200 p-2 rounded-lg flex items-center justify-center transition cursor-pointer"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>

              <div></div>
              <button
                id="move-down-btn"
                onClick={moveBackward}
                title="後退 (S / ArrowDown)"
                className="bg-zinc-850 hover:bg-zinc-750 hover:text-teal-400 border border-zinc-750 active:scale-90 text-zinc-200 p-2 rounded-lg flex items-center justify-center transition cursor-pointer"
              >
                <ChevronDown className="w-4.5 h-4.5" />
              </button>
              <div></div>
            </div>
          </div>
        </div>

        {/* Combat Log Console */}
        <div id="console-logs" className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 flex-grow flex flex-col min-h-[160px] max-h-[220px] lg:max-h-none">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1 px-1">迷宮行動履歴</span>
          <div id="log-list" className="bg-zinc-950 border border-zinc-850/60 rounded-md p-2 flex-grow overflow-y-auto space-y-1.5 font-mono text-xs select-text">
            {combatLog.length === 0 ? (
              <div className="text-zinc-650 italic">キーパッド、または W/A/S/D キーを使って冒険へ船出しよう。</div>
            ) : (
              combatLog.map((log, index) => (
                <div key={`log-${index}`} className={`border-b border-zinc-900/50 pb-1 ${
                  log.includes('宝箱') ? 'text-amber-400' :
                  log.includes('全回復') ? 'text-cyan-400' :
                  log.includes('戦闘') || log.includes('魔王') ? 'text-red-400 font-semibold' :
                  log.includes('向き直り') ? 'text-zinc-400 text-[11px]' :
                  log.includes('階段') ? 'text-emerald-400' : 'text-zinc-300'
                }`}>
                  ⚔️ {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showFullMap && (
        <div 
          className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300"
          onClick={() => setShowFullMap(false)}
        >
          <div 
            className="bg-zinc-90 w-full max-w-4xl bg-zinc-900 border-2 border-zinc-800 p-6 rounded-2xl text-zinc-100 shadow-2xl relative flex flex-col md:flex-row gap-6 animate-in fade-in duration-200"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowFullMap(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors text-sm font-bold"
              title="閉じる"
            >
              ✕
            </button>

            {/* Map Side */}
            <div className="flex-1 flex flex-col items-center">
              <h3 className="text-base font-bold text-teal-400 mb-4 flex items-center space-x-2">
                <Map className="w-5 h-5 animate-pulse" />
                <span>地下 {currentFloor} 階 - 迷宮全体マップ</span>
              </h3>

              {/* Map Grid Container */}
              <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80 shadow-2xl max-w-full overflow-auto">
                <div 
                  className="grid gap-[1px]"
                  style={{
                    gridTemplateColumns: `repeat(${MAP_SIZE}, minmax(0, 1fr))`,
                    width: `${Math.min(440, MAP_SIZE * 22)}px`,
                    aspectRatio: '1 / 1'
                  }}
                >
                  {map.map((tile) => {
                    const isPlayerHere = playerPos.x === tile.x && playerPos.y === tile.y;
                    let cellBg = 'bg-zinc-950';
                    let borderStyle = 'border border-zinc-900';
                    
                    if (!tile.revealed) {
                      cellBg = 'bg-zinc-950';
                      borderStyle = 'border border-zinc-900/40 opacity-25';
                    } else if (isPlayerHere) {
                      cellBg = 'bg-teal-950/90 animate-pulse';
                      borderStyle = 'border border-teal-500 text-teal-300 font-bold';
                    } else if (tile.isPortal && !tile.cleared) {
                      cellBg = 'bg-purple-950/65';
                      borderStyle = 'border border-purple-800/60 text-purple-400';
                    } else {
                      switch (tile.type) {
                        case 'wall':
                          cellBg = 'bg-zinc-850';
                          borderStyle = 'border border-zinc-750';
                          break;
                        case 'start':
                          cellBg = 'bg-zinc-900';
                          borderStyle = 'border border-emerald-900/60';
                          break;
                        case 'monster':
                        case 'boss':
                          cellBg = tile.cleared ? 'bg-zinc-900/40' : 'bg-red-950/60';
                          borderStyle = tile.cleared ? 'border border-zinc-900' : 'border border-red-900/50';
                          break;
                        case 'chest':
                          cellBg = tile.cleared ? 'bg-zinc-900/40' : 'bg-amber-950/60';
                          borderStyle = tile.cleared ? 'border border-zinc-900' : 'border border-amber-900/50';
                          break;
                        case 'shrine':
                          cellBg = tile.cleared ? 'bg-zinc-900/40' : 'bg-cyan-950/60';
                          borderStyle = tile.cleared ? 'border border-zinc-900' : 'border border-cyan-900/50';
                          break;
                        case 'stairs':
                          cellBg = 'bg-emerald-950 hover:bg-emerald-900/80';
                          borderStyle = 'border border-emerald-550 text-emerald-400';
                          break;
                        case 'empty':
                          cellBg = 'bg-zinc-900/45';
                          borderStyle = 'border border-zinc-900/35';
                          break;
                      }
                    }

                    return (
                      <div
                        key={`full-tile-${tile.x}-${tile.y}`}
                        className={`flex items-center justify-center text-xs font-sans aspect-square w-full select-none rounded-[1px] transition-all ${cellBg} ${borderStyle}`}
                        title={`座標 (${tile.x}, ${tile.y})`}
                      >
                        {tile.revealed && (
                          isPlayerHere ? (
                            <span className="text-xs text-teal-400 font-black">
                              {playerDir === 'N' ? '▲' : playerDir === 'E' ? '▶' : playerDir === 'S' ? '▼' : '◀'}
                            </span>
                          ) : (
                            tile.isPortal && !tile.cleared ? <span className="scale-100">🌀</span> :
                            tile.type === 'stairs' ? <span className="scale-100">🪜</span> :
                            tile.type === 'chest' && !tile.cleared ? <span className="scale-100">🎁</span> :
                            tile.type === 'shrine' && !tile.cleared ? <span className="scale-100 font-bold"> Fountain ⛲</span> :
                            tile.type === 'boss' && !tile.cleared ? <span className="scale-110 animate-pulse">😈</span> :
                            tile.type === 'monster' && !tile.cleared ? <span className="scale-100">💀</span> : ''
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Info / Legend Side */}
            <div className="w-full md:w-64 flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6">
              <div>
                <h4 className="font-bold text-zinc-300 text-xs tracking-wider uppercase mb-3 flex items-center space-x-1.5 border-b border-zinc-800 pb-2">
                  <Compass className="w-4 h-4 text-teal-400 animate-pulse" />
                  <span>迷宮全図 凡例</span>
                </h4>
                <div className="space-y-2 text-[11px] text-zinc-400">
                  <div className="flex items-center space-x-3 bg-zinc-950/40 p-1.5 rounded border border-zinc-850">
                    <span className="text-teal-400 font-extrabold text-center w-5 bg-teal-950/50 py-0.5 rounded text-xs">▲</span>
                    <span><strong>勇者の現在地</strong> (向き)</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-zinc-950/40 p-1.5 rounded border border-zinc-850">
                    <span className="text-center w-5 text-emerald-400 bg-emerald-950/50 py-0.5 rounded text-xs">🪜</span>
                    <span><strong>下り階段</strong> (結界あり)</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-zinc-950/40 p-1.5 rounded border border-zinc-850">
                    <span className="text-center w-5 text-amber-405 bg-amber-950/50 py-0.5 rounded text-xs">🎁</span>
                    <span><strong>宝箱</strong> (鍵・アイテム)</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-zinc-950/40 p-1.5 rounded border border-zinc-850">
                    <span className="text-center w-5 text-cyan-405 bg-cyan-950/50 py-0.5 rounded text-xs">⛲</span>
                    <span><strong>聖水の泉</strong> (全回復)</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-zinc-950/40 p-1.5 rounded border border-zinc-850">
                    <span className="text-center w-5 text-purple-400 bg-purple-950/50 py-0.5 rounded text-xs">🌀</span>
                    <span><strong>隠し転送門</strong> (ポータル)</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-zinc-950/40 p-1.5 rounded border border-zinc-850">
                    <span className="text-center w-5 text-red-400 bg-red-950/50 py-0.5 rounded text-xs">💀</span>
                    <span><strong>守護モンスター</strong> (戦闘)</span>
                  </div>
                  <div className="flex items-center space-x-3 bg-zinc-950/40 p-1.5 rounded border border-zinc-850">
                    <span className="text-center w-5 text-red-500 bg-red-950/50 py-0.5 rounded text-xs">😈</span>
                    <span><strong>最深部の魔王</strong> (ボス)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-[10px] text-zinc-500 leading-relaxed font-mono">
                  * 移動するごとに、周囲1マスの視界が「自動マッピング」により自動的に記録されていきます。<br />
                  * [M] キーまたはウィンドウ外クリックでも閉じられます。
                </p>
                <button
                  onClick={() => setShowFullMap(false)}
                  className="mt-3 w-full bg-teal-600 hover:bg-teal-500 text-zinc-950 font-bold py-2 rounded text-xs transition-all active:scale-95 cursor-pointer shadow-lg shadow-teal-500/10"
                >
                  地図を閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

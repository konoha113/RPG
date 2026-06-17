import React, { useState, useEffect, useRef } from 'react';
import { Hero, Enemy, CombatLog, Skill } from '../types';
import { playSound } from '../utils/sound';
import { motion, AnimatePresence } from 'motion/react';
import { Sword, Sparkles, Heart, RefreshCw, Trophy, Skull } from 'lucide-react';

interface BattleScreenProps {
  hero: Hero;
  updateHero: (updated: Hero) => void;
  enemyType: 'regular' | 'boss';
  currentFloor: number;
  onWin: (expGained: number, goldGained: number) => void;
  onLose: () => void;
  onFlee: () => void;
}

interface DamageIndicator {
  id: string;
  amount: string;
  isPlayer: boolean; // true if popping over player, false if over enemy
  type: 'damage' | 'heal' | 'miss' | 'steal';
}

const ENEMIES_BY_FLOOR: Record<number, { name: string; maxHp: number; atk: number; def: number; exp: number; gold: number; icon: string }[]> = {
  1: [
    { name: '狂暴アッシどスライム', maxHp: 25, atk: 6, def: 2, exp: 12, gold: 15, icon: '👾' },
    { name: '血に飢えたヘルハウンド', maxHp: 32, atk: 8, def: 3, exp: 18, gold: 20, icon: '🐺' },
  ],
  2: [
    { name: '怨嗟のゾンビグール', maxHp: 48, atk: 11, def: 4, exp: 25, gold: 25, icon: '🧟‍♂️' },
    { name: '巨大凶悪人喰い草ラフレシア', maxHp: 42, atk: 13, def: 3, exp: 28, gold: 30, icon: '🥀' },
  ],
  3: [
    { name: '呪われし魔甲冑骸骨兵', maxHp: 65, atk: 16, def: 6, exp: 40, gold: 40, icon: '💀' },
    { name: '冷酷なる漆黒の暗殺鬼', maxHp: 80, atk: 19, def: 5, exp: 50, gold: 50, icon: '🥷' },
  ],
  4: [
    { name: '古代殺戮兵器メタルゴーレム', maxHp: 120, atk: 22, def: 12, exp: 80, gold: 60, icon: '⚙️' },
    { name: '烈焔の獄覇竜ワイバーン', maxHp: 140, atk: 28, def: 8, exp: 110, gold: 80, icon: '🐉' },
  ],
  5: [
    { name: '深淵の総司令・暗黒邪神騎士', maxHp: 180, atk: 35, def: 15, exp: 200, gold: 120, icon: '🩸' },
  ]
};

const BOSS_ENEMY = {
  name: '深淵覇王・終焉極大魔王マオウ',
  maxHp: 450,
  atk: 48,
  def: 22,
  exp: 999,
  gold: 999,
  icon: '👹'
};

export default function BattleScreen({
  hero,
  updateHero,
  enemyType,
  currentFloor,
  onWin,
  onLose,
  onFlee,
}: BattleScreenProps) {

  const [enemy, setEnemy] = useState<Enemy | null>(null);
  const [battleLogs, setBattleLogs] = useState<CombatLog[]>([]);
  const [activeTab, setActiveTab] = useState<'main' | 'skills' | 'items'>('main');
  const [hasStolen, setHasStolen] = useState<boolean>(false);
  const [shakeEnemy, setShakeEnemy] = useState<boolean>(false);
  const [shakePlayer, setShakePlayer] = useState<boolean>(false);
  const [damageIndicators, setDamageIndicators] = useState<DamageIndicator[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState<boolean>(true);
  const [isActionLocked, setIsActionLocked] = useState<boolean>(false);

  // Real-time 3D Animation and Combat FX Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weaponSwingProgressRef = useRef<number>(0);
  const combatEffectRef = useRef<{ type: string; progress: number } | null>(null);
  const shakeIntensityRef = useRef<number>(0);
  const particlesRef = useRef<any[]>([]);
  const ticksRef = useRef<number>(0);
  const deathTimerRef = useRef<number>(0);

  // Setup Real-time 3D Combat Painting Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600;
    const height = 350;

    const spawnExplosionParticles = (count: number, sx: number, sy: number, color: string) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particlesRef.current.push({
          x: sx,
          y: sy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - (Math.random() * 2.5),
          gravity: 0.12,
          size: Math.random() * 3.5 + 1.5,
          color: color,
          alpha: 1.0,
          age: 0,
          maxAge: Math.floor(Math.random() * 18) + 15,
        });
      }
    };

    const drawWarriorSword = (ctx: CanvasRenderingContext2D, wx: number, wy: number, scale: number, rot: number, xOff: number, yOff: number) => {
      ctx.save();
      ctx.translate(wx + xOff, wy + yOff);
      ctx.rotate(rot);

      // Slash Trail
      if (weaponSwingProgressRef.current > 0.3 && weaponSwingProgressRef.current < 0.8) {
        const trailGrad = ctx.createLinearGradient(-40, -120, 0, 0);
        trailGrad.addColorStop(0, 'rgba(45, 212, 191, 0.45)');
        trailGrad.addColorStop(1, 'rgba(45, 212, 191, 0)');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-65, -95);
        ctx.bezierCurveTo(-110, -115, -30, -175, 45, -100);
        ctx.closePath();
        ctx.fillStyle = trailGrad;
        ctx.fill();
      }

      // Hilt (Grip)
      ctx.fillStyle = '#52525b';
      ctx.fillRect(-5, 0, 10, 32);

      // Guard
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(22, 0);
      ctx.lineTo(16, -6);
      ctx.lineTo(-16, -6);
      ctx.closePath();
      ctx.fill();

      // Guard gem
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-3, -4, 6, 4);

      // Pommel
      ctx.beginPath();
      ctx.arc(0, 34, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#d97706';
      ctx.fill();

      // Blade
      const bladeGrad = ctx.createLinearGradient(-10, -145, 10, 0);
      bladeGrad.addColorStop(0, '#fafafa');
      bladeGrad.addColorStop(0.5, '#cbd5e1');
      bladeGrad.addColorStop(1, '#475569');

      ctx.beginPath();
      ctx.moveTo(-9, -6);
      ctx.lineTo(-6, -130);
      ctx.lineTo(0, -155);
      ctx.lineTo(6, -130);
      ctx.lineTo(9, -6);
      ctx.closePath();
      ctx.fillStyle = bladeGrad;
      ctx.fill();

      // Laser central line
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, -150);
      ctx.stroke();

      ctx.restore();
    };

    const drawMageStaff = (ctx: CanvasRenderingContext2D, wx: number, wy: number, scale: number, rot: number, xOff: number, yOff: number) => {
      ctx.save();
      ctx.translate(wx + xOff, wy + yOff);
      ctx.rotate(rot);

      // Magical pulsing orb halo
      const orbitPulse = Math.sin(ticksRef.current * 0.12) * 5;
      const colGrad = ctx.createRadialGradient(0, -120, 3, 0, -120, 22 + orbitPulse);
      colGrad.addColorStop(0, 'rgba(165, 243, 252, 0.98)');
      colGrad.addColorStop(0.4, 'rgba(6, 182, 212, 0.55)');
      colGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.beginPath();
      ctx.arc(0, -120, 24 + orbitPulse, 0, 2 * Math.PI);
      ctx.fillStyle = colGrad;
      ctx.fill();

      // Staff body
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 35);
      ctx.quadraticCurveTo(-14, -35, 0, -110);
      ctx.stroke();

      // Golden ribbon wrap
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-4, 18);
      ctx.quadraticCurveTo(7, 0, -6, -18);
      ctx.quadraticCurveTo(7, -36, -3, -65);
      ctx.quadraticCurveTo(9, -82, 0, -102);
      ctx.stroke();

      // Grip holder
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.moveTo(-10, -108);
      ctx.lineTo(-16, -120);
      ctx.lineTo(0, -114);
      ctx.lineTo(16, -120);
      ctx.lineTo(10, -108);
      ctx.closePath();
      ctx.fill();

      // Central crystal orb
      ctx.beginPath();
      ctx.arc(0, -120, 10, 0, 2 * Math.PI);
      ctx.fillStyle = '#06b6d4';
      ctx.fill();

      // Magic ambient sparkles
      if (Math.random() < 0.4) {
        const sprX = (Math.random() - 0.5) * 50;
        const sprY = -120 + (Math.random() - 0.5) * 50;
        ctx.fillStyle = 'white';
        ctx.fillRect(sprX, sprY, 2.5, 2.5);
      }

      ctx.restore();
    };

    const drawThiefDagger = (ctx: CanvasRenderingContext2D, wx: number, wy: number, scale: number, rot: number, xOff: number, yOff: number) => {
      ctx.save();
      ctx.translate(wx + xOff, wy + yOff);
      ctx.rotate(rot);

      // Dash slash trail background
      if (weaponSwingProgressRef.current > 0.2 && weaponSwingProgressRef.current < 0.8) {
        ctx.strokeStyle = 'rgba(232, 121, 249, 0.35)';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(0, 0, 70, -Math.PI / 2, -Math.PI);
        ctx.stroke();
      }

      // Leather grip handle
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(-3.5, 0, 7, 24);

      // Metal guard
      ctx.fillStyle = '#27272a';
      ctx.fillRect(-14, -4, 28, 4);

      // Metallic purple daggers
      const bladeGrad = ctx.createLinearGradient(-8, -85, 8, 0);
      bladeGrad.addColorStop(0, '#fae8ff');
      bladeGrad.addColorStop(0.55, '#d946ef');
      bladeGrad.addColorStop(1, '#4a044e');

      ctx.beginPath();
      ctx.moveTo(-5, -4);
      ctx.bezierCurveTo(-12, -40, -2, -70, -20, -95);
      ctx.bezierCurveTo(-5, -80, 7, -40, 5, -4);
      ctx.closePath();
      ctx.fillStyle = bladeGrad;
      ctx.fill();

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.stroke();

      ctx.restore();
    };

    const render = () => {
      ticksRef.current += 1;

      // 1. Update weapon swing animations
      if (weaponSwingProgressRef.current > 0) {
        weaponSwingProgressRef.current += 0.065;
        if (weaponSwingProgressRef.current >= 1.0) {
          weaponSwingProgressRef.current = 0;
        }
      }

      // 2. Update combat effect progress
      if (combatEffectRef.current) {
        combatEffectRef.current.progress += 0.045;
        if (combatEffectRef.current.progress >= 1.0) {
          combatEffectRef.current = null;
        }
      }

      // 3. Decay shake intensity
      if (shakeIntensityRef.current > 0) {
        shakeIntensityRef.current -= 0.085;
        if (shakeIntensityRef.current < 0) {
          shakeIntensityRef.current = 0;
        }
      }

      // 4. Update death animation timer if monster dead
      if (enemy && enemy.hp <= 0) {
        deathTimerRef.current += 1;
      }

      // 5. Update particle simulation
      particlesRef.current = particlesRef.current.map(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.gravity) {
          p.vy += p.gravity;
        }
        p.age += 1;
        return p;
      }).filter(p => p.age < p.maxAge);

      // --- DRAW 3D CANVAS GAME SECTION ---
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, width, height);

      if (enemy) {
        const isBoss = enemy.isBoss;
        const cx = width / 2;
        const cy = height / 2;

        // Draw sky ceiling gradient
        const skyGrad = ctx.createLinearGradient(0, 0, 0, cy);
        if (isBoss) {
          skyGrad.addColorStop(0, '#110202');
          skyGrad.addColorStop(1, '#3b0712');
        } else {
          skyGrad.addColorStop(0, '#020617');
          skyGrad.addColorStop(1, '#15133c');
        }
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, cy);

        // Constellation stars
        ctx.fillStyle = isBoss ? 'rgba(239, 68, 68, 0.45)' : 'rgba(14, 165, 233, 0.4)';
        for (let i = 0; i < 20; i++) {
          const starX = ((Math.sin(i * 123 + ticksRef.current * 0.015) + 1.0) / 2) * width;
          const starY = ((Math.cos(i * 73 + ticksRef.current * 0.01) + 1.0) / 2) * cy;
          ctx.fillRect(starX, starY, 1.5, 1.5);
        }

        // Draw deep 3D floor
        const floorGrad = ctx.createLinearGradient(0, cy, 0, height);
        if (isBoss) {
          floorGrad.addColorStop(0, '#0c0202');
          floorGrad.addColorStop(1, '#200808');
        } else {
          floorGrad.addColorStop(0, '#09090b');
          floorGrad.addColorStop(1, '#0c1b2b');
        }
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, cy, width, height - cy);

        // Floor perspective lines
        ctx.strokeStyle = isBoss ? 'rgba(239, 68, 68, 0.15)' : 'rgba(20, 184, 166, 0.18)';
        ctx.lineWidth = 1;
        for (let x = -100; x <= width + 100; x += 60) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x, height);
          ctx.stroke();
        }

        // Horizontal perspective increments
        const perspectiveRatios = [1.0, 0.6, 0.35, 0.2, 0.1, 0.0];
        perspectiveRatios.forEach(r => {
          const y = cy + (height / 2) * r;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        });

        // 3D Corridor Side Walls
        const ratio = [1.0, 0.6, 0.35, 0.2, 0.1, 0.04];
        const strokeColor = isBoss ? 'rgba(220, 38, 38, 0.25)' : 'rgba(14, 116, 144, 0.25)';
        for (let d = 4; d >= 1; d--) {
          const xl_prev = cx - (width / 2) * ratio[d - 1];
          const xr_prev = cx + (width / 2) * ratio[d - 1];
          const yt_prev = cy - (height / 2) * ratio[d - 1];
          const yb_prev = cy + (height / 2) * ratio[d - 1];

          const xl_curr = cx - (width / 2) * ratio[d];
          const xr_curr = cx + (width / 2) * ratio[d];
          const yt_curr = cy - (height / 2) * ratio[d];
          const yb_curr = cy + (height / 2) * ratio[d];

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;

          // Left Wall Panel
          ctx.beginPath();
          ctx.moveTo(xl_curr, yt_curr);
          ctx.lineTo(xl_prev, yt_prev);
          ctx.lineTo(xl_prev, yb_prev);
          ctx.lineTo(xl_curr, yb_curr);
          ctx.closePath();
          ctx.fillStyle = d % 2 === 0 ? '#0f0f12' : '#141418';
          ctx.fill();
          ctx.stroke();

          // Right Wall Panel
          ctx.beginPath();
          ctx.moveTo(xr_prev, yt_prev);
          ctx.lineTo(xr_curr, yt_curr);
          ctx.lineTo(xr_curr, yb_curr);
          ctx.lineTo(xr_prev, yb_prev);
          ctx.closePath();
          ctx.fillStyle = d % 2 === 0 ? '#141418' : '#1b1b22';
          ctx.fill();
          ctx.stroke();
        }

        // Draw magical summon circle pedestal
        const pedX = cx;
        const pedY = height * 0.72;
        const rx = 110;
        const ry = 35;

        ctx.beginPath();
        ctx.ellipse(pedX, pedY, rx + 12, ry + 4, 0, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fill();

        const pulse = Math.sin(ticksRef.current * 0.05) * 5;
        ctx.beginPath();
        ctx.ellipse(pedX, pedY, rx + pulse, ry + pulse / 3, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = isBoss ? 'rgba(239, 68, 68, 0.7)' : 'rgba(34, 211, 238, 0.7)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(pedX, pedY, rx * 0.65 - pulse, ry * 0.65 - pulse / 4, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = isBoss ? 'rgba(185, 28, 28, 0.4)' : 'rgba(20, 184, 166, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Rays rising
        ctx.fillStyle = isBoss ? 'rgba(248, 113, 113, 0.35)' : 'rgba(45, 212, 191, 0.35)';
        for (let i = 0; i < 4; i++) {
          const angle = (ticksRef.current * 0.015 + i * (Math.PI / 2)) % (2 * Math.PI);
          const rX = pedX + Math.cos(angle) * (rx * 0.85);
          const rY = pedY + Math.sin(angle) * (ry * 0.85);
          ctx.fillRect(rX - 1, rY - 25 - (ticksRef.current + i * 15) % 20, 2, 6);
        }

        // Draw Active Enemy Sprite
        const hoverOffset = Math.sin(ticksRef.current * 0.05) * 6;
        let shakeX = 0;
        let shakeY = 0;
        if (shakeIntensityRef.current > 0) {
          shakeX = (Math.sin(ticksRef.current * 2.1) + (Math.random() - 0.5)) * shakeIntensityRef.current * 16;
          shakeY = (Math.cos(ticksRef.current * 1.7) + (Math.random() - 0.5)) * shakeIntensityRef.current * 10;
        }

        let alpha = 1.0;
        let sinkY = 0;
        if (enemy.hp <= 0) {
          alpha = Math.max(0, 1.0 - (deathTimerRef.current / 40));
          sinkY = deathTimerRef.current * 2.2;
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        const baseSize = isBoss ? 135 : 95;
        const breath = Math.cos(ticksRef.current * 0.035) * 0.03 + 1.0;
        const renderX = cx + shakeX;
        const renderY = pedY - (baseSize * 0.45) + hoverOffset + shakeY + sinkY;

        ctx.font = `${Math.ceil(baseSize)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (shakeIntensityRef.current > 0) {
          ctx.translate(renderX, renderY);
          ctx.rotate((Math.random() - 0.5) * 0.16);
          ctx.fillText(enemy.imageIcon, 0, 0);
        } else if (enemy.hp <= 0) {
          ctx.translate(renderX, renderY);
          ctx.rotate(deathTimerRef.current * 0.04);
          ctx.fillText(enemy.imageIcon, 0, 0);
        } else {
          ctx.fillText(enemy.imageIcon, renderX, renderY);
        }
        ctx.restore();

        // 6. Draw Combat effect overlays
        if (combatEffectRef.current) {
          const eff = combatEffectRef.current;
          const t = eff.progress;

          if (eff.type === 'slash_light' || eff.type === 'slash_heavy') {
            const isHeavy = eff.type === 'slash_heavy';
            ctx.save();
            ctx.strokeStyle = isHeavy ? '#ef4444' : '#ffffff';
            ctx.shadowColor = isHeavy ? '#ef4444' : '#14b8a6';
            ctx.shadowBlur = 15;
            ctx.lineWidth = isHeavy ? 10 * (1.0 - t) : 5 * (1.0 - t);

            ctx.beginPath();
            ctx.moveTo(cx - 90 + t * 180, pedY - 60 + 50 - t * 100);
            ctx.lineTo(cx + 90 - t * 180, pedY - 60 - 50 + t * 100);
            ctx.stroke();
            ctx.restore();

            if (t < 0.25) {
              spawnExplosionParticles(2, cx + (Math.random() - 0.5) * 60, pedY - 60 + (Math.random() - 0.5) * 40, isHeavy ? '#fecaca' : '#fed7aa');
            }
          }

          if (eff.type === 'fire') {
            const radius = t * 110;
            const fGrad = ctx.createRadialGradient(cx, pedY - 65, 1, cx, pedY - 65, radius);
            fGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
            fGrad.addColorStop(0.35, 'rgba(249,115,22,0.85)');
            fGrad.addColorStop(0.8, 'rgba(239,68,68,0.45)');
            fGrad.addColorStop(1, 'rgba(239,68,68,0)');
            ctx.beginPath();
            ctx.arc(cx, pedY - 65, radius, 0, 2 * Math.PI);
            ctx.fillStyle = fGrad;
            ctx.fill();

            if (Math.random() < 0.72) {
              spawnExplosionParticles(3, cx + (Math.random() - 0.5) * 60, pedY - 65 + (Math.random() - 0.5) * 60, '#f97316');
            }
          }

          if (eff.type === 'thunder') {
            ctx.save();
            ctx.strokeStyle = '#e0f2fe';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 4 * (1.0 - t);

            if (t < 0.16) {
              ctx.fillStyle = 'rgba(255,255,255,0.4)';
              ctx.fillRect(0, 0, width, height);
            }

            ctx.beginPath();
            ctx.moveTo(cx, 0);
            let rxBolt = cx;
            for (let i = 1; i <= 4; i++) {
              const bY = (pedY - 60) * (i / 4);
              const bX = cx + (Math.random() - 0.5) * 70;
              ctx.lineTo(bX, bY);
              rxBolt = bX;
            }
            ctx.stroke();
            ctx.restore();

            if (t < 0.3) {
              spawnExplosionParticles(5, rxBolt, pedY - 60, '#e0f2fe');
            }
          }

          if (eff.type === 'heal') {
            ctx.strokeStyle = `rgba(52, 211, 153, ${1.0 - t})`;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.ellipse(width * 0.3, height * 0.75 - t * 140, 55 * t, 16 * t, 0, 0, 2 * Math.PI);
            ctx.stroke();

            if (Math.random() < 0.72) {
              particlesRef.current.push({
                x: (Math.random() * 0.8 + 0.1) * width,
                y: height - 10,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 4 - 3,
                gravity: -0.06,
                size: Math.random() * 4.5 + 2,
                color: '#34d399',
                alpha: 0.9,
                age: 0,
                maxAge: 35,
              });
            }
          }

          if (eff.type === 'blizzard') {
            ctx.save();
            ctx.strokeStyle = `rgba(186, 230, 253, ${1.0 - t})`;
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 20;
            ctx.lineWidth = 3;

            const radius = t * 90;
            ctx.beginPath();
            ctx.arc(cx, pedY - 65, radius, t * Math.PI, (t + 1.5) * Math.PI);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(cx, pedY - 65, radius - 20, -t * Math.PI, (-t + 1.5) * Math.PI);
            ctx.stroke();
            ctx.restore();

            if (Math.random() < 0.6) {
              spawnExplosionParticles(3, cx + (Math.random() - 0.5) * 80, pedY - 65 + (Math.random() - 0.5) * 80, '#e0f2fe');
            }
          }

          if (eff.type === 'meteor') {
            ctx.save();
            const startX = cx + 200 * (1.0 - t);
            const startY = -50 + (pedY - 15) * t;

            const radius = 25 * (0.5 + t / 2);
            const metGrad = ctx.createRadialGradient(startX, startY, 2, startX, startY, radius + 15);
            metGrad.addColorStop(0, '#fef08a');
            metGrad.addColorStop(0.3, '#f97316');
            metGrad.addColorStop(0.7, '#dc2626');
            metGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

            ctx.beginPath();
            ctx.arc(startX, startY, radius + 15, 0, 2 * Math.PI);
            ctx.fillStyle = metGrad;
            ctx.fill();

            ctx.restore();

            if (t > 0.4 && Math.random() < 0.8) {
              spawnExplosionParticles(4, cx + (Math.random() - 0.5) * 90, pedY - 65 + (Math.random() - 0.5) * 60, '#ef4444');
              spawnExplosionParticles(2, cx + (Math.random() - 0.5) * 90, pedY - 65 + (Math.random() - 0.5) * 60, '#f59e0b');
            }
          }

          if (eff.type === 'poison') {
            ctx.save();
            ctx.fillStyle = `rgba(168, 85, 247, ${1.0 - t})`;
            for (let i = 0; i < 5; i++) {
              const bpX = cx + Math.sin(t * 10 + i) * 35;
              const bpY = (pedY - 65) + Math.cos(t * 7 + i) * 25 - t * 30;
              const bRadius = (12 * t) + 4;
              ctx.beginPath();
              ctx.arc(bpX, bpY, bRadius, 0, 2 * Math.PI);
              ctx.fill();
            }
            ctx.restore();

            if (Math.random() < 0.5) {
              spawnExplosionParticles(2, cx + (Math.random() - 0.5) * 70, pedY - 65 + (Math.random() - 0.5) * 40, '#a855f7');
            }
          }

          if (eff.type === 'shield_bash') {
            ctx.save();
            ctx.strokeStyle = `rgba(226, 232, 240, ${1.0 - t})`;
            ctx.lineWidth = 12 * (1.0 - t);
            ctx.shadowColor = '#94a3b8';
            ctx.shadowBlur = 15;
            
            ctx.beginPath();
            ctx.ellipse(cx, pedY - 65, 80 * t, 50 * t, 0, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.restore();

            if (t < 0.3) {
              spawnExplosionParticles(4, cx, pedY - 65, '#e2e8f0');
            }
          }

          if (eff.type === 'shadow_assassin') {
            ctx.save();
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 4 * (1.0 - t);
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 10;

            ctx.beginPath();
            ctx.moveTo(cx - 100, pedY - 100 + t * 160);
            ctx.lineTo(cx + 100, pedY - 20 - t * 160);
            ctx.moveTo(cx + 100, pedY - 100 + t * 160);
            ctx.lineTo(cx - 100, pedY - 20 - t * 160);
            ctx.stroke();
            ctx.restore();

            if (Math.random() < 0.7) {
              spawnExplosionParticles(2, cx + (Math.random() - 0.5) * 110, pedY - 65 + (Math.random() - 0.5) * 50, '#312e81');
            }
          }

          if (eff.type === 'giga_impact') {
            ctx.save();
            ctx.strokeStyle = '#fbbf24'; // Amber Gold
            ctx.lineWidth = 15 * (1.0 - t);
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 30;

            ctx.beginPath();
            // Giant vertical slash
            ctx.moveTo(cx, pedY - 140 + t * 40);
            ctx.lineTo(cx, pedY + 10 - t * 40);
            // Crossing slash
            ctx.moveTo(cx - 100 + t * 40, pedY - 65);
            ctx.lineTo(cx + 100 - t * 40, pedY - 65);
            ctx.stroke();

            // Inner bright white flash
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 6 * (1.0 - t);
            ctx.beginPath();
            ctx.moveTo(cx, pedY - 120 + t * 40);
            ctx.lineTo(cx, pedY - 10 - t * 40);
            ctx.moveTo(cx - 80 + t * 40, pedY - 65);
            ctx.lineTo(cx + 80 - t * 40, pedY - 65);
            ctx.stroke();

            ctx.restore();

            if (Math.random() < 0.9) {
              spawnExplosionParticles(4, cx + (Math.random() - 0.5) * 80, pedY - 65 + (Math.random() - 0.5) * 80, '#fef08a');
              spawnExplosionParticles(2, cx + (Math.random() - 0.5) * 85, pedY - 65 + (Math.random() - 0.5) * 85, '#ffffff');
            }
          }

          if (eff.type === 'cosmic_flash') {
            ctx.save();
            // Nebula glow
            const rad = t * 130;
            const cosGrad = ctx.createRadialGradient(cx, pedY - 65, rad * 0.1, cx, pedY - 65, rad);
            cosGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            cosGrad.addColorStop(0.3, 'rgba(168, 85, 247, 0.85)'); // Purple
            cosGrad.addColorStop(0.6, 'rgba(59, 130, 246, 0.45)'); // Blue
            cosGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

            ctx.beginPath();
            ctx.arc(cx, pedY - 65, rad, 0, 2 * Math.PI);
            ctx.fillStyle = cosGrad;
            ctx.fill();

            // Flash star lines
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 * (1.0 - t);
            ctx.beginPath();
            ctx.moveTo(cx - 120, pedY - 65);
            ctx.lineTo(cx + 120, pedY - 65);
            ctx.moveTo(cx, pedY - 185);
            ctx.lineTo(cx, pedY + 55);
            ctx.stroke();

            ctx.restore();

            if (Math.random() < 0.8) {
              spawnExplosionParticles(3, cx + (Math.random() - 0.5) * 100, pedY - 65 + (Math.random() - 0.5) * 100, '#e879f9');
              spawnExplosionParticles(2, cx + (Math.random() - 0.5) * 110, pedY - 65 + (Math.random() - 0.5) * 110, '#60a5fa');
            }
          }

          if (eff.type === 'giga_pierce') {
            ctx.save();
            ctx.strokeStyle = '#e2e8f0'; // Bright slate
            ctx.lineWidth = 4 * (1.0 - t);
            ctx.shadowColor = '#cbd5e1';
            ctx.shadowBlur = 15;

            // Multiple rapid slashes coming from different points to the center
            ctx.beginPath();
            for (let i = 0; i < 4; i++) {
              const startAngle = (i * Math.PI) / 2 + t * Math.PI;
              const ox = cx + Math.cos(startAngle) * 90 * (1.0 - t);
              const oy = (pedY - 65) + Math.sin(startAngle) * 90 * (1.0 - t);
              ctx.moveTo(ox, oy);
              ctx.lineTo(cx, pedY - 65);
            }
            ctx.stroke();
            ctx.restore();

            if (Math.random() < 0.8) {
              spawnExplosionParticles(3, cx + (Math.random() - 0.5) * 70, pedY - 65 + (Math.random() - 0.5) * 70, '#f8fafc');
            }
          }

          if (eff.type === 'enemy_slash') {
            ctx.save();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 14 * (1.0 - t);
            ctx.shadowColor = 'red';
            ctx.shadowBlur = 25;

            if (t < 0.2) {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
              ctx.fillRect(0, 0, width, height);
            }

            ctx.beginPath();
            ctx.moveTo(width * 0.25, height * 0.25);
            ctx.lineTo(width * 0.75, height * 0.75);
            ctx.moveTo(width * 0.75, height * 0.25);
            ctx.lineTo(width * 0.25, height * 0.75);
            ctx.stroke();
            ctx.restore();

            if (t < 0.35) {
              spawnExplosionParticles(3, width / 2 + (Math.random() - 0.5) * 220, height / 2 + (Math.random() - 0.5) * 110, '#ef4444');
            }
          }
        }

        // 7. Paint Custom Particles
        particlesRef.current.forEach(p => {
          ctx.save();
          ctx.globalAlpha = p.alpha * (1.0 - p.age / p.maxAge);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
          ctx.fill();
          ctx.restore();
        });

        // 8. Paint First-Person Weapon
        const swing = weaponSwingProgressRef.current;
        let rotOffset = 0;
        let xOffset = 0;
        let yOffset = 0;

        if (swing > 0) {
          if (swing < 0.35) {
            const progress = swing / 0.35;
            rotOffset = progress * 0.25;
            xOffset = progress * 16;
            yOffset = progress * 12;
          } else if (swing < 0.75) {
            const progress = (swing - 0.35) / 0.4;
            rotOffset = 0.25 - progress * 1.6;
            xOffset = 16 - progress * 75;
            yOffset = 12 - progress * 24;
          } else {
            const progress = (swing - 0.75) / 0.25;
            rotOffset = -1.35 + progress * 1.35;
            xOffset = -59 + progress * 59;
            yOffset = -12 + progress * 12;
          }
        }

        const weaponBaseX = width * 0.73;
        const weaponBaseY = height + 10;

        if (hero.classType === 'warrior') {
          drawWarriorSword(ctx, weaponBaseX, weaponBaseY, 1.0, rotOffset, xOffset, yOffset);
        } else if (hero.classType === 'mage') {
          drawMageStaff(ctx, weaponBaseX, weaponBaseY, 1.0, rotOffset, xOffset, yOffset);
        } else {
          drawThiefDagger(ctx, weaponBaseX, weaponBaseY, 1.0, rotOffset, xOffset, yOffset);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [enemy, hero]);

  // Initialize combat enemy
  useEffect(() => {
    if (enemyType === 'boss') {
      setEnemy({
        name: BOSS_ENEMY.name,
        maxHp: BOSS_ENEMY.maxHp,
        hp: BOSS_ENEMY.maxHp,
        atk: BOSS_ENEMY.atk,
        def: BOSS_ENEMY.def,
        rewardExp: BOSS_ENEMY.exp,
        rewardGold: BOSS_ENEMY.gold,
        isBoss: true,
        imageIcon: BOSS_ENEMY.icon,
      });
      addLog('目の前に破壊を司る【魔王・マオウ】が光臨した！', 'system');
    } else {
      const candidates = ENEMIES_BY_FLOOR[currentFloor] || ENEMIES_BY_FLOOR[1];
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      setEnemy({
        name: selected.name,
        maxHp: selected.maxHp,
        hp: selected.maxHp,
        atk: selected.atk,
        def: selected.def,
        rewardExp: selected.exp,
        rewardGold: selected.gold,
        imageIcon: selected.icon,
      });
      addLog(`野生の【${selected.name}】が現れた！`, 'system');
    }
    setHasStolen(false);
  }, [enemyType, currentFloor]);

  const addLog = (text: string, type: CombatLog['type']) => {
    setBattleLogs(prev => [
      ...prev,
      { id: Math.random().toString(), text, type }
    ]);
  };

  const spawnIndicator = (amount: string, isPlayer: boolean, type: DamageIndicator['type']) => {
    const newInd = { id: Math.random().toString(), amount, isPlayer, type };
    setDamageIndicators(prev => [...prev, newInd]);
  };

  const removeIndicator = (id: string) => {
    setDamageIndicators(prev => prev.filter(ind => ind.id !== id));
  };

  // Helper calculation for random deviation (90% to 110%)
  const applyVariance = (value: number) => {
    const min = value * 0.9;
    const max = value * 1.1;
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  // Execute Player Damage on Enemy
  const executePlayerAttack = (damage: number, costMp: number = 0, isMagic: boolean = false, skillName?: string, accuracy: number = 1.0) => {
    if (!enemy) return;

    setIsActionLocked(true);
    
    // Trigger Canvas Swing animations & effects
    weaponSwingProgressRef.current = 0.01;
    shakeIntensityRef.current = 1.15;
    if (isMagic) {
      if (skillName === 'サンダー') {
        combatEffectRef.current = { type: 'thunder', progress: 0.01 };
      } else if (skillName === 'ブリザード') {
        combatEffectRef.current = { type: 'blizzard', progress: 0.01 };
      } else if (skillName === 'メテオストライク') {
        combatEffectRef.current = { type: 'meteor', progress: 0.01 };
      } else if (skillName === 'コズミックフラッシュ') {
        combatEffectRef.current = { type: 'cosmic_flash', progress: 0.01 };
      } else {
        combatEffectRef.current = { type: 'fire', progress: 0.01 };
      }
    } else {
      if (skillName === '毒刃乱舞') {
        combatEffectRef.current = { type: 'poison', progress: 0.01 };
      } else if (skillName === '金剛盾衝撃') {
        combatEffectRef.current = { type: 'shield_bash', progress: 0.01 };
      } else if (skillName === '影分身暗殺剣') {
        combatEffectRef.current = { type: 'shadow_assassin', progress: 0.01 };
      } else if (skillName === '覇王一閃') {
        combatEffectRef.current = { type: 'giga_impact', progress: 0.01 };
      } else if (skillName === '天照幻影滅殺刃') {
        combatEffectRef.current = { type: 'giga_pierce', progress: 0.01 };
      } else {
        const isHeavy = skillName === '兜割り' || skillName === '背水の陣' || skillName === '急所突き' || skillName === '烈風無双斬';
        combatEffectRef.current = { type: isHeavy ? 'slash_heavy' : 'slash_light', progress: 0.01 };
      }
    }

    // Sound Selection
    if (isMagic) {
      playSound('magic');
    } else {
      playSound('hit');
    }

    // Spend MP
    if (costMp > 0) {
      updateHero({
        ...hero,
        stats: {
          ...hero.stats,
          mp: Math.max(0, hero.stats.mp - costMp),
        }
      });
    }

    const descName = skillName || 'こうげき';

    // Accuracy Roll Check
    const isHit = Math.random() < accuracy;
    if (!isHit) {
      setTimeout(() => {
        spawnIndicator('MISS!', false, 'miss');
        playSound('click');
        addLog(`【${hero.name}】の${descName}！`, 'info');
        addLog(`しかし、敵にひらりと身をかわされた！（ミス）`, 'system');
        
        setIsPlayerTurn(false);
        setTimeout(() => {
          executeEnemyTurn(enemy.hp);
        }, 1200);
      }, 350);
      return;
    }

    // Animation Shake
    setShakeEnemy(true);
    setTimeout(() => setShakeEnemy(false), 200);

    // Apply Defences
    let defenseReduction = isMagic ? Math.floor(enemy.def * 0.3) : enemy.def;
    let finalDamage = Math.max(1, damage - defenseReduction);
    finalDamage = applyVariance(finalDamage);

    // Check critical hit
    const isCrit = !isMagic && Math.random() < (hero.classType === 'thief' ? 0.35 : 0.08);
    if (isCrit) {
      finalDamage = Math.floor(finalDamage * 1.8);
    }

    const nextHp = Math.max(0, enemy.hp - finalDamage);
    setEnemy({ ...enemy, hp: nextHp });

    spawnIndicator(finalDamage.toString(), false, 'damage');

    if (isCrit) {
      addLog(`会心の一撃！【${hero.name}】の${descName}！`, 'info');
      addLog(`【${enemy.name}】に ${finalDamage} の超絶ダメージを与えた！`, 'player_damage');
    } else {
      addLog(`【${hero.name}】の${descName}！`, 'info');
      addLog(`【${enemy.name}】に ${finalDamage} のダメージを与えた！`, 'player_damage');
    }

    // Check if Enemy died
    if (nextHp <= 0) {
      setTimeout(() => {
        handleVictory();
      }, 1000);
    } else {
      // Toggle turns
      setIsPlayerTurn(false);
      setTimeout(() => {
        executeEnemyTurn(nextHp);
      }, 1200);
    }
  };

  // Enemy responds
  const executeEnemyTurn = (currentEnemyHp: number) => {
    if (!enemy || currentEnemyHp <= 0) return;

    playSound('enemyHit');
    setShakePlayer(true);
    setTimeout(() => setShakePlayer(false), 200);

    // Trigger incoming claw attack overlay on canvas
    combatEffectRef.current = { type: 'enemy_slash', progress: 0.01 };

    // AI Choose attack - Boss has high skill chances
    const isSpecialAttack = enemy.isBoss ? Math.random() < 0.45 : Math.random() < 0.20;
    let rawAtk = enemy.atk;
    let description = `【${enemy.name}】の攻撃！`;

    if (isSpecialAttack) {
      rawAtk = Math.floor(enemy.atk * 1.4);
      description = `強襲！【${enemy.name}】の激しい特殊必殺攻撃！`;
    }

    let finalDamage = Math.max(1, rawAtk - hero.stats.def);
    finalDamage = applyVariance(finalDamage);

    const nextPlayerHp = Math.max(0, hero.stats.hp - finalDamage);
    updateHero({
      ...hero,
      stats: {
        ...hero.stats,
        hp: nextPlayerHp,
      }
    });

    spawnIndicator(finalDamage.toString(), true, 'damage');
    addLog(description, 'system');
    addLog(`【${hero.name}】は ${finalDamage} のダメージを受けた！`, 'enemy_damage');

    if (nextPlayerHp <= 0) {
      // Defeat!
      setTimeout(() => {
        playSound('gameover');
        onLose();
      }, 1000);
    } else {
      // Switch back to player
      setTimeout(() => {
        setIsPlayerTurn(true);
        setIsActionLocked(false);
        setActiveTab('main');
      }, 1000);
    }
  };

  // Regular Attack
  const handleAttack = () => {
    if (!isPlayerTurn || isActionLocked || !enemy) return;
    executePlayerAttack(hero.stats.atk);
  };

  // Execute Skill / Magic
  const handleUseSkill = (skill: Skill) => {
    if (!isPlayerTurn || isActionLocked || !enemy) return;
    if (hero.stats.mp < skill.mpCost) {
      playSound('click');
      addLog('MPが足りません！', 'system');
      return;
    }

    if (skill.name === 'ヒール' || skill.name === 'ヒール薬') {
      // Recovery Logic
      setIsActionLocked(true);
      playSound('heal');
      
      // Trigger canvas healing animation
      combatEffectRef.current = { type: 'heal', progress: 0.01 };

      const healAmount = Math.floor(hero.stats.maxHp * 0.55);
      const nextHp = Math.min(hero.stats.maxHp, hero.stats.hp + healAmount);

      updateHero({
        ...hero,
        stats: {
          ...hero.stats,
          hp: nextHp,
          mp: hero.stats.mp - skill.mpCost,
        }
      });

      spawnIndicator(`+${healAmount}`, true, 'heal');
      addLog(`【${hero.name}】の回復魔法 ${skill.name}！`, 'info');
      addLog(`自身のHPが ${healAmount} 回復した！`, 'heal');

      setIsPlayerTurn(false);
      setTimeout(() => {
        executeEnemyTurn(enemy.hp);
      }, 1200);

    } else if (skill.name === '盗む') {
      // Thief unique steal skill
      if (hasStolen) {
        playSound('click');
        addLog('このモンスターからは既に盗んでいます！', 'system');
        return;
      }
      setIsActionLocked(true);
      playSound('click');

      const isSuccess = Math.random() < 0.7;
      const updatedHero = { ...hero };
      updatedHero.stats.mp = Math.max(0, hero.stats.mp - skill.mpCost);

      addLog(`【${hero.name}】は盗みを試みた！`, 'info');

      if (isSuccess) {
        playSound('pickup');
        setHasStolen(true);
        const goldGain = Math.floor(Math.random() * 25) + 15;
        const gotPotion = Math.random() < 0.45;

        updatedHero.stats.gold += goldGain;
        let stolenItem = `${goldGain}ゴールド`;
        if (gotPotion) {
          updatedHero.inventory.potions += 1;
          stolenItem += ` と回復ポーション1個`;
        }

        updateHero(updatedHero);
        spawnIndicator('入手！', false, 'steal');
        addLog(`大成功！ ${stolenItem} を盗み取った！`, 'loot');
      } else {
        addLog(`失敗！すばしっこく避けられた。`, 'system');
      }

      setIsPlayerTurn(false);
      setTimeout(() => {
        executeEnemyTurn(enemy.hp);
      }, 1200);

    } else {
      // Damage calculation
      let dmgMultiplier = 1.3;
      let accuracy = 1.0;

      if (skill.name === '兜割り') dmgMultiplier = 1.6;
      if (skill.name === '背水の陣') dmgMultiplier = 2.4;
      if (skill.name === '烈風無双斬') dmgMultiplier = 2.0;
      if (skill.name === '金剛盾衝撃') dmgMultiplier = 1.1;
      if (skill.name === '覇王一閃') {
        dmgMultiplier = 5.0;
        accuracy = 0.35;
      }
      if (skill.name === 'ファイア') dmgMultiplier = 1.9;
      if (skill.name === 'サンダー') dmgMultiplier = 2.2;
      if (skill.name === 'ブリザード') dmgMultiplier = 2.0;
      if (skill.name === 'メテオストライク') dmgMultiplier = 3.2;
      if (skill.name === 'コズミックフラッシュ') {
        dmgMultiplier = 5.5;
        accuracy = 0.30;
      }
      if (skill.name === '急所突き') dmgMultiplier = 1.4;
      if (skill.name === '毒刃乱舞') dmgMultiplier = 1.7;
      if (skill.name === '影分身暗殺剣') dmgMultiplier = 2.6;
      if (skill.name === '天照幻影滅殺刃') {
        dmgMultiplier = 4.5;
        accuracy = 0.40;
      }

      let calculatedDamage = Math.floor(hero.stats.atk * dmgMultiplier);
      if (skill.name === '金剛盾衝撃') {
        // Shield Bash scales with defense as well
        calculatedDamage = Math.floor((hero.stats.atk + hero.stats.def * 1.5) * dmgMultiplier);
      }

      const isMagic = skill.name === 'ファイア' || skill.name === 'サンダー' || skill.name === 'ブリザード' || skill.name === 'メテオストライク' || skill.name === 'コズミックフラッシュ';
      executePlayerAttack(calculatedDamage, skill.mpCost, isMagic, skill.name, accuracy);
    }
  };

  // Consume Items in Combat
  const handleUseItem = (type: 'hp' | 'mp') => {
    if (!isPlayerTurn || isActionLocked || !enemy) return;

    if (type === 'hp') {
      if (hero.inventory.potions <= 0) {
        playSound('click');
        addLog('HPポーションがありません！', 'system');
        return;
      }
      setIsActionLocked(true);
      playSound('heal');

      // Trigger HP canvas healing animation
      combatEffectRef.current = { type: 'heal', progress: 0.01 };

      const healAmount = Math.floor(hero.stats.maxHp * 0.5);
      const nextHp = Math.min(hero.stats.maxHp, hero.stats.hp + healAmount);

      updateHero({
        ...hero,
        stats: {
          ...hero.stats,
          hp: nextHp,
        },
        inventory: {
          ...hero.inventory,
          potions: hero.inventory.potions - 1
        }
      });

      spawnIndicator(`+${healAmount}`, true, 'heal');
      addLog(`【${hero.name}】は回復薬（HP）を飲みほした！`, 'info');
      addLog(`HPが ${healAmount} 回復した！`, 'heal');
    } else {
      if (hero.inventory.mpPotions <= 0) {
        playSound('click');
        addLog('MPポーションがありません！', 'system');
        return;
      }
      setIsActionLocked(true);
      playSound('heal');

      // Trigger MP canvas healing animation
      combatEffectRef.current = { type: 'heal', progress: 0.01 };

      const mHealAmount = Math.floor(hero.stats.maxMp * 0.5);
      const nextMp = Math.min(hero.stats.maxMp, hero.stats.mp + mHealAmount);

      updateHero({
        ...hero,
        stats: {
          ...hero.stats,
          mp: nextMp,
        },
        inventory: {
          ...hero.inventory,
          mpPotions: hero.inventory.mpPotions - 1
        }
      });

      spawnIndicator(`+${mHealAmount}`, true, 'heal');
      addLog(`【${hero.name}】は魔導魔力薬を飲みほした！`, 'info');
      addLog(`MPが ${mHealAmount} 回復した！`, 'heal');
    }

    setIsPlayerTurn(false);
    setTimeout(() => {
      executeEnemyTurn(enemy.hp);
    }, 1200);
  };

  // Flee combat
  const handleFlee = () => {
    if (!isPlayerTurn || isActionLocked || !enemy) return;

    if (enemy.isBoss) {
      playSound('click');
      addLog('魔王からは逃げられない！命運を賭けて戦え！', 'system');
      return;
    }

    setIsActionLocked(true);
    playSound('click');

    // Thief runs with 100% success. Others 65% success.
    const runSuccess = hero.classType === 'thief' || Math.random() < 0.65;
    if (runSuccess) {
      addLog('【逃走大成功！】モンスターの包囲をすり抜けた！', 'loot');
      setTimeout(() => {
        onFlee();
      }, 1000);
    } else {
      addLog('逃走失敗！退路を塞がれた！', 'system');
      setIsPlayerTurn(false);
      setTimeout(() => {
        executeEnemyTurn(enemy.hp);
      }, 1200);
    }
  };

  const handleVictory = () => {
    if (!enemy) return;
    playSound('victory');
    addLog(`【戦闘勝利！】${enemy.name} を撃破した！`, 'loot');
    addLog(`報酬: +${enemy.rewardExp} EXP, +${enemy.rewardGold} ゴールド獲得！`, 'loot');

    setTimeout(() => {
      onWin(enemy.rewardExp, enemy.rewardGold);
    }, 1400);
  };

  // Get skills options based on class type
  const getSkills = (): Skill[] => {
    switch (hero.classType) {
      case 'warrior':
        return [
          { name: '兜割り', mpCost: 6, description: '敵の急所を力強く叩き斬り、大きな一撃を与える' },
          { name: '烈風無双斬', mpCost: 9, description: '風に乗りし豪烈な三連薙ぎ払い！強烈な連続斬撃ダメージを与える' },
          { name: '金剛盾衝撃', mpCost: 6, description: '堅固な盾で突進！自分の防御力と攻撃力を合算した衝撃を与える' },
          { name: '背水の陣', mpCost: 12, description: '命を賭けた決死の特攻！超絶な大ダメージを与える' },
          { name: '覇王一閃', mpCost: 15, description: '【命中率35%/威力5.0倍】すべてを無に帰す渾身の大唐竹割り。一撃すれば5.0倍の超絶破壊力を発揮！' },
        ];
      case 'mage':
        return [
          { name: 'ファイア', mpCost: 8, description: '強力な火炎魔弾を放ち、防御を無視気味に焼き焦がす' },
          { name: 'サンダー', mpCost: 14, description: '天から雷光を召喚して敵を撃ち、膨大な電撃ダメージ' },
          { name: 'ブリザード', mpCost: 11, description: '極低温の氷雪嵐で絶望的な吹雪を浴びせ、防御力を貫通して大ダメージを与える' },
          { name: 'メテオストライク', mpCost: 20, description: '宇宙から終末をもたらす大隕石を招来し、敵を粉砕する最大級の爆熱神罰' },
          { name: 'コズミックフラッシュ', mpCost: 18, description: '【命中率30%/威力5.5倍】深宇宙より超新星爆発を誘起し周囲を巻き込む。当たれば5.5倍の極大ダメージ！' },
          { name: 'ヒール', mpCost: 8, description: '神聖回復魔法で自分の体力を高密度に回復(55%回復)' },
        ];
      case 'thief':
        return [
          { name: '急所突き', mpCost: 5, description: '相手の隙を突き、高確率で会心の致命傷を負わせる' },
          { name: '毒刃乱舞', mpCost: 6, description: '劇毒を仕込んだ刃で刹那に刻み、苛烈な毒塗れの斬撃ダメージを与える' },
          { name: '影分身暗殺剣', mpCost: 12, description: '闇夜より無数の分身を作り出し、急所を完全に不意打ちして粉砕する' },
          { name: '天照幻影滅殺刃', mpCost: 12, description: '【命中率40%/威力4.5倍】目にも留まらぬ速さで急所の心臓を抉る幻影の突き技。当たれば4.5倍の超大ダメージ！' },
          { name: '盗む', mpCost: 3, description: '敵が持つ大事なゴールドやポーションを盗み取る' },
        ];
    }
  };

  if (!enemy) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-zinc-950 font-sans">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-2" />
        <span className="text-zinc-400 text-xs">戦闘の舞台を構築中...</span>
      </div>
    );
  }

  return (
    <div id="battle-view" className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-2 md:p-3 rounded-lg font-sans">
      
      {/* Active 3D Battle Arena Viewport */}
      <div id="combatants-zone" className="relative w-full aspect-video md:aspect-[16/9.5] rounded-xl overflow-hidden border border-zinc-805 shadow-2xl bg-zinc-950 mb-3 select-none">
        
        {/* The 3D Battle Painting Canvas */}
        <canvas
          ref={canvasRef}
          width={600}
          height={350}
          className="w-full h-full object-cover block"
        />

        {/* HUD - TOP LEFT: Floor Indicator */}
        <div className="absolute top-2.5 left-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded px-2.5 py-1 text-[9px] font-mono uppercase font-bold tracking-widest text-teal-400 backdrop-blur-xs flex items-center space-x-1.5 shadow-md">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
          <span>BATTLE FL.{currentFloor}</span>
        </div>

        {/* HUD - TOP RIGHT: Enemy HP Bar Card */}
        <div className="absolute top-2.5 right-2.5 w-48 sm:w-60 bg-zinc-950/85 backdrop-blur-sm border border-zinc-800/80 rounded-lg p-2 shadow-2xl flex flex-col space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[10px] sm:text-xs text-zinc-100 flex items-center gap-1 truncate max-w-[80%]">
              {enemy.isBoss && <Trophy className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
              {enemy.name}
            </span>
            <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded-sm shrink-0 ${
              enemy.isBoss 
                ? 'bg-red-950/60 border border-red-900/50 text-red-400' 
                : 'bg-zinc-900 text-zinc-400 border border-zinc-850'
            }`}>
              {enemy.isBoss ? 'BOSS' : `HP ${enemy.hp}`}
            </span>
          </div>
          
          <div className="space-y-0.5">
            <div className="w-full bg-zinc-950 h-2 rounded-full border border-zinc-900 overflow-hidden relative">
              <div
                className={`h-full ring-l ring-white/10 transition-all duration-300 ${
                  enemy.hp < enemy.maxHp * 0.25 
                    ? 'bg-gradient-to-r from-red-650 to-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' 
                    : enemy.isBoss 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-500' 
                      : 'bg-gradient-to-r from-amber-600 to-orange-500'
                }`}
                style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[8px] font-mono text-zinc-500">
              <span>{Math.ceil((enemy.hp / enemy.maxHp) * 100)}%</span>
              <span>{enemy.hp} / {enemy.maxHp} HP</span>
            </div>
          </div>
        </div>

        {/* HUD - BOTTOM LEFT: Player Status HUD Card */}
        <div className="absolute bottom-2.5 left-2.5 w-52 sm:w-64 bg-zinc-950/85 backdrop-blur-md border border-zinc-800/80 rounded-xl p-2 sm:p-2.5 shadow-2xl flex flex-col space-y-1.5 pointer-events-none">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-1">
              <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-850 text-teal-400 px-1 rounded">Lv.{hero.stats.level}</span>
              <span className="font-bold text-xs sm:text-xs tracking-wide text-zinc-200">{hero.name}</span>
            </div>
            <span className="text-[8px] text-amber-500 font-bold uppercase tracking-wider">
              {hero.classType === 'warrior' ? '🛡️ 戦士' : hero.classType === 'mage' ? '🪄 魔法使い' : '🗡️ 盗賊'}
            </span>
          </div>

          {/* HP bar */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[9px] text-zinc-300 font-mono">
              <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-500 fill-red-500/10" /> HP</span>
              <span className="font-bold text-[10px]">{hero.stats.hp} / {hero.stats.maxHp}</span>
            </div>
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
              <div
                className="bg-gradient-to-r from-red-650 to-red-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (hero.stats.hp / hero.stats.maxHp) * 100)}%` }}
              />
            </div>
          </div>

          {/* MP bar */}
          <div className="space-y-0.5">
            <div className="flex justify-between text-[9px] text-zinc-300 font-mono">
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-cyan-400 fill-cyan-400/10" /> MP</span>
              <span className="font-bold text-[10px]">{hero.stats.mp} / {hero.stats.maxMp}</span>
            </div>
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-900">
              <div
                className="bg-gradient-to-r from-cyan-600 to-cyan-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (hero.stats.mp / hero.stats.maxMp) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bouncing Damage Numbers Overlay inside Area */}
        <AnimatePresence>
          {damageIndicators.map((ind) => (
            <motion.div
              key={ind.id}
              initial={{ opacity: 0, y: ind.isPlayer ? 50 : 20, scale: 0.6 }}
              animate={{ opacity: 1, y: ind.isPlayer ? -40 : -95, scale: [1, 1.5, 1.2] }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              onAnimationComplete={() => removeIndicator(ind.id)}
              className={`absolute font-black text-2xl tracking-wide z-20 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] ${
                ind.isPlayer ? 'left-[22%] bottom-[40%]' : 'left-[50%] top-[45%] -translate-x-1/2'
              } ${
                ind.type === 'damage' ? 'text-red-500 font-extrabold shadow-red-500' :
                ind.type === 'heal' ? 'text-emerald-450' :
                ind.type === 'steal' ? 'text-cyan-400' : 'text-zinc-400'
              }`}
            >
              {ind.amount}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Action Logs Box */}
      <div id="battle-logs-box" className="bg-zinc-950/90 border border-zinc-850 p-2 rounded-lg h-24 overflow-y-auto mb-3 font-mono text-xs text-zinc-300 space-y-1 select-text">
        {battleLogs.length === 0 ? (
          <div className="text-zinc-600 italic">あなたのターンです！コマンドを選択してください。</div>
        ) : (
          battleLogs.map((log) => (
            <div key={log.id} className={
              log.type === 'player_damage' ? 'text-green-400' :
              log.type === 'enemy_damage' ? 'text-red-400 font-bold' :
              log.type === 'heal' ? 'text-cyan-300' :
              log.type === 'loot' ? 'text-amber-400 font-bold' : 'text-zinc-300'
            }>
              ⚔️ {log.text}
            </div>
          ))
        )}
      </div>

      {/* Battle Command Controllers */}
      <div id="battle-commands" className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 min-h-[120px]">
        {activeTab === 'main' && (
          <div id="main-commands" className="grid grid-cols-2 gap-3 h-full">
            <button
              id="atk-btn"
              onClick={handleAttack}
              disabled={!isPlayerTurn || isActionLocked}
              className="disabled:opacity-40 bg-zinc-800 hover:bg-zinc-750 hover:border-zinc-550 border border-zinc-700 text-zinc-100 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md"
            >
              <Sword className="w-4 h-4 text-red-500" />
              <span>通常攻撃 [コウゲキ]</span>
            </button>

            <button
              id="skills-tab-btn"
              onClick={() => { playSound('click'); setActiveTab('skills'); }}
              disabled={!isPlayerTurn || isActionLocked}
              className="disabled:opacity-40 bg-zinc-800 hover:bg-zinc-750 hover:border-zinc-550 border border-zinc-700 text-zinc-100 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>スキル・呪文</span>
            </button>

            <button
              id="items-tab-btn"
              onClick={() => { playSound('click'); setActiveTab('items'); }}
              disabled={!isPlayerTurn || isActionLocked}
              className="disabled:opacity-40 bg-zinc-800 hover:bg-zinc-750 hover:border-zinc-550 border border-zinc-700 text-zinc-100 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md"
            >
              <span className="text-xs">🩹</span>
              <span>持ち歩き道具</span>
            </button>

            <button
              id="escape-btn"
              onClick={handleFlee}
              disabled={!isPlayerTurn || isActionLocked || enemy?.isBoss}
              className="disabled:opacity-40 bg-zinc-850 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-750 border text-zinc-400 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow"
            >
              <span>逃げ出す [フカイ]</span>
            </button>
          </div>
        )}

        {activeTab === 'skills' && (
          <div id="skills-commands" className="space-y-2">
            <div className="flex justify-between items-center mb-1 pb-1 border-b border-zinc-800">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">使用可能なスキル・呪文</span>
              <button
                id="back-skills-btn"
                onClick={() => { playSound('click'); setActiveTab('main'); }}
                className="text-[10px] text-amber-500 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded hover:bg-zinc-800 active:scale-95"
              >
                戻る ↩
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto">
              {getSkills().map((skill) => (
                <button
                  key={skill.name}
                  id={`skill-${skill.name}`}
                  onClick={() => handleUseSkill(skill)}
                  className="flex flex-col items-start bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 p-2 rounded-lg transition active:scale-98 text-left"
                >
                  <div className="w-full flex justify-between items-center text-xs font-bold">
                    <span className="text-zinc-100 flex items-center gap-1">✨ {skill.name}</span>
                    <span className="text-[10px] text-cyan-400 font-mono">消費 MP {skill.mpCost}</span>
                  </div>
                  <span className="text-[9px] text-zinc-400 mt-0.5 line-clamp-1">{skill.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'items' && (
          <div id="items-commands" className="space-y-2">
            <div className="flex justify-between items-center mb-1 pb-1 border-b border-zinc-800">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">戦闘用消耗道具</span>
              <button
                id="back-items-btn"
                onClick={() => { playSound('click'); setActiveTab('main'); }}
                className="text-[10px] text-amber-500 bg-zinc-950 border border-zinc-800 px-2 py-0.5 rounded hover:bg-zinc-800 active:scale-95"
              >
                戻る ↩
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="use-hp-pot-btn"
                onClick={() => handleUseItem('hp')}
                disabled={hero.inventory.potions <= 0}
                className="disabled:opacity-40 flex items-center justify-between bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-lg transition active:scale-95 text-left"
              >
                <div>
                  <div className="text-xs font-bold text-red-400">回復薬 (HP50%)</div>
                  <span className="text-[10px] text-zinc-500">所持: {hero.inventory.potions} 個</span>
                </div>
              </button>

              <button
                id="use-mp-pot-btn"
                onClick={() => handleUseItem('mp')}
                disabled={hero.inventory.mpPotions <= 0}
                className="disabled:opacity-40 flex items-center justify-between bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 p-2.5 rounded-lg transition active:scale-95 text-left"
              >
                <div>
                  <div className="text-xs font-bold text-cyan-400">魔力薬 (MP50%)</div>
                  <span className="text-[10px] text-zinc-500">所持: {hero.inventory.mpPotions} 個</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

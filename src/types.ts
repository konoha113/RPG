export type HeroClass = 'warrior' | 'mage' | 'thief';

export interface CharacterStats {
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  exp: number;
  nextExp: number;
  gold: number;
}

export interface Hero {
  id: string;
  name: string;
  classType: HeroClass;
  stats: CharacterStats;
  weaponUpgrade: number; // +0, +1, etc.
  armorUpgrade: number;  // +0, +1, etc.
  inventory: {
    potions: number;
    mpPotions: number;
    upgradeStones: number;
  };
}

export interface Enemy {
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  rewardExp: number;
  rewardGold: number;
  isBoss?: boolean;
  imageIcon: string; // Icon name from lucide or brief emoji
}

export type TileType = 'wall' | 'empty' | 'chest' | 'monster' | 'boss' | 'shrine' | 'stairs' | 'start';

export interface DungeonTile {
  x: number;
  y: number;
  type: TileType;
  revealed: boolean;
  visited: boolean;
  cleared: boolean; // For events like monsters or chests
  hasKey?: boolean;
  hasTrap?: boolean;
  trapType?: 'poison' | 'arrow' | 'pit';
  isPortal?: boolean;
}

export type GameState = 'title' | 'class_select' | 'town' | 'dungeon' | 'battle' | 'game_over' | 'victory';

export interface CombatLog {
  id: string;
  text: string;
  type: 'info' | 'player_damage' | 'enemy_damage' | 'heal' | 'system' | 'loot';
}

export interface Skill {
  name: string;
  mpCost: number;
  description: string;
}

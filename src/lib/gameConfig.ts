import { GameConfig } from '@/types/game'

export const GAME_CONFIG: GameConfig = {
  // 玩家设置
  PLAYER_SPEED: 5,
  PLAYER_HEALTH: 100,
  PLAYER_MOVE_SPEED: 15,
  PLAYER_ROTATION_SPEED: 0.08,

  // 子弹设置
  BULLET_SPEED: 30,
  BULLET_DAMAGE: 20,
  BULLET_LIFESPAN: 3000,
  BULLET_COOLDOWN: 500,

  // 怪物设置
  MONSTER_SPEED: 2,
  MONSTER_HEALTH: 50,
  MONSTER_COUNT: 6,
  MONSTER_DAMAGE: 8,

  // 地图设置
  MAP_SIZE: 100,
  ROUND_SECONDS: 180,
}

export const PHYSICS = {
  GRAVITY: -9.81,
  TANK_MASS: 1000,
  BULLET_MASS: 1,
  FRICTION: 0.95,
  RESTITUTION: 0.3,
  COLLISION_GROUPS: {
    PLAYER: 1,
    MONSTER: 2,
    BULLET: 4,
    TERRAIN: 8,
  }
}

export const MULTISYNQ_CONFIG = {
  apiKey: import.meta.env.VITE_MULTISYNQ_API_KEY || '234567_Paste_Your_Own_API_Key_Here_7654321',
  appId: 'io.monad.tankbattle',
}
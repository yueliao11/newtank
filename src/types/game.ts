export interface Position {
  x: number
  y: number
  z: number
}

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Player {
  id: string
  viewId: string
  address?: string
  position: Position
  rotation: number
  health: number
  maxHealth: number
  score: number
  color: string
  isAlive: boolean
  lastShot: number
  kills?: number
}

export interface Monster {
  id: string
  position: Position
  rotation: number
  health: number
  maxHealth: number
  state: 'idle' | 'chasing' | 'attacking' | 'dead'
  target?: string
  aiData: {
    wanderDirection: number
    wanderTimer: number
    detectionRadius: number
    attackRange: number
    lastDirection: number
  }
}

export interface Bullet {
  id: string
  ownerId: string
  position: Position
  velocity: Vector3
  damage: number
  createdAt: number
  lifespan: number
}

export interface GameState {
  gameState: 'waiting' | 'playing' | 'finished' | 'results'
  isActive: boolean
  players: Map<string, Player>
  monsters: Map<string, Monster>
  bullets: Map<string, Bullet>
  leaderboard: LeaderboardEntry[]
  roundTimeRemaining: number
  monstersRemaining: number
}

export interface LeaderboardEntry {
  id: string
  address?: string
  score: number
  kills: number
  isAlive: boolean
}

export interface InputState {
  moveForward: boolean
  moveBackward: boolean
  moveLeft: boolean
  moveRight: boolean
  shoot: boolean
  mouseX: number
  mouseY: number
}

export interface GameConfig {
  PLAYER_SPEED: number
  PLAYER_HEALTH: number
  PLAYER_MOVE_SPEED: number
  PLAYER_ROTATION_SPEED: number
  BULLET_SPEED: number
  BULLET_DAMAGE: number
  BULLET_LIFESPAN: number
  BULLET_COOLDOWN: number
  MONSTER_SPEED: number
  MONSTER_HEALTH: number
  MONSTER_COUNT: number
  MONSTER_DAMAGE: number
  MAP_SIZE: number
  ROUND_SECONDS: number
}

export interface HUDData {
  health: number
  maxHealth: number
  score: number
  timeRemaining: number
  monstersRemaining: number
  playersOnline: number
  gameState?: string
}
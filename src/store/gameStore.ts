import { create } from 'zustand'
import { GameState, Player, Monster, Bullet, LeaderboardEntry, InputState, HUDData } from '@/types/game'

interface Explosion {
  id: string
  position: { x: number; y: number; z: number }
  size: number
  color: string
  timestamp: number
}

interface MuzzleFlash {
  id: string
  playerId: string
  position: { x: number; y: number; z: number }
  rotation: number
  timestamp: number
}

interface GameStore extends GameState {
  // 输入状态
  inputState: InputState
  setInputState: (input: Partial<InputState>) => void
  
  // 客户端预测状态
  predictedPosition: { x: number; y: number; z: number } | null
  predictedRotation: number | null
  setPredictedPosition: (position: { x: number; y: number; z: number }) => void
  setPredictedRotation: (rotation: number) => void
  clearPrediction: () => void
  
  // 小地图状态
  minimapVisible: boolean
  setMinimapVisible: (visible: boolean) => void
  
  // 玩家相关
  setPlayers: (players: Map<string, Player>) => void
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  
  // 怪物相关
  setMonsters: (monsters: Map<string, Monster>) => void
  addMonster: (monster: Monster) => void
  removeMonster: (monsterId: string) => void
  updateMonster: (monsterId: string, updates: Partial<Monster>) => void
  
  // 子弹相关
  setBullets: (bullets: Map<string, Bullet>) => void
  addBullet: (bullet: Bullet) => void
  removeBullet: (bulletId: string) => void
  
  // 爆炸效果
  explosions: Explosion[]
  addExplosion: (position: { x: number; y: number; z: number }, size?: number, color?: string) => void
  removeExplosion: (explosionId: string) => void
  
  // 开火效果
  muzzleFlashes: MuzzleFlash[]
  addMuzzleFlash: (playerId: string, position: { x: number; y: number; z: number }, rotation: number) => void
  removeMuzzleFlash: (flashId: string) => void
  
  // 游戏状态
  setGameState: (state: 'waiting' | 'playing' | 'finished' | 'results') => void
  setActive: (active: boolean) => void
  setLeaderboard: (leaderboard: LeaderboardEntry[]) => void
  setRoundTimeRemaining: (time: number) => void
  setMonstersRemaining: (count: number) => void
  
  // HUD 数据
  getHUDData: () => HUDData
  
  // 重置游戏
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  // 初始状态
  gameState: 'waiting',
  isActive: false,
  players: new Map(),
  monsters: new Map(),
  bullets: new Map(),
  explosions: [],
  muzzleFlashes: [],
  leaderboard: [],
  roundTimeRemaining: 180,
  monstersRemaining: 0,
  
  // 输入状态
  inputState: {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    shoot: false,
    mouseX: 0,
    mouseY: 0,
  },
  
  // 客户端预测状态
  predictedPosition: null,
  predictedRotation: null,
  setPredictedPosition: (position) => set({ predictedPosition: position }),
  setPredictedRotation: (rotation) => set({ predictedRotation: rotation }),
  clearPrediction: () => set({ predictedPosition: null, predictedRotation: null }),
  
  // 小地图状态
  minimapVisible: true,
  setMinimapVisible: (visible: boolean) => set({ minimapVisible: visible }),
  
  setInputState: (input) => 
    set((state) => ({
      inputState: { ...state.inputState, ...input }
    })),
  
  // 玩家管理
  setPlayers: (players) => set({ players }),
  
  addPlayer: (player) =>
    set((state) => {
      const newPlayers = new Map(state.players)
      newPlayers.set(player.id, player)
      return { players: newPlayers }
    }),
  
  removePlayer: (playerId) =>
    set((state) => {
      const newPlayers = new Map(state.players)
      newPlayers.delete(playerId)
      return { players: newPlayers }
    }),
  
  updatePlayer: (playerId, updates) =>
    set((state) => {
      const newPlayers = new Map(state.players)
      const player = newPlayers.get(playerId)
      if (player) {
        newPlayers.set(playerId, { ...player, ...updates })
      }
      return { players: newPlayers }
    }),
  
  // 怪物管理
  setMonsters: (monsters) => set({ monsters }),
  
  addMonster: (monster) =>
    set((state) => {
      const newMonsters = new Map(state.monsters)
      newMonsters.set(monster.id, monster)
      return { monsters: newMonsters }
    }),
  
  removeMonster: (monsterId) =>
    set((state) => {
      const newMonsters = new Map(state.monsters)
      newMonsters.delete(monsterId)
      return { monsters: newMonsters }
    }),
  
  updateMonster: (monsterId, updates) =>
    set((state) => {
      const newMonsters = new Map(state.monsters)
      const monster = newMonsters.get(monsterId)
      if (monster) {
        newMonsters.set(monsterId, { ...monster, ...updates })
      }
      return { monsters: newMonsters }
    }),
  
  // 子弹管理
  setBullets: (bullets) => set({ bullets }),
  
  addBullet: (bullet) =>
    set((state) => {
      const newBullets = new Map(state.bullets)
      newBullets.set(bullet.id, bullet)
      return { bullets: newBullets }
    }),
  
  removeBullet: (bulletId) =>
    set((state) => {
      const newBullets = new Map(state.bullets)
      newBullets.delete(bulletId)
      return { bullets: newBullets }
    }),
  
  // 爆炸效果管理
  addExplosion: (position, size = 1, color = '#ff4400') =>
    set((state) => {
      const explosion: Explosion = {
        id: `explosion_${Date.now()}_${Math.random()}`,
        position,
        size,
        color,
        timestamp: Date.now()
      }
      return { explosions: [...state.explosions, explosion] }
    }),
  
  removeExplosion: (explosionId) =>
    set((state) => ({
      explosions: state.explosions.filter(e => e.id !== explosionId)
    })),
  
  // 开火效果管理
  addMuzzleFlash: (playerId, position, rotation) =>
    set((state) => {
      const muzzleFlash: MuzzleFlash = {
        id: `muzzle_${Date.now()}_${Math.random()}`,
        playerId,
        position,
        rotation,
        timestamp: Date.now()
      }
      return { muzzleFlashes: [...state.muzzleFlashes, muzzleFlash] }
    }),
  
  removeMuzzleFlash: (flashId) =>
    set((state) => ({
      muzzleFlashes: state.muzzleFlashes.filter(f => f.id !== flashId)
    })),
  
  // 游戏状态管理
  setGameState: (gameState) => set({ gameState }),
  setActive: (isActive) => set({ isActive }),
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  setRoundTimeRemaining: (roundTimeRemaining) => set({ roundTimeRemaining }),
  setMonstersRemaining: (monstersRemaining) => set({ monstersRemaining }),
  
  // HUD 数据
  getHUDData: () => {
    const state = get()
    return {
      health: 100, // 将在实际游戏中从当前玩家获取
      maxHealth: 100,
      score: 0, // 将在实际游戏中从当前玩家获取
      timeRemaining: state.roundTimeRemaining,
      monstersRemaining: state.monstersRemaining,
      playersOnline: state.players.size,
      gameState: state.gameState,
    }
  },
  
  // 重置游戏
  resetGame: () =>
    set({
      gameState: 'waiting',
      isActive: false,
      players: new Map(),
      monsters: new Map(),
      bullets: new Map(),
      leaderboard: [],
      roundTimeRemaining: 180,
      monstersRemaining: 0,
    }),
}))
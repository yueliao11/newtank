import * as Multisynq from '@multisynq/client'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { PlayerModel } from './PlayerModel'
import { MonsterModel } from './MonsterModel'
import { BulletModel } from './BulletModel'

export class GameModel extends Multisynq.Model {
  players: Map<string, PlayerModel> = new Map()
  monsters: Map<string, MonsterModel> = new Map()
  bullets: Map<string, BulletModel> = new Map()
  gameState: 'waiting' | 'playing' | 'finished' | 'results' = 'waiting'
  roundStartTime: number = 0
  roundTimeRemaining: number = GAME_CONFIG.ROUND_SECONDS

  init() {
    console.log(`${this.now()}: Game initialized`)
    
    // 订阅玩家加入和离开事件
    this.subscribe(this.sessionId, 'view-join', this.onPlayerJoin)
    this.subscribe(this.sessionId, 'view-exit', this.onPlayerExit)
    
    // 开始游戏循环
    this.gameLoop()
    
    // 生成初始怪物
    this.spawnMonsters()
    
    // 开始倒计时
    this.startRound()
  }

  onPlayerJoin(data: any) {
    const { viewId, viewData } = data
    console.log(`${this.now()}: Player ${viewId} joined`)
    
    // 创建新玩家
    const player = PlayerModel.create({
      viewId,
      address: viewData?.address || '',
      color: viewData?.color || this.generateRandomColor(),
    })
    
    this.players.set(viewId, player)
    
    // 通知所有客户端有新玩家加入
    this.publish('game', 'player-joined', { 
      playerId: player.id, 
      viewId,
      player: this.serializePlayer(player)
    })
    
    // 如果有足够玩家且游戏未开始，开始游戏
    if (this.players.size >= 1 && this.gameState === 'waiting') {
      this.startGame()
    }
  }

  onPlayerExit(data: any) {
    const { viewId } = data
    console.log(`${this.now()}: Player ${viewId} left`)
    
    const player = this.players.get(viewId)
    if (player) {
      this.players.delete(viewId)
      player.destroy()
      
      // 通知所有客户端玩家离开
      this.publish('game', 'player-left', { viewId })
    }
  }

  startGame() {
    this.gameState = 'playing'
    this.roundStartTime = this.now()
    this.roundTimeRemaining = GAME_CONFIG.ROUND_SECONDS
    
    console.log(`${this.now()}: Game started`)
    this.publish('game', 'game-started', { gameState: this.gameState })
  }

  startRound() {
    this.future(1000).updateTimer()
  }

  updateTimer() {
    if (this.gameState === 'playing') {
      const elapsed = Math.floor((this.now() - this.roundStartTime) / 1000)
      this.roundTimeRemaining = Math.max(0, GAME_CONFIG.ROUND_SECONDS - elapsed)
      
      if (this.roundTimeRemaining <= 0) {
        this.endGame()
        return
      }
    }
    
    // 每秒更新一次计时器
    this.future(1000).updateTimer()
  }

  endGame() {
    this.gameState = 'finished'
    console.log(`${this.now()}: Game ended`)
    
    // 计算最终排行榜
    const leaderboard = Array.from(this.players.values())
      .map(player => ({
        id: player.id,
        viewId: player.viewId,
        address: player.address,
        score: player.score,
        kills: player.kills,
        isAlive: player.isAlive
      }))
      .sort((a, b) => b.score - a.score)
    
    this.publish('game', 'game-ended', { 
      gameState: this.gameState,
      leaderboard
    })
    
    // 5秒后重新开始
    this.future(5000).restartGame()
  }

  restartGame() {
    // 重置所有玩家
    for (const player of this.players.values()) {
      player.reset()
    }
    
    // 清除所有子弹
    for (const bullet of this.bullets.values()) {
      bullet.destroy()
    }
    this.bullets.clear()
    
    // 重新生成怪物
    for (const monster of this.monsters.values()) {
      monster.destroy()
    }
    this.monsters.clear()
    this.spawnMonsters()
    
    // 重新开始游戏
    this.gameState = 'waiting'
    this.publish('game', 'game-restarted', { gameState: this.gameState })
    
    if (this.players.size >= 1) {
      this.future(3000).startGame() // 3秒后开始新回合
    }
  }

  spawnMonsters() {
    for (let i = 0; i < GAME_CONFIG.MONSTER_COUNT; i++) {
      const monster = MonsterModel.create({
        position: this.getRandomSpawnPosition(),
      })
      this.monsters.set(monster.id, monster)
    }
    
    this.publish('game', 'monsters-spawned', {
      monsters: Array.from(this.monsters.values()).map(m => this.serializeMonster(m))
    })
  }

  gameLoop() {
    // 更新所有游戏对象
    if (this.gameState === 'playing') {
      // 更新玩家
      for (const player of this.players.values()) {
        player.update()
      }
      
      // 更新怪物
      for (const monster of this.monsters.values()) {
        monster.update(this.players)
      }
      
      // 更新子弹
      for (const bullet of this.bullets.values()) {
        bullet.update()
      }
      
      // 检查碰撞
      this.checkCollisions()
      
      // 发布游戏状态更新
      this.publishGameState()
    }
    
    // 50ms后继续游戏循环 (20 FPS)
    this.future(50).gameLoop()
  }

  checkCollisions() {
    // 子弹与玩家碰撞
    for (const bullet of this.bullets.values()) {
      for (const player of this.players.values()) {
        if (bullet.ownerId !== player.viewId && 
            player.isAlive && 
            this.checkCollision(bullet.position, player.position, 2)) {
          
          // 发布爆炸效果事件
          this.publish('game', 'explosion', {
            position: bullet.position,
            size: 1.5,
            color: '#ff4400'
          })
          
          player.takeDamage(bullet.damage, bullet.ownerId)
          bullet.destroy()
          break
        }
      }
    }
    
    // 子弹与怪物碰撞
    for (const bullet of this.bullets.values()) {
      for (const monster of this.monsters.values()) {
        if (monster.health > 0 && 
            this.checkCollision(bullet.position, monster.position, 2)) {
          
          // 发布爆炸效果事件
          this.publish('game', 'explosion', {
            position: bullet.position,
            size: 1.2,
            color: '#ff6600'
          })
          
          monster.takeDamage(bullet.damage, bullet.ownerId)
          bullet.destroy()
          break
        }
      }
    }
    
    // 玩家与怪物碰撞
    for (const player of this.players.values()) {
      if (!player.isAlive) continue
      
      for (const monster of this.monsters.values()) {
        if (monster.health > 0 && 
            this.checkCollision(player.position, monster.position, 3)) {
          
          player.takeDamage(GAME_CONFIG.MONSTER_DAMAGE, 'monster')
          break
        }
      }
    }
  }

  checkCollision(pos1: any, pos2: any, distance: number): boolean {
    const dx = pos1.x - pos2.x
    const dz = pos1.z - pos2.z
    return Math.sqrt(dx * dx + dz * dz) < distance
  }

  publishGameState() {
    const gameData = {
      gameState: this.gameState,
      roundTimeRemaining: this.roundTimeRemaining,
      playersCount: this.players.size,
      monstersCount: Array.from(this.monsters.values()).filter(m => m.health > 0).length,
      players: Array.from(this.players.values()).map(p => this.serializePlayer(p)),
      monsters: Array.from(this.monsters.values()).map(m => this.serializeMonster(m)),
      bullets: Array.from(this.bullets.values()).map(b => this.serializeBullet(b)),
    }
    
    this.publish('game', 'state-update', gameData)
  }

  getRandomSpawnPosition() {
    const mapSize = GAME_CONFIG.MAP_SIZE
    return {
      x: (Math.random() - 0.5) * mapSize * 0.8,
      y: 0.5,
      z: (Math.random() - 0.5) * mapSize * 0.8,
    }
  }

  generateRandomColor(): string {
    return `hsl(${Math.random() * 360}, 70%, 60%)`
  }

  serializePlayer(player: PlayerModel) {
    return {
      id: player.id,
      viewId: player.viewId,
      address: player.address,
      position: player.position,
      rotation: player.rotation,
      health: player.health,
      maxHealth: player.maxHealth,
      score: player.score,
      color: player.color,
      isAlive: player.isAlive,
      kills: player.kills,
    }
  }

  serializeMonster(monster: MonsterModel) {
    return {
      id: monster.id,
      position: monster.position,
      rotation: monster.rotation,
      health: monster.health,
      maxHealth: monster.maxHealth,
      state: monster.state,
    }
  }

  serializeBullet(bullet: BulletModel) {
    return {
      id: bullet.id,
      ownerId: bullet.ownerId,
      position: bullet.position,
      velocity: bullet.velocity,
      damage: bullet.damage,
    }
  }
}

GameModel.register('GameModel')
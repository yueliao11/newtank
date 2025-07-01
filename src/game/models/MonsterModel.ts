import * as Multisynq from '@multisynq/client'
import { GAME_CONFIG } from '@/lib/gameConfig'

export class MonsterModel extends Multisynq.Model {
  position = { x: 0, y: 0.5, z: 0 }
  rotation: number = 0
  health: number = GAME_CONFIG.MONSTER_HEALTH
  maxHealth: number = GAME_CONFIG.MONSTER_HEALTH
  state: 'idle' | 'chasing' | 'attacking' | 'dead' = 'idle'
  target: string = ''
  
  aiData = {
    wanderDirection: 0,
    wanderTimer: 0,
    detectionRadius: 12,
    attackRange: 3,
    lastDirection: 0,
  }

  init(options: { position?: any }) {
    console.log(`${this.now()}: Monster ${this.id} created`)
    
    if (options.position) {
      this.position = { ...options.position }
    }
    
    this.rotation = Math.random() * Math.PI * 2
    this.aiData.wanderDirection = Math.random() * Math.PI * 2
    this.aiData.wanderTimer = Math.random() * 3000 + 1000 // 1-4秒
  }

  update(players: Map<string, any>) {
    if (this.health <= 0) {
      if (this.state !== 'dead') {
        this.state = 'dead'
        // 3秒后销毁
        this.future(3000).destroy()
      }
      return
    }
    
    // AI 状态机
    switch (this.state) {
      case 'idle':
        this.updateIdle(players)
        break
        
      case 'chasing':
        this.updateChasing(players)
        break
        
      case 'attacking':
        this.updateAttacking(players)
        break
    }
    
    // 限制在地图范围内
    const mapSize = GAME_CONFIG.MAP_SIZE / 2
    this.position.x = Math.max(-mapSize, Math.min(mapSize, this.position.x))
    this.position.z = Math.max(-mapSize, Math.min(mapSize, this.position.z))
  }

  updateIdle(players: Map<string, any>) {
    // 寻找附近的玩家
    const nearestPlayer = this.findNearestPlayer(players)
    
    if (nearestPlayer && nearestPlayer.distance < this.aiData.detectionRadius) {
      this.target = nearestPlayer.player.viewId
      this.state = 'chasing'
      return
    }
    
    // 随机游荡
    this.wander()
  }

  updateChasing(players: Map<string, any>) {
    const targetPlayer = players.get(this.target)
    
    if (!targetPlayer || !targetPlayer.isAlive) {
      this.target = ''
      this.state = 'idle'
      return
    }
    
    const distance = this.distanceTo(targetPlayer.position)
    
    if (distance > this.aiData.detectionRadius * 1.5) {
      // 目标太远，放弃追击
      this.target = ''
      this.state = 'idle'
      return
    }
    
    if (distance < this.aiData.attackRange) {
      this.state = 'attacking'
      return
    }
    
    // 朝目标移动
    this.moveTowards(targetPlayer.position)
  }

  updateAttacking(players: Map<string, any>) {
    const targetPlayer = players.get(this.target)
    
    if (!targetPlayer || !targetPlayer.isAlive) {
      this.target = ''
      this.state = 'idle'
      return
    }
    
    const distance = this.distanceTo(targetPlayer.position)
    
    if (distance > this.aiData.attackRange * 1.2) {
      this.state = 'chasing'
      return
    }
    
    // 攻击玩家（伤害在碰撞检测中处理）
    this.lookAt(targetPlayer.position)
  }

  wander() {
    const now = this.now()
    
    // 检查是否需要改变方向
    if (now > this.aiData.wanderTimer) {
      this.aiData.wanderDirection = Math.random() * Math.PI * 2
      this.aiData.wanderTimer = now + Math.random() * 3000 + 1000
    }
    
    // 向游荡方向移动
    const speed = GAME_CONFIG.MONSTER_SPEED / 60 // 转换为每帧速度
    this.position.x += Math.sin(this.aiData.wanderDirection) * speed
    this.position.z += Math.cos(this.aiData.wanderDirection) * speed
    
    this.rotation = this.aiData.wanderDirection
  }

  moveTowards(targetPosition: any) {
    const dx = targetPosition.x - this.position.x
    const dz = targetPosition.z - this.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    
    if (distance > 0.1) {
      const speed = GAME_CONFIG.MONSTER_SPEED * 1.5 / 60 // 追击时速度更快
      this.position.x += (dx / distance) * speed
      this.position.z += (dz / distance) * speed
      
      this.rotation = Math.atan2(dx, dz)
    }
  }

  lookAt(targetPosition: any) {
    const dx = targetPosition.x - this.position.x
    const dz = targetPosition.z - this.position.z
    this.rotation = Math.atan2(dx, dz)
  }

  findNearestPlayer(players: Map<string, any>) {
    let nearest = null
    let minDistance = Infinity
    
    for (const player of players.values()) {
      if (!player.isAlive) continue
      
      const distance = this.distanceTo(player.position)
      if (distance < minDistance) {
        minDistance = distance
        nearest = { player, distance }
      }
    }
    
    return nearest
  }

  distanceTo(position: any): number {
    const dx = this.position.x - position.x
    const dz = this.position.z - position.z
    return Math.sqrt(dx * dx + dz * dz)
  }

  takeDamage(damage: number, attackerId: string) {
    if (this.health <= 0) return
    
    this.health -= damage
    
    if (this.health <= 0) {
      this.health = 0
      
      // 给攻击者加分
      const game = this.wellKnownModel('modelRoot') as any
      if (game && game.players && attackerId !== 'monster') {
        const attacker = game.players.get(attackerId)
        if (attacker) {
          attacker.score += 1
        }
      }
      
      console.log(`${this.now()}: Monster ${this.id} killed by ${attackerId}`)
      
      // 生成新怪物
      this.future(5000).respawn()
    }
  }

  respawn() {
    // 在游戏中生成新怪物来替代这个
    const game = this.wellKnownModel('modelRoot') as any
    if (game && game.monsters && game.monsters.size < GAME_CONFIG.MONSTER_COUNT) {
      const newMonster = MonsterModel.create({
        position: this.getRandomSpawnPosition(),
      })
      game.monsters.set(newMonster.id, newMonster)
    }
    
    this.destroy()
  }

  getRandomSpawnPosition() {
    const mapSize = GAME_CONFIG.MAP_SIZE
    return {
      x: (Math.random() - 0.5) * mapSize * 0.8,
      y: 0.5,
      z: (Math.random() - 0.5) * mapSize * 0.8,
    }
  }

  destroy() {
    const game = this.wellKnownModel('modelRoot') as any
    if (game && game.monsters) {
      game.monsters.delete(this.id)
    }
    super.destroy()
  }
}

MonsterModel.register('MonsterModel')
import * as Multisynq from '@multisynq/client'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { BulletModel } from './BulletModel'

export class PlayerModel extends Multisynq.Model {
  viewId: string = ''
  address: string = ''
  position = { x: 0, y: 0.5, z: 0 }
  rotation: number = 0
  health: number = GAME_CONFIG.PLAYER_HEALTH
  maxHealth: number = GAME_CONFIG.PLAYER_HEALTH
  score: number = 0
  kills: number = 0
  color: string = '#00ff00'
  isAlive: boolean = true
  lastShot: number = 0
  
  // 控制状态
  controls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    shoot: false,
  }

  init(options: { viewId: string; address?: string; color?: string }) {
    console.log(`${this.now()}: Player ${options.viewId} created`)
    
    this.viewId = options.viewId
    this.address = options.address || ''
    this.color = options.color || this.generateRandomColor()
    
    // 随机生成初始位置
    this.position = this.getRandomSpawnPosition()
    this.rotation = Math.random() * Math.PI * 2
    
    // 订阅控制输入
    this.subscribe(this.viewId, 'input', this.onInput)
  }

  onInput(inputData: any) {
    const { type, data } = inputData
    
    switch (type) {
      case 'move':
        this.controls.moveForward = data.forward
        this.controls.moveBackward = data.backward
        this.controls.moveLeft = data.left
        this.controls.moveRight = data.right
        break
        
      case 'rotate':
        this.rotation = data.rotation
        break
        
      case 'shoot':
        if (data.shoot) {
          this.shoot()
        }
        break
    }
  }

  update() {
    if (!this.isAlive) return
    
    // 移动逻辑
    if (this.controls.moveForward || this.controls.moveBackward || 
        this.controls.moveLeft || this.controls.moveRight) {
      
      const speed = GAME_CONFIG.PLAYER_MOVE_SPEED / 60 // 转换为每帧速度
      let moveX = 0
      let moveZ = 0
      
      if (this.controls.moveForward) {
        moveX += Math.sin(this.rotation) * speed
        moveZ += Math.cos(this.rotation) * speed
      }
      if (this.controls.moveBackward) {
        moveX -= Math.sin(this.rotation) * speed * 0.5
        moveZ -= Math.cos(this.rotation) * speed * 0.5
      }
      if (this.controls.moveLeft) {
        moveX += Math.sin(this.rotation - Math.PI / 2) * speed * 0.7
        moveZ += Math.cos(this.rotation - Math.PI / 2) * speed * 0.7
      }
      if (this.controls.moveRight) {
        moveX += Math.sin(this.rotation + Math.PI / 2) * speed * 0.7
        moveZ += Math.cos(this.rotation + Math.PI / 2) * speed * 0.7
      }
      
      // 更新位置，限制在地图范围内
      const mapSize = GAME_CONFIG.MAP_SIZE / 2
      this.position.x = Math.max(-mapSize, Math.min(mapSize, this.position.x + moveX))
      this.position.z = Math.max(-mapSize, Math.min(mapSize, this.position.z + moveZ))
    }
  }

  shoot() {
    const now = this.now()
    if (now - this.lastShot < GAME_CONFIG.BULLET_COOLDOWN) {
      return // 冷却时间未到
    }
    
    this.lastShot = now
    
    // 创建子弹
    const bulletPosition = {
      x: this.position.x + Math.sin(this.rotation) * 2,
      y: this.position.y,
      z: this.position.z + Math.cos(this.rotation) * 2,
    }
    
    const bulletVelocity = {
      x: Math.sin(this.rotation) * GAME_CONFIG.BULLET_SPEED,
      y: 0,
      z: Math.cos(this.rotation) * GAME_CONFIG.BULLET_SPEED,
    }
    
    const bullet = BulletModel.create({
      ownerId: this.viewId,
      position: bulletPosition,
      velocity: bulletVelocity,
      damage: GAME_CONFIG.BULLET_DAMAGE,
    })
    
    // 添加到游戏的子弹列表
    const game = this.wellKnownModel('modelRoot') as any
    if (game && game.bullets) {
      game.bullets.set(bullet.id, bullet)
    }
  }

  takeDamage(damage: number, attackerId: string) {
    if (!this.isAlive) return
    
    this.health -= damage
    
    if (this.health <= 0) {
      this.health = 0
      this.isAlive = false
      
      // 给攻击者加分
      if (attackerId !== 'monster' && attackerId !== this.viewId) {
        const game = this.wellKnownModel('modelRoot') as any
        if (game && game.players) {
          const attacker = game.players.get(attackerId)
          if (attacker) {
            attacker.score += 5
            attacker.kills += 1
          }
        }
      }
      
      console.log(`${this.now()}: Player ${this.viewId} killed by ${attackerId}`)
      
      // 3秒后重生
      this.future(3000).respawn()
    }
  }

  respawn() {
    this.health = this.maxHealth
    this.isAlive = true
    this.position = this.getRandomSpawnPosition()
    this.rotation = Math.random() * Math.PI * 2
    
    console.log(`${this.now()}: Player ${this.viewId} respawned`)
  }

  reset() {
    this.health = this.maxHealth
    this.isAlive = true
    this.score = 0
    this.kills = 0
    this.position = this.getRandomSpawnPosition()
    this.rotation = Math.random() * Math.PI * 2
    this.lastShot = 0
    
    // 重置控制状态
    this.controls = {
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      shoot: false,
    }
  }

  getRandomSpawnPosition() {
    const mapSize = GAME_CONFIG.MAP_SIZE
    return {
      x: (Math.random() - 0.5) * mapSize * 0.6,
      y: 0.5,
      z: (Math.random() - 0.5) * mapSize * 0.6,
    }
  }

  generateRandomColor(): string {
    const colors = [
      '#ff4444', '#44ff44', '#4444ff', '#ffff44', 
      '#ff44ff', '#44ffff', '#ff8844', '#8844ff'
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }
}

PlayerModel.register('PlayerModel')
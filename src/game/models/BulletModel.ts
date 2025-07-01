import * as Multisynq from '@multisynq/client'
import { GAME_CONFIG } from '@/lib/gameConfig'

export class BulletModel extends Multisynq.Model {
  ownerId: string = ''
  position = { x: 0, y: 0.5, z: 0 }
  velocity = { x: 0, y: 0, z: 0 }
  damage: number = GAME_CONFIG.BULLET_DAMAGE
  createdAt: number = 0
  lifespan: number = GAME_CONFIG.BULLET_LIFESPAN

  init(options: {
    ownerId: string
    position: any
    velocity: any
    damage: number
  }) {
    console.log(`${this.now()}: Bullet ${this.id} created by ${options.ownerId}`)
    
    this.ownerId = options.ownerId
    this.position = { ...options.position }
    this.velocity = { ...options.velocity }
    this.damage = options.damage
    this.createdAt = this.now()
  }

  update() {
    // 移动子弹
    const deltaTime = 1 / 60 // 假设60FPS
    this.position.x += this.velocity.x * deltaTime
    this.position.y += this.velocity.y * deltaTime
    this.position.z += this.velocity.z * deltaTime
    
    // 检查生命周期
    const age = this.now() - this.createdAt
    if (age > this.lifespan) {
      this.destroy()
      return
    }
    
    // 检查是否超出地图边界
    const mapSize = GAME_CONFIG.MAP_SIZE / 2
    if (Math.abs(this.position.x) > mapSize || 
        Math.abs(this.position.z) > mapSize ||
        this.position.y < -5 || this.position.y > 20) {
      this.destroy()
      return
    }
  }

  destroy() {
    // 从游戏的子弹列表中移除
    const game = this.wellKnownModel('modelRoot') as any
    if (game && game.bullets) {
      game.bullets.delete(this.id)
    }
    
    console.log(`${this.now()}: Bullet ${this.id} destroyed`)
    super.destroy()
  }
}

BulletModel.register('BulletModel')
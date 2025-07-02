import { Position, Obstacle } from '@/types/game'

// 坦克的碰撞半径
export const TANK_COLLISION_RADIUS = 1.5

// 生成固定位置的障碍物（确保所有客户端都有相同的障碍物）
export const generateObstacles = (): Obstacle[] => {
  const obstacles: Obstacle[] = []
  
  // 使用固定的种子生成确定性的障碍物位置
  const seedRandom = (seed: number) => {
    let x = Math.sin(seed) * 10000
    return x - Math.floor(x)
  }
  
  // 生成树木
  for (let i = 0; i < 20; i++) {
    const x = (seedRandom(i * 2) - 0.5) * 180
    const z = (seedRandom(i * 2 + 1) - 0.5) * 180
    
    // 确保障碍物不在出生点附近
    if (Math.abs(x) > 10 || Math.abs(z) > 10) {
      obstacles.push({
        id: `tree_${i}`,
        type: 'tree',
        position: { x, y: 0, z },
        radius: 1.5,
        height: 2 + seedRandom(i * 3) * 3
      })
    }
  }
  
  // 生成石头
  for (let i = 0; i < 15; i++) {
    const x = (seedRandom(i * 4 + 100) - 0.5) * 190
    const z = (seedRandom(i * 4 + 101) - 0.5) * 190
    
    // 确保障碍物不在出生点附近
    if (Math.abs(x) > 8 || Math.abs(z) > 8) {
      obstacles.push({
        id: `rock_${i}`,
        type: 'rock',
        position: { x, y: 0, z },
        radius: 0.5 + seedRandom(i * 4 + 102) * 1.5
      })
    }
  }
  
  return obstacles
}

// 检查两个圆形物体是否碰撞
export const checkCircleCollision = (
  pos1: Position,
  radius1: number,
  pos2: Position,
  radius2: number
): boolean => {
  const dx = pos1.x - pos2.x
  const dz = pos1.z - pos2.z
  const distance = Math.sqrt(dx * dx + dz * dz)
  return distance < (radius1 + radius2)
}

// 检查坦克与所有障碍物的碰撞
export const checkTankObstacleCollision = (
  tankPosition: Position,
  obstacles: Obstacle[]
): Obstacle | null => {
  for (const obstacle of obstacles) {
    if (checkCircleCollision(tankPosition, TANK_COLLISION_RADIUS, obstacle.position, obstacle.radius)) {
      return obstacle
    }
  }
  return null
}

// 计算推回向量，当发生碰撞时将坦克推回到安全位置
export const calculatePushbackVector = (
  tankPosition: Position,
  obstacle: Obstacle
): { x: number, z: number } => {
  const dx = tankPosition.x - obstacle.position.x
  const dz = tankPosition.z - obstacle.position.z
  const distance = Math.sqrt(dx * dx + dz * dz)
  
  if (distance === 0) {
    // 如果完全重叠，随机选择一个方向
    return { x: 1, z: 0 }
  }
  
  // 归一化方向向量
  const normalX = dx / distance
  const normalZ = dz / distance
  
  // 计算需要推回的距离
  const overlap = (TANK_COLLISION_RADIUS + obstacle.radius) - distance
  const pushbackDistance = overlap + 0.1 // 额外的安全距离
  
  return {
    x: normalX * pushbackDistance,
    z: normalZ * pushbackDistance
  }
}

// 验证位置是否与障碍物碰撞
export const isPositionValid = (position: Position, obstacles: Obstacle[]): boolean => {
  return !checkTankObstacleCollision(position, obstacles)
}

// 找到最近的有效位置 - 优化为最大化响应性
export const findNearestValidPosition = (
  targetPosition: Position,
  currentPosition: Position,
  obstacles: Obstacle[]
): Position => {
  // 如果目标位置有效，直接返回 - 优先保证无碰撞时的响应性
  if (isPositionValid(targetPosition, obstacles)) {
    return targetPosition
  }
  
  // 找到碰撞的障碍物
  const collidingObstacle = checkTankObstacleCollision(targetPosition, obstacles)
  if (!collidingObstacle) {
    return targetPosition
  }
  
  // 计算从当前位置到目标位置的移动向量
  const moveX = targetPosition.x - currentPosition.x
  const moveZ = targetPosition.z - currentPosition.z
  const moveDistance = Math.sqrt(moveX * moveX + moveZ * moveZ)
  
  // 提高滑动阈值，让更多小移动可以滑动，保持流畅性
  if (moveDistance < 0.2) {
    // 尝试多个滑动方向，优先保持移动流畅性
    const slideFactors = [0.8, 0.6, 0.4, 0.2] // 从最大滑动到最小滑动
    
    for (const factor of slideFactors) {
      const slidePosition = {
        x: currentPosition.x + moveX * factor,
        y: targetPosition.y,
        z: currentPosition.z + moveZ * factor
      }
      
      if (isPositionValid(slidePosition, obstacles)) {
        return slidePosition
      }
    }
    
    // 尝试垂直滑动（沿障碍物边缘）
    const perpX = -moveZ // 垂直向量
    const perpZ = moveX
    const perpLength = Math.sqrt(perpX * perpX + perpZ * perpZ)
    
    if (perpLength > 0) {
      const normalizedPerpX = perpX / perpLength
      const normalizedPerpZ = perpZ / perpLength
      
      // 尝试两个垂直方向的滑动
      for (const direction of [1, -1]) {
        const slidePosition = {
          x: currentPosition.x + normalizedPerpX * direction * moveDistance * 0.5,
          y: targetPosition.y,
          z: currentPosition.z + normalizedPerpZ * direction * moveDistance * 0.5
        }
        
        if (isPositionValid(slidePosition, obstacles)) {
          return slidePosition
        }
      }
    }
  }
  
  // 如果滑动失败，计算推回位置，但使用更小的安全距离以保持更接近障碍物
  const dx = targetPosition.x - collidingObstacle.position.x
  const dz = targetPosition.z - collidingObstacle.position.z
  const distance = Math.sqrt(dx * dx + dz * dz)
  
  if (distance === 0) {
    // 完全重叠时，使用移动方向作为推回方向
    const pushDirection = moveDistance > 0 ? { x: moveX / moveDistance, z: moveZ / moveDistance } : { x: 1, z: 0 }
    return {
      x: collidingObstacle.position.x + pushDirection.x * (collidingObstacle.radius + TANK_COLLISION_RADIUS + 0.02),
      y: targetPosition.y,
      z: collidingObstacle.position.z + pushDirection.z * (collidingObstacle.radius + TANK_COLLISION_RADIUS + 0.02)
    }
  }
  
  // 计算最小安全距离的推回位置
  const normalX = dx / distance
  const normalZ = dz / distance
  const safeDistance = collidingObstacle.radius + TANK_COLLISION_RADIUS + 0.02 // 减小安全距离
  
  return {
    x: collidingObstacle.position.x + normalX * safeDistance,
    y: targetPosition.y,
    z: collidingObstacle.position.z + normalZ * safeDistance
  }
}
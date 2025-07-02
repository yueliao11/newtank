import React, { useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useMultiSynq } from './MultiSynqProvider'
import { GAME_CONFIG } from '@/lib/gameConfig'
import { generateObstacles, findNearestValidPosition } from '@/lib/collisionUtils'

// 客户端预测控制器
export const ClientPrediction: React.FC = () => {
  const { inputState, obstacles, setPredictedPosition, setPredictedRotation, clearPrediction } = useGameStore()
  const { myViewId, isConnected } = useMultiSynq()
  
  // 客户端物理状态
  const localState = useRef({
    position: { x: 0, y: 0.5, z: 0 },
    rotation: 0,
    velocity: { x: 0, z: 0 },
    lastUpdate: Date.now(),
    serverPosition: { x: 0, y: 0.5, z: 0 },
    serverRotation: 0,
    reconciled: false
  })
  
  // 物理常数（与服务器保持一致）
  const physics = {
    acceleration: 0.8,
    friction: 0.85,
    maxSpeed: GAME_CONFIG.PLAYER_MOVE_SPEED / 20,
    turnSpeed: 0.05
  }
  
  // 本地物理计算
  const updateLocalPhysics = useCallback((deltaTime: number) => {
    if (!isConnected) return
    
    const dt = deltaTime / 1000 // 转换为秒
    const state = localState.current
    
    // 检查是否有输入变化 - 降低速度阈值，提高响应性
    const hasInput = inputState.moveForward || inputState.moveBackward || inputState.moveLeft || inputState.moveRight
    if (!hasInput && Math.abs(state.velocity.x) < 0.001 && Math.abs(state.velocity.z) < 0.001) {
      return // 没有输入且速度很小时跳过更新
    }
    
    // 计算加速度
    let accelX = 0
    let accelZ = 0
    
    if (inputState.moveForward) {
      accelX += Math.sin(state.rotation) * physics.acceleration
      accelZ += Math.cos(state.rotation) * physics.acceleration
    }
    if (inputState.moveBackward) {
      accelX -= Math.sin(state.rotation) * physics.acceleration * 0.6
      accelZ -= Math.cos(state.rotation) * physics.acceleration * 0.6
    }
    if (inputState.moveLeft) {
      accelX += Math.sin(state.rotation - Math.PI / 2) * physics.acceleration * 0.8
      accelZ += Math.cos(state.rotation - Math.PI / 2) * physics.acceleration * 0.8
    }
    if (inputState.moveRight) {
      accelX += Math.sin(state.rotation + Math.PI / 2) * physics.acceleration * 0.8
      accelZ += Math.cos(state.rotation + Math.PI / 2) * physics.acceleration * 0.8
    }
    
    // 更新速度
    state.velocity.x += accelX * dt * 60 // 归一化到60fps
    state.velocity.z += accelZ * dt * 60
    
    // 应用摩擦力
    state.velocity.x *= Math.pow(physics.friction, dt * 60)
    state.velocity.z *= Math.pow(physics.friction, dt * 60)
    
    // 限制最大速度
    const currentSpeed = Math.sqrt(state.velocity.x * state.velocity.x + state.velocity.z * state.velocity.z)
    if (currentSpeed > physics.maxSpeed) {
      state.velocity.x = (state.velocity.x / currentSpeed) * physics.maxSpeed
      state.velocity.z = (state.velocity.z / currentSpeed) * physics.maxSpeed
    }
    
    // 更新位置（先计算新位置）
    const mapSize = GAME_CONFIG.MAP_SIZE / 2
    let newX = Math.max(-mapSize, Math.min(mapSize, state.position.x + state.velocity.x * dt * 60))
    let newZ = Math.max(-mapSize, Math.min(mapSize, state.position.z + state.velocity.z * dt * 60))
    
    // 检查新位置是否与障碍物碰撞
    const newPosition = { x: newX, y: state.position.y, z: newZ }
    const validPosition = findNearestValidPosition(newPosition, state.position, obstacles)
    
    // 只在位置实际改变时才更新
    if (Math.abs(validPosition.x - state.position.x) > 0.0001 || Math.abs(validPosition.z - state.position.z) > 0.0001) {
      state.position.x = validPosition.x
      state.position.z = validPosition.z
      
      // 如果发生碰撞，更柔和地减少速度，保持流畅性
      if (validPosition.x !== newX || validPosition.z !== newZ) {
        // 减少速度损失，让碰撞时仍能保持一定的移动能力
        state.velocity.x *= 0.6
        state.velocity.z *= 0.6
      }
    }
    
  }, [inputState, isConnected])
  
  // 处理鼠标旋转的本地预测
  const updateLocalRotation = useCallback(() => {
    if (!isConnected) return
    
    // 计算鼠标角度
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const deltaX = inputState.mouseX - centerX
    const deltaY = inputState.mouseY - centerY
    
    if (deltaX !== 0 || deltaY !== 0) {
      const targetRotation = Math.atan2(deltaX, deltaY)
      const state = localState.current
      
      // 只在旋转角度有明显变化时才更新
      if (Math.abs(targetRotation - state.rotation) > 0.01) {
        state.rotation = targetRotation
      }
    }
  }, [inputState.mouseX, inputState.mouseY, isConnected])
  
  // 服务器状态校正
  const reconcileWithServer = useCallback((serverPosition: any, serverRotation: number) => {
    const state = localState.current
    const threshold = 1.5 // 进一步增大差异阈值，减少不必要的校正
    
    // 检查位置差异
    const positionDiff = Math.sqrt(
      Math.pow(serverPosition.x - state.position.x, 2) +
      Math.pow(serverPosition.z - state.position.z, 2)
    )
    
    // 如果差异太大，进行校正
    if (positionDiff > threshold) {
      // 非常平滑的校正，避免打断用户体验
      const correctionFactor = 0.05
      state.position.x += (serverPosition.x - state.position.x) * correctionFactor
      state.position.z += (serverPosition.z - state.position.z) * correctionFactor
      setPredictedPosition({ ...state.position })
    }
    
    // 旋转校正 - 进一步增大阈值，减少对用户操作的干扰
    const rotationDiff = Math.abs(serverRotation - state.rotation)
    if (rotationDiff > 0.3) {
      state.rotation += (serverRotation - state.rotation) * 0.05
      setPredictedRotation(state.rotation)
    }
    
    // 更新服务器状态引用
    state.serverPosition = { ...serverPosition }
    state.serverRotation = serverRotation
    state.reconciled = true
  }, [setPredictedPosition, setPredictedRotation])
  
  // 主要的更新循环
  useEffect(() => {
    let animationId: number
    let lastTime = Date.now()
    let lastStateUpdate = 0
    
    const update = () => {
      const now = Date.now()
      const deltaTime = now - lastTime
      
      // 限制更新频率，避免过于频繁的状态更新
      if (deltaTime < 16) { // 如果距离上次更新不到16ms就跳过，保持60fps响应性
        animationId = requestAnimationFrame(update)
        return
      }
      
      lastTime = now
      
      // 限制最大deltaTime防止跳跃
      const safeDeltaTime = Math.min(deltaTime, 16.67) // 60fps 最大
      
      updateLocalPhysics(safeDeltaTime)
      updateLocalRotation()
      
      // 节流的状态更新 - 限制到60fps，最大化响应性
      if (now - lastStateUpdate > 16) {
        const state = localState.current
        setPredictedPosition({ ...state.position })
        setPredictedRotation(state.rotation)
        lastStateUpdate = now
      }
      
      animationId = requestAnimationFrame(update)
    }
    
    if (isConnected) {
      update()
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [updateLocalPhysics, updateLocalRotation, isConnected, setPredictedPosition, setPredictedRotation])
  
  // 监听服务器状态更新进行校正 - 降低更新频率避免无限循环
  useEffect(() => {
    const interval = setInterval(() => {
      const gameStore = useGameStore.getState()
      const myPlayer = Array.from(gameStore.players.values()).find(p => p.viewId === myViewId)
      
      if (myPlayer && localState.current.reconciled) {
        reconcileWithServer(myPlayer.position, myPlayer.rotation)
      } else if (myPlayer && !localState.current.reconciled) {
        // 初始化本地状态
        localState.current.position = { ...myPlayer.position }
        localState.current.rotation = myPlayer.rotation
        localState.current.serverPosition = { ...myPlayer.position }
        localState.current.serverRotation = myPlayer.rotation
        localState.current.reconciled = true
      }
    }, 250) // 每250ms检查一次服务器状态，减少对用户输入的干扰
    
    return () => clearInterval(interval)
  }, [myViewId, reconcileWithServer])
  
  // 清理状态
  useEffect(() => {
    return () => {
      clearPrediction()
    }
  }, [clearPrediction])
  
  return null // 这个组件不渲染任何内容
}
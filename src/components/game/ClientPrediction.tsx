import React, { useRef, useEffect, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useMultiSynq } from './MultiSynqProvider'
import { GAME_CONFIG } from '@/lib/gameConfig'

// 客户端预测控制器
export const ClientPrediction: React.FC = () => {
  const { inputState, setPredictedPosition, setPredictedRotation, clearPrediction } = useGameStore()
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
    
    // 检查是否有输入变化
    const hasInput = inputState.moveForward || inputState.moveBackward || inputState.moveLeft || inputState.moveRight
    if (!hasInput && Math.abs(state.velocity.x) < 0.01 && Math.abs(state.velocity.z) < 0.01) {
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
    
    // 更新位置
    const mapSize = GAME_CONFIG.MAP_SIZE / 2
    const newX = Math.max(-mapSize, Math.min(mapSize, state.position.x + state.velocity.x * dt * 60))
    const newZ = Math.max(-mapSize, Math.min(mapSize, state.position.z + state.velocity.z * dt * 60))
    
    // 只在位置实际改变时才更新
    if (Math.abs(newX - state.position.x) > 0.001 || Math.abs(newZ - state.position.z) > 0.001) {
      state.position.x = newX
      state.position.z = newZ
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
    const threshold = 0.5 // 差异阈值
    
    // 检查位置差异
    const positionDiff = Math.sqrt(
      Math.pow(serverPosition.x - state.position.x, 2) +
      Math.pow(serverPosition.z - state.position.z, 2)
    )
    
    // 如果差异太大，进行校正
    if (positionDiff > threshold) {
      // 平滑校正而不是突然跳转
      const correctionFactor = 0.3
      state.position.x += (serverPosition.x - state.position.x) * correctionFactor
      state.position.z += (serverPosition.z - state.position.z) * correctionFactor
      setPredictedPosition({ ...state.position })
    }
    
    // 旋转校正
    const rotationDiff = Math.abs(serverRotation - state.rotation)
    if (rotationDiff > 0.1) {
      state.rotation += (serverRotation - state.rotation) * 0.3
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
      if (deltaTime < 16) { // 如果距离上次更新不到16ms就跳过
        animationId = requestAnimationFrame(update)
        return
      }
      
      lastTime = now
      
      // 限制最大deltaTime防止跳跃
      const safeDeltaTime = Math.min(deltaTime, 16.67) // 60fps 最大
      
      updateLocalPhysics(safeDeltaTime)
      updateLocalRotation()
      
      // 节流的状态更新 - 限制到30fps以防止无限循环
      if (now - lastStateUpdate > 33) {
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
    }, 100) // 每100ms检查一次服务器状态，避免过于频繁
    
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
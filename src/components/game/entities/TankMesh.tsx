import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Player } from '@/types/game'
import { MuzzleFlash } from './MuzzleFlash'
import { ShellEjection } from './ShellEjection'
import { useGameStore } from '@/store/gameStore'

interface TankMeshProps {
  player: Player
  isMyPlayer: boolean
}

export const TankMesh: React.FC<TankMeshProps> = ({ player, isMyPlayer }) => {
  const { predictedPosition, predictedRotation } = useGameStore()
  const tankRef = useRef<THREE.Group>(null)
  const turretRef = useRef<THREE.Group>(null)
  const nameRef = useRef<THREE.Mesh>(null)
  
  // 开火效果状态
  const [showMuzzleFlash, setShowMuzzleFlash] = useState(false)
  const [muzzleFlashId, setMuzzleFlashId] = useState(0)
  const lastShotTime = useRef(0)
  const [shellEjection, setShellEjection] = useState<{ id: number; time: number } | null>(null)
  
  // 平滑插值的目标位置和旋转
  const targetPosition = useRef(new THREE.Vector3(player.position.x, player.position.y, player.position.z))
  const targetRotation = useRef(player.rotation)
  const lastUpdateTime = useRef(Date.now())
  
  useEffect(() => {
    // 为我的玩家使用客户端预测，其他玩家使用服务器位置
    if (isMyPlayer && predictedPosition) {
      targetPosition.current.set(predictedPosition.x, predictedPosition.y, predictedPosition.z)
    } else {
      targetPosition.current.set(player.position.x, player.position.y, player.position.z)
    }
    
    if (isMyPlayer && predictedRotation !== null) {
      targetRotation.current = predictedRotation
    } else {
      targetRotation.current = player.rotation
    }
    
    lastUpdateTime.current = Date.now()
  }, [player.position, player.rotation, isMyPlayer, predictedPosition, predictedRotation])
  
  // 检测开火并触发火焰效果
  useEffect(() => {
    if (player.lastShot && player.lastShot > lastShotTime.current) {
      lastShotTime.current = player.lastShot
      
      // 触发炮口闪光
      setMuzzleFlashId(prev => prev + 1)
      setShowMuzzleFlash(true)
      
      // 触发弹壳抛射
      setShellEjection({ id: Date.now(), time: Date.now() })
      
      // 清理弹壳效果
      setTimeout(() => setShellEjection(null), 2000)
    }
  }, [player.lastShot])
  
  useFrame((_state, delta) => {
    if (tankRef.current) {
      const distance = tankRef.current.position.distanceTo(targetPosition.current)
      
      // 为我的玩家提供更快响应，其他玩家保持平滑
      let lerpFactor: number
      if (isMyPlayer) {
        // 我的玩家：极快响应，几乎立即跟随
        lerpFactor = distance > 1 ? 1 : Math.min(0.8, delta * 25)
      } else {
        // 其他玩家：平滑插值
        lerpFactor = distance > 2 ? 0.7 : Math.min(0.1, delta * 5)
      }
      
      // 降低阈值，让更小的移动也能被捕获
      if (distance > (isMyPlayer ? 0.001 : 0.01)) {
        tankRef.current.position.lerp(targetPosition.current, lerpFactor)
      }
      
      // 平滑旋转到目标角度
      const currentRotation = tankRef.current.rotation.y
      let deltaRotation = targetRotation.current - currentRotation
      
      // 处理角度环绕
      if (deltaRotation > Math.PI) deltaRotation -= Math.PI * 2
      if (deltaRotation < -Math.PI) deltaRotation += Math.PI * 2
      
      // 为我的玩家提供更快旋转响应
      let rotationLerpFactor: number
      if (isMyPlayer) {
        // 我的玩家：极快旋转响应，几乎立即跟随
        rotationLerpFactor = Math.abs(deltaRotation) > Math.PI / 6 ? 1 : Math.min(0.9, delta * 30)
      } else {
        // 其他玩家：平滑旋转
        rotationLerpFactor = Math.abs(deltaRotation) > Math.PI / 4 ? 0.4 : Math.min(0.08, delta * 3)
      }
      
      // 降低阈值，让更小的旋转也能被捕获
      if (Math.abs(deltaRotation) > (isMyPlayer ? 0.001 : 0.01)) {
        tankRef.current.rotation.y += deltaRotation * rotationLerpFactor
      }
    }
    
    // 名字标签始终面向相机
    if (nameRef.current) {
      nameRef.current.lookAt(0, nameRef.current.position.y, 0)
    }
  })
  
  // 创建文字材质
  const createTextTexture = (text: string, color: string) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return null
    
    canvas.width = 256
    canvas.height = 64
    
    context.fillStyle = 'rgba(0, 0, 0, 0.8)'
    context.fillRect(0, 0, canvas.width, canvas.height)
    
    context.fillStyle = color
    context.font = 'bold 24px Arial'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }
  
  const displayName = player.address 
    ? `${player.address.slice(0, 6)}...${player.address.slice(-4)}`
    : `Player ${player.viewId.slice(-4)}`
  
  const nameTexture = createTextTexture(displayName, isMyPlayer ? '#00ff00' : '#ffffff')
  
  return (
    <group ref={tankRef} position={[player.position.x, player.position.y, player.position.z]}>
      {/* 主体 - 坦克底盘 */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.5, 0.8, 4]} />
        <meshStandardMaterial 
          color={player.color}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      
      {/* 炮塔 */}
      <group ref={turretRef} position={[0, 0.4, 0]}>
        {/* 炮塔主体 */}
        <mesh castShadow>
          <cylinderGeometry args={[1, 1.2, 0.6, 12]} />
          <meshStandardMaterial 
            color={player.color}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
        
        {/* 炮管 */}
        <mesh position={[0, 0, 1.5]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 3, 8]} />
          <meshStandardMaterial 
            color="#444444"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        
        {/* 炮口火焰效果 */}
        {showMuzzleFlash && (
          <MuzzleFlash
            key={muzzleFlashId}
            position={{ x: 0, y: 0, z: 3 }}
            rotation={0}
            onComplete={() => setShowMuzzleFlash(false)}
          />
        )}
      </group>
      
      {/* 履带 */}
      <group position={[0, -0.2, 0]}>
        {/* 左履带 */}
        <mesh position={[-1.4, 0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.6, 4.2]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
        </mesh>
        
        {/* 右履带 */}
        <mesh position={[1.4, 0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.6, 4.2]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
        </mesh>
      </group>
      
      {/* 车轮装饰 */}
      {[-1.5, -0.5, 0.5, 1.5].map((z, i) => (
        <group key={i} position={[0, -0.3, z]}>
          <mesh position={[-1.4, 0, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.2, 8]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
          <mesh position={[1.4, 0, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.25, 0.2, 8]} />
            <meshStandardMaterial color="#444444" />
          </mesh>
        </group>
      ))}
      
      {/* 生命值指示器 */}
      <group position={[0, 3, 0]}>
        {/* 血条背景 */}
        <mesh>
          <planeGeometry args={[3, 0.3]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
        </mesh>
        
        {/* 血条前景 */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[3 * (player.health / player.maxHealth), 0.3]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.9} />
        </mesh>
        
        {/* 玩家名字 */}
        {nameTexture && (
          <mesh ref={nameRef} position={[0, 0.5, 0]}>
            <planeGeometry args={[2, 0.5]} />
            <meshBasicMaterial 
              map={nameTexture} 
              transparent 
              alphaTest={0.1}
            />
          </mesh>
        )}
      </group>
      
      {/* 死亡效果 */}
      {!player.isAlive && (
        <group>
          <mesh>
            <sphereGeometry args={[3, 16, 8]} />
            <meshBasicMaterial 
              color="#ff4444" 
              transparent 
              opacity={0.3}
              wireframe
            />
          </mesh>
        </group>
      )}
      
      {/* 我的玩家特殊标记 */}
      {isMyPlayer && (
        <mesh position={[0, 4, 0]}>
          <coneGeometry args={[0.3, 0.6, 4]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      )}
      
      {/* 弹壳抛射效果 */}
      {shellEjection && (
        <ShellEjection 
          key={shellEjection.id}
          position={{ x: 1.2, y: 1, z: 0.5 }}
          rotation={player.rotation}
        />
      )}
    </group>
  )
}
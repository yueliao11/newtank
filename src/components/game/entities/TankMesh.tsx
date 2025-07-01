import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Player } from '@/types/game'

interface TankMeshProps {
  player: Player
  isMyPlayer: boolean
}

export const TankMesh: React.FC<TankMeshProps> = ({ player, isMyPlayer }) => {
  const tankRef = useRef<THREE.Group>(null)
  const turretRef = useRef<THREE.Group>(null)
  const nameRef = useRef<THREE.Mesh>(null)
  
  // 平滑插值的目标位置和旋转
  const targetPosition = useRef(new THREE.Vector3(player.position.x, player.position.y, player.position.z))
  const targetRotation = useRef(player.rotation)
  
  useEffect(() => {
    targetPosition.current.set(player.position.x, player.position.y, player.position.z)
    targetRotation.current = player.rotation
  }, [player.position, player.rotation])
  
  useFrame(() => {
    if (tankRef.current) {
      // 平滑移动到目标位置
      tankRef.current.position.lerp(targetPosition.current, 0.1)
      
      // 平滑旋转到目标角度
      const currentRotation = tankRef.current.rotation.y
      let deltaRotation = targetRotation.current - currentRotation
      
      // 处理角度环绕
      if (deltaRotation > Math.PI) deltaRotation -= Math.PI * 2
      if (deltaRotation < -Math.PI) deltaRotation += Math.PI * 2
      
      tankRef.current.rotation.y += deltaRotation * 0.1
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
    </group>
  )
}
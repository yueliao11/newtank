import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface MuzzleFlashProps {
  position: { x: number; y: number; z: number }
  rotation: number
  onComplete?: () => void
}

export const MuzzleFlash: React.FC<MuzzleFlashProps> = ({ 
  position, 
  rotation,
  onComplete 
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const [progress, setProgress] = useState(0)
  const startTime = useRef(Date.now())
  const duration = 200 // 200ms 闪光效果
  const sparkRef = useRef<THREE.Group>(null)
  const smokeRef = useRef<THREE.Group>(null)
  
  useFrame(() => {
    const elapsed = Date.now() - startTime.current
    const newProgress = Math.min(elapsed / duration, 1)
    setProgress(newProgress)
    
    if (groupRef.current) {
      // 快速缩放动画，初期放大然后逐渐缩小
      const scalePhase1 = Math.min(newProgress * 3, 1) // 前1/3时间快速放大
      const scalePhase2 = Math.max(0, (newProgress - 0.33) / 0.67) // 后2/3时间缩小
      const scale = scalePhase1 * (1 - scalePhase2 * 0.8) * (1 + Math.sin(newProgress * Math.PI * 6) * 0.1)
      groupRef.current.scale.setScalar(scale)
      
      // 轻微抖动效果
      const shakeIntensity = (1 - newProgress) * 0.15
      groupRef.current.position.set(
        position.x + (Math.random() - 0.5) * shakeIntensity,
        position.y + (Math.random() - 0.5) * shakeIntensity,
        position.z + (Math.random() - 0.5) * shakeIntensity
      )
    }
    
    // 火花粒子旋转
    if (sparkRef.current) {
      sparkRef.current.rotation.z += 0.3
    }
    
    // 烟雾向上漂移
    if (smokeRef.current) {
      smokeRef.current.position.z += 0.02
      smokeRef.current.scale.setScalar(1 + newProgress * 0.5)
    }
    
    // 动画完成后调用回调
    if (newProgress >= 1 && onComplete) {
      onComplete()
    }
  })
  
  // 计算各阶段透明度
  const flashOpacity = Math.max(0, 1 - progress * 2)
  const glowOpacity = Math.max(0, 1 - progress * 1.5)
  const smokeOpacity = Math.max(0, (1 - progress) * 0.7)
  
  return (
    <group 
      ref={groupRef} 
      position={[position.x, position.y, position.z]}
      rotation={[0, rotation, 0]}
    >
      {/* 主火焰锥体 - 更大更明显 */}
      <mesh position={[0, 0, 2.5]}>
        <coneGeometry args={[1.2, 2.5, 8]} />
        <meshBasicMaterial 
          color="#ff4400"
          transparent
          opacity={flashOpacity * 0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 内层白色火焰 */}
      <mesh position={[0, 0, 2.8]}>
        <coneGeometry args={[0.8, 2, 6]} />
        <meshBasicMaterial 
          color="#ffffff"
          transparent
          opacity={flashOpacity * 1.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 核心亮点 */}
      <mesh position={[0, 0, 1.8]}>
        <coneGeometry args={[0.4, 1, 6]} />
        <meshBasicMaterial 
          color="#ffffff"
          transparent
          opacity={flashOpacity * 1.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 外围橙色光晕 */}
      <mesh position={[0, 0, 1.5]}>
        <sphereGeometry args={[1.8, 8, 6]} />
        <meshBasicMaterial 
          color="#ff6600"
          transparent
          opacity={glowOpacity * 0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 冲击波环 */}
      <mesh position={[0, 0, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1, 2.5, 16]} />
        <meshBasicMaterial 
          color="#ffaa44"
          transparent
          opacity={glowOpacity * 0.4}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* 火花粒子组 */}
      <group ref={sparkRef} position={[0, 0, 1.8]}>
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * Math.PI * 2
          const distance = 0.8 + Math.random() * 1.2
          const height = (Math.random() - 0.5) * 0.6
          const x = Math.cos(angle) * distance
          const y = height
          const z = Math.sin(angle) * distance * 0.3
          
          return (
            <mesh key={i} position={[x, y, z]}>
              <sphereGeometry args={[0.08, 4, 4]} />
              <meshBasicMaterial 
                color={i % 2 === 0 ? "#ffdd00" : "#ff8800"}
                transparent
                opacity={flashOpacity * 0.9}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )
        })}
      </group>
      
      {/* 更多散射火花 */}
      {[...Array(8)].map((_, i) => {
        const angle = Math.random() * Math.PI * 2
        const distance = 2 + Math.random() * 1.5
        const x = Math.cos(angle) * distance
        const y = (Math.random() - 0.5) * 1
        const z = 1 + Math.sin(angle) * distance * 0.2
        
        return (
          <mesh key={`spark-${i}`} position={[x, y, z]}>
            <sphereGeometry args={[0.06, 4, 4]} />
            <meshBasicMaterial 
              color="#ffaa22"
              transparent
              opacity={flashOpacity * 0.7}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )
      })}
      
      {/* 烟雾效果 */}
      <group ref={smokeRef} position={[0, 0, 0]}>
        {[...Array(4)].map((_, i) => {
          const offset = i * 0.3
          const x = (Math.random() - 0.5) * 0.5
          const y = (Math.random() - 0.5) * 0.3
          const z = 1 + offset
          
          return (
            <mesh key={`smoke-${i}`} position={[x, y, z]}>
              <sphereGeometry args={[0.6 + i * 0.2, 8, 6]} />
              <meshBasicMaterial 
                color="#666666"
                transparent
                opacity={smokeOpacity * (0.4 - i * 0.08)}
                blending={THREE.NormalBlending}
              />
            </mesh>
          )
        })}
      </group>
      
      {/* 炮口闪光盘 */}
      <mesh position={[0, 0, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 16]} />
        <meshBasicMaterial 
          color="#ffff88"
          transparent
          opacity={flashOpacity * 0.8}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
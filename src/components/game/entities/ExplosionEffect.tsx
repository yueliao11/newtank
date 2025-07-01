import React, { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ExplosionEffectProps {
  position: { x: number; y: number; z: number }
  onComplete?: () => void
  size?: number
  color?: string
}

export const ExplosionEffect: React.FC<ExplosionEffectProps> = ({ 
  position, 
  onComplete,
  size = 1,
  color = '#ff4400'
}) => {
  const groupRef = useRef<THREE.Group>(null)
  const [progress, setProgress] = useState(0)
  const startTime = useRef(Date.now())
  const duration = 1000 // 1秒爆炸动画
  
  useFrame(() => {
    const elapsed = Date.now() - startTime.current
    const newProgress = Math.min(elapsed / duration, 1)
    setProgress(newProgress)
    
    if (groupRef.current) {
      // 旋转效果
      groupRef.current.rotation.y += 0.1
      groupRef.current.rotation.x += 0.05
      
      // 缩放效果
      const scale = Math.sin(newProgress * Math.PI) * size
      groupRef.current.scale.setScalar(scale)
    }
    
    // 动画完成后调用回调
    if (newProgress >= 1 && onComplete) {
      onComplete()
    }
  })
  
  // 计算透明度
  const opacity = Math.max(0, 1 - progress * 2)
  
  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      {/* 主爆炸球 */}
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={opacity * 0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 内部火焰 */}
      <mesh>
        <sphereGeometry args={[0.7, 12, 12]} />
        <meshBasicMaterial 
          color="#ffff00"
          transparent
          opacity={opacity * 0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 核心白光 */}
      <mesh>
        <sphereGeometry args={[0.4, 8, 8]} />
        <meshBasicMaterial 
          color="#ffffff"
          transparent
          opacity={opacity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 冲击波环 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 2.5, 32]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={opacity * 0.5}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* 额外的火花粒子 */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        const distance = 1.2 + Math.sin(progress * Math.PI * 4) * 0.3
        const x = Math.cos(angle) * distance
        const z = Math.sin(angle) * distance
        const y = (Math.random() - 0.5) * 0.5
        
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.1, 6, 6]} />
            <meshBasicMaterial 
              color="#ffaa00"
              transparent
              opacity={opacity * 0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )
      })}
    </group>
  )
}
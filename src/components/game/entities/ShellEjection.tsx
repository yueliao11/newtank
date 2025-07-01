import React, { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ShellEjectionProps {
  position: { x: number; y: number; z: number }
  rotation: number
}

export const ShellEjection: React.FC<ShellEjectionProps> = ({ position, rotation }) => {
  const shellRef = useRef<THREE.Group>(null)
  const startTime = useRef(Date.now())
  const duration = 1500 // 1.5秒弹壳抛射时间
  
  // 弹壳的初始速度和重力参数
  const initialVelocity = useRef({
    x: (Math.random() - 0.5) * 3 + Math.cos(rotation + Math.PI / 2) * 2, // 向侧面抛射
    y: 2 + Math.random() * 1.5, // 向上
    z: (Math.random() - 0.5) * 1 + Math.sin(rotation + Math.PI / 2) * 2
  })
  
  const gravity = -9.8
  const bounceCoefficient = 0.3
  const [bounced, setBounced] = useState(false)
  
  useFrame(() => {
    const elapsed = (Date.now() - startTime.current) / 1000 // 转换为秒
    const newProgress = Math.min(elapsed / (duration / 1000), 1)
    
    if (shellRef.current) {
      // 物理运动计算
      const t = elapsed
      
      // 计算当前位置（抛物线运动）
      let currentY = position.y + initialVelocity.current.y * t + 0.5 * gravity * t * t
      let currentX = position.x + initialVelocity.current.x * t
      let currentZ = position.z + initialVelocity.current.z * t
      
      // 地面碰撞检测
      if (currentY <= 0.1 && !bounced) {
        setBounced(true)
        // 反弹，减少垂直速度
        initialVelocity.current.y *= -bounceCoefficient
        initialVelocity.current.x *= 0.8 // 摩擦力
        initialVelocity.current.z *= 0.8
        startTime.current = Date.now()
        currentY = 0.1
      }
      
      // 确保弹壳不会穿过地面
      currentY = Math.max(currentY, 0.1)
      
      shellRef.current.position.set(currentX, currentY, currentZ)
      
      // 旋转动画（弹壳翻滚）
      shellRef.current.rotation.x += 0.3
      shellRef.current.rotation.y += 0.2
      shellRef.current.rotation.z += 0.4
      
      // 透明度渐变
      const opacity = Math.max(0, 1 - newProgress * 0.7)
      if (shellRef.current.children[0] instanceof THREE.Mesh) {
        const material = shellRef.current.children[0].material as THREE.MeshBasicMaterial
        material.opacity = opacity
      }
    }
  })
  
  return (
    <group ref={shellRef} position={[position.x, position.y, position.z]}>
      {/* 弹壳本体 */}
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.4, 8]} />
        <meshBasicMaterial 
          color="#cc9900"
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* 弹壳底部 */}
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.04, 8]} />
        <meshBasicMaterial 
          color="#aa7700"
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* 弹壳顶部 */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.04, 8]} />
        <meshBasicMaterial 
          color="#dd9900"
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* 火药燃烧痕迹 */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.02, 8]} />
        <meshBasicMaterial 
          color="#333333"
          transparent
          opacity={0.7}
        />
      </mesh>
      
      {/* 轻微的烟雾效果 */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.15, 6, 4]} />
        <meshBasicMaterial 
          color="#999999"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
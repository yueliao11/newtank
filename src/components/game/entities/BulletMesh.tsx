import React, { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Bullet } from '@/types/game'

interface BulletMeshProps {
  bullet: Bullet
}

export const BulletMesh: React.FC<BulletMeshProps> = ({ bullet }) => {
  const bulletRef = useRef<THREE.Group>(null)
  const [previousPositions, setPreviousPositions] = useState<THREE.Vector3[]>([])
  const [trailPoints, setTrailPoints] = useState<THREE.Vector3[]>([])
  
  // 更新轨迹点
  useEffect(() => {
    if (bullet.position && 
        typeof bullet.position.x === 'number' && 
        typeof bullet.position.y === 'number' && 
        typeof bullet.position.z === 'number') {
      const currentPos = new THREE.Vector3(bullet.position.x, bullet.position.y, bullet.position.z)
      setPreviousPositions(prev => {
        const newPositions = [currentPos, ...prev.slice(0, 8)]
        return newPositions
      })
      
      // 为粒子轨迹创建点
      setTrailPoints(prev => {
        const newPoints = [currentPos.clone(), ...prev.slice(0, 6)]
        return newPoints
      })
    }
  }, [bullet.position])
  
  // 旋转和脉动动画
  useFrame((state) => {
    if (bulletRef.current) {
      bulletRef.current.rotation.x += 0.3
      bulletRef.current.rotation.z += 0.4
      
      // 脉动效果
      const scale = 1 + Math.sin(state.clock.elapsedTime * 15) * 0.15
      bulletRef.current.scale.setScalar(scale)
    }
  })
  
  // 安全的位置处理
  const safePosition = bullet.position && 
    typeof bullet.position.x === 'number' && 
    typeof bullet.position.y === 'number' && 
    typeof bullet.position.z === 'number'
    ? [bullet.position.x, bullet.position.y, bullet.position.z]
    : [0, 0, 0]

  return (
    <group 
      ref={bulletRef} 
      position={safePosition}
    >
      {/* 主要子弹体 - 更亮更突出 */}
      <mesh castShadow>
        <sphereGeometry args={[0.25, 12, 8]} />
        <meshBasicMaterial 
          color="#ff2200" 
          emissive="#ff1100"
          emissiveIntensity={1.2}
        />
      </mesh>
      
      {/* 外层发光球 */}
      <mesh>
        <sphereGeometry args={[0.45, 8, 6]} />
        <meshBasicMaterial 
          color="#ff6600" 
          transparent 
          opacity={0.5}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 最外层光晕 */}
      <mesh>
        <sphereGeometry args={[0.7, 6, 4]} />
        <meshBasicMaterial 
          color="#ffaa44" 
          transparent 
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 白色核心 */}
      <mesh>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshBasicMaterial 
          color="#ffffff" 
          emissive="#ffffff"
          emissiveIntensity={1.5}
        />
      </mesh>
      
      {/* 前进方向的能量锥 */}
      <mesh position={[0, 0, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.4, 2, 8]} />
        <meshBasicMaterial 
          color="#ffcc00" 
          transparent 
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 旋转的能量环 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.7, 16]} />
        <meshBasicMaterial 
          color="#ff8800" 
          transparent 
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* 快速旋转的内环 */}
      <mesh rotation={[Math.PI / 2, 0, Math.PI / 4]}>
        <ringGeometry args={[0.2, 0.35, 8]} />
        <meshBasicMaterial 
          color="#ffff00" 
          transparent 
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* 火花效果 */}
      {[...Array(4)].map((_, i) => {
        const angle = (i / 4) * Math.PI * 2
        const distance = 0.8
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        
        return (
          <mesh key={i} position={[x, y, 0]}>
            <sphereGeometry args={[0.06, 4, 4]} />
            <meshBasicMaterial 
              color="#ffdd00"
              transparent
              opacity={0.9}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )
      })}
      
      {/* 简化的轨迹粒子 */}
      {trailPoints.map((point, i) => {
        if (i === 0) return null // 跳过当前位置
        const opacity = 1 - (i / trailPoints.length)
        const scale = 1 - (i / trailPoints.length) * 0.7
        
        return (
          <mesh 
            key={i} 
            position={[point.x - safePosition[0], point.y - safePosition[1], point.z - safePosition[2]]}
            scale={[scale, scale, scale]}
          >
            <sphereGeometry args={[0.15, 6, 4]} />
            <meshBasicMaterial 
              color="#ff6600"
              transparent
              opacity={opacity * 0.6}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        )
      })}
      
      {/* 拖尾光束 */}
      <mesh position={[0, 0, -1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.3, 2, 8]} />
        <meshBasicMaterial 
          color="#ff4400" 
          transparent 
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
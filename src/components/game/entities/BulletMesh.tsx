import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Bullet } from '@/types/game'

interface BulletMeshProps {
  bullet: Bullet
}

export const BulletMesh: React.FC<BulletMeshProps> = ({ bullet }) => {
  const bulletRef = useRef<THREE.Group>(null)
  
  // 添加旋转动画
  useFrame((state) => {
    if (bulletRef.current) {
      bulletRef.current.rotation.x += 0.2
      bulletRef.current.rotation.z += 0.3
    }
  })
  
  return (
    <group 
      ref={bulletRef} 
      position={[bullet.position.x, bullet.position.y, bullet.position.z]}
    >
      {/* 主要子弹体 - 更大更明显 */}
      <mesh castShadow>
        <sphereGeometry args={[0.2, 8, 6]} />
        <meshBasicMaterial 
          color="#ff4400" 
          emissive="#ff2200"
          emissiveIntensity={0.8}
        />
      </mesh>
      
      {/* 发光外圈 */}
      <mesh>
        <sphereGeometry args={[0.4, 8, 6]} />
        <meshBasicMaterial 
          color="#ff6600" 
          transparent 
          opacity={0.4}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* 亮核心 */}
      <mesh>
        <sphereGeometry args={[0.1, 6, 4]} />
        <meshBasicMaterial 
          color="#ffffff" 
          emissive="#ffffff"
          emissiveIntensity={1}
        />
      </mesh>
      
      {/* 简单的光环效果 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.5, 16]} />
        <meshBasicMaterial 
          color="#ff8800" 
          transparent 
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}
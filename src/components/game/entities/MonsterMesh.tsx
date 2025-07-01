import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Monster } from '@/types/game'

interface MonsterMeshProps {
  monster: Monster
}

export const MonsterMesh: React.FC<MonsterMeshProps> = ({ monster }) => {
  const monsterRef = useRef<THREE.Group>(null)
  const eyesRef = useRef<THREE.Group>(null)
  
  // 平滑插值的目标位置和旋转
  const targetPosition = useRef(new THREE.Vector3(monster.position.x, monster.position.y, monster.position.z))
  const targetRotation = useRef(monster.rotation)
  
  React.useEffect(() => {
    targetPosition.current.set(monster.position.x, monster.position.y, monster.position.z)
    targetRotation.current = monster.rotation
  }, [monster.position, monster.rotation])
  
  useFrame((state) => {
    if (monsterRef.current) {
      // 平滑移动到目标位置
      monsterRef.current.position.lerp(targetPosition.current, 0.1)
      
      // 平滑旋转到目标角度
      const currentRotation = monsterRef.current.rotation.y
      let deltaRotation = targetRotation.current - currentRotation
      
      // 处理角度环绕
      if (deltaRotation > Math.PI) deltaRotation -= Math.PI * 2
      if (deltaRotation < -Math.PI) deltaRotation += Math.PI * 2
      
      monsterRef.current.rotation.y += deltaRotation * 0.1
      
      // 添加轻微的上下浮动动画
      if (monster.health > 0) {
        monsterRef.current.position.y = monster.position.y + Math.sin(state.clock.elapsedTime * 2) * 0.1
      }
    }
    
    // 眼睛闪烁效果
    if (eyesRef.current && monster.health > 0) {
      const intensity = 0.8 + Math.sin(state.clock.elapsedTime * 8) * 0.2
      eyesRef.current.scale.setScalar(intensity)
    }
  })
  
  // 根据怪物状态确定颜色
  const getMonsterColor = () => {
    if (monster.health <= 0) return '#666666'
    
    switch (monster.state) {
      case 'chasing':
        return '#ff4444'
      case 'attacking':
        return '#ff0000'
      default:
        return '#8B4513'
    }
  }
  
  const getEyeColor = () => {
    if (monster.health <= 0) return '#333333'
    
    switch (monster.state) {
      case 'chasing':
      case 'attacking':
        return '#ff0000'
      default:
        return '#ffff00'
    }
  }
  
  return (
    <group ref={monsterRef} position={[monster.position.x, monster.position.y, monster.position.z]}>
      {/* 主体 */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial 
          color={getMonsterColor()}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>
      
      {/* 眼睛 */}
      <group ref={eyesRef} position={[0, 0.3, 0.8]}>
        {/* 左眼 */}
        <mesh position={[-0.3, 0, 0]}>
          <sphereGeometry args={[0.15, 8, 6]} />
          <meshBasicMaterial color={getEyeColor()} />
        </mesh>
        
        {/* 右眼 */}
        <mesh position={[0.3, 0, 0]}>
          <sphereGeometry args={[0.15, 8, 6]} />
          <meshBasicMaterial color={getEyeColor()} />
        </mesh>
      </group>
      
      {/* 嘴巴 */}
      <mesh position={[0, -0.2, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.3, 8]} />
        <meshBasicMaterial color="#000000" side={THREE.DoubleSide} />
      </mesh>
      
      {/* 触手/腿 */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2
        const x = Math.cos(angle) * 0.8
        const z = Math.sin(angle) * 0.8
        
        return (
          <mesh
            key={i}
            position={[x, -0.8, z]}
            rotation={[0, angle, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.1, 0.15, 1, 6]} />
            <meshStandardMaterial 
              color={getMonsterColor()}
              roughness={0.8}
            />
          </mesh>
        )
      })}
      
      {/* 生命值指示器 */}
      <group position={[0, 2, 0]}>
        {/* 血条背景 */}
        <mesh>
          <planeGeometry args={[2, 0.2]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.8} />
        </mesh>
        
        {/* 血条前景 */}
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[2 * (monster.health / monster.maxHealth), 0.2]} />
          <meshBasicMaterial color="#00ff00" transparent opacity={0.9} />
        </mesh>
      </group>
      
      {/* 状态指示 */}
      {monster.state === 'chasing' && (
        <mesh position={[0, 2.5, 0]}>
          <coneGeometry args={[0.2, 0.4, 3]} />
          <meshBasicMaterial color="#ff4444" />
        </mesh>
      )}
      
      {monster.state === 'attacking' && (
        <mesh position={[0, 2.5, 0]}>
          <octahedronGeometry args={[0.3]} />
          <meshBasicMaterial color="#ff0000" />
        </mesh>
      )}
      
      {/* 死亡效果 */}
      {monster.health <= 0 && (
        <group>
          {/* 烟雾效果 */}
          <mesh>
            <sphereGeometry args={[1.5, 8, 6]} />
            <meshBasicMaterial 
              color="#666666" 
              transparent 
              opacity={0.3}
              wireframe
            />
          </mesh>
          
          {/* 分解效果 */}
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
              ]}
              rotation={[
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
              ]}
            >
              <boxGeometry args={[0.2, 0.2, 0.2]} />
              <meshBasicMaterial color="#666666" transparent opacity={0.5} />
            </mesh>
          ))}
        </group>
      )}
      
      {/* 检测范围指示（调试用，可选） */}
      {process.env.NODE_ENV === 'development' && monster.health > 0 && monster.aiData && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[monster.aiData.detectionRadius - 0.5, monster.aiData.detectionRadius, 32]} />
          <meshBasicMaterial 
            color="#ffff00" 
            transparent 
            opacity={0.1}
            wireframe
          />
        </mesh>
      )}
    </group>
  )
}
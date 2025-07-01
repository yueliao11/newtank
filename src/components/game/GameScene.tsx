import React, { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '@/store/gameStore'
import { useMultiSynq } from './MultiSynqProvider'
import { Player } from '@/types/game'
import { TankMesh } from './entities/TankMesh'
import { MonsterMesh } from './entities/MonsterMesh'
import { BulletMesh } from './entities/BulletMesh'
import { ExplosionEffect } from './entities/ExplosionEffect'
import { Minimap } from './Minimap'

export const GameScene: React.FC = () => {
  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        camera={{ 
          position: [0, 15, 15], 
          fov: 60,
          near: 0.1,
          far: 1000 
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true
          gl.shadowMap.type = THREE.PCFSoftShadowMap
          gl.setClearColor('#87CEEB')
          
          // 处理 WebGL 上下文丢失
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            console.warn('WebGL context lost')
            event.preventDefault()
          })
          
          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored')
          })
        }}
      >
        <SceneContent />
      </Canvas>
      
      {/* 小地图覆盖层 */}
      <Minimap />
    </div>
  )
}

const SceneContent: React.FC = () => {
  const { myViewId } = useMultiSynq()
  const { players, monsters, bullets, explosions, removeExplosion } = useGameStore()
  const controlsRef = useRef<any>()

  // 找到我的玩家
  const myPlayer = Array.from(players.values()).find(p => p.viewId === myViewId)

  // 相机跟随逻辑
  useFrame((state, delta) => {
    if (myPlayer && myPlayer.isAlive && controlsRef.current) {
      // 计算目标位置
      const targetPosition = new THREE.Vector3(
        myPlayer.position.x - Math.sin(myPlayer.rotation) * 10,
        myPlayer.position.y + 8,
        myPlayer.position.z - Math.cos(myPlayer.rotation) * 10
      )
      
      // 计算目标观察点
      const lookAtPosition = new THREE.Vector3(
        myPlayer.position.x,
        myPlayer.position.y,
        myPlayer.position.z
      )
      
      // 使用更平滑的插值，基于deltaTime
      const positionDistance = state.camera.position.distanceTo(targetPosition)
      const targetDistance = controlsRef.current.target.distanceTo(lookAtPosition)
      
      // 动态调整插值速度 - 距离越远插值越快
      const positionLerpFactor = positionDistance > 5 ? 0.1 : Math.min(0.08, delta * 3)
      const targetLerpFactor = targetDistance > 2 ? 0.1 : Math.min(0.08, delta * 3)
      
      if (positionDistance > 0.05) {
        state.camera.position.lerp(targetPosition, positionLerpFactor)
      }
      
      if (targetDistance > 0.05) {
        controlsRef.current.target.lerp(lookAtPosition, targetLerpFactor)
        controlsRef.current.update()
      }
    }
  })

  return (
    <>
      {/* 灯光设置 */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[50, 50, 25]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
      />
      
      {/* 环境和背景 */}
      <Environment preset="sunset" />
      <fog attach="fog" args={['#87CEEB', 50, 200]} />
      
      {/* 地面 */}
      <Ground />
      
      {/* 网格线（可选） */}
      <Grid 
        args={[200, 200]} 
        position={[0, 0.01, 0]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#ffffff"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#ffffff"
        fadeDistance={100}
        fadeStrength={1}
        infiniteGrid
      />
      
      {/* 相机控制 */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.2}
        enablePan={false}
      />
      
      {/* 渲染所有玩家坦克 */}
      {Array.from(players.values()).map((player: Player) => (
        <TankMesh
          key={player.id}
          player={player}
          isMyPlayer={player.viewId === myViewId}
        />
      ))}
      
      {/* 渲染所有怪物 */}
      {Array.from(monsters.values()).map((monster) => (
        <MonsterMesh
          key={monster.id}
          monster={monster}
        />
      ))}
      
      {/* 渲染所有子弹 */}
      {Array.from(bullets.values()).map((bullet) => (
        <BulletMesh
          key={bullet.id}
          bullet={bullet}
        />
      ))}
      
      {/* 渲染爆炸效果 */}
      {explosions.map((explosion) => (
        <ExplosionEffect
          key={explosion.id}
          position={explosion.position}
          size={explosion.size}
          color={explosion.color}
          onComplete={() => removeExplosion(explosion.id)}
        />
      ))}
      
      {/* 场景装饰 */}
      <SceneDecorations />
    </>
  )
}

const Ground: React.FC = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial 
        color="#2d5a27" 
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
}

const SceneDecorations: React.FC = () => {
  // 使用 useMemo 确保装饰物位置只生成一次
  const treePositions = React.useMemo(() => 
    Array.from({ length: 20 }, () => [
      (Math.random() - 0.5) * 180,
      0,
      (Math.random() - 0.5) * 180
    ] as [number, number, number])
  , [])
  
  const rockPositions = React.useMemo(() => 
    Array.from({ length: 15 }, () => [
      (Math.random() - 0.5) * 190,
      0,
      (Math.random() - 0.5) * 190
    ] as [number, number, number])
  , [])

  return (
    <group>
      {/* 一些随机的树木装饰 */}
      {treePositions.map((position, i) => (
        <Tree
          key={i}
          position={position}
        />
      ))}
      
      {/* 一些石头装饰 */}
      {rockPositions.map((position, i) => (
        <Rock
          key={i}
          position={position}
        />
      ))}
    </group>
  )
}

const Tree: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  // 使用 useMemo 确保树的尺寸只生成一次
  const { trunkHeight, leavesSize } = React.useMemo(() => ({
    trunkHeight: 2 + Math.random() * 3,
    leavesSize: 1.5 + Math.random() * 2
  }), [])
  
  return (
    <group position={position}>
      {/* 树干 */}
      <mesh position={[0, trunkHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, trunkHeight, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* 树叶 */}
      <mesh position={[0, trunkHeight + leavesSize / 2, 0]} castShadow>
        <sphereGeometry args={[leavesSize, 8, 6]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
    </group>
  )
}

const Rock: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  // 使用 useMemo 确保石头的尺寸只生成一次
  const size = React.useMemo(() => 0.5 + Math.random() * 1.5, [])
  
  return (
    <mesh position={position} castShadow>
      <dodecahedronGeometry args={[size]} />
      <meshStandardMaterial color="#696969" roughness={0.9} />
    </mesh>
  )
}
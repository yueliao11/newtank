import React, { useMemo } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useMultiSynq } from './MultiSynqProvider'
import { Player, Monster } from '@/types/game'

interface MinimapProps {
  size?: number
  worldSize?: number
}

export const Minimap: React.FC<MinimapProps> = ({ 
  size = 200, 
  worldSize = 200 
}) => {
  const { players, monsters, bullets, explosions, minimapVisible } = useGameStore()
  const { myViewId } = useMultiSynq()
  
  if (!minimapVisible) return null

  // 缩放因子：将世界坐标转换为小地图坐标
  const scale = size / worldSize

  // 转换世界坐标到小地图坐标
  const worldToMinimap = (x: number, z: number) => ({
    x: (x + worldSize / 2) * scale,
    y: (z + worldSize / 2) * scale
  })

  // 获取我的玩家用于中心显示
  const myPlayer = Array.from(players.values()).find(p => p.viewId === myViewId)

  // 计算地形元素位置（基于GameScene中的装饰物）
  const terrainElements = useMemo(() => {
    const trees: Array<{ x: number; y: number }> = []
    const rocks: Array<{ x: number; y: number }> = []
    
    // 使用固定种子确保地形位置一致
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }
    
    // 模拟树木位置（与 GameScene 中的逻辑保持一致）
    for (let i = 0; i < 20; i++) {
      const worldX = (seededRandom(i * 2) - 0.5) * 180
      const worldZ = (seededRandom(i * 2 + 1) - 0.5) * 180
      const minimapPos = worldToMinimap(worldX, worldZ)
      trees.push(minimapPos)
    }
    
    // 模拟石头位置
    for (let i = 0; i < 15; i++) {
      const worldX = (seededRandom(i * 3 + 100) - 0.5) * 190
      const worldZ = (seededRandom(i * 3 + 101) - 0.5) * 190
      const minimapPos = worldToMinimap(worldX, worldZ)
      rocks.push(minimapPos)
    }
    
    return { trees, rocks }
  }, [scale, worldSize])

  return (
    <div className="fixed top-4 right-4 z-50 bg-black bg-opacity-80 border-2 border-green-400 rounded-lg p-2 shadow-lg">
      {/* 小地图标题 */}
      <div className="text-green-400 text-xs font-bold mb-1 text-center border-b border-green-400 pb-1">
        战场小地图 
        <span className="text-gray-300 ml-1">[F2]</span>
      </div>
      
      {/* 小地图画布 */}
      <div 
        className="relative bg-green-800 border border-gray-400"
        style={{ width: size, height: size }}
      >
        {/* 地形背景网格 */}
        <svg 
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* 网格线 */}
          <defs>
            <pattern id="grid" width={size / 10} height={size / 10} patternUnits="userSpaceOnUse">
              <path 
                d={`M ${size / 10} 0 L 0 0 0 ${size / 10}`} 
                fill="none" 
                stroke="rgba(255,255,255,0.1)" 
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* 中心线 */}
          <line 
            x1={size / 2} y1="0" 
            x2={size / 2} y2={size} 
            stroke="rgba(255,255,255,0.2)" 
            strokeWidth="1"
          />
          <line 
            x1="0" y1={size / 2} 
            x2={size} y2={size / 2} 
            stroke="rgba(255,255,255,0.2)" 
            strokeWidth="1"
          />
        </svg>

        {/* 地形元素 */}
        {terrainElements.trees.map((tree, index) => (
          <div
            key={`tree-${index}`}
            className="absolute w-1 h-1 bg-green-400 rounded-full"
            style={{
              left: tree.x - 0.5,
              top: tree.y - 0.5,
            }}
          />
        ))}
        
        {terrainElements.rocks.map((rock, index) => (
          <div
            key={`rock-${index}`}
            className="absolute w-1 h-1 bg-gray-400 rounded-sm"
            style={{
              left: rock.x - 0.5,
              top: rock.y - 0.5,
            }}
          />
        ))}

        {/* 怪物 */}
        {Array.from(monsters.values()).map((monster: Monster) => {
          const pos = worldToMinimap(monster.position.x, monster.position.z)
          return (
            <div key={monster.id} className="absolute">
              <div
                className="w-3 h-3 bg-red-500 rounded-full border border-red-700 animate-pulse"
                style={{
                  left: pos.x - 6,
                  top: pos.y - 6,
                }}
                title={`怪物 HP: ${monster.health}`}
              />
              {/* 怪物朝向指示器 */}
              <div
                className="absolute w-0.5 h-2 bg-red-700"
                style={{
                  left: pos.x - 1,
                  top: pos.y - 8,
                  transform: `rotate(${monster.rotation}rad)`,
                  transformOrigin: 'center bottom',
                }}
              />
            </div>
          )
        })}

        {/* 子弹 */}
        {Array.from(bullets.values()).map((bullet) => {
          const pos = worldToMinimap(bullet.position.x, bullet.position.z)
          return (
            <div
              key={bullet.id}
              className="absolute w-1 h-1 bg-yellow-300 rounded-full shadow-sm"
              style={{
                left: pos.x - 2,
                top: pos.y - 2,
              }}
            />
          )
        })}

        {/* 爆炸效果 */}
        {explosions.map((explosion) => {
          const pos = worldToMinimap(explosion.position.x, explosion.position.z)
          const explosionSize = Math.max(4, explosion.size * scale * 0.5)
          return (
            <div
              key={explosion.id}
              className="absolute animate-ping"
              style={{
                left: pos.x - explosionSize / 2,
                top: pos.y - explosionSize / 2,
                width: explosionSize,
                height: explosionSize,
              }}
            >
              <div 
                className="w-full h-full bg-orange-500 rounded-full opacity-75"
                style={{ backgroundColor: explosion.color }}
              />
            </div>
          )
        })}

        {/* 玩家坦克 */}
        {Array.from(players.values()).map((player: Player) => {
          const pos = worldToMinimap(player.position.x, player.position.z)
          const isMyPlayer = player.viewId === myViewId
          const isAlive = player.isAlive
          
          return (
            <div key={player.id} className="absolute">
              {/* 玩家坦克 */}
              <div
                className={`w-3 h-3 rounded-sm border-2 ${
                  isMyPlayer 
                    ? 'bg-blue-400 border-blue-600' 
                    : isAlive 
                      ? 'bg-green-400 border-green-600'
                      : 'bg-gray-400 border-gray-600'
                }`}
                style={{
                  left: pos.x - 6,
                  top: pos.y - 6,
                  transform: `rotate(${player.rotation}rad)`,
                }}
                title={`${isMyPlayer ? '我' : '玩家'} HP: ${player.health} 分数: ${player.score}`}
              />
              
              {/* 坦克朝向指示器 */}
              <div
                className={`absolute w-0.5 h-2 ${
                  isMyPlayer 
                    ? 'bg-blue-600' 
                    : isAlive 
                      ? 'bg-green-600'
                      : 'bg-gray-600'
                }`}
                style={{
                  left: pos.x - 1,
                  top: pos.y - 8,
                  transform: `rotate(${player.rotation}rad)`,
                  transformOrigin: 'center bottom',
                }}
              />
              
              {/* 玩家名称（仅在靠近时显示） */}
              {isMyPlayer && (
                <div
                  className="absolute text-white text-xs font-bold whitespace-nowrap"
                  style={{
                    left: pos.x - 10,
                    top: pos.y - 18,
                    textShadow: '1px 1px 2px black',
                  }}
                >
                  我
                </div>
              )}
            </div>
          )
        })}

        {/* 视野范围指示（以我的玩家为中心的圆圈） */}
        {myPlayer && (
          <div
            className="absolute border border-blue-300 border-opacity-50 rounded-full pointer-events-none"
            style={{
              width: 40,
              height: 40,
              left: worldToMinimap(myPlayer.position.x, myPlayer.position.z).x - 20,
              top: worldToMinimap(myPlayer.position.x, myPlayer.position.z).y - 20,
            }}
          />
        )}
      </div>
      
      {/* 图例 */}
      <div className="mt-2 text-gray-300 text-xs space-y-0.5 border-t border-green-400 pt-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-sm border border-blue-600"></div>
            <span>我</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-sm border border-green-600"></div>
            <span>盟友</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-500 rounded-full border border-red-700"></div>
            <span>敌人</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-1 h-1 bg-yellow-300 rounded-full"></div>
            <span>子弹</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-1 h-1 bg-green-400 rounded-full"></div>
            <span>树木</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-1 h-1 bg-gray-400 rounded-sm"></div>
            <span>石头</span>
          </div>
        </div>
      </div>
    </div>
  )
}
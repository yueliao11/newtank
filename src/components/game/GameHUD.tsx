import React from 'react'
import { useGameStore } from '@/store/gameStore'
import { useMultiSynq } from './MultiSynqProvider'
import { Player } from '@/types/game'

export const GameHUD: React.FC = () => {
  const { gameState, players, monsters, roundTimeRemaining } = useGameStore()
  const { myViewId, isConnected, session } = useMultiSynq()
  
  const myPlayer = Array.from(players.values()).find((p: Player) => p.viewId === myViewId)
  const alivePlayers = Array.from(players.values()).filter((p: Player) => p.isAlive)
  const aliveMonsters = Array.from(monsters.values()).filter(m => m.health > 0)
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  if (!isConnected) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white rounded-lg p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-bold mb-2">连接中...</h2>
          <p className="text-gray-600">正在连接到 MultiSynq 服务器</p>
        </div>
      </div>
    )
  }
  
  return (
    <>
      {/* 主要 HUD */}
      <div className="fixed inset-0 pointer-events-none z-40">
        {/* 顶部状态栏 */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          {/* 左侧：玩家信息 */}
          <div className="bg-black bg-opacity-60 rounded-lg p-4 text-white min-w-64">
            <h3 className="text-lg font-bold mb-2">玩家状态</h3>
            {myPlayer ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>生命值:</span>
                  <span className={myPlayer.health > 30 ? 'text-green-400' : 'text-red-400'}>
                    {myPlayer.health}/{myPlayer.maxHealth}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      myPlayer.health > 50 ? 'bg-green-500' :
                      myPlayer.health > 30 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(myPlayer.health / myPlayer.maxHealth) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  <span>得分:</span>
                  <span className="text-yellow-400">{myPlayer.score}</span>
                </div>
                <div className="flex justify-between">
                  <span>击杀:</span>
                  <span className="text-red-400">{myPlayer.kills || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>状态:</span>
                  <span className={myPlayer.isAlive ? 'text-green-400' : 'text-red-400'}>
                    {myPlayer.isAlive ? '存活' : '已阵亡'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400">等待加入游戏...</div>
            )}
          </div>
          
          {/* 右侧：游戏信息 */}
          <div className="bg-black bg-opacity-60 rounded-lg p-4 text-white min-w-48">
            <h3 className="text-lg font-bold mb-2">游戏状态</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>状态:</span>
                <span className={gameStateColor(gameState)}>
                  {gameStateText(gameState)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>时间:</span>
                <span className="text-blue-400">{formatTime(roundTimeRemaining)}</span>
              </div>
              <div className="flex justify-between">
                <span>玩家:</span>
                <span className="text-green-400">{alivePlayers.length}</span>
              </div>
              <div className="flex justify-between">
                <span>怪物:</span>
                <span className="text-red-400">{aliveMonsters.length}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 排行榜 */}
        <Leaderboard />
        
        {/* 十字准星 */}
        <Crosshair />
        
        {/* 控制说明 */}
        <ControlsInfo />
        
        {/* 游戏状态覆盖层 */}
        <GameStateOverlay />
      </div>
      
      {/* 死亡提示 */}
      {myPlayer && !myPlayer.isAlive && (
        <div className="fixed inset-0 flex items-center justify-center bg-red-900 bg-opacity-50 z-50">
          <div className="bg-black bg-opacity-80 rounded-lg p-8 text-center text-white">
            <h2 className="text-3xl font-bold text-red-400 mb-4">💀 已阵亡!</h2>
            <p className="text-lg mb-2">你被击败了!</p>
            <p className="text-sm text-gray-400">3秒后重生...</p>
          </div>
        </div>
      )}
    </>
  )
}

const Leaderboard: React.FC = () => {
  const { players } = useGameStore()
  
  const sortedPlayers = Array.from(players.values())
    .sort((a: Player, b: Player) => b.score - a.score)
    .slice(0, 5) // 只显示前5名
  
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
      <div className="bg-black bg-opacity-60 rounded-lg p-4 text-white min-w-80">
        <h3 className="text-lg font-bold mb-2 text-center">🏆 排行榜</h3>
        <div className="space-y-1">
          {sortedPlayers.map((player: Player, index) => (
            <div key={player.id} className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className={`w-6 text-center ${
                  index === 0 ? 'text-yellow-400' :
                  index === 1 ? 'text-gray-300' :
                  index === 2 ? 'text-orange-400' : 'text-gray-400'
                }`}>
                  {index + 1}
                </span>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="text-sm">
                  {player.address 
                    ? `${player.address.slice(0, 6)}...${player.address.slice(-4)}`
                    : `Player ${player.viewId.slice(-4)}`
                  }
                </span>
              </div>
              <div className="flex space-x-4 text-sm">
                <span className="text-yellow-400">{player.score}分</span>
                <span className="text-red-400">{player.kills || 0}杀</span>
                <span className={player.isAlive ? 'text-green-400' : 'text-gray-400'}>
                  {player.isAlive ? '存活' : '死亡'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const Crosshair: React.FC = () => {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <div className="relative">
        {/* 十字准星 */}
        <div className="absolute w-6 h-0.5 bg-white opacity-80 top-0 left-1/2 transform -translate-x-1/2 -translate-y-3" />
        <div className="absolute w-6 h-0.5 bg-white opacity-80 bottom-0 left-1/2 transform -translate-x-1/2 translate-y-3" />
        <div className="absolute w-0.5 h-6 bg-white opacity-80 left-0 top-1/2 transform -translate-x-3 -translate-y-1/2" />
        <div className="absolute w-0.5 h-6 bg-white opacity-80 right-0 top-1/2 transform translate-x-3 -translate-y-1/2" />
        
        {/* 中心点 */}
        <div className="w-1 h-1 bg-red-500 rounded-full" />
      </div>
    </div>
  )
}

const ControlsInfo: React.FC = () => {
  const [isVisible, setIsVisible] = React.useState(true)
  
  return (
    <div className="absolute bottom-4 left-4">
      <button
        className="bg-black bg-opacity-60 text-white px-3 py-1 rounded mb-2 pointer-events-auto"
        onClick={() => setIsVisible(!isVisible)}
      >
        {isVisible ? '隐藏控制' : '显示控制'}
      </button>
      
      {isVisible && (
        <div className="bg-black bg-opacity-60 rounded-lg p-4 text-white text-sm">
          <h4 className="font-bold mb-2">🎮 控制说明</h4>
          <div className="space-y-1">
            <div><kbd className="bg-gray-700 px-1 rounded">WASD</kbd> 或 <kbd className="bg-gray-700 px-1 rounded">方向键</kbd> - 移动</div>
            <div><kbd className="bg-gray-700 px-1 rounded">鼠标</kbd> - 瞄准方向</div>
            <div><kbd className="bg-gray-700 px-1 rounded">左键</kbd> 或 <kbd className="bg-gray-700 px-1 rounded">空格</kbd> - 射击</div>
            <div className="text-gray-400 text-xs mt-2">
              💡 击杀怪物获得1分，击杀玩家获得5分
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const GameStateOverlay: React.FC = () => {
  const { gameState, roundTimeRemaining } = useGameStore()
  const { session } = useMultiSynq()
  
  if (gameState === 'playing') return null
  
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-white rounded-lg p-8 text-center max-w-md">
        {gameState === 'waiting' && (
          <>
            <h2 className="text-2xl font-bold mb-4">🚀 等待开始</h2>
            <p className="text-gray-600 mb-4">等待更多玩家加入...</p>
            <div className="text-sm text-gray-500">
              <p>房间 ID: <code className="bg-gray-100 px-2 py-1 rounded">{session?.id.slice(-8)}</code></p>
              <p className="mt-2">分享链接邀请朋友一起游戏!</p>
            </div>
          </>
        )}
        
        {gameState === 'finished' && (
          <>
            <h2 className="text-2xl font-bold mb-4">🏁 游戏结束</h2>
            <p className="text-gray-600 mb-4">时间到!</p>
            <p className="text-sm text-gray-500">正在计算最终排名...</p>
          </>
        )}
        
        {gameState === 'results' && (
          <>
            <h2 className="text-2xl font-bold mb-4">🎉 游戏结果</h2>
            <p className="text-gray-600 mb-4">查看最终排行榜</p>
            <p className="text-sm text-gray-500">新游戏即将开始...</p>
          </>
        )}
      </div>
    </div>
  )
}

// 辅助函数
const gameStateColor = (state: string) => {
  switch (state) {
    case 'waiting':
      return 'text-yellow-400'
    case 'playing':
      return 'text-green-400'
    case 'finished':
      return 'text-red-400'
    case 'results':
      return 'text-blue-400'
    default:
      return 'text-gray-400'
  }
}

const gameStateText = (state: string) => {
  switch (state) {
    case 'waiting':
      return '等待中'
    case 'playing':
      return '进行中'
    case 'finished':
      return '已结束'
    case 'results':
      return '结果展示'
    default:
      return '未知'
  }
}
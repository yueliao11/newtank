import React, { createContext, useContext, useEffect, useState } from 'react'
import * as Multisynq from '@multisynq/client'
import { MULTISYNQ_CONFIG } from '@/lib/gameConfig'
import { GameModel } from '@/game/models/GameModel'
import { useGameStore } from '@/store/gameStore'

interface MultiSynqContextType {
  session: any
  isConnected: boolean
  gameModel: GameModel | null
  myViewId: string
  error: string | null
}

const MultiSynqContext = createContext<MultiSynqContextType | null>(null)

export const useMultiSynq = () => {
  const context = useContext(MultiSynqContext)
  if (!context) {
    throw new Error('useMultiSynq must be used within a MultiSynqProvider')
  }
  return context
}

interface MultiSynqProviderProps {
  children: React.ReactNode
  userAddress?: string
}

export const MultiSynqProvider: React.FC<MultiSynqProviderProps> = ({ 
  children, 
  userAddress 
}) => {
  const [session, setSession] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [gameModel, setGameModel] = useState<GameModel | null>(null)
  const [myViewId, setMyViewId] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    connectToSession()
  }, [userAddress])

  const connectToSession = async () => {
    try {
      setError(null)
      
      // 生成随机颜色
      const playerColor = `hsl(${Math.random() * 360}, 70%, 60%)`
      
      console.log('Connecting to MultiSynq session...')
      
      const multisynqSession = await Multisynq.Session.join({
        apiKey: MULTISYNQ_CONFIG.apiKey,
        appId: MULTISYNQ_CONFIG.appId,
        model: GameModel,
        view: GameView,
        viewData: {
          address: userAddress || '',
          color: playerColor,
        },
        // name: "tank-battle-room", // 取消注释以使用固定房间名
        // password: "123456", // 取消注释以使用房间密码
      })
      
      setSession(multisynqSession)
      setIsConnected(true)
      setMyViewId(multisynqSession.view.viewId)
      // 使用一个虚拟的GameModel实例作为占位符
      setGameModel(new GameModel())
      
      console.log('Connected to MultiSynq session:', multisynqSession.id)
      console.log('My view ID:', multisynqSession.view.viewId)
      
    } catch (err) {
      console.error('Failed to connect to MultiSynq:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }

  const value: MultiSynqContextType = {
    session,
    isConnected,
    gameModel,
    myViewId,
    error,
  }

  return (
    <MultiSynqContext.Provider value={value}>
      {children}
    </MultiSynqContext.Provider>
  )
}

// MultiSynq View 类
class GameView extends Multisynq.View {
  constructor(model: GameModel) {
    super(model)
    
    // 订阅游戏事件
    this.subscribe('game', 'state-update', this.onGameStateUpdate)
    this.subscribe('game', 'player-joined', this.onPlayerJoined)
    this.subscribe('game', 'player-left', this.onPlayerLeft)
    this.subscribe('game', 'game-started', this.onGameStarted)
    this.subscribe('game', 'game-ended', this.onGameEnded)
    this.subscribe('game', 'game-restarted', this.onGameRestarted)
    this.subscribe('game', 'monsters-spawned', this.onMonstersSpawned)
    this.subscribe('game', 'explosion', this.onExplosion)
    this.subscribe('game', 'player-shot', this.onPlayerShot)
    
    console.log('GameView initialized for viewId:', this.viewId)
  }

  onGameStateUpdate(data: any) {
    const store = useGameStore.getState()
    
    // 更新游戏状态
    store.setGameState(data.gameState)
    store.setRoundTimeRemaining(data.roundTimeRemaining)
    store.setMonstersRemaining(data.monstersCount)
    
    // 更新玩家数据 - 使用地址去重
    const playersMap = new Map()
    const addressToViewId = new Map()
    
    data.players.forEach((playerData: any) => {
      const address = playerData.address
      
      // 如果有地址，检查是否已存在相同地址的玩家
      if (address && addressToViewId.has(address)) {
        const existingViewId = addressToViewId.get(address)
        const existingPlayer = playersMap.get(existingViewId)
        
        // 保留分数更高的玩家
        if (!existingPlayer || playerData.score > existingPlayer.score) {
          playersMap.delete(existingViewId)
          playersMap.set(playerData.viewId, playerData)
          addressToViewId.set(address, playerData.viewId)
        }
      } else {
        playersMap.set(playerData.viewId, playerData)
        if (address) {
          addressToViewId.set(address, playerData.viewId)
        }
      }
    })
    
    store.setPlayers(playersMap)
    
    // 更新怪物数据
    const monstersMap = new Map()
    data.monsters.forEach((monsterData: any) => {
      monstersMap.set(monsterData.id, monsterData)
    })
    store.setMonsters(monstersMap)
    
    // 更新子弹数据
    const bulletsMap = new Map()
    data.bullets.forEach((bulletData: any) => {
      bulletsMap.set(bulletData.id, bulletData)
    })
    store.setBullets(bulletsMap)
  }

  onPlayerJoined(data: any) {
    console.log('Player joined:', data.viewId)
    const store = useGameStore.getState()
    store.addPlayer(data.player)
  }

  onPlayerLeft(data: any) {
    console.log('Player left:', data.viewId)
    const store = useGameStore.getState()
    store.removePlayer(data.viewId)
  }

  onGameStarted(data: any) {
    console.log('Game started')
    const store = useGameStore.getState()
    store.setGameState(data.gameState)
  }

  onGameEnded(data: any) {
    console.log('Game ended')
    const store = useGameStore.getState()
    store.setGameState(data.gameState)
    store.setLeaderboard(data.leaderboard)
  }

  onGameRestarted(data: any) {
    console.log('Game restarted')
    const store = useGameStore.getState()
    store.setGameState(data.gameState)
  }

  onMonstersSpawned(data: any) {
    console.log('Monsters spawned:', data.monsters.length)
    const store = useGameStore.getState()
    const monstersMap = new Map()
    data.monsters.forEach((monster: any) => {
      monstersMap.set(monster.id, monster)
    })
    store.setMonsters(monstersMap)
  }

  onExplosion(data: any) {
    console.log('Explosion triggered:', data)
    const store = useGameStore.getState()
    store.addExplosion(data.position, data.size, data.color)
  }

  onPlayerShot(data: any) {
    console.log('Player shot:', data)
    const store = useGameStore.getState()
    store.addMuzzleFlash(data.playerId, data.position, data.rotation)
  }

  // 发送输入到游戏模型
  sendInput(type: string, data: any) {
    this.publish(this.viewId, 'input', { type, data })
  }

  // 更新方法（每帧调用）
  update(_time: number) {
    // 这里可以添加客户端特定的更新逻辑
    // 比如插值、预测等
  }
}
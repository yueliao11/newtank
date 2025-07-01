import React, { useState } from 'react'
import { WalletProvider, WalletConnectButton, useWallet } from './components/auth/WalletConnector'
import { MultiSynqProvider } from './components/game/MultiSynqProvider'
import { GameScene } from './components/game/GameScene'
import { GameHUD } from './components/game/GameHUD'
import { PlayerControls, MobileControls } from './components/game/PlayerControls'
import { ErrorBoundary } from './components/ErrorBoundary'

function App() {
  return (
    <WalletProvider>
      <div className="w-full h-screen bg-gray-900 overflow-hidden">
        <AppContent />
      </div>
    </WalletProvider>
  )
}

const AppContent: React.FC = () => {
  const { address } = useWallet()
  const [showGame, setShowGame] = useState(false) // 默认显示欢迎界面

  if (!showGame) {
    return <WelcomeScreen onStartGame={() => setShowGame(true)} />
  }

  return (
    <ErrorBoundary>
      <MultiSynqProvider userAddress={address || undefined}>
        <GameView />
      </MultiSynqProvider>
    </ErrorBoundary>
  )
}

const WelcomeScreen: React.FC<{ onStartGame: () => void }> = ({ onStartGame }) => {
  const { isConnected, address, isCorrectNetwork } = useWallet()

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black">
      <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 text-white">
        <div className="text-center">
          {/* 游戏标题 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              🛡️ Monad Tank Battle
            </h1>
            <p className="text-gray-300">多人实时坦克对战游戏</p>
          </div>

          {/* 游戏特性 */}
          <div className="mb-8 space-y-3 text-left">
            <div className="flex items-center space-x-3">
              <span className="text-green-400">✓</span>
              <span>实时多人联机对战</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-400">✓</span>
              <span>Web3 钱包身份认证</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-400">✓</span>
              <span>确定性状态同步</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-400">✓</span>
              <span>3D 图形和物理引擎</span>
            </div>
          </div>

          {/* 钱包连接 */}
          <div className="mb-6">
            <WalletConnectButton />
          </div>

          {/* 开始游戏按钮 */}
          <button
            onClick={onStartGame}
            className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            🚀 开始游戏
          </button>

          {/* 状态提示 */}
          <div className="mt-4 text-sm">
            {isConnected ? (
              <div className="space-y-2">
                <p className="text-green-400">✅ 钱包已连接：{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                {isCorrectNetwork ? (
                  <p className="text-green-400">🌐 已连接到 Monad Testnet</p>
                ) : (
                  <p className="text-yellow-400">⚠️ 请切换到 Monad Testnet 网络</p>
                )}
              </div>
            ) : (
              <p className="text-gray-400">💡 可以不连接钱包直接游戏，或连接钱包获得身份标识</p>
            )}
          </div>

          {/* 游戏说明 */}
          <div className="mt-6 text-xs text-gray-500 text-left">
            <h4 className="font-semibold mb-2">游戏玩法：</h4>
            <ul className="space-y-1">
              <li>• 使用 WASD 或方向键移动坦克</li>
              <li>• 鼠标控制瞄准方向</li>
              <li>• 左键或空格键射击</li>
              <li>• 击杀怪物获得 1 分，击杀玩家获得 5 分</li>
              <li>• 避免被怪物或其他玩家击中</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

const GameView: React.FC = () => {
  return (
    <div className="relative w-full h-full">
      {/* 3D 游戏场景 */}
      <GameScene />
      
      {/* 游戏 HUD */}
      <GameHUD />
      
      {/* 玩家控制 */}
      <PlayerControls />
      
      {/* 移动端控制 */}
      <MobileControls />
      
      {/* 返回主菜单按钮 */}
      <ReturnToMenuButton />
    </div>
  )
}

const ReturnToMenuButton: React.FC = () => {
  const handleReturn = () => {
    if (confirm('确定要返回主菜单吗？这将断开游戏连接。')) {
      window.location.reload()
    }
  }

  return (
    <button
      onClick={handleReturn}
      className="fixed top-4 right-4 bg-black bg-opacity-60 hover:bg-opacity-80 text-white px-4 py-2 rounded-lg transition-all duration-200 z-50 pointer-events-auto"
    >
      ⬅️ 返回主菜单
    </button>
  )
}

export default App
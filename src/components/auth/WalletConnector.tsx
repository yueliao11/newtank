import React, { createContext, useContext, useEffect, useState } from 'react'
import { switchToMonadTestnet, isMonadTestnet } from '@/lib/networks'

// 简化的钱包连接器，不依赖外部 Web3 库
interface WalletContextType {
  isConnected: boolean
  address: string | null
  isLoading: boolean
  error: string | null
  isCorrectNetwork: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchNetwork: () => Promise<void>
}

const WalletContext = createContext<WalletContextType | null>(null)

export const useWallet = () => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

interface WalletProviderProps {
  children: React.ReactNode
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)

  // 检查是否已连接钱包
  useEffect(() => {
    checkConnection()
  }, [])

  // 监听网络变化
  useEffect(() => {
    if (isConnected) {
      checkNetwork()
    }
  }, [isConnected])

  const checkConnection = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setIsConnected(true)
          // 同时检查网络
          await checkNetwork()
        }
      }
    } catch (err) {
      console.log('No previous wallet connection found')
    }
  }

  const checkNetwork = async () => {
    try {
      const correctNetwork = await isMonadTestnet()
      setIsCorrectNetwork(correctNetwork)
      if (!correctNetwork) {
        setError('请切换到 Monad Testnet 网络')
      } else {
        setError(null)
      }
    } catch (err) {
      console.error('检查网络失败:', err)
      setIsCorrectNetwork(false)
    }
  }

  const switchNetwork = async () => {
    try {
      setIsLoading(true)
      setError(null)
      await switchToMonadTestnet()
      await checkNetwork()
    } catch (err: any) {
      setError(err.message || '切换网络失败')
      console.error('Network switch error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const connect = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (typeof window.ethereum === 'undefined') {
        throw new Error('请安装 MetaMask 或其他 Web3 钱包')
      }

      // 请求账户连接
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length === 0) {
        throw new Error('未找到钱包账户')
      }

      setAddress(accounts[0])
      setIsConnected(true)
      
      // 连接成功后检查网络
      await checkNetwork()
      
      // 监听账户变化
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

    } catch (err: any) {
      setError(err.message || '连接钱包失败')
      console.error('Wallet connection error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = () => {
    setAddress(null)
    setIsConnected(false)
    setError(null)
    setIsCorrectNetwork(false)
    
    // 移除事件监听器
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
  }

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect()
    } else {
      setAddress(accounts[0])
    }
  }

  const handleChainChanged = async () => {
    // 链改变时重新检查网络
    if (isConnected) {
      await checkNetwork()
    }
  }

  const value: WalletContextType = {
    isConnected,
    address,
    isLoading,
    error,
    isCorrectNetwork,
    connect,
    disconnect,
    switchNetwork,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export const WalletConnectButton: React.FC = () => {
  const { 
    isConnected, 
    address, 
    isLoading, 
    error, 
    isCorrectNetwork, 
    connect, 
    disconnect, 
    switchNetwork 
  } = useWallet()

  if (isConnected && address) {
    return (
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-2 rounded-lg ${
            isCorrectNetwork 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            <div className="text-xs">
              {isCorrectNetwork ? '已连接 Monad Testnet' : '网络错误'}
            </div>
            <div className="font-mono text-sm">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          </div>
          <button
            onClick={disconnect}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            断开连接
          </button>
        </div>
        
        {/* 网络切换按钮 */}
        {!isCorrectNetwork && (
          <button
            onClick={switchNetwork}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>切换中...</span>
              </>
            ) : (
              <span>切换到 Monad Testnet</span>
            )}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={connect}
        disabled={isLoading}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            <span>连接中...</span>
          </>
        ) : (
          <>
            <span>🦊</span>
            <span>连接钱包</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="bg-red-100 text-red-800 px-3 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div className="text-xs text-gray-500 max-w-sm">
        连接钱包后，你的地址将作为游戏中的身份标识。请确保连接到 Monad Testnet 网络。
      </div>
    </div>
  )
}

// 声明 window.ethereum 类型
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, handler: (...args: any[]) => void) => void
      removeListener: (event: string, handler: (...args: any[]) => void) => void
      isMetaMask?: boolean
    }
  }
}
import React, { createContext, useContext, useEffect, useState } from 'react'

// 简化的钱包连接器，不依赖外部 Web3 库
interface WalletContextType {
  isConnected: boolean
  address: string | null
  isLoading: boolean
  error: string | null
  connect: () => Promise<void>
  disconnect: () => void
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

  // 检查是否已连接钱包
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setIsConnected(true)
        }
      }
    } catch (err) {
      console.log('No previous wallet connection found')
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

  const handleChainChanged = () => {
    // 链改变时重新加载页面（简单处理）
    window.location.reload()
  }

  const value: WalletContextType = {
    isConnected,
    address,
    isLoading,
    error,
    connect,
    disconnect,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export const WalletConnectButton: React.FC = () => {
  const { isConnected, address, isLoading, error, connect, disconnect } = useWallet()

  if (isConnected && address) {
    return (
      <div className="flex items-center space-x-4">
        <div className="bg-green-100 text-green-800 px-3 py-2 rounded-lg">
          <div className="text-xs">已连接</div>
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
        连接钱包后，你的地址将作为游戏中的身份标识
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
    }
  }
}
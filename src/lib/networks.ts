// Monad Testnet 网络配置
export const MONAD_TESTNET = {
  chainId: '0x279f', // 10143 in hex
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: [
    'https://testnet-rpc.monad.xyz',
    'https://monad-testnet.drpc.org',
  ],
  blockExplorerUrls: [
    'https://testnet-explorer.monad.xyz',
  ],
  iconUrls: [], // 可以添加 Monad 图标 URL
}

// 支持的网络列表
export const SUPPORTED_NETWORKS = {
  MONAD_TESTNET,
}

// 默认网络
export const DEFAULT_NETWORK = MONAD_TESTNET

// 网络切换函数
export const switchToMonadTestnet = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('请安装 MetaMask 或其他 Web3 钱包')
  }

  try {
    // 尝试切换到 Monad Testnet
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MONAD_TESTNET.chainId }],
    })
  } catch (switchError: any) {
    // 如果网络不存在，添加网络
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [MONAD_TESTNET],
        })
      } catch (addError) {
        throw new Error('添加 Monad Testnet 网络失败')
      }
    } else {
      throw new Error('切换到 Monad Testnet 失败')
    }
  }
}

// 检查当前网络是否为 Monad Testnet
export const isMonadTestnet = async (): Promise<boolean> => {
  if (typeof window.ethereum === 'undefined') {
    return false
  }

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' })
    return chainId === MONAD_TESTNET.chainId
  } catch (error) {
    console.error('检查网络失败:', error)
    return false
  }
}

// 获取当前网络信息
export const getCurrentNetwork = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('请安装 MetaMask 或其他 Web3 钱包')
  }

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' })
    return {
      chainId,
      isMonadTestnet: chainId === MONAD_TESTNET.chainId,
      networkName: chainId === MONAD_TESTNET.chainId ? 'Monad Testnet' : '未知网络',
    }
  } catch (error) {
    throw new Error('获取网络信息失败')
  }
}
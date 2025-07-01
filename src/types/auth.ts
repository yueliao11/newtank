export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  address?: string
  error?: string
}

export interface Web3Config {
  projectId: string
  chains: any[]
  metadata: {
    name: string
    description: string
    url: string
    icons: string[]
  }
}
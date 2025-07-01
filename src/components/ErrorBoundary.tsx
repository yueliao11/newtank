import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">🚨 游戏遇到了问题</h2>
            <p className="text-gray-300 mb-4">
              游戏在加载过程中遇到了错误，请尝试刷新页面。
            </p>
            <details className="mb-4 text-left max-w-lg">
              <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                查看错误详情
              </summary>
              <pre className="mt-2 p-4 bg-gray-800 rounded text-sm overflow-auto">
                {this.state.error?.stack || this.state.error?.message}
              </pre>
            </details>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              🔄 刷新页面
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
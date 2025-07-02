import React, { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useMultiSynq } from './MultiSynqProvider'

export const PlayerControls: React.FC = () => {
  const { session, isConnected } = useMultiSynq()
  const { inputState, setInputState } = useGameStore()
  const keysPressed = useRef<Set<string>>(new Set())
  const mousePosition = useRef({ x: 0, y: 0 })
  const lastInputSent = useRef({ move: 0, rotate: 0, shoot: 0 })
  
  // 发送移动输入到服务器
  const sendMoveInput = useCallback(() => {
    if (!session?.view || !isConnected) return
    
    const now = Date.now()
    if (now - lastInputSent.current.move < 16) return // 限制到 60fps，最大化响应性
    
    const moveData = {
      moveForward: inputState.moveForward,
      moveBackward: inputState.moveBackward,
      moveLeft: inputState.moveLeft,
      moveRight: inputState.moveRight,
    }
    
    session.view.sendInput('move', moveData)
    lastInputSent.current.move = now
  }, [session, isConnected, inputState])
  
  // 发送旋转输入到服务器
  const sendRotateInput = useCallback((rotation: number) => {
    if (!session?.view || !isConnected) return
    
    const now = Date.now()
    if (now - lastInputSent.current.rotate < 16) return // 限制到 60fps，最大化响应性
    
    session.view.sendInput('rotate', { rotation })
    lastInputSent.current.rotate = now
  }, [session, isConnected])
  
  // 发送射击输入到服务器
  const sendShootInput = useCallback((shoot: boolean) => {
    if (!session?.view || !isConnected) return
    
    const now = Date.now()
    if (now - lastInputSent.current.shoot < 100) return // 限制射击频率
    
    session.view.sendInput('shoot', { shoot })
    lastInputSent.current.shoot = now
  }, [session, isConnected])
  
  // 处理键盘按下事件
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    
    if (keysPressed.current.has(key)) return
    keysPressed.current.add(key)
    
    let needsUpdate = false
    const newInputState = { ...inputState }
    
    switch (key) {
      case 'w':
      case 'arrowup':
        newInputState.moveForward = true
        needsUpdate = true
        break
      case 's':
      case 'arrowdown':
        newInputState.moveBackward = true
        needsUpdate = true
        break
      case 'a':
      case 'arrowleft':
        newInputState.moveLeft = true
        needsUpdate = true
        break
      case 'd':
      case 'arrowright':
        newInputState.moveRight = true
        needsUpdate = true
        break
      case ' ':
        event.preventDefault()
        newInputState.shoot = true
        sendShootInput(true)
        break
      case 'f2':
        event.preventDefault()
        {
          const { minimapVisible, setMinimapVisible } = useGameStore.getState()
          setMinimapVisible(!minimapVisible)
        }
        break
    }
    
    if (needsUpdate) {
      setInputState(newInputState)
      // 立即发送移动输入，提高响应性
      setTimeout(() => sendMoveInput(), 0)
    }
  }, [inputState, setInputState, sendShootInput, sendMoveInput])
  
  // 处理键盘释放事件
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    keysPressed.current.delete(key)
    
    let needsUpdate = false
    const newInputState = { ...inputState }
    
    switch (key) {
      case 'w':
      case 'arrowup':
        newInputState.moveForward = false
        needsUpdate = true
        break
      case 's':
      case 'arrowdown':
        newInputState.moveBackward = false
        needsUpdate = true
        break
      case 'a':
      case 'arrowleft':
        newInputState.moveLeft = false
        needsUpdate = true
        break
      case 'd':
      case 'arrowright':
        newInputState.moveRight = false
        needsUpdate = true
        break
      case ' ':
        newInputState.shoot = false
        break
    }
    
    if (needsUpdate) {
      setInputState(newInputState)
      // 立即发送移动输入，提高响应性
      setTimeout(() => sendMoveInput(), 0)
    }
  }, [inputState, setInputState, sendMoveInput])
  
  // 处理鼠标移动事件
  const handleMouseMove = useCallback((event: MouseEvent) => {
    const rect = (event.target as HTMLElement)?.getBoundingClientRect()
    if (!rect) return
    
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const mouseX = event.clientX - rect.left - centerX
    const mouseY = event.clientY - rect.top - centerY
    
    // 计算旋转角度
    const rotation = Math.atan2(mouseX, -mouseY)
    
    mousePosition.current = { x: mouseX, y: mouseY }
    setInputState({ mouseX, mouseY })
    
    sendRotateInput(rotation)
  }, [setInputState, sendRotateInput])
  
  // 处理鼠标点击事件
  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button === 0) { // 左键
      event.preventDefault()
      setInputState({ shoot: true })
      sendShootInput(true)
    }
  }, [setInputState, sendShootInput])
  
  const handleMouseUp = useCallback((event: MouseEvent) => {
    if (event.button === 0) { // 左键
      setInputState({ shoot: false })
    }
  }, [setInputState])
  
  // 处理右键菜单
  const handleContextMenu = useCallback((event: Event) => {
    event.preventDefault()
  }, [])
  
  // 处理窗口失去焦点
  const handleBlur = useCallback(() => {
    // 清除所有输入状态
    keysPressed.current.clear()
    setInputState({
      moveForward: false,
      moveBackward: false,
      moveLeft: false,
      moveRight: false,
      shoot: false,
    })
  }, [setInputState])
  
  // 监听输入状态变化并发送到服务器
  useEffect(() => {
    sendMoveInput()
  }, [inputState.moveForward, inputState.moveBackward, inputState.moveLeft, inputState.moveRight, sendMoveInput])
  
  // 设置事件监听器
  useEffect(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    
    // 确保 canvas 可以接收焦点
    canvas.tabIndex = -1
    canvas.focus()
    
    // 添加事件监听器
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mousedown', handleMouseDown)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('contextmenu', handleContextMenu)
    window.addEventListener('blur', handleBlur)
    
    // 点击 canvas 时获取焦点
    const handleCanvasClick = () => {
      canvas.focus()
    }
    canvas.addEventListener('click', handleCanvasClick)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mousedown', handleMouseDown)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('contextmenu', handleContextMenu)
      canvas.removeEventListener('click', handleCanvasClick)
      window.removeEventListener('blur', handleBlur)
    }
  }, [
    handleKeyDown,
    handleKeyUp,
    handleMouseMove,
    handleMouseDown,
    handleMouseUp,
    handleContextMenu,
    handleBlur,
  ])
  
  return null // 这个组件不渲染任何内容
}

// 移动端控制组件
export const MobileControls: React.FC = () => {
  const { session, isConnected } = useMultiSynq()
  const { setInputState } = useGameStore()
  const [isMobile, setIsMobile] = React.useState(false)
  const lastInputSent = useRef({ move: 0, rotate: 0, shoot: 0 })
  
  useEffect(() => {
    // 检测是否为移动设备
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const sendInput = useCallback((type: string, data: any) => {
    if (!session?.view || !isConnected) return
    
    const now = Date.now()
    if (now - lastInputSent.current[type as keyof typeof lastInputSent.current] < 16) return
    
    session.view.sendInput(type, data)
    lastInputSent.current[type as keyof typeof lastInputSent.current] = now
  }, [session, isConnected])
  
  if (!isMobile) return null
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* 虚拟摇杆 */}
      <VirtualJoystick
        onMove={(direction) => {
          const moveData = {
            moveForward: direction.y > 0.3,
            moveBackward: direction.y < -0.3,
            moveLeft: direction.x < -0.3,
            moveRight: direction.x > 0.3,
          }
          
          setInputState(moveData)
          sendInput('move', {
            moveForward: moveData.moveForward,
            moveBackward: moveData.moveBackward,
            moveLeft: moveData.moveLeft,
            moveRight: moveData.moveRight,
          })
        }}
      />
      
      {/* 射击按钮 */}
      <TouchButton
        className="bottom-8 right-8"
        onPress={() => sendInput('shoot', { shoot: true })}
        onRelease={() => sendInput('shoot', { shoot: false })}
      >
        🔥
      </TouchButton>
      
      {/* 旋转控制区域 */}
      <TouchRotateArea
        onRotate={(rotation) => sendInput('rotate', { rotation })}
      />
    </div>
  )
}

// 虚拟摇杆组件
const VirtualJoystick: React.FC<{
  onMove: (direction: { x: number; y: number }) => void
}> = ({ onMove }) => {
  const [isActive, setIsActive] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [center, setCenter] = React.useState({ x: 0, y: 0 })
  const joystickRef = useRef<HTMLDivElement>(null)
  
  const handleStart = (clientX: number, clientY: number) => {
    setIsActive(true)
    setCenter({ x: clientX, y: clientY })
    setPosition({ x: clientX, y: clientY })
  }
  
  const handleMove = (clientX: number, clientY: number) => {
    if (!isActive) return
    
    const dx = clientX - center.x
    const dy = clientY - center.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDistance = 50
    
    if (distance > maxDistance) {
      const angle = Math.atan2(dy, dx)
      setPosition({
        x: center.x + Math.cos(angle) * maxDistance,
        y: center.y + Math.sin(angle) * maxDistance,
      })
      
      onMove({
        x: Math.cos(angle),
        y: Math.sin(angle),
      })
    } else {
      setPosition({ x: clientX, y: clientY })
      onMove({
        x: distance > 10 ? dx / maxDistance : 0,
        y: distance > 10 ? dy / maxDistance : 0,
      })
    }
  }
  
  const handleEnd = () => {
    setIsActive(false)
    onMove({ x: 0, y: 0 })
  }
  
  return (
    <div
      ref={joystickRef}
      className="fixed bottom-8 left-8 w-24 h-24 pointer-events-auto"
      onTouchStart={(e) => {
        const touch = e.touches[0]
        handleStart(touch.clientX, touch.clientY)
      }}
      onTouchMove={(e) => {
        const touch = e.touches[0]
        handleMove(touch.clientX, touch.clientY)
      }}
      onTouchEnd={handleEnd}
    >
      {/* 摇杆底座 */}
      <div className="w-full h-full bg-white bg-opacity-30 rounded-full border-2 border-white border-opacity-50" />
      
      {/* 摇杆把手 */}
      {isActive && (
        <div
          className="absolute w-8 h-8 bg-white bg-opacity-70 rounded-full transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: position.x - center.x + 48,
            top: position.y - center.y + 48,
          }}
        />
      )}
    </div>
  )
}

// 触摸按钮组件
const TouchButton: React.FC<{
  className: string
  onPress: () => void
  onRelease: () => void
  children: React.ReactNode
}> = ({ className, onPress, onRelease, children }) => {
  return (
    <div
      className={`fixed w-16 h-16 bg-white bg-opacity-30 rounded-full border-2 border-white border-opacity-50 flex items-center justify-center text-2xl pointer-events-auto ${className}`}
      onTouchStart={onPress}
      onTouchEnd={onRelease}
      onMouseDown={onPress}
      onMouseUp={onRelease}
    >
      {children}
    </div>
  )
}

// 旋转控制区域
const TouchRotateArea: React.FC<{
  onRotate: (rotation: number) => void
}> = ({ onRotate }) => {
  const handleTouch = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const rect = e.currentTarget.getBoundingClientRect()
    
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const x = touch.clientX - rect.left - centerX
    const y = touch.clientY - rect.top - centerY
    
    const rotation = Math.atan2(x, -y)
    onRotate(rotation)
  }
  
  return (
    <div
      className="fixed inset-0 pointer-events-auto bg-transparent"
      onTouchMove={handleTouch}
      style={{ zIndex: -1 }}
    />
  )
}
# 🛡️ Monad Tank Battle

一个基于 MultiSynq 技术的多人实时坦克对战游戏，支持 Web3 钱包连接和确定性状态同步。

![游戏截图](./docs/screenshot.png)

## ✨ 特性

- 🎮 **实时多人对战** - 使用 MultiSynq 确保所有玩家状态完全同步
- 🔗 **Web3 集成** - 支持 MetaMask 等钱包连接，区块链身份认证
- 🎯 **3D 图形** - 基于 Three.js 的 3D 渲染引擎
- 📱 **移动端支持** - 响应式设计，支持触控操作
- 🎨 **实时 HUD** - 生命值、得分、排行榜等实时显示
- 🤖 **智能 AI** - 怪物具有追击、攻击等 AI 行为
- ⚡ **高性能** - 60 FPS 流畅游戏体验

## 🎯 游戏玩法

### 基本操作
- **移动**: `WASD` 或方向键
- **瞄准**: 鼠标移动
- **射击**: 左键点击或空格键
- **移动端**: 虚拟摇杆 + 触控按钮

### 游戏规则
- 🎯 击杀怪物获得 **1 分**
- ⚔️ 击杀玩家获得 **5 分**
- 💚 生命值 100，被击中减少 20 点
- 🔁 死亡后 3 秒自动重生
- ⏰ 每局游戏 3 分钟

### 获胜条件
- 回合结束时得分最高的玩家获胜
- 或者成为最后存活的玩家

## 🚀 快速开始

### 环境要求
- Node.js 18+
- 现代浏览器（支持 WebGL）
- MetaMask 或其他 Web3 钱包（可选）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd monad-tank-battle
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# MultiSynq API Key - 从 https://multisynq.io/coder 获取
VITE_MULTISYNQ_API_KEY=your_multisynq_api_key

# WalletConnect Project ID - 从 https://cloud.walletconnect.com 获取（可选）
VITE_WALLETCONNECT_PROJECT_ID=your_project_id

# 应用 URL
VITE_APP_URL=http://localhost:5173
```

4. **启动开发服务器**
```bash
npm run dev
```

5. **打开游戏**
访问 `http://localhost:5173` 即可开始游戏！

### 生产部署

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 🔧 技术架构

### 核心技术栈
- **前端框架**: React 18 + TypeScript
- **3D 引擎**: Three.js + React Three Fiber
- **状态管理**: Zustand
- **同步技术**: MultiSynq (确定性状态同步)
- **样式框架**: TailwindCSS
- **构建工具**: Vite

### 项目结构
```
src/
├── components/           # React 组件
│   ├── auth/            # 认证相关组件
│   ├── game/            # 游戏核心组件
│   └── ui/              # UI 组件
├── game/                # 游戏逻辑模型
│   └── models/          # MultiSynq 模型
├── store/               # 状态管理
├── types/               # TypeScript 类型
├── lib/                 # 工具库和配置
└── assets/              # 静态资源
```

### MultiSynq 架构

游戏使用 MultiSynq 的 Model/View 模式：

- **Model** (服务端逻辑): 
  - `GameModel`: 游戏主循环和状态管理
  - `PlayerModel`: 玩家逻辑和控制
  - `MonsterModel`: AI 怪物行为
  - `BulletModel`: 子弹物理和碰撞

- **View** (客户端渲染):
  - `GameScene`: 3D 场景渲染
  - `GameHUD`: 用户界面
  - `PlayerControls`: 输入处理

## 🎮 多人联机

### 房间系统
- 自动生成唯一房间 ID
- 支持 QR 码分享邀请
- 最多支持 8 人同时游戏

### 同步机制
- 使用 MultiSynq 确保状态完全同步
- 20 FPS 服务端模拟 + 60 FPS 客户端渲染
- 自动处理网络延迟和断线重连

### 加入游戏
1. 打开游戏链接
2. 连接钱包（可选）
3. 自动匹配或创建房间
4. 等待其他玩家加入
5. 游戏自动开始

## 🛠️ 开发指南

### 添加新功能

1. **新游戏实体**
```typescript
// 1. 定义类型
interface NewEntity {
  id: string
  position: Position
  // ...其他属性
}

// 2. 创建模型
class NewEntityModel extends Multisynq.Model {
  init(options: any) {
    // 初始化逻辑
  }
  
  update() {
    // 更新逻辑
  }
}

// 3. 创建视图组件
const NewEntityMesh: React.FC = ({ entity }) => {
  return (
    <mesh position={[entity.position.x, entity.position.y, entity.position.z]}>
      {/* 3D 模型 */}
    </mesh>
  )
}
```

2. **新UI界面**
```typescript
const NewUIComponent: React.FC = () => {
  const gameStore = useGameStore()
  const { session } = useMultiSynq()
  
  return (
    <div className="fixed top-4 left-4">
      {/* UI 内容 */}
    </div>
  )
}
```

### 调试技巧

1. **开发者工具**
- 按 F12 打开控制台查看日志
- MultiSynq 事件和状态变化都有详细日志

2. **网络问题**
- 检查 MultiSynq API Key 是否正确
- 确保网络连接稳定
- 查看控制台网络错误

3. **性能优化**
- 使用 React DevTools 检查渲染性能
- 监控 Three.js 的渲染调用次数
- 优化材质和几何体复用

## 🌟 高级功能

### 自定义房间
```javascript
// 加入指定房间
const session = await Multisynq.Session.join({
  // ...其他配置
  name: "my-custom-room",
  password: "room-password",
})
```

### 扩展 AI 行为
```typescript
class CustomMonster extends MonsterModel {
  customBehavior() {
    // 自定义 AI 逻辑
    switch (this.state) {
      case 'custom':
        // 特殊行为
        break
    }
  }
}
```

### 添加特效
```typescript
const ExplosionEffect: React.FC = ({ position }) => {
  return (
    <group position={position}>
      {/* 粒子效果 */}
      <pointLight color="#ff4400" intensity={2} distance={10} />
    </group>
  )
}
```

## 📝 API 参考

### 游戏配置
```typescript
export const GAME_CONFIG = {
  PLAYER_HEALTH: 100,        // 玩家生命值
  BULLET_DAMAGE: 20,         // 子弹伤害
  BULLET_COOLDOWN: 500,      // 射击冷却时间(ms)
  MONSTER_COUNT: 6,          // 怪物数量
  ROUND_SECONDS: 180,        // 回合时长(秒)
}
```

### 状态管理
```typescript
const gameStore = useGameStore()

// 获取游戏状态
const { players, monsters, bullets, gameState } = gameStore

// 更新状态
gameStore.setGameState('playing')
gameStore.addPlayer(newPlayer)
```

### MultiSynq 事件
```typescript
// 发送输入到模型
view.sendInput('move', { forward: true, left: false })
view.sendInput('shoot', { shoot: true })

// 监听游戏事件
this.subscribe('game', 'player-joined', this.onPlayerJoined)
this.subscribe('game', 'state-update', this.onStateUpdate)
```

## 🚀 部署指南

### Vercel 部署
1. 将代码推送到 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 自动部署完成

### Netlify 部署
1. 构建项目: `npm run build`
2. 上传 `dist` 文件夹到 Netlify
3. 配置自定义域名（可选）

### 环境变量配置
- `VITE_MULTISYNQ_API_KEY`: 必须，从 multisynq.io 获取
- `VITE_WALLETCONNECT_PROJECT_ID`: 可选，Web3 钱包支持
- `VITE_APP_URL`: 生产环境 URL

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支: `git checkout -b feature/AmazingFeature`
3. 提交更改: `git commit -m 'Add some AmazingFeature'`
4. 推送分支: `git push origin feature/AmazingFeature`
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [MultiSynq](https://multisynq.io) - 提供确定性状态同步技术
- [Three.js](https://threejs.org) - 3D 图形渲染引擎
- [React Three Fiber](https://github.com/pmndrs/react-three-fiber) - React 的 Three.js 集成
- [Tailwind CSS](https://tailwindcss.com) - CSS 框架

## 📞 支持

如果遇到问题或有建议：
- 🐛 [报告 Bug](https://github.com/your-repo/issues)
- 💡 [功能建议](https://github.com/your-repo/issues)
- 📧 邮件联系：support@example.com

---

**🎮 现在就开始你的坦克大战之旅吧！**
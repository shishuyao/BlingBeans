# 果果豆豆打卡

家庭行为打卡与豆豆奖励 Web 应用。支持多人档案、后端同步、月历打卡、彩色豆豆进度（10 小豆 = 1 大豆）、奖励兑换与月度总结。面向 Android 触屏优化，可安装为 PWA。

## 快速开始

```bash
npm install
npm run db:push -w @guoguo/server
npm run build -w @guoguo/shared

# 终端 1：API
npm run dev:server

# 终端 2：前端
npm run dev:web
```

- 前端：http://localhost:5180  
- API：http://localhost:3001  

在同一局域网 Android 设备上访问电脑的 `http://<电脑IP>:5180` 即可。

## 功能

- 家庭账号注册/登录，多孩子档案切换
- 可编辑行为标签（颜色、达标豆数）
- 月历打卡，同日同标签显示 x2 / x3
- 顶栏小豆进度条按标签颜色染色；集满 10 颗合成大豆（动画 + 音效）
- 奖励表（照片、小豆/大豆混合定价、兑换）
- 月度总结：打卡成就 + 兑奖相册

## 生产构建

```bash
npm run build
cd apps/server && DATABASE_URL="file:./prod.db" npm start
```

服务端会托管 `apps/web/dist` 静态资源。

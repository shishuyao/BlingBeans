[English](README.md) | 简体中文

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

- 前端：[http://localhost:5180](http://localhost:5180)
- API：[http://localhost:3001](http://localhost:3001)

在同一局域网 Android 设备上访问电脑的 `http://<电脑IP>:5180` 即可。

开发调试才需要上面两个终端。家里平时用下面的「开启服务」，不要和 `npm run dev:server` 一起开，否则会抢 3001 端口。

## 开启服务

家里用的是打包后的服务：网页和接口都在 **3001**，数据是 `apps/server/.env` 里的库（当前为 `apps/server/prisma/dev.db`）。

开机登录后约 20 秒会自动开（计划任务名 `Guoguo`）。没开起来，或改完代码要重新开，在项目根目录执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-guoguo.ps1
```

脚本会做这些事：

- 源码比现有打包新时，先更新数据库结构并重新构建，再停掉旧的打包进程
- 启动 `apps/server/dist/index.js`
- 3001 已经有别的程序占用时（例如另一个 `npm run dev:server`），这次启动会跳过

浏览器打开 [http://localhost:3001](http://localhost:3001)。手机同一 Wi-Fi 下打开 `http://<电脑IP>:3001`。

日志在 `logs/guoguo.log`。换了电脑或计划任务丢了，再注册一次开机自启：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-autostart.ps1
```

## 功能

- 家庭账号注册/登录，多孩子档案切换
- 可编辑行为标签（颜色、达标豆数）
- 月历打卡，同日同标签显示 x2 / x3
- 顶栏小豆进度条按标签颜色染色；集满 10 颗合成大豆（动画 + 音效）
- 奖励表（照片、小豆/大豆混合定价、兑换）
- 月度总结：打卡成就 + 兑奖相册

## 功能迭代

### 2026-10-07

- **未打卡扣豆**：第一次打卡之后，已经过去却没打卡的日子自动扣豆。扣豆标签里有一条深红色、不能删除的「未打卡扣豆」，默认为 10 小豆（1 大豆），改成 0 则不生效。扣完手里的豆还不够时，扣到 0 并进入危险模式。详见 [docs/iterations/2026-10-07-未打卡扣豆.md](docs/iterations/2026-10-07-未打卡扣豆.md)。

### 2026-09-30

- **扣豆标签**：打卡弹层左加豆、右扣豆；扣豆不乘开心日倍率；余额 ≤ -5 时豆条锁定（与危险日同一套）。详见 [docs/iterations/2026-09-30-扣豆标签.md](docs/iterations/2026-09-30-扣豆标签.md)。
- **危险日历**：字号加大、窄屏可左右滑；危险日中间显示门槛、底部 `已加/门槛`；达标浅绿，凌晨未加满则锁定并略加深红。需满只计加豆，兑奖不算。详见 [docs/iterations/2026-09-30-危险日历.md](docs/iterations/2026-09-30-危险日历.md)。

### 2026-09-29

- **探宝日历**：月历改成盲盒探宝（开心日倍率 / 危险日门槛 / 危险模式锁兑奖）。详见 [docs/iterations/2026-09-29-探宝日历.md](docs/iterations/2026-09-29-探宝日历.md)。
- **豆豆入账**：打卡实际发豆数和加减流水写入数据库。详见 [docs/iterations/2026-09-29-豆豆入账.md](docs/iterations/2026-09-29-豆豆入账.md)。
- **盲盒美化**：日历格做成淡色包装盒卡片（十字缎带、无礼盒图标）、当天「今」标。详见 [docs/iterations/2026-09-29-盲盒美化.md](docs/iterations/2026-09-29-盲盒美化.md)。
- **打卡倍率显示**：开心日标签行显示「原豆 × 倍率 ≈ 实得」，不直接改成四舍五入后的豆数。详见 [docs/iterations/2026-09-29-打卡倍率显示.md](docs/iterations/2026-09-29-打卡倍率显示.md)。
- 家长 PIN：解锁后可再点锁重新上锁；再次解锁必须再输 PIN（`pinEpoch`）。
- 奖励照片可裁剪（4:3 拖移/捏合）；兑换成功有动画和提示音。
- 总结页增加横向兑奖时间轴，相册详情改为卡片尺寸。
- 标签新增/编辑改为底部弹层；豆数输入清空时视为 0，提交最少 1。
- 减少豆豆也有音效；暗色模式下卡通豆去掉会糊成黑块的投影。

## 手动打包

启动脚本在源码更新时也会做同样的事。需要单独打包时：

```bash
npm run build
```

服务端会托管 `apps/web/dist`。不要改用另一个数据库文件来启动，否则打卡记录会对不上现在这份 `dev.db`。

应用内右上角可在中文和 English 之间切换，选择保存在浏览器（`guoguo_locale`）。新注册的家庭会按当时的语言生成默认标签；已经保存的标签名称不会被改写。

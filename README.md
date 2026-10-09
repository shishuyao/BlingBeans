English | [简体中文](README.zh-CN.md)

# Guoguo Beans

A family check-in and bean-reward web app. Multiple child profiles, server sync, a monthly calendar, colored bean progress (10 small beans = 1 big bean), rewards, and a monthly summary. Tuned for Android touch screens and installable as a PWA.

## Quick start

```bash
npm install
npm run db:push -w @guoguo/server
npm run build -w @guoguo/shared

# Terminal 1: API
npm run dev:server

# Terminal 2: web
npm run dev:web
```

- Web: [http://localhost:5180](http://localhost:5180)
- API: [http://localhost:3001](http://localhost:3001)

On the same Wi-Fi, open `http://<computer-ip>:5180` from an Android device.

Those two terminals are for development. Day-to-day use is the packaged service below. Do not run it together with `npm run dev:server`, or they will fight over port 3001.

## Start the household service

The packaged server serves both the site and the API on **port 3001**. Data lives in the database named by `apps/server/.env` (currently `apps/server/prisma/dev.db`).

About 20 seconds after Windows sign-in, scheduled task `Guoguo` starts it. If it is down, or you changed the code and need a restart, run this from the repo root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-guoguo.ps1
```

The script:

- updates the database schema and rebuilds when source is newer than the current build, then stops the old packaged process
- starts `apps/server/dist/index.js`
- skips the start if something else already owns port 3001 (for example `npm run dev:server`)

Open [http://localhost:3001](http://localhost:3001). On a phone on the same Wi-Fi, open `http://<computer-ip>:3001`.

Logs are in `logs/guoguo.log`. On a new computer, or if the scheduled task is gone, register autostart again:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-autostart.ps1
```

## Features

- Family account (register / sign in) and multiple child profiles
- Editable behavior tags (color and bean amount)
- Monthly calendar; the same tag on the same day shows x2 / x3
- Top bar colors small beans by tag; 10 small beans merge into one big bean (animation and sound)
- Reward list (photo, mixed small/big bean prices, redeem)
- Monthly summary: check-in achievements and a redeem album

## Changelog

### 2026-10-07

- **Missed check-in:** after the first check-in, each past day with no check-in deducts beans automatically. The deduct-tag list has a dark-red entry that cannot be deleted. Default is 10 small beans (1 big bean); set it to 0 to turn the charge off. If the charge is larger than the remaining beans, the balance goes to 0 and danger mode starts. See [docs/iterations/2026-10-07-未打卡扣豆.md](docs/iterations/2026-10-07-未打卡扣豆.md) (Chinese).

### 2026-09-30

- **Deduct tags:** the check-in sheet puts plus tags on the left and deduct tags on the right. Deducts do not use the happy-day multiplier. At a balance of −5 or lower, the bean bar locks (same lock as a danger day). See [docs/iterations/2026-09-30-扣豆标签.md](docs/iterations/2026-09-30-扣豆标签.md).
- **Danger calendar:** larger type, horizontal swipe on narrow screens. A danger day shows the threshold in the middle and `earned/threshold` at the bottom. Meeting the goal turns the cell light green; missing it by dawn locks the day and deepens the red. Only beans earned that day count; redemptions do not. See [docs/iterations/2026-09-30-危险日历.md](docs/iterations/2026-09-30-危险日历.md).

### 2026-09-29

- **Quest calendar:** the month is a blind-box quest (happy-day multiplier, danger-day threshold, danger mode locks redemptions). See [docs/iterations/2026-09-29-探宝日历.md](docs/iterations/2026-09-29-探宝日历.md).
- **Bean ledger:** the beans actually awarded, and the plus/minus history, are stored in the database. See [docs/iterations/2026-09-29-豆豆入账.md](docs/iterations/2026-09-29-豆豆入账.md).
- **Box look:** calendar cells are pale gift boxes (ribbon cross, no gift icon) with a “today” mark. See [docs/iterations/2026-09-29-盲盒美化.md](docs/iterations/2026-09-29-盲盒美化.md).
- **Multiplier display:** on a happy day the tag row shows “base × multiplier ≈ awarded” instead of replacing the tag amount with the rounded result. See [docs/iterations/2026-09-29-打卡倍率显示.md](docs/iterations/2026-09-29-打卡倍率显示.md).
- Parent PIN can be locked again after unlock. The next unlock always asks for the PIN (`pinEpoch`).
- Reward photos can be cropped (4:3, drag and pinch). A successful redeem plays an animation and a sound.
- The summary page has a horizontal redeem timeline; album details use card size.
- Creating and editing a tag uses a bottom sheet. An empty bean field counts as 0; submit requires at least 1.
- Removing beans plays a sound. In dark mode, cartoon beans drop the shadow that turned into a black blob.

## Build by hand

The start script does the same rebuild when source is newer. To build on its own:

```bash
npm run build
```

The server hosts `apps/web/dist`. Do not point the server at a different SQLite file, or check-in history will not match the current `dev.db`.

The in-app language switch is stored in the browser (`guoguo_locale`). New families can be created in Chinese or English; existing tag names stay as they were saved.

# 猜数字小游戏（服务器版）

前后端分离的猜数字游戏，1-100 随机数。

## 怎么玩

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`

## 项目结构

```
src/
├── index.ts      ← 后端：Express 服务器，/api/guess 和 /api/new-game
├── game.ts       ← 游戏逻辑：checkGuess(), createGame()
└── game.test.ts  ← 测试
public/
└── index.html    ← 前端：页面，通过 fetch 调后端接口
.scratch/          ← AI 任务追踪（PRD + issues）
```

## 前端 ↔ 后端

```
浏览器                         服务器
  │  POST /api/guess {42}  →    │
  │  ←  {result:"higher"}       │
  │  显示"太低了！"              │
```

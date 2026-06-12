# 猜数字小游戏（服务器版）

前后端分离的猜数字游戏，1-100 随机数。

## 第一次玩

1. 装 [Node.js](https://nodejs.org/)
2. `Win + R` → 输入 `powershell` → 回车
3. 进入项目目录：
   ```bash
   cd codex-demo
   ```
4. 装依赖（只需一次）：
   ```bash
   npm install
   ```
5. 启动服务器：
   ```bash
   npx tsx src/index.ts
   ```
6. 看到 `Todo app running on http://localhost:3000` 就说明跑起来了
7. 浏览器打开 `http://localhost:3000`

## 以后每次玩

```bash
Win + R → powershell → 回车
cd codex-demo
npx tsx src/index.ts
```

浏览器打开 `http://localhost:3000`，玩完按 `Ctrl + C` 关。

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

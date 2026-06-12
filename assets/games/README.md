# 猜数字小游戏 — 玩法说明

两个版本都是猜数字（1-100）：电脑随机想一个数，你来猜，猜完告诉你高了还是低了。

---

## 方式一：双击版（推荐，最简单）

**文件**：[guess-the-number.html](guess-the-number.html)

**怎么玩**：
1. 下载 [guess-the-number.html](guess-the-number.html)
2. 双击打开（自动用浏览器）
3. 输入数字 → 点「猜」
4. 看到「太高了」「太低了」「答对了」

**不需要装任何东西，不需要命令行。**

原理：前后端合并——所有逻辑全在一个 HTML 文件里（随机数生成 + 判断 + 界面）。

---

## 方式二：服务器版（前后端分离）

**文件夹**：[codex-demo/](codex-demo/)

**怎么玩**：
1. 安装 [Node.js](https://nodejs.org/)（如果还没装的话）
2. 打开命令行（Win + R → 输入 `powershell` → 回车）
3. 进入项目目录：
   ```
   cd codex-demo
   ```
4. 安装依赖（第一次需要）：
   ```
   npm install
   ```
5. 启动服务器：
   ```
   npm run dev
   ```
6. 浏览器打开 `http://localhost:3000`
7. 开始猜数字！
8. 玩完按 `Ctrl + C` 关闭服务器

**项目结构**：
```
codex-demo/
├── src/
│   ├── index.ts          ← 后端：Express 服务器，处理 /api/guess
│   ├── game.ts           ← 游戏逻辑：checkGuess()
│   └── game.test.ts      ← 测试
├── public/
│   └── index.html        ← 前端：页面，发请求给后端
├── .scratch/              ← AI 的任务追踪（PRD + issues）
└── docs/agents/           ← AI 的项目配置
```

**前后端是怎么交互的**：

```
浏览器（前端）                      服务器（后端）
    │                                   │
    │  POST /api/guess { guess: 42 }    │
    │  ─────────────────────────────>   │
    │                                   │  检查 42 是高了低了
    │  { result: "higher", attempts: 3 }│
    │  <─────────────────────────────   │
    │                                   │
    │  显示"太低了！"                     │
```

---

## 两个版本的区别

| | 双击版 | 服务器版 |
|---|--------|----------|
| 玩起来 | 下载→双击→玩 | 装 Node → npm install → 启动 → 玩 |
| 原理 | 前后端合并成一个文件 | 前后端分离，通过 HTTP 通信 |
| 适合 | 纯体验游戏 | 学习前后端概念 |

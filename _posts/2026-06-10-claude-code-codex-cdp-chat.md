---
layout: post
title: "Claude Code × Codex 跨界聊天：用 CDP 让 AI 们互相发消息"
date: 2026-06-10
categories: [教程, Claude Code, AI]
tags: [Claude Code, Codex, OpenAI, CDP, Chrome DevTools Protocol, WebSocket, Electron, Skill, 跨界聊天, 多模型对话]
description: "用 Chrome DevTools Protocol 远程操控 Codex 桌面客户端，实现 Claude Code 与 Codex 之间的跨界对话"
---

> **日期**：2026 年 6 月 10 日
> **难度**：新手可读，操作需 AI 辅助
> **核心工具**：CDP (Chrome DevTools Protocol) + WebSocket + Claude Code Skill
> **最终产物**：[Codex Chat Skill](https://github.com/Ann-luo/effective-pancake/tree/main/skills/codex-chat) — 一个 Claude Code 技能包，装完就能跟 Codex 聊天
> **标签**：Claude Code, Codex, OpenAI, CDP, WebSocket, Electron, Skill, 跨界聊天

---

<!--more-->

## 一、这到底是干嘛的？

简单说：**让 Claude Code（Anthropic 的 AI 编程助手）能跟 Codex（OpenAI 的桌面聊天应用）互相发消息。**

打个比方：

```
你 ──→ Claude Code（VS Code 里） ──→ "帮我给 Codex 发个 hi"
                                        │
                                        │ CDP 协议（遥控器）
                                        ↓
                                   Codex 桌面客户端 ──→ "hi, 你是谁？"
                                        │
                                        │ CDP 协议（读回复）
                                        ↓
Claude Code ──→ "我是 Claude Code！" ──→ Codex
```

两个不同公司的 AI 产品，通过一个叫 **CDP** 的调试协议，实现了"跨界聊天"。整个过程全部自动化，你只需要对 Claude Code 说一句话。

---

## 二、前置知识：CDP 是什么？

### 用人话解释

**CDP = Chrome DevTools Protocol**，是 Chrome 浏览器内置的一套"遥控接口"。

你平时用 Chrome 的时候，按 F12 打开的那个开发者工具（DevTools），就是通过 CDP 跟浏览器页面通信的。它能做到：

- 查看/修改页面上任何元素
- 执行 JavaScript 代码
- 模拟键盘鼠标操作
- 抓取网络请求

**关键点**：不只是 Chrome 浏览器支持 CDP，**所有用 Electron 做的桌面应用**也都内置了 CDP。因为 Electron 本质上就是打包了一个 Chromium 浏览器。

Codex 桌面客户端是用 Electron 做的，所以它内置了 CDP。Codex++ 启动器帮我们打开了这个调试端口（端口号 9229）。

> 你可以把 CDP 理解成一个"万能遥控器"——能控制任何一个用 Electron 做的桌面应用。

### Codex 是什么？

**Codex** 是 OpenAI 官方出的桌面聊天应用（类似 ChatGPT 网页版，但有系统级权限）。你用它在桌面端跟 OpenAI 的各种模型聊天。

**Codex++** 是一个第三方开源启动器，给 Codex 加了一些额外能力（比如打开 CDP 调试端口）。我们的方案依赖 Codex++ 开启的端口。

---

## 三、踩坑全过程：从翻车到成功

> 这部分记录了真实调试过程。如果你只想要最终方案，跳到第四章。

### 尝试 1：PowerShell SendKeys（❌ 失败）

最初的思路：用 PowerShell 的 `SendKeys` 模拟键盘输入，把文字"打"进 Codex 的输入框。

```powershell
[System.Windows.Forms.SendKeys]::SendWait("你好 Codex，我是 Claude Code+  ")
```

**翻车原因**：SendKeys 里的 `+` 字符会被解释成 **Shift 键**！所以 `Codex++` 打出来变成了 `Codex==`，完全乱套。

用 `Codex{+}{+}` 转义后勉强能打字了，但 Electron 应用对 SendKeys 的支持极差，消息始终发不出去。

> 💡 **教训**：SendKeys 是老旧的 Windows API，设计于 Windows 95 时代，对现代 Electron 应用基本无效。

### 尝试 2：CDP 填字 + 按钮点击（⚠️ 部分成功）

CDP 有个 `Runtime.evaluate` 方法，可以直接在页面里执行 JavaScript。思路：

```
1. 用 Runtime.evaluate 在 Codex 输入框里插入文字
2. 找到"发送"按钮
3. 用 Runtime.evaluate 点击按钮
```

填字部分成功了，但**按钮点击频繁翻车**：

| 尝试 | 点击策略 | 结果 |
|------|----------|------|
| 第 1 次 | 找最后一个按钮 | 点到了"隐藏边栏"按钮 🫠 |
| 第 2 次 | 按 aria-label 过滤 | 点到了"添加文件"按钮 🫠 |
| 第 3 次 | 按位置筛选（最靠近输入框、带 SVG 的小按钮） | 点到了"批准"按钮 🫠 |
| 第 4 次 | 过滤排除"添加"、"文件"、"批准"等关键词 | 按钮点对了，但消息没发出去 🫠 |

> 💡 **教训**：Codex 的发送按钮没有稳定的标识符（aria-label 会变、DOM 结构会变、位置会变）。靠点击按钮发送消息不可靠。

### 尝试 3：CDP 填字 + Enter 键（✅ 最终方案）

既然按钮靠不住，那就**模拟键盘敲 Enter 键**。CDP 有个 `Input.dispatchKeyEvent` 方法，能精确模拟键盘事件。

这次成功了！核心逻辑：

```
1. Runtime.evaluate → 往 ProseMirror 编辑器里填文字
2. Input.dispatchKeyEvent → 发 rawKeyDown（按下 Enter）
3. Input.dispatchKeyEvent → 发 char（Enter 的字符 \r）
4. Input.dispatchKeyEvent → 发 keyUp（松开 Enter）
5. ✅ 消息发出去了！
```

Enter 键的三连击（按下 → 字符 → 松开）是 Chrome 内核要求的完整键盘事件序列。只发一个事件不行——必须三个都发。

---

## 四、完整技术方案

### 4.1 整体架构

```
┌─────────────────────┐      WebSocket        ┌──────────────────────┐
│  Claude Code        │ ←──────────────────→ │  Codex (Electron)    │
│  (VS Code 终端)     │   ws://127.0.0.1:9229 │  CDP 端口: 9229      │
│                     │                       │                      │
│  codex_cdp_helper   │   Runtime.evaluate    │  ProseMirror 编辑器   │
│  .js               │   Input.dispatchKey   │  main 对话区          │
└─────────────────────┘                       └──────────────────────┘
```

### 4.2 关键技术点

#### ① 找到 Codex 的 CDP 页面

Codex 启动后，所有可控制的页面信息在 `http://127.0.0.1:9229/json`：

```json
[
  {
    "id": "103B1F679F64F4A284B224A587ABE9A8",
    "type": "page",
    "url": "https://codex.openai.com/...",
    "webSocketDebuggerUrl": "ws://127.0.0.1:9229/devtools/page/103B1F..."
  }
]
```

找 URL 里包含 `codex` 的那个页面，拿到它的 `webSocketDebuggerUrl`。

#### ② 往 ProseMirror 编辑器填文字

Codex 用的富文本编辑器叫 **ProseMirror**（一个 `<div class="ProseMirror" contentEditable>`）。直接设 `innerHTML` 不够，必须触发 `input` 事件让 React 感知到变化。

而且字符串里有引号、特殊字符时，直接用 `Runtime.evaluate` 传参容易炸。解决办法——先存全局变量，再引用：

```javascript
// Step 1: 安全存文字（避免 JS 字符串转义问题）
window.__claude_msg = "你的消息内容（可以包含 ' 引号 \" 等任意字符）";

// Step 2: 操作编辑器
const pm = document.querySelector('.ProseMirror');
pm.innerHTML = '';                          // 清空
pm.appendChild(document.createTextNode(window.__claude_msg));  // 填字
pm.dispatchEvent(new InputEvent('input', {  // 触发 React 更新
  bubbles: true, data: window.__claude_msg, inputType: 'insertText'
}));
pm.focus();
```

#### ③ 模拟 Enter 键发送

```javascript
// 三个事件缺一不可
Input.dispatchKeyEvent({ type: 'rawKeyDown', key: 'Enter', code: 'Enter', keyCode: 13, ... });
Input.dispatchKeyEvent({ type: 'char', text: '\r', key: 'Enter', code: 'Enter', keyCode: 13, ... });
Input.dispatchKeyEvent({ type: 'keyUp', key: 'Enter', code: 'Enter', keyCode: 13, ... });
```

#### ④ 读取 Codex 回复

```javascript
// 从 DOM 提取对话
const main = document.querySelector('main');
const articles = main.querySelectorAll('article');
// 每个 article 是一段消息，按顺序提取
```

### 4.3 完整命令流程

```
你: "给 Codex 发消息：你好呀！"

Claude Code 内部：
  ├─ node codex_cdp_helper.js find      → 找到 Codex 页面 ID
  ├─ 连接 WebSocket: ws://127.0.0.1:9229/devtools/page/XXX
  ├─ Runtime.evaluate                  → 存文字到 window.__claude_msg
  ├─ Runtime.evaluate                  → 填充 ProseMirror 编辑器
  ├─ Input.dispatchKeyEvent × 3        → Enter 键发送
  └─ 返回: { status: "SENT" }

你: "Codex 回了什么？"

Claude Code 内部：
  ├─ Runtime.evaluate                  → 查询 main > article
  ├─ 提取每条消息的文本
  └─ 返回: [{ role: "assistant", content: "你好！我是 Codex..." }]
```

---

## 五、一键安装：Claude Code Skill

> 我不想每次都要重写代码。所以把它打包成了一个 **Claude Code Skill**。
> 
> 📂 **Skill 源码**：[skills/codex-chat/](https://github.com/Ann-luo/effective-pancake/tree/main/skills/codex-chat)

### Skill 是什么？

Claude Code 的 Skill 就是一个 Markdown 文件，里面写好了：
- **什么时候触发**（比如"和 Codex 聊天"）
- **具体怎么做**（调哪个脚本、走什么步骤）
- **踩过的坑**（正确的方法 vs 错误的方法）

把它放在 `~/.claude/skills/` 目录下，Claude Code 就能自动读取。

### 安装方法

你的 `~/.claude/skills/` 目录结构：

```
~/.claude/skills/
├── codex-chat.md                    ← Skill 定义文件
└── scripts/
    └── codex_cdp_helper.js         ← CDP 辅助脚本（真正的"遥控器"）
```

**方式一：手动复制**

把仓库里 [skills/codex-chat/](https://github.com/Ann-luo/effective-pancake/tree/main/skills/codex-chat) 下的文件复制到对应位置。

**方式二：让 Claude Code 帮你装**

对 Claude Code 说："帮我把 effective-pancake 仓库里的 codex-chat skill 装到我本地"——它自己会处理。

### 使用方法

| 你说 | Claude Code 做的事 |
|------|-------------------|
| `和 Codex 聊天` | 自动连接 Codex，开始对话循环 |
| `给 Codex 发消息：xxx` | 往 Codex 输入框填字 + 按 Enter 发送 |
| `看看 Codex 回了什么` | 读取 Codex 对话区的最新回复 |
| `回复 Codex` | 读回复 → 理解内容 → 生成回复 → 发送 |

### settings.json 权限配置

因为 CDP 操作涉及 Bash 命令，需要在 `~/.claude/settings.json` 里加上权限：

```json
{
  "permissions": {
    "allow": [
      "Bash(cd * node codex_*.js *)",
      "Bash(cd * npm install ws *)",
      "Bash(node * codex_cdp_helper.js *)"
    ]
  }
}
```

---

## 六、完整代码

### 核心脚本：codex_cdp_helper.js

> 📂 完整源码：[skills/codex-chat/scripts/codex_cdp_helper.js](https://github.com/Ann-luo/effective-pancake/blob/main/skills/codex-chat/scripts/codex_cdp_helper.js)

三个命令：

```bash
# 找到 Codex 页面
node codex_cdp_helper.js find

# 发送消息
node codex_cdp_helper.js send "你的消息"

# 读取回复
node codex_cdp_helper.js read
```

核心代码骨架：

```javascript
// 1. 连接 CDP WebSocket
const ws = new WebSocket(page.webSocketDebuggerUrl);

// 2. 发送 CDP 命令
function send(method, params) {
  return new Promise((resolve) => {
    const id = ++msgId;
    ws.send(JSON.stringify({ id, method, params }));
    // 等待回包匹配 id...
  });
}

// 3. 填充编辑器 + Enter 发送
await send('Runtime.evaluate', { expression: 'window.__claude_msg = "...";' });
await send('Runtime.evaluate', { expression: '/* 操作 ProseMirror */' });
await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', ... });
await send('Input.dispatchKeyEvent', { type: 'char', text: '\r', ... });
await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', ... });

// 4. 读取消息
const result = await send('Runtime.evaluate', {
  expression: 'document.querySelector("main")?.textContent',
  returnByValue: true,
});
```

---

## 七、坑点速查表

| 编号 | 坑 | 现象 | 正确做法 |
|------|-----|------|----------|
| 1 | PowerShell SendKeys | `Codex++` 变成 `Codex==` | 用 CDP `Input.dispatchKeyEvent`，别用 SendKeys |
| 2 | CDP 点击发送按钮 | 点到其他按钮 / 点了没反应 | 用 `Input.dispatchKeyEvent` 模拟 Enter，别点按钮 |
| 3 | Runtime.evaluate 传字符串 | 消息含引号时 JS 炸裂 | 先存 `window.__claude_msg` 全局变量，再引用 |
| 4 | ProseMirror 填字后没反应 | React 没感知到变化 | 填完字必须 `dispatchEvent(new InputEvent(...))` |
| 5 | 只发一个 Enter keyDown | 消息发不出去 | 必须发三个事件：keyDown + char + keyUp |
| 6 | 硬编码 CDP Page ID | 重启后 ID 变了 | 每次都从 `http://127.0.0.1:9229/json` 动态查找 |
| 7 | ws 包没装 | `require('ws')` 失败 | 脚本内置自动安装：`npm install ws` |
| 8 | Auto-mode 拦截 CDP 操作 | Bash 权限被拒 | 在 settings.json 添加 `Bash(node * codex_cdp_helper.js *)` |

---

## 八、常见问题 FAQ

### Q1：这是什么原理？安全吗？

全程走的是**本机 localhost 通信**（`127.0.0.1:9229`），数据不出你的电脑。CDP 是 Chrome 内置的调试协议，Google 设计的，不是我们发明的魔法。

### Q2：为什么要用 CDP 而不是 API？

Codex 是桌面应用，没有开放 API。CDP 是目前唯一能让外部程序跟它交互的方式。本质上你是在用 Chrome 调试器的能力"遥控"一个 Electron 窗口。

### Q3：一定要装 Codex++ 吗？

是的。原版 Codex 不会自动开启 CDP 调试端口。Codex++ 启动器帮它打开了 `--remote-debugging-port=9229`。

### Q4：这个方法能控制其他 Electron 应用吗？

能。VS Code、Discord、Slack、Notion、Obsidian……只要用 `--remote-debugging-port` 启动，全部能用同一套方案遥控。

### Q5：这个 skill 能在任何 Claude Code 上用吗？

能。Skill 放在 `~/.claude/skills/` 是用户级配置，不管你当前在哪个项目，技能都能用。

---

## 九、总结

```
你有一个大胆的想法
  → 探索 CDP（Chrome DevTools Protocol）
  → 踩坑 × 8（SendKeys 翻车 → 按钮点击翻车 × 4 → Enter 终于成功）
  → 封装成 Claude Code Skill
  → 以后一句话就能跟 Codex 聊天
```

这次探索最有价值的收获：**CDP 是 Electron 应用的"万能遥控器"**。掌握了这个技能，理论上可以控制你电脑上任何一个 Electron 应用。

> 📂 本文涉及的全部代码已上传至 [Ann-luo/effective-pancake](https://github.com/Ann-luo/effective-pancake) 仓库：
> - Skill 定义：[skills/codex-chat/codex-chat.md](https://github.com/Ann-luo/effective-pancake/blob/main/skills/codex-chat/codex-chat.md)
> - CDP 脚本：[skills/codex-chat/scripts/codex_cdp_helper.js](https://github.com/Ann-luo/effective-pancake/blob/main/skills/codex-chat/scripts/codex_cdp_helper.js)

---

> **免责声明**：本文由 Claude Code (DeepSeek-V4-Pro) 输出，内容基于真实调试过程整理。CDP 调试能力仅限本机 localhost 使用，不会向外部发送任何数据。

---

*最后更新：2026 年 6 月 10 日*

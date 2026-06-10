---
layout: post
title: "Claude Code × Codex 通信：自定义 CDP Skill 踩坑与修复"
date: 2026-06-10
categories: [教程, Claude Code]
tags: [Claude Code, Codex, CDP, Skill, 自定义技能, 跨模型通信]
description: "Claude Code 自定义 Skill 的正确格式、扁平文件陷阱、CDP 页面检测修复，附带完整 skill 资源包"
---

> **日期**：2026 年 6 月 10 日
> **适用场景**：在 Claude Code 中创建自定义 Skill，通过 CDP 与 OpenAI Codex 桌面客户端通信
> **难度**：有基础概念即可
> **标签**：Claude Code, Codex, CDP, Skill, 跨模型通信

---

<!--more-->

## 一、这是什么？

用 Claude Code 的自定义 **Skill** 功能，通过 Chrome DevTools Protocol (CDP) 直接跟 OpenAI Codex 桌面客户端聊天。

原理很简单：Codex 是基于 Electron 的桌面应用，启动时自动暴露 CDP 调试端口 `9229`。只要用 WebSocket 连上去，就能：

- **发消息**：通过 `Runtime.evaluate` 往 ProseMirror 编辑器填文本，然后 `Input.dispatchKeyEvent` 模拟 Enter 发送
- **读回复**：同样通过 `Runtime.evaluate` 查询 DOM，提取对话内容
- **多轮对话**：读完 → 理解 → 生成回复 → 发送 → 循环

> 📦 **Skill 资源包在仓库 `skills/codex-chat/` 目录下，直接下载即可使用。**

---

## 二、目录结构

```
.claude/skills/codex-chat/
├── SKILL.md              ← Skill 定义文件（必须叫这个名字）
└── scripts/
    └── codex_cdp_helper.js   ← CDP 通信脚本
```

---

## 三、踩坑：扁平文件不会被识别

### 问题

我一开始把 skill 文件放在：

```
❌ .claude/skills/codex-chat.md    （扁平文件，Claude Code 完全无视）
```

用 `/codex-chat` 调用时提示 "Unknown skill"，在可用 skills 列表里也看不到。

### 原因

Claude Code 要求 skill 必须是 **子目录 + `SKILL.md`** 的结构：

```
✅ .claude/skills/codex-chat/SKILL.md   （正确格式）
```

这个规则在官方 skill-creator 插件文档里有写，但很容易忽略。所有 plugin 里的 skill 也都是这个结构：

```
plugins/
└── some-plugin/
    └── skills/
        └── skill-name/
            └── SKILL.md        ← 必须命名为 SKILL.md
```

### 修复

把 `codex-chat.md` 移进同名子目录，重命名为 `SKILL.md`：

```bash
mkdir -p ~/.claude/skills/codex-chat/scripts
mv ~/.claude/skills/codex-chat.md ~/.claude/skills/codex-chat/SKILL.md
mv ~/.claude/skills/scripts/codex_cdp_helper.js ~/.claude/skills/codex-chat/scripts/
```

重启 Claude Code 会话后，`/codex-chat` 就出现了。

---

## 四、踩坑：CDP 页面检测失败

### 问题

修复完结构后发现第一步就报错：

```
NO_CODEX_PAGE: Found 1 CDP target(s) but none with "codex" in URL
```

但 Codex 明明在运行！用 `curl http://127.0.0.1:9229/json` 一看：

```json
{
  "title": "Codex",
  "url": "app://-/index.html",
  "webSocketDebuggerUrl": "ws://127.0.0.1:9229/devtools/page/..."
}
```

**title 是 "Codex"，但 URL 是 `app://-/index.html`，里面没有 "codex" 这个单词。**

### 原因

新版本 Codex (Electron 版) 的 CDP URL 使用的是 Electron 默认的 `app://` 协议，不再包含 "codex" 字样。原脚本只检查了 URL：

```javascript
// 原来的逻辑 ❌
const codex = targets.find(t =>
  t.type === 'page' &&
  (t.url || '').toLowerCase().includes('codex')   // ← 只查 URL
);
```

### 修复

加上 `title` 字段检查：

```javascript
// 修复后 ✅
const codex = targets.find(t =>
  t.type === 'page' &&
  ((t.url || '').toLowerCase().includes('codex') ||
   (t.title || '').toLowerCase().includes('codex'))   // ← 也查 title
);
```

---

## 五、完整测试流程

### 1. 确认 Codex 在线

```bash
curl -s http://127.0.0.1:9229/json | grep -i codex
```

### 2. 读取对话

```bash
node ~/.claude/skills/codex-chat/scripts/codex_cdp_helper.js read
```

### 3. 发送消息

```bash
node ~/.claude/skills/codex-chat/scripts/codex_cdp_helper.js send "Hello Codex!"
```

### 4. 多轮对话

循环执行 read → 分析回复 → send → 等待 → read ...

### 实测结果

```
[codex-cdp] Finding Codex page...        ✅
[codex-cdp] Connected to: app://-/index.html  ✅
[codex-cdp] Stored message text          ✅
[codex-cdp] Fill result: OK              ✅
[codex-cdp] rawKeyDown sent              ✅
[codex-cdp] char sent                    ✅
[codex-cdp] keyUp sent                   ✅
{ "status": "SENT", ... }                ✅

Codex 回复:
"Nice — skipping the middleman is always cleaner.
 Direct connection beats routing through a third-party launcher."
```

---

## 六、前置条件

| 条件 | 说明 |
|------|------|
| Codex 桌面客户端已启动 | 自动暴露 CDP 端口 9229 |
| `ws` npm 包 | 脚本会自动安装 |
| Claude Code | 需要有 `~/.claude/skills/` 目录 |

---

## 七、Skill 安装方法

1. 复制 `skills/codex-chat/` 到你的 `~/.claude/skills/` 目录
2. 重启 Claude Code 会话
3. 输入 `/codex-chat` 即可使用

```bash
cp -r skills/codex-chat ~/.claude/skills/
```

---

## 八、技术原理图

```
┌─────────────────┐     CDP WebSocket      ┌──────────────────┐
│   Claude Code    │ ◄──────────────────►   │   Codex (Electron)│
│   (Terminal)     │   Runtime.evaluate     │   (Desktop App)   │
│                  │   Input.dispatchKey    │   ProseMirror     │
│  /codex-chat     │                        │   GPT-5           │
└─────────────────┘                        └──────────────────┘
```

核心技巧：
1. **填充文本**：`Runtime.evaluate` 在 ProseMirror 编辑器 DIV 中插入文本节点并触发 `input` 事件
2. **安全传参**：用 `window.__claude_msg = msg` 全局变量避免 JS 字符串转义
3. **发送消息**：模拟完整 Enter 键序列（rawKeyDown + char + keyUp），比点击按钮更可靠
4. **读取消息**：查询 `<main>` 内的 article 元素，回退到全文本提取

---

**跨模型聊天，有点意思。😄**

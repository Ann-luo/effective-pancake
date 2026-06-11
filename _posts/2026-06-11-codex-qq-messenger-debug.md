---
layout: post
title: "Codex 控制 QQ 发消息——一晚上的调试记录"
date: 2026-06-11 12:00:00 +0800
categories: [Codex, Computer Use, 调试]
tags: [Codex, QQ, Computer Use, 自动化, 调试]
---

2026 年 6 月 11 日，我让 Codex 帮我在 QQ 上给朋友发消息，结果折腾了一整个晚上。

## 背景

Codex 内置了 Computer Use 功能，可以控制 Windows 桌面：点击、打字、截图。我的需求很简单：打开 QQ → 找到联系人 → 发消息。

## 第一关：权限

辅助程序 `codex-computer-use.exe` 需要系统权限启动。默认沙箱模式下 `CreateProcessAsUserW failed: 5`。开高级权限解决。

## 第二关：隐藏 Bug

操作 QQ 时报 `elicitations are unavailable`。批准弹窗弹不出来。

## 第三关：挖 Bug

`helper_transport.js` 中 `i = globalThis.nodeRepl`——i 是 ESM import 导入的变量，严格模式下不能重新赋值。修复：直接用 `globalThis.nodeRepl`。

## 第四关：缓存

改好文件，Node.js 模块缓存用的是旧版本。重启内核不生效——`js_reset` 不清模块缓存。

## 第五关：窗口消失

辅助进程崩溃后 QQ 自动最小化，只剩 250×74 的缩略图。

## 第六关：发送按键

打字能进输入框，但按键发不出去。

## 第七关：Enter vs Return（事实核对）

最初结论是 Return 每次都成功。但实际第二次操作时：

| 按键 | 结果 |
|------|------|
| **Enter** | 成功发送 |
| Return | 没发出去（QQ 当时是 Enter 发送模式） |
| Ctrl+Enter | 内核崩溃 |
| 点发送按钮 | 坐标偏了就点空 |

QQ 有两种发送模式：Enter 发送和 Ctrl+Enter 发送。用户当前是 Enter 发送模式，所以 **Return 没起作用，Enter 反而发出了消息**。

**修正结论**：没有哪一个键绝对可靠，取决于 QQ 的当前发送设置。正确的策略是先试 Enter，不发再试 Return。实测 Enter 在默认的 Enter 发送模式下有效，Return 仅在 Ctrl+Enter 模式下才能发送。

## 第八关：窗口最小化

`get_window_state` 报 "window is minimized"。调用 `activate_window` 后直接用同一个 window 对象仍然报最小化。

解决：激活窗口后用 `list_apps` 重新获取 window 引用，再用新引用调 `get_window_state`。不要用 `sky.get_window`——它期望 opaque numeric id，而 QQ skill 通过 `@oai/sky` 直接导入拿到的 window id 是 UUID 字符串，会报 "id must be an integer >= 0"。

## 第九关：exec context 丢失

跨 REPL 调用时频繁出现 "node_repl exec context not found"。`js_reset` + 在一个调用里跑完 setup→find→activate→send 全流程才能稳定。不要在两次调用之间依赖 const 绑定。

## 第十关：坐标微调

初始点击坐标 `(0.3, 0.85)` 容易偏。改为 `(0.5, 0.93)`——窗口正中偏底部——命中 QQ 输入框更稳定。

## 第十一关：拼接完整流程

经过以上所有调试，一份调用里完成全部操作的最终流程：

1. Setup（`@oai/sky` + transport patch）
2. `list_apps` → 找 QQ → 找目标窗口
3. `activate_window` → 等待 1.5s → `list_apps` 刷新引用
4. `get_window_state` → 点击输入框 `(0.5, 0.93)` → Ctrl+A Delete 清空 → `type_text` → 按 Enter/Return

一次性跑通，两条消息（分别用 Return 和 Enter）都发送成功。

## 总结

涉及：Windows 权限、ESM 模块系统、Node.js 缓存、进程管理、UI 自动化、键盘键码差异、窗口状态管理、REPL 会话生命周期。

核心教训：

- `@oai/sky` 直接导入和 `computer-use-client.mjs` 的 API 表面相同但 window id 类型不兼容，混用会出 "id must be an integer"；
- 窗口激活后必须用 `list_apps` 重新获取引用，`activate_window` 不会自动更新 window 对象；
- REPL 跨调用状态不可靠，关键流程要在一个 `js` 调用里跑完；
- Enter / Return 没有绝对哪个更可靠——取决于 QQ 的发送模式设置。多数用户默认 Enter 发送，建议先试 Enter 再 fallback 到 Return。

---

📦 配套 Skill 资源包：[qq-messenger]({{ '/skills/qq-messenger/SKILL.md' | relative_url }})——下载后放入 `~/.claude/skills/`，即可用 `/qq-messenger` 控制 QQ 发消息。

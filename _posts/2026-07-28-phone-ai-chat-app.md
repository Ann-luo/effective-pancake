---
layout: post
title: "附：Phone 脱敏通用版下载"
date: 2026-07-28 12:00:00 +0800
categories: [Claude Code, AI工具]
tags: [HTML, AI, 开源]
---

[Phone](/effective-pancake/assets/phone.html) 是从[布雷斯项目](/effective-pancake/2026/07/23/ai-chat-app-dev-record.html)脱敏而来的通用版——去掉了所有角色设定和个人信息，换上通用 AI 助手人设。

📥 **[下载 phone.html](/effective-pancake/assets/phone.html)**（右键另存为，~380KB，双击即用）

---

## 怎么用

### 1. 获取 API Key

去 [DeepSeek 开放平台](https://platform.deepseek.com) 注册，在 API Keys 页面创建一个 key。新用户有免费额度。

### 2. 打开应用

双击 `phone.html`，浏览器打开。点底部导航栏的 👤 进入设置，填入 API Key，保存。

### 3. 开始聊天

切回聊天页，打字发送。默认 AI 助手人设偏温和友好——可以在设置 → 智能体管理里自定义人设。

### 4. 自定义角色

设置 → 当前智能体 → 点名字进入智能体列表。可以新建角色，编辑名字、头像 emoji、人设模板。人设决定了 AI 说话的风格和背景故事。

---

## 功能一览

| 功能 | 位置 |
|------|------|
| 💬 AI 聊天 | 主页，支持流式输出、多气泡连发 |
| 🤖 多智能体 | 点聊天顶部名字切换 |
| 📂 多房间 | 点 📂 图标，同一角色不同话题 |
| 📷 朋友圈 | 底部 tab，AI 自动发帖互动 |
| 📔 日记 | 底部 tab，AI 自动写 |
| ✅ 待办 | 底部 tab，AI 可见不可改 |
| 🎵 歌单 | 底部 tab，粘贴链接自动识别平台 |
| 🧧 红包 | 聊天框 + 号菜单 |
| 🛒 礼物 | 👤 → 钱包 → 礼物商店 |
| 🔒 锁屏 | 设置 → 安全，支持 PIN 和问答 |
| 🌙 深色 | 设置 → 外观 |
| 📤 导出 | 各页面 📤 按钮，APK/浏览器自适应 |
| 📥 导入 | 各页面 📥 按钮，按 id 去重合并 |

---

## 打包成 APK

用 HBuilder X 打开 `phone.html` → 发行 → 原生 App-云打包。详见 [HBuilder 本地调试实录](/effective-pancake/2026/07/27/hbuilder-local-debug.html)。

---

## 技术细节

- **纯前端**：HTML + CSS + 原生 JS，零框架零依赖
- **存储**：IndexedDB，容量几百 MB，文字聊天几乎无限
- **API**：DeepSeek Chat Completions（兼容 OpenAI 格式），换成其他模型改一行 URL 即可
- **脱敏内容**：人设、头像、贴纸文案、默认角色名均已通用化

源码在 [GitHub](https://github.com/Ann-luo/effective-pancake) `assets/phone.html`。

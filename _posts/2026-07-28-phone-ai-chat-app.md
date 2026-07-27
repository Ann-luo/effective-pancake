---
layout: post
title: "Phone：一个单文件 AI 聊天应用（脱敏通用版）"
date: 2026-07-28 12:00:00 +0800
categories: [Claude Code, AI工具]
tags: [HTML, AI, DeepSeek, 单文件, 开源]
---

## 这是什么

一个纯前端 AI 聊天应用，**单文件 HTML，双击打开即用**。

长得像微信，能聊天、发朋友圈、写日记、管理待办和歌单，有红包和礼物系统。接 DeepSeek API，IndexedDB 存储，支持 HBuilder 打包成 APK。

是从[布雷斯项目](/effective-pancake/2026/07/23/ai-chat-app-dev-record.html)脱敏而来的通用版——去掉了所有角色设定和个人信息，换上通用人设，开箱即用。

## 下载

📥 **[phone.html](/effective-pancake/assets/phone.html)**（右键另存为，约 380KB）

## 怎么用

1. 下载 `phone.html`
2. 双击浏览器打开
3. 设置里填 DeepSeek API Key
4. 开始聊天

### 打包成 APK

用 HBuilder X 打开 → 发行 → 原生 App-云打包。详见 [HBuilder 本地调试实录](/effective-pancake/2026/07/27/hbuilder-local-debug.html)。

## 功能

- 💬 多智能体 + 多房间聊天（流式输出、多气泡）
- 📷 朋友圈（自动发布、互动评论）
- 📔 AI 日记
- ✅ 待办清单 + 🎵 共享歌单
- 🧧 红包 + 🛒 礼物商店 + 💰 钱包
- 🔒 锁屏密码 + 🌙 深色模式
- 📤 全功能导入导出（APK/浏览器双适配）
- IndexedDB 存储，不依赖后端

## 技术栈

纯 HTML + CSS + 原生 JavaScript，零框架零依赖。约 9300 行，380KB。

## 源码

[GitHub 仓库](https://github.com/Ann-luo/effective-pancake) → `assets/phone.html`

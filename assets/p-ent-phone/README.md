# 📱 Phone Desktop — 手机桌面模拟器

> 纯前端 · 模块化 · 零依赖 · 12 家 AI 供应商自由切换

给 AI 聊天应用加一个完整的手机桌面操作系统层。打开是一个手机桌面——锁屏、小组件、22 个 App、7 个小游戏、通知、壁纸、主题切换。点 Phone 图标进入完整 AI 聊天应用。

v2.1 · 26 个文件 · 7446 行 · GitHub 版本管理 · CC BY-NC 4.0

---

## ✨ 功能

### 系统层
- 🔒 锁屏界面（点击解锁，时钟+日期，深蓝渐变背景）
- 🏠 多页桌面（图标网格，4×6 布局，滑动翻页）
- 📌 底部 Dock 栏（长按自定义更换图标）
- 🧩 桌面小组件（时钟、天气、日历、待办、便签）
- 📂 文件夹管理（点选式归类）
- 🎨 主题切换（深蓝 / 暗黑 / 浅色）
- 🔍 全局搜索（搜 App 名、联系人）
- 🔔 通知系统（顶部横幅 + 通知中心 + 图标角标红点）
- 💾 一键备份恢复（JSON 全量导出/导入，排除媒体大文件）

### 🤖 AI 多模型支持（12 家供应商）

| 供应商 | 最新模型 | 区域 |
|--------|------|:--:|
| **DeepSeek** | v4-flash, v4-pro | 🇨🇳 |
| **通义千问** | qwen3.7-max, plus, flash | 🇨🇳 |
| **百度文心** | ernie-4.5-turbo, ernie-5.0 | 🇨🇳 |
| **字节豆包** | doubao-pro, doubao-lite | 🇨🇳 |
| **Kimi** | moonshot-v1-8k/32k/128k | 🇨🇳 |
| **智谱 GLM** | glm-4-flash, plus, long | 🇨🇳 |
| **讯飞星火** | spark-lite, pro, max | 🇨🇳 |
| **MiniMax** | M3, M2.5 | 🇨🇳 |
| **GPT** | gpt-5, gpt-5-nano, gpt-4.1 | 🌍 |
| **Claude** | sonnet-5, opus-5, haiku-4.5 | 🌍 |
| **Gemini** | 2.5-flash, 2.5-pro | 🌍 |
| **Mistral** | medium-3.5, small-4 | 🌍 |

每供应商独立 API Key + base URL + 模型列表。支持自动拉取模型（Kimi/GPT/Mistral）。Claude 独有 Messages API 适配。

### App（22 个）
📷 相机 · 🖼️ 相册 · 📁 文件 · 🎵 音乐 · 📝 备忘录 · 📅 日历 · ⏰ 时钟（秒表/倒计时/闹钟）· 📟 计算器 · 🌤️ 天气（随机+wttr.in） · 📞 电话 · 🗺️ 地图 · ⚙️ 设置 · 🏪 商店 · 🔔 通知 · 🎮 小游戏 · 📊 查手机 · 💬 Phone · 💬 短信 · 🤖 AI 模型管理

### 小游戏（7 个）
🔢 2048 · ⚫ 五子棋（AI 对战）· 🎯 猜数字 · ✊ 石头剪刀布 · 🃏 21点 · 🐍 贪吃蛇 · 💣 扫雷（标旗模式）

---

## 🚀 使用

### 浏览器
直接用浏览器打开 `index.html`。

### Android APK
用 HBuilder X 打包（HTML5+）。把 `index.html` + `css/` + `js/` 复制到 HBuilder 项目的 `p-ent-phone/` 目录，云打包即可。

### 首次使用
1. 点 🔒 锁屏解锁
2. 点 ⚙️ 设置 → 🤖 AI 模型管理 → 选供应商 → 填 API Key
3. 点 💬 Phone 开始聊天

---

## 🛠 技术栈

- **纯前端**：HTML + CSS + JavaScript（经典 script 标签，file:// 兼容）
- **存储**：IndexedDB（pent_db_v1）+ localStorage
- **AI**：12 家供应商统一 `pchatCompletion()` 抽象层，支持流式 SSE 和非流式
- **打包**：HBuilder HTML5+
- **版本管理**：Git（40+ commits）

---

## 📁 文件结构

```
p-ent-phonev2/
├── index.html              ← 主文件（7446行）
├── css/style.css           ← 所有样式
├── js/
│   ├── storage.js          ← IndexedDB 封装
│   ├── provider.js         ← 12 供应商 + 统一 API
│   ├── dock.js             ← Dock 自定义
│   ├── notifications.js    ← 通知系统
│   ├── export.js           ← 导出模块
│   ├── theme.js            ← 主题切换
│   ├── apps/               ← 14 个 App 模块
│   └── games/              ← 7 个游戏
├── README.md
├── LICENSE (CC BY-NC 4.0)
└── .gitignore
```

---

## ⚠️ 注意

- 需要自行申请 API Key（DeepSeek 免费额度够个人用：[platform.deepseek.com](https://platform.deepseek.com/)）
- 所有数据存储在浏览器本地，清除数据会丢失，请定期备份
- APK 分享面板依赖 H5+ API，部分 ROM 可能不兼容
- 非商用（CC BY-NC 4.0），数据完全本地

---

## 📝 开发记录

- [v1 开发全记录（69 章）](https://ann-luo.github.io/effective-pancake/2026/07/30/phone-desktop-dev-record.html)
- [v2 模块化重构（16 章）](https://ann-luo.github.io/effective-pancake/2026/08/04/pent-phone-v2-modules.html)
- [项目仓库](https://github.com/Ann-luo/p-ent-phone)

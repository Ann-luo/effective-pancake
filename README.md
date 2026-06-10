# effective-pancake 🥞

学习笔记 · 随性版

> 爱看看，不看滚，反正我写爽了就行。

[![GitHub Pages](https://img.shields.io/badge/Pages-在线博客-blue?logo=github)](https://ann-luo.github.io/effective-pancake)
[![Jekyll](https://img.shields.io/badge/Jekyll-静态博客-red?logo=jekyll)](https://jekyllrb.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

🌐 **博客地址：[ann-luo.github.io/effective-pancake](https://ann-luo.github.io/effective-pancake)**

---

## 📂 文章目录

### 一、VS Code & GitHub Copilot

| # | 文章 | 说明 |
|---|------|------|
| 1 | [代理连接错误：排查与修复完全指南](./_posts/2026-06-08-vscode-copilot-proxy-fix.md) | 解决 `ERR_PROXY_CONNECTION_FAILED`，从定位到根治 |
| 1-1 | 　└ [原始排查聊天记录](./_posts/2026-06-08-vscode-copilot-proxy-chatlog.md) | 从报错到解决的真实对话过程 |

### 二、Windows 技巧

| # | 文章 | 说明 |
|---|------|------|
| 2 | [符号链接完全指南：拯救 C 盘空间](./_posts/2026-06-08-windows-symlink-guide.md) | `mklink /J` 命令详解 + 图形化工具 + VS Code 实战 |
| 2-1 | 　└ [原始探索聊天记录](./_posts/2026-06-08-windows-symlink-chatlog.md) | 从忘记命令到掌握符号链接全过程 |

### 三、GitHub & 博客搭建

| # | 文章 | 说明 |
|---|------|------|
| 3 | [GitHub 仓库变身博客完全指南](./_posts/2026-06-10-github-repo-to-blog-guide.md) | 免费把 GitHub 仓库变成博客网站，小白友好 |

### 四、Claude Code & AI 工具

| # | 文章 | 说明 |
|---|------|------|
| 4 | [Claude Code × Codex CDP Skill：跨模型通信踩坑与修复](./_posts/2026-06-10-codex-cdp-skill.md) | 自定义 Skill — 扁平文件陷阱、CDP 页面检测修复 |
| 　 | 　📦 [Skill 资源包：codex-chat](./skills/codex-chat/SKILL.md) | 下载后放入 `~/.claude/skills/`，重启即可用 `/codex-chat` |

---

## 🚀 快速开始

**阅读博客** → [ann-luo.github.io/effective-pancake](https://ann-luo.github.io/effective-pancake)

**使用 Skill** → 复制到 Claude Code 配置目录：
```bash
cp -r skills/codex-chat ~/.claude/skills/
```
然后在 Claude Code 里说 `和 Codex 聊天` 即可。

**投稿 / 复刻** → `git clone` → 在 `_posts/` 新建文章 → `git push` → 自动部署。

---

## 🛠 Skills 资源包

| # | Skill | 说明 | 安装 |
|---|-------|------|------|
| 1 | [codex-chat](./skills/codex-chat/SKILL.md) | 通过 CDP 与 OpenAI Codex 桌面客户端通信 | `cp -r skills/codex-chat ~/.claude/skills/` |

---

## 📁 仓库结构

```
effective-pancake/
│
├── _posts/                  ← 博客文章（Markdown）
│   ├── 2026-06-08-vscode-copilot-proxy-fix.md       (一-1) VS Code Copilot 代理修复
│   ├── 2026-06-08-vscode-copilot-proxy-chatlog.md   (一-1-1) ├ 排查聊天记录
│   ├── 2026-06-08-windows-symlink-guide.md           (二-2) Windows 符号链接
│   ├── 2026-06-08-windows-symlink-chatlog.md         (二-2-1) ├ 探索聊天记录
│   ├── 2026-06-10-github-repo-to-blog-guide.md       (三-3) GitHub 仓库变身博客
│   └── 2026-06-10-codex-cdp-skill.md                 (四-4) Codex CDP Skill
│
├── skills/                  ← Claude Code Skill 资源包
│   └── codex-chat/
│       ├── SKILL.md
│       └── scripts/
│           └── codex_cdp_helper.js
│
├── _config.yml              ← Jekyll 博客配置
├── index.md                 ← 博客首页
├── Gemfile                  ← Jekyll 依赖
├── README.md                ← 本文件
├── LICENSE
└── .github/
    └── workflows/
        └── jekyll.yml       ← GitHub Actions 自动部署
```

---

## ⚙️ 技术栈

| 层 | 技术 |
|----|------|
| 内容 | Markdown + Jekyll Front Matter |
| 生成 | [Jekyll](https://jekyllrb.com) + [Minima](https://github.com/jekyll/minima) |
| 托管 | [GitHub Pages](https://pages.github.com) |
| 部署 | [GitHub Actions](https://github.com/features/actions) |
| 扩展 | [Claude Code Skills](https://claude.ai/code) |

---

*最后更新：2026 年 6 月 10 日*

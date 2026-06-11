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
| 1.1 | [代理连接错误：排查与修复完全指南](./_posts/2026-06-08-vscode-copilot-proxy-fix.md) | 解决 `ERR_PROXY_CONNECTION_FAILED`，从定位到根治 |
| 1.2 | 　└ [原始排查聊天记录](./_posts/2026-06-08-vscode-copilot-proxy-chatlog.md) | 从报错到解决的真实对话过程 |

### 二、Windows 技巧

| # | 文章 | 说明 |
|---|------|------|
| 2.1 | [符号链接完全指南：拯救 C 盘空间](./_posts/2026-06-08-windows-symlink-guide.md) | `mklink /J` 命令详解 + 图形化工具 + VS Code 实战 |
| 2.2 | 　└ [原始探索聊天记录](./_posts/2026-06-08-windows-symlink-chatlog.md) | 从忘记命令到掌握符号链接全过程 |

### 三、GitHub & 博客搭建

| # | 文章 | 说明 |
|---|------|------|
| 3.1 | [GitHub 仓库变身博客完全指南](./_posts/2026-06-10-github-repo-to-blog-guide.md) | 免费把 GitHub 仓库变成博客网站，小白友好 |

### 四、Claude Code & AI 工具

| # | 文章 | 说明 |
|---|------|------|
| 4.1 | [Claude Code × Codex CDP Skill：跨模型通信踩坑与修复](./_posts/2026-06-10-codex-cdp-skill.md) | 自定义 Skill — 扁平文件陷阱、CDP 页面检测修复 |
| 4.2 | 　📦 [Skill 资源包：codex-chat](./skills/codex-chat/SKILL.md) | 下载后放入 `~/.claude/skills/`，重启即可用 `/codex-chat` |
| 4.3 | [Publish Blog Skill：一条龙自动发布博客的原理](./_posts/2026-06-10-publish-blog-skill.md) | Skill 设计思路 — 怎么让 AI 写文章不漏改一个文件 |

### 五、杂项

| # | 文章 | 说明 |
|---|------|------|
| 5.1 | [AI 茶馆夜话：两个 AI 在我电脑上聊起来了](./_posts/2026-06-10-ai-tea-room.md) | Claude Code × Codex 四轮跨模型对话，AI 间的茶水间峰会 |
| 5.2 | 　└ [原始聊天记录](./assets/codex-cc-2026-06-10.txt) | CDP 桥接通信完整文本，1055 行全量记录 |

### 六、Codex & Computer Use

| # | 文章 | 说明 |
|---|------|------|
| 6.1 | [Codex 控制 QQ 发消息调试记](./_posts/2026-06-11-codex-qq-messenger-debug.md) | 十一关调试实录：权限、ESM、缓存、Enter vs Return、窗口状态…… |
| 6.2 | 　📦 [Skill 资源包：qq-messenger](./skills/qq-messenger/SKILL.md) | 放入 Codex 的 skills 目录，通过 Codex Computer Use 控制 QQ 发消息 |
| 6.3 | 　└ [原始聊天记录](./assets/codex-qq-2026-06-11.txt) | 完整调试对话过程，从权限报错到消息发送成功 |

---

## 🚀 快速开始

**阅读博客** → [ann-luo.github.io/effective-pancake](https://ann-luo.github.io/effective-pancake)

**Claude Code Skill** → 复制到 Claude Code 配置目录：
```bash
cp -r skills/codex-chat ~/.claude/skills/
cp -r skills/publish-blog ~/.claude/skills/
```

**Codex Skill** → 将 `skills/qq-messenger/SKILL.md` 放入 Codex 的 skills 目录，即可通过 Codex Computer Use 控制 QQ 发消息。

**投稿 / 复刻** → `git clone` → 在 `_posts/` 新建文章 → `git push` → 自动部署。

---

## 🛠 Skills 资源包

| # | Skill | 说明 | 安装 |
|---|-------|------|------|
| 4.2 | [codex-chat](./skills/codex-chat/SKILL.md) | 通过 CDP 与 OpenAI Codex 桌面客户端通信，对应文章 4.1 | `cp -r skills/codex-chat ~/.claude/skills/` |
| 4.3 | [publish-blog](./skills/publish-blog/SKILL.md) | 一条龙博客发布：写文章 → 更新索引 → 自动推送，对应文章 4.3 | `cp -r skills/publish-blog ~/.claude/skills/` |
| 6.2 | [qq-messenger](./skills/qq-messenger/SKILL.md) | 通过 Codex Computer Use 控制 Windows QQ 发消息，对应文章 6.1 | 放入 Codex 的 skills 目录 |

---

## 📁 仓库结构

```
effective-pancake/
│
├── _posts/                  ← 博客文章（Markdown）
│   ├── 2026-06-08-vscode-copilot-proxy-fix.md       (1.1) VS Code Copilot 代理修复
│   ├── 2026-06-08-vscode-copilot-proxy-chatlog.md   (1.2) ├ 排查聊天记录
│   ├── 2026-06-08-windows-symlink-guide.md           (2.1) Windows 符号链接
│   ├── 2026-06-08-windows-symlink-chatlog.md         (2.2) ├ 探索聊天记录
│   ├── 2026-06-10-github-repo-to-blog-guide.md       (3.1) GitHub 仓库变身博客
│   ├── 2026-06-10-codex-cdp-skill.md                 (4.1) Codex CDP Skill
│   ├── 2026-06-10-publish-blog-skill.md               (4.3) Publish Blog Skill
│   ├── 2026-06-11-codex-qq-messenger-debug.md          (6.1) Codex 控制 QQ 发消息
│   └── 2026-06-10-ai-tea-room.md                     (5.1) AI 茶馆夜话
│
├── assets/                  ← 附件 / 原始记录
│   ├── codex-cc-2026-06-10.txt                       (5.2) AI 茶馆夜话聊天记录
│   └── codex-qq-2026-06-11.txt                       (6.3) Codex QQ 发消息调试记录
│
├── skills/                  ← Claude Code Skill 资源包
│   ├── codex-chat/
│   │   ├── SKILL.md
│   │   └── scripts/
│   │       └── codex_cdp_helper.js
│   ├── publish-blog/
│   │   └── SKILL.md
│   └── qq-messenger/
│       └── SKILL.md
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

*最后更新：2026 年 6 月 11 日*

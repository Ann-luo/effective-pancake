---
layout: post
title: "Publish Blog Skill：一条龙自动发布博客的原理"
date: 2026-06-10 23:00:00 +0800
categories: ["四、Claude Code & AI 工具"]
tags: [Claude Code, Skill, Jekyll, 博客自动化, GitHub Pages]
---

## 痛点

我的博客是 Jekyll + GitHub Pages 搭的，发一篇文章要改 **三个文件**：

| 文件 | 干什么 |
|------|--------|
| `_posts/YYYY-MM-DD-slug.md` | 文章正文 |
| `index.md` | 首页文章导航（手写分类列表） |
| `README.md` | 仓库主页的文章目录表 + 仓库结构图 |

一开始是手动改的，后面让 Claude Code 帮我改。但每次说完"写个博客"，它不一定记全三个文件。上次就漏了 README 的目录表和仓库结构图，只改了 index.md。

于是决定把它做成一个 **Claude Code Skill** —— `/publish-blog`。

---

## Skill 是什么

Claude Code 的 Skill 就是一个 Markdown 文件，放在 `~/.claude/skills/<name>/SKILL.md` 里。Claude Code 启动时自动扫这个目录，把 Skill 加载到系统提示里。当用户说触发词（或手动 `/skill-name`），Claude Code 就按 Skill 里写的流程执行。

本质上是一个 **可复用的操作手册** —— 把"怎么做"写清楚，AI 就不会漏步骤。

---

## publish-blog Skill 设计

### 触发方式

用户说 **"写个博客"**、**"发文章"**、**"发布到博客"**，或手动 `/publish-blog`。

### 执行流程（7 步）

```
1. git pull + git status         → 确认仓库是最新的
2. 写 _posts/ 文章               → Jekyll Front Matter 模板
3. 更新 index.md                 → 在对应分类下加 - X.Y 标题
4. 更新 README.md（三处）        → 文章目录表 / 仓库结构图 / Skills 表格
5. 附件入 assets/                → 聊天记录、截图等
6. git add → commit → push       → 推到 main 分支
7. 等 1-5 分钟 GitHub Pages 部署
```

### 为什么要把流程写成文件而不是靠记忆

1. **记忆会过期** — 上下文压缩后细节就丢了，下次可能又漏改 README
2. **Skill 是硬约束** — 写进 Skill 的步骤，Claude Code 一定会执行，不会被其他上下文干扰
3. **可分享** — 别人 clone 仓库后把 `skills/publish-blog` 复制到 `~/.claude/skills/` 就能用

---

## 关键设计决策

### 三文件同步是核心

这个博客的特殊之处在于有三份"目录"需要同步：

```
文章正文（_posts/）
    ↕
首页导航（index.md）      ← 访问者看到的第一个页面
    ↕
仓库主页（README.md）     ← GitHub 项目首页，很多读者从这跳转
```

漏了哪个都会让读者找不到新文章。Skill 把这做成强制步骤，一步不漏。

### 编号规范

五个分类用中文数字编号（一、二、三、四、五），子编号 `X.Y`。新分类按序递增。这样写文章时不用想编号，Skill 自动分配。

### commit 格式

```
新文章: 文章标题

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

保持一致的 commit 历史，方便日后追溯。

---

## Skill 文件结构

```
skills/publish-blog/
└── SKILL.md          ← 唯一的文件，包含全部流程说明
```

和 `codex-chat` skill 不一样——那个需要 `scripts/codex_cdp_helper.js` 辅助脚本。publish-blog 纯靠自然语言指令，不需要额外代码。

原因：publish-blog 的操作全是文件读写和 git 命令，Claude Code 本身就有这些工具。加脚本反而多了一层维护负担。

---

## 安装方式

```bash
cp -r skills/publish-blog ~/.claude/skills/
```

重启 Claude Code 后生效。然后说"写个博客"就行。

---

## 下一步

下一步把这些 Skill 做成一个合集，一个仓库搞定博客的完整自动化：

- `/codex-chat` — 跨模型通信
- `/publish-blog` — 博客发布
- 未来可能加 `/blog-analytics`、`/auto-backup` 之类的

---

## 附录：Skill 完整源码

见仓库 `skills/publish-blog/SKILL.md`，或本地 `~/.claude/skills/publish-blog/SKILL.md`。

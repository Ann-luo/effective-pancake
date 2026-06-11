# Publish Blog Skill

将文章发布到 effective-pancake 博客，自动同步 index.md 导航和 README.md 目录。

## 前置条件

- 仓库已 clone 到 `C:\tmp\effective-pancake`
- 有 GitHub push 权限（Ann-luo/effective-pancake）

## 完整流程

### 步骤 1：确认仓库状态

```bash
cd /c/tmp/effective-pancake && git pull origin main && git status
```

### 步骤 2：写文章

在 `_posts/` 下创建 `YYYY-MM-DD-slug.md`，模板：

```markdown
---
layout: post
title: "文章标题"
date: YYYY-MM-DD HH:MM:SS +0800   ← ⚠️ 时间必须早于当前 UTC 时间，否则 Jekyll 会跳过（future: false 默认）
categories: ["分类名"]
tags: [标签1, 标签2]
---

## 正文
```

### 步骤 3：更新 index.md（首页导航）

在对应分类下添加条目：

```markdown
- X.Y 文章标题
```

### 步骤 4：更新 README.md（三处）

#### 4a. 文章目录表

在对应分类表格中添加行：

```markdown
| X.Y | [标题](./_posts/YYYY-MM-DD-slug.md) | 一句话说明 |
```

如果有附件（如聊天记录 txt）：

```markdown
| X.Y+1 | 　└ [附件描述](./assets/filename.txt) | 说明 |
```

#### 4b. 仓库结构图

在 `_posts/` 区块添加：

```
│   ├── YYYY-MM-DD-slug.md                     (X.Y) 标题
```

如果有附件，在 `assets/` 区块添加。

#### 4c. 新分类（如有需要）

**分类规则**：文章必须放入最匹配的大类。如果现有大类都不合适，**新开一个大类**（编号顺延，如「七、xxx」）。**不要**把不匹配的文章塞进「五、杂项」——杂项只放真正无法归类的零散内容。

新增分类时需同步：
- README 文章目录表：新增 `### 七、分类名` 表格区块
- index.md 导航：新增 `**七、分类名**` 区块
- 本文件的「现有分类」表：新增一行

### 步骤 5：附件 / Skill 资源包

**普通附件**（聊天记录、截图等）→ `assets/` 目录。

**Skill 资源包**（如果文章配套了 Claude Code Skill）→ `skills/<skill-name>/SKILL.md`。

附带 Skill 时需要同步更新四处：

| 位置 | 格式 |
|------|------|
| `skills/<name>/SKILL.md` | 复制 Skill 文件到仓库 |
| index.md 导航 | `- X.Y Skill 资源包：skill-name`（紧跟在对应文章后面） |
| README 文章目录表 | `\| X.Y \| 　📦 [Skill 资源包：xxx](./skills/xxx/SKILL.md) \| 说明 \|` |
| README Skills 资源包表 | `\| X.Y \| [xxx](./skills/xxx/SKILL.md) \| 说明 \| cp -r skills/xxx ~/.claude/skills/ \|` |
| README 仓库结构图 | `skills/` 区块加 `├── xxx/` + `│   └── SKILL.md` |
| README 快速开始 | `cp` 命令块加一行 |

示例（qq-messenger，编号 6.2，对应文章 6.1）：

```markdown
<!-- index.md -->
- 6.1 Codex 控制 QQ 发消息——一晚上的调试记录
- 6.2 Skill 资源包：qq-messenger

<!-- README 文章目录表 -->
| 6.1 | [Codex 控制 QQ 发消息调试记](./_posts/...) | 说明 |
| 6.2 | 　📦 [Skill 资源包：qq-messenger](./skills/qq-messenger/SKILL.md) | 说明 |

<!-- README Skills 资源包表 -->
| 6.2 | [qq-messenger](./skills/qq-messenger/SKILL.md) | 说明 | `cp -r skills/qq-messenger ~/.claude/skills/` |
```

### 步骤 6：提交推送

```bash
cd /c/tmp/effective-pancake
git add _posts/ index.md README.md assets/ skills/
git commit -m "新文章: 标题"
git push origin main
```

### 步骤 7：确认部署

GitHub Pages 自动构建部署，1-5 分钟生效。
确认方式：`curl -s https://ann-luo.github.io/effective-pancake/ | grep "文章标题"`

## 现有分类（编号规范）

| 编号 | 分类名 |
|------|--------|
| 一 | VS Code & GitHub Copilot |
| 二 | Windows 技巧 |
| 三 | GitHub & 博客搭建 |
| 四 | Claude Code & AI 工具 |
| 五 | 杂项 |
| 六 | Codex & Computer Use |

## 注意事项

- index.md 导航用无序列表（`- X.Y 标题`）
- README 文章目录用表格（`| X.Y | [标题](链接) | 说明 |`）
- 仓库结构图用 ASCII 树（`│   ├──` / `│   └──`）
- 三个文件（_posts/、index.md、README.md）必须同步更新，不能只改一个
- commit message 用中文，Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
- **⚠️ Jekyll 未来日期陷阱**：Jekyll 默认 `future: false`，构建时跳过 date 晚于构建时间的文章。GitHub Actions 用 UTC 时间（= CST-8）。所以 `date` 的时间不要设为晚上（如 23:00 CST = 15:00 UTC），用 `12:00:00 +0800` 或更早的时间确保在 UTC 构建时已经是过去

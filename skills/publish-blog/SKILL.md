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
date: YYYY-MM-DD HH:MM:SS +0800
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

如果文章类别不在现有分类中，需要在 README 文章目录表添加新分类的完整表格，并在 index.md 添加新分类标题。

### 步骤 5：附件

聊天记录、截图等放入 `assets/` 目录。

### 步骤 6：提交推送

```bash
cd /c/tmp/effective-pancake
git add _posts/ index.md README.md assets/
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

## 注意事项

- index.md 导航用无序列表（`- X.Y 标题`）
- README 文章目录用表格（`| X.Y | [标题](链接) | 说明 |`）
- 仓库结构图用 ASCII 树（`│   ├──` / `│   └──`）
- 三个文件（_posts/、index.md、README.md）必须同步更新，不能只改一个
- commit message 用中文，Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>

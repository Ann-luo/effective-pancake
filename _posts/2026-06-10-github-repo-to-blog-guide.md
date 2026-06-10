---
layout: post
title: "GitHub 仓库变身博客完全指南"
date: 2026-06-10
categories: [教程]
tags: [GitHub, GitHub Pages, Jekyll, 博客, 小白教程]
description: "免费把 GitHub 仓库变成博客网站，纯小白友好，手把手教学"
---

## 一、这是干嘛？

把你的 GitHub 仓库变成一个**博客网站**。写文章用 Markdown，推送完 GitHub 自动把文章变成网页。你不用买服务器、不用装软件、不用写代码。

---

## 二、你需要准备什么？

| 东西 | 说明 |
|------|------|
| 一个 GitHub 账号 | 注册免费 |
| 一个 GitHub 仓库 | 空的也行 |
| 会写 Markdown | 不会也行，反正就是写字 |

就这三样，没了。

---

## 三、博客靠什么跑起来？

三个 GitHub 官方免费功能拼在一起：

```
Jekyll（网页生成器） + GitHub Pages（免费托管） + GitHub Actions（自动构建）
```

打个比方：
- **Jekyll**：好比一个"烘焙机"，把你写的 Markdown 文字烤成网页
- **GitHub Pages**：免费的"展示柜"，把烤好的网页展示给全世界看
- **GitHub Actions**：一个"自动按钮"，你一推送它就自动启动烘焙机

整个过程你只做一件事：**写文章，git push**。

---

## 四、操作步骤

### 第 1 步：创建 4 个核心文件

在你的仓库根目录创建：

#### ① `_config.yml` — 配置文件

```yaml
title: 你的博客名
description: 简短描述
theme: minima
baseurl: "/你的仓库名"
url: "https://你的用户名.github.io"

plugins:
  - jekyll-feed
  - jekyll-seo-tag

defaults:
  - scope:
      path: ""
      type: "posts"
    values:
      layout: "post"
```

> `theme: minima` 是 GitHub 官方支持的主题之一，首页自动列出文章，风格简洁。改个主题名就能换皮肤。

#### ② `index.md` — 博客首页

```markdown
---
layout: home
title: 你的博客名
---

欢迎文案写这里。
```

> `layout: home` 是 minima 主题自带的首页模板，自动显示所有文章列表。

#### ③ `Gemfile` — 零件清单

```ruby
source "https://rubygems.org"

gem "jekyll", "~> 4.3"
gem "minima", "~> 2.5"
gem "jekyll-feed"
gem "jekyll-seo-tag"
```

这个文件告诉 Jekyll 需要哪些"零件"（Ruby 术语叫 Gem）。

#### ④ `.github/workflows/jekyll.yml` — 自动部署脚本

告诉 GitHub Actions："每次有人 push，帮我运行 Jekyll 构建，然后部署到 Pages。"

```yaml
name: Deploy Jekyll site to Pages

on:
  push:
    branches: ["main"]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
      - uses: actions/configure-pages@v5
        id: pages
      - run: bundle install
      - run: bundle exec jekyll build --baseurl "${{ steps.pages.outputs.base_path }}"
        env:
          JEKYLL_ENV: production
      - uses: actions/upload-pages-artifact@v3

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/deploy-pages@v4
```

### 第 2 步：写第一篇文章

在 `_posts/` 目录下新建文件，命名格式：`年-月-日-标题.md`，例如：

```
_posts/2026-06-10-我的第一篇文章.md
```

文章内容：

```markdown
---
layout: post
title: "我的第一篇文章"
date: 2026-06-10
categories: [分类名]
tags: [标签1, 标签2, 标签3]
---

这里写正文，跟平时写 Markdown 一样。
```

> `---` 之间的部分叫 **Front Matter**，是给 Jekyll 看的元信息。`layout: post` 用文章模板，`title` 是文章标题，`date` 是发布日期。

### 第 3 步：推送到 GitHub

```bash
git add -A
git commit -m "初始化博客"
git push origin main
```

### 第 4 步：打开 GitHub Pages 开关

去仓库的 **Settings → Pages**，把 **Source** 设为 **GitHub Actions**，保存。

> 这一步只需要做一次。之后 GitHub Actions 会自动处理部署。

### 第 5 步：等一两分钟

推送后 GitHub Actions 会自动跑一个叫 **"Deploy Jekyll site to Pages"** 的任务。在仓库的 **Actions** 标签页能看进度。

变绿 ✅ 就说明部署成功，博客地址是：

```
https://你的用户名.github.io/仓库名/
```

---

## 五、以后怎么发新文章？

三步：

1. 在 `_posts/` 新建 `YYYY-MM-DD-标题.md`，写上 Front Matter + 正文
2. `git push`
3. 一两分钟后博客自动更新

想偷懒的话，让 AI 帮你写文件+推送也行。

---

## 六、常见问题

### 为什么显示 404？

三个可能：
- 还没设置 Pages Source 为 GitHub Actions（去 Settings → Pages 设）
- Actions 还没跑完（去 Actions 页看，等绿了再刷新）
- 仓库是私有的（Settings → Pages 需要公开仓库，或者买 GitHub Pro）

### 为什么 Actions 红色失败？

99% 是 `Gemfile` 的问题：
- 没创建 Gemfile → 创建一个
- 没有 `gem "minima"` → 加上去
- 用了 `bundler-cache` 但没有 `Gemfile.lock` → 改成先 `bundle install`

### 能改主题吗？

能。GitHub 内置支持的主题在 [pages.github.com/themes](https://pages.github.com/themes/) 能看到。比如把 `_config.yml` 里的 `theme: minima` 改成 `theme: cayman` 就换了皮肤。

---

## 七、踩坑记录

| 坑 | 原因 | 解决 |
|----|------|------|
| Actions 第一次运行失败 | 没创建 Gemfile，工作流里用 `bundle add` 不靠谱 | 创建 Gemfile，工作流改成 `bundle install` |
| 显示 404 | Pages Source 没开 GitHub Actions | Settings → Pages 手动设 |
| 设了之后还是 404 | 工作流失败没部署成功 | 修复 Gemfile，等 Actions 跑绿 |

---

## 八、总结

```
GitHub 仓库 → 加 4 个文件 → Settings 开 Pages → 搞定
```

核心就 4 个文件：
- `_config.yml`（配置）
- `index.md`（首页）
- `.github/workflows/jekyll.yml`（自动部署）
- `Gemfile`（零件清单）

以后你只跟 `_posts/` 目录打交道，往里面塞 `.md` 文件就行。

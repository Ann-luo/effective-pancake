# Publish Blog Skill

将文章发布到 effective-pancake 博客，自动同步 index.md 导航和 README.md 目录。

## 前置条件

- 仓库已 clone 到 `C:\tmp\effective-pancake`
- 有 GitHub push 权限（Ann-luo/effective-pancake）
- ⚠️ 本地**没有 Ruby**，无法 `jekyll build` 预演。构建正确性只能靠 CI，所以步骤 6 的自检不能省

## 完整流程

### 步骤 1：确认仓库状态

```bash
cd /c/tmp/effective-pancake && git pull origin main && git status
```

### 步骤 2：写文章

在 `_posts/` 下创建 `YYYY-MM-DD-slug.md`：

```markdown
---
layout: post
title: "文章标题"
date: YYYY-MM-DD 12:00:00 +0800
categories: ["Codex & Computer Use"]   ← 只能取下方「分类清单」里的值
tags: [标签1, 标签2]
---

> 一句话导语

---

## 正文章节
```

**三个硬性要求：**

1. **正文不要写 H1**。标题由 `layout: post` 从 front matter 渲染；正文再写 `# 标题` 会重复显示一遍。
2. **`categories` 必须是 `["..."]` 列表形式**，且只能取固定清单里的值。写成裸字符串（`categories: Claude Code & AI 工具`）会被 Jekyll 按空格拆成多个分类。
3. **`date` 用 `12:00:00 +0800`**（见「未来日期陷阱」）。

### 步骤 3：更新 index.md（首页导航）

⚠️ **不要写 `./_posts/xxx.md`** —— 那个路径在博客上不存在，是 404（GitHub 上能点开、博客上点不开，容易漏掉）。改用 Jekyll 的 `post_url` 标签，它按文件名解析成真实文章地址，以后改 permalink 也不用回头修：

```markdown
- X.Y [文章标题]({% post_url YYYY-MM-DD-slug %})
```

`post_url` 里的名字必须和 `_posts/` 下的文件名（去掉 `.md`）**完全一致**，拼错会让整个 Jekyll 构建失败、站点停在旧版本。

附件（txt / html 等）放在 `assets/`，用绝对路径：

```markdown
- X.Y [附件描述](/effective-pancake/assets/filename.txt)
```

### 步骤 4：更新 README.md（两处，都要改）

README 是给 GitHub 看的，**不用** `post_url`，保持相对路径。

#### 4a. 文章目录表

```markdown
| X.Y | [标题](./_posts/YYYY-MM-DD-slug.md) | 一句话说明 |
```

说明列保持一句话，不要把整个 feature 清单塞进去。

附件行：

```markdown
| X.Y+1 | 　└ [附件描述](./assets/filename.txt) | 说明 |
```

#### 4b. 仓库结构图

```
│   ├── YYYY-MM-DD-slug.md                     (X.Y) 标题
```

漏改结构图是高频错误。

### 步骤 5：附件 / Skill 资源包

**普通附件**（聊天记录、截图等）→ `assets/`。

**Skill 资源包** → `skills/<skill-name>/SKILL.md`。

⚠️ **先看 Skill 是给谁用的，安装说明不一样：**

| Skill 类型 | 安装说明 | 例子 |
|-----------|---------|------|
| Claude Code Skill | `cp -r skills/xxx ~/.claude/skills/` | codex-chat、publish-blog |
| Codex Skill | 放入 Codex 的 skills 目录（不是 Claude Code 的目录！） | qq-messenger |

附带 Skill 需同步的位置：

| 位置 | 格式 |
|------|------|
| `skills/<name>/SKILL.md` | 复制 Skill 文件到仓库 |
| index.md 导航 | `- X.Y 📦 [Skill 资源包：skill-name](./skills/xxx/SKILL.md)` |
| README 文章目录表 | `\| X.Y \| 　📦 [Skill 资源包：xxx](./skills/xxx/SKILL.md) \| 说明 + 正确安装路径 \|` |
| README Skills 资源包表 | `\| X.Y \| [xxx](./skills/xxx/SKILL.md) \| 说明 \| 安装命令 \|` |
| README 仓库结构图 | `skills/` 区块加条目 |
| README 快速开始 | Claude Code Skill → 放进 `cp` 代码块；Codex Skill → 另起一行文字说明 |

示例——Codex Skill（qq-messenger，编号 6.2）：

```markdown
| 6.2 | 　📦 [Skill 资源包：qq-messenger](./skills/qq-messenger/SKILL.md) | 放入 Codex 的 skills 目录 |
```

示例——Claude Code Skill（codex-chat，编号 4.2）：

```markdown
| 4.2 | [codex-chat](./skills/codex-chat/SKILL.md) | CDP 与 Codex 通信 | `cp -r skills/codex-chat ~/.claude/skills/` |
```

### 步骤 6：提交前自检

本地无法构建，所以提交前跑一遍：

```bash
cd /c/tmp/effective-pancake
python - <<'PYEOF'
import io,re,glob,os,sys
sys.stdout.reconfigure(encoding='utf-8',errors='replace')
idx=io.open('index.md',encoding='utf-8').read()
posts={os.path.basename(p)[:-3] for p in glob.glob('_posts/*.md')}
refs=re.findall(r'\{%\s*post_url\s+(\S+?)\s*%\}',idx)
print('post_url 对不上的:', [r for r in refs if r not in posts] or '无')
CANON={'VS Code & GitHub Copilot','Windows 技巧','GitHub & 博客搭建',
       'Claude Code & AI 工具','杂项','Codex & Computer Use','日志'}
for p in sorted(glob.glob('_posts/*.md')):
    t=io.open(p,encoding='utf-8').read()
    m=re.match(r'^---\r?\n(.*?)\r?\n---\r?\n',t,re.S)
    if not m:
        print('  无 front matter:',p); continue
    c=re.search(r'^categories:\s*(.*)$',m.group(1),re.M)
    if not c or not c.group(1).startswith('['):
        print('  categories 不是列表:',p)
    elif c.group(1).strip('[]"\'') not in CANON:
        print('  categories 不在清单:',p,c.group(1))
    if re.match(r'^#\s',t[m.end():].lstrip('\r\n').split('\n')[0]):
        print('  正文有多余 H1:',p)
print('自检结束')
PYEOF
```

### 步骤 7：提交推送

```bash
cd /c/tmp/effective-pancake
git add _posts/ index.md README.md assets/ skills/
git commit -m "新文章: 标题"
git push origin main
```

commit message 用中文，结尾加 `Co-Authored-By: Claude <当前模型> <noreply@anthropic.com>`。

### 步骤 8：确认部署

GitHub Pages 自动构建部署，1-5 分钟生效。

```bash
# 首页能看到新文章标题
curl -s https://ann-luo.github.io/effective-pancake/ | grep "文章标题"
```

新文章地址格式为 `https://ann-luo.github.io/effective-pancake/:year/:month/:day/:title.html`，应返回 200。

若 Actions 失败，去仓库 Actions 页看构建日志 —— `post_url` 拼错是最常见原因。

## 分类清单（categories 只能取这七个值）

| index.md / README 区块标题 | front matter 里的取值 |
|---|---|
| 一、VS Code & GitHub Copilot | `"VS Code & GitHub Copilot"` |
| 二、Windows 技巧 | `"Windows 技巧"` |
| 三、GitHub & 博客搭建 | `"GitHub & 博客搭建"` |
| 四、Claude Code & AI 工具 | `"Claude Code & AI 工具"` |
| 五、杂项 | `"杂项"` |
| 六、Codex & Computer Use | `"Codex & Computer Use"` |
| 七、日志 | `"日志"` |

注意：front matter 里**不带**中文数字前缀（不带「六、」），前缀只出现在 index.md / README 的区块标题里。

**分类规则**：文章必须放进最匹配的大类。现有大类都不合适时**新开一个大类**（编号顺延），并把新值同时加进这张表 —— 不要塞进「五、杂项」，杂项只放真正无法归类的零散内容。

## 仓库约定（容易踩的坑）

- **permalink 已显式设置**为 `/:year/:month/:day/:title:output_ext`，URL 里**不含 categories**。所以改分类名不会改 URL；反过来说，别把 categories 当路径用
- **`_config.yml` 里有 `exclude`**，其中 `post/` 和 `README.md` 不会被发布。旧文不要往 `post/` 里放
- **`.gitignore` 已忽略 `_site/`、`.jekyll-cache/`**。本地若装了 Ruby 跑过 `jekyll build`，别把生成目录提交上来
- **⚠️ Jekyll 未来日期陷阱**：Jekyll 默认 `future: false`，构建时跳过 date 晚于构建时间的文章。GitHub Actions 用 UTC（= CST-8）。所以 `date` 统一用 `12:00:00 +0800`，别用晚上时间
- **⚠️ Skill 类型不要搞混**：附带 Skill 时先确认是 Claude Code 还是 Codex 用的。Codex Skill 不要写 `cp -r ... ~/.claude/skills/`
- **三个文件必须同步**：`_posts/`（front matter）+ `index.md`（导航）+ `README.md`（目录表 + 结构图，两处）

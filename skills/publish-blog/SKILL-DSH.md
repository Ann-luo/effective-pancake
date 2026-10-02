
# Publish Blog

把文章发布到 effective-pancake 博客，自动同步 `index.md` 导航和 `README.md` 目录。

> 本技能原本是 Claude Code 版（bash 写法）。这份是 **DSH 版**：命令改成 PowerShell，
> shell 用 `pwsh`。原版在 `~/.claude/skills/publish-blog/`，两份并存、互不影响。

## 前置条件

- 仓库已 clone 到 `C:\tmp\effective-pancake`
- 有 GitHub push 权限（`Ann-luo/effective-pancake`）
- ⚠️ 本地**没有 Ruby**，跑不了 `jekyll build` 预演。构建正确性只能靠 CI，
  **所以下面第 6 步的自检不能省**
- 本机有 `git` 和 `python`；**没有 `gh`**（所以用 `git push`，不用 `gh`）

## 完整流程

### 步骤 1：确认仓库状态

```powershell
Set-Location C:\tmp\effective-pancake
git pull origin main
git status
```

### 步骤 2：写文章

在 `_posts\` 下创建 `YYYY-MM-DD-slug.md`：

```markdown
---
layout: post
title: "文章标题"
date: YYYY-MM-DD 12:00:00 +0800
categories: ["Codex & Computer Use"]   # 只能取下方「分类清单」里的值
tags: [标签1, 标签2]
---

> 一句话导语

---

## 正文章节
```

**三个硬性要求：**

1. **正文不要写 H1。** 标题由 `layout: post` 从 front matter 渲染；正文再写 `# 标题` 会重复显示一遍。
2. **`categories` 必须是 `["..."]` 列表形式**，且只能取固定清单里的值。写成裸字符串（`categories: Claude Code & AI 工具`）会被 Jekyll 按空格拆成多个分类。
3. **`date` 用 `12:00:00 +0800`**（见下面「未来日期陷阱」）。

### 步骤 3：更新 index.md（首页导航）

⚠️ **不要写 `./_posts/xxx.md`** —— 那个路径在博客上不存在，是 404
（GitHub 上能点开、博客上点不开，容易漏掉）。改用 Jekyll 的 `post_url` 标签，
它按文件名解析成真实文章地址，以后改 permalink 也不用回头修：

```markdown
- X.Y [文章标题]({% post_url YYYY-MM-DD-slug %})
```

`post_url` 里的名字必须和 `_posts\` 下的文件名（去掉 `.md`）**完全一致**，
拼错会让整个 Jekyll 构建失败、站点停在旧版本。

附件（txt / html 等）放在 `assets\`，用绝对路径：

```markdown
- X.Y [附件描述](/effective-pancake/assets/filename.txt)
```

#### ⚠️ 但「文章正文里互链」要用完整 URL，不要用 post_url

**踩坑记录（2026-10-02）**：给一篇总览文章写「跳转到其他几篇」的链接时用了 `post_url`，
博客上跳转正常，但**用户点 GitHub 上的文件看时是一行红色原文**：

```
① [白嫖党狂喜：给 DSH 加上生图和生视频能力]({% post_url 2026-10-02-xxx %})
```

因为 GitHub 的 Markdown 预览**不执行 Liquid**。而博客里其他文章用的章节锚点（`#ch1`）、
附件链接在 GitHub 上都是蓝色可点的 —— **一行原文夹在中间，观感上就是"坏了"。**

**所以分两种情况：**

| 位置 | 写法 | 理由 |
|---|---|---|
| **index.md 首页导航** | `{% post_url %}` | 只在博客上看，GitHub 不展示这个文件 |
| **文章正文里互链** | **完整 URL** | GitHub 和博客**两边都要能点** |

正文互链的写法：

```markdown
### ① [文章标题](https://ann-luo.github.io/effective-pancake/YYYY/MM/DD/文件名.html)
```

**代价要清楚**：硬编码 URL 意味着以后改 permalink 就得手动修这些链接。
但 `_config.yml` 里 permalink 已经显式写死（`/:year/:month/:day/:title:output_ext`），
这个风险基本不存在 —— **换来"两边都能点"，值。**

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

**漏改结构图是高频错误。**

### 步骤 5：附件 / Skill 资源包

**普通附件**（聊天记录、截图等）→ `assets\`。

**Skill 资源包** → `skills\<skill-name>\SKILL.md`。

⚠️ **先看 Skill 是给谁用的，安装说明不一样：**

| Skill 类型 | 安装说明 | 例子 |
|-----------|---------|------|
| Claude Code Skill | `cp -r skills/xxx ~/.claude/skills/` | codex-chat、publish-blog |
| **DSH Skill** | 复制到 `~/.agents/skills/`（Windows 用 `Copy-Item -Recurse`） | — |
| Codex Skill | 放入 Codex 的 skills 目录（**不是** Claude Code 的目录！） | qq-messenger |

附带 Skill 需同步的位置：

| 位置 | 格式 |
|------|------|
| `skills\<name>\SKILL.md` | 复制 Skill 文件到仓库 |
| index.md 导航 | `- X.Y 📦 [Skill 资源包：skill-name](./skills/xxx/SKILL.md)` |
| README 文章目录表 | `\| X.Y \| 　📦 [Skill 资源包：xxx](./skills/xxx/SKILL.md) \| 说明 + 正确安装路径 \|` |
| README Skills 资源包表 | `\| X.Y \| [xxx](./skills/xxx/SKILL.md) \| 说明 \| 安装命令 \|` |
| README 仓库结构图 | `skills/` 区块加条目 |
| README 快速开始 | Claude Code Skill → 放进 `cp` 代码块；DSH Skill → 另写一行 `Copy-Item`；Codex Skill → 另起一行文字说明 |

示例——Codex Skill（qq-messenger，编号 6.2）：

```markdown
| 6.2 | 　📦 [Skill 资源包：qq-messenger](./skills/qq-messenger/SKILL.md) | 放入 Codex 的 skills 目录 |
```

示例——Claude Code Skill（codex-chat，编号 4.2）：

```markdown
| 4.2 | [codex-chat](./skills/codex-chat/SKILL.md) | CDP 与 Codex 通信 | `cp -r skills/codex-chat ~/.claude/skills/` |
```

### 步骤 6：提交前自检（不能省）

本地没 Ruby、建不了站，所以提交前必须跑一遍。

**⚠️ 备份写到仓库外面。** 改 `_posts/` 下的文章前如果要备份，别写成
`_posts/xxx.md.bak`（**就放在原文件旁边**）—— 下一步 `git add _posts/` 会把它
一起提交进仓库。**正确做法：备份写到 `C:\tmp\` 或桌面。**

**DSH 下不要用 bash heredoc（`python - <<'PYEOF'`），pwsh 会被引号搞死** ——
用工具把脚本写进临时文件再执行：

```powershell
# 1) 先用 write 工具把下面这段 Python 写到 C:\tmp\precheck.py
# 2) 再执行：
python C:\tmp\precheck.py
```

> ⚠️ **改 `skills/` 下的文件前后，务必想一遍 front matter**
>
> `skills/` 里同时存在两类文件，它们的 front matter 要求**相反**：
>
> | 文件 | front matter | 原因 |
> |---|---|---|
> | **本地** `~/.agents/skills/publish-blog/SKILL.md` | ✅ **必须有** | DSH 靠它识别 skill |
> | **仓库** `skills/publish-blog/SKILL-DSH.md` | ❌ **必须没有** | 有就被 Jekyll 当页面渲染，正文里的 `{% post_url %}` 被真执行 → **构建失败** |
>
> **所以「本地 → 仓库」这个复制动作，永远要跟一步删 front matter。**
> 这一步漏过两次（第二次是本地覆盖仓库时又带回去的），别再漏第三次。
>
> 判据：仓库那份的**首行不能是 `---`**。
> `precheck.py` 已经加了这条检查，会直接报错拦住。

`precheck.py` 的内容：

```python
import io, re, glob, os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
os.chdir(r'C:\tmp\effective-pancake')

posts = {os.path.basename(p)[:-3] for p in glob.glob('_posts/*.md')}
CANON = {'VS Code & GitHub Copilot', 'Windows 技巧', 'GitHub & 博客搭建',
         'Claude Code & AI 工具', '杂项', 'Codex & Computer Use', '日志',
         'DSH & 插件生态', '调试与排查方法'}
problems = []

# 正文也要查——文章里引用别的文章、引用附件，同样会用 post_url 和站内链接
for f in ['index.md'] + sorted(glob.glob('_posts/*.md')):
    t = io.open(f, encoding='utf-8').read()
    # 链接检查跳过代码块：文章里常拿"错误写法"当例子，那不是真链接
    scan = re.sub(r'`{3}.*?`{3}', '', t, flags=re.S)
    for r in re.findall(r'\{%\s*post_url\s+(\S+?)\s*%\}', scan):
        if r not in posts:
            problems.append('%s: post_url 对不上 -> %s' % (f, r))
    for m in re.findall(r'\]\((/effective-pancake/\d{4}/\d{2}/\d{2}/[^)]*)\)', scan):
        problems.append('%s: 硬编码文章网址，应改用 post_url -> %s' % (f, m))
    for m in re.findall(r'\]\((\.\.?/[^)]*)\)', scan):
        problems.append('%s: 相对链接，博客上会 404 -> %s' % (f, m))
    for m in re.findall(r'\]\(/effective-pancake/((?:assets|skills)/[^)]*)\)', scan):
        if not os.path.exists(m):
            problems.append('%s: 资源不存在 -> %s' % (f, m))
    # Liquid 在代码块里也会真执行（代码围栏对它只是普通文字）：
    # 所以查全文，剥掉 raw 包裹后剩下的 {% %} 必须都是能解析的 post_url
    stripped = re.sub(r'\{%\s*raw\s*%\}.*?\{%\s*endraw\s*%\}', '', t, flags=re.S)
    for tag in re.findall(r'\{%\s*(.*?)\s*%\}', stripped):
        if tag in ('raw', 'endraw'):
            continue
        if tag.startswith('post_url') and tag[8:].strip() in posts:
            continue
        problems.append('%s: 会真执行的 Liquid 标签有风险，须用 raw 包裹 -> {%% %s %%}' % (f, tag))
    if not f.startswith('_posts'):
        continue          # index.md 是首页，没有 categories/title 那一套
    fm = re.match(r'^---\r?\n(.*?)\r?\n---\r?\n', t, re.S)
    if not fm:
        problems.append('%s: 缺 front matter' % f)
        continue
    c = re.search(r'^categories:\s*(.*)$', fm.group(1), re.M)
    if not c or not c.group(1).startswith('['):
        problems.append('%s: categories 不是列表' % f)
    elif c.group(1).strip('[]"\'') not in CANON:
        problems.append('%s: categories 不在清单 -> %s' % (f, c.group(1)))
    if re.match(r'^#\s', t[fm.end():].lstrip('\r\n').split('\n')[0]):
        problems.append('%s: 正文有多余 H1' % f)

# ===== skills/ 专项检查（2026-10-02 真实事故：构建被这个搞挂两次）=====
# 出事要两个条件同时满足：有 front matter（Jekyll 当页面渲染它）+ 有 {% %}（渲染时真执行）
#   只有其一都安全：
#     有 front matter 无 Liquid（codex-chat/export-dsh-chat/qq-messenger）→ 没事
#     有 Liquid 无 front matter（publish-blog/SKILL.md）→ 当静态文件复制 → 也没事
for f in sorted(glob.glob('skills/**/*.md',recursive=True)):
    t=io.open(f,encoding='utf-8').read()
    has_fm=bool(re.match(r'^---\r?\n',t))
    liquid=re.findall(r'\{%\s*(?!raw\b|endraw\b).*?%\}',t)
    if has_fm and liquid:
        problems.append('%s: ⚠ 有 front matter + %d 处 Liquid → Jekyll 会渲染并执行，构建必失败（删 front matter）'%(f,len(liquid)))

print('\n'.join('  ' + p for p in problems) if problems else '自检通过 ✓')
```

### 步骤 7：提交推送

**⚠️ 别用 `git add <目录>/`。** 目录会把里面的**所有**未跟踪文件一起加进去 ——
包括你顺手写的 `.bak` 备份、临时脚本、草稿。**这是真实踩过的坑**：
备份文件被提交进仓库，958 行垃圾，事后两个提交才清掉。

**正确流程（四步，一步都别省）：**

```powershell
Set-Location C:\tmp\effective-pancake

# ① 精确暂存：明确列出文件，不要写目录
git add _posts/2026-XX-XX-slug.md index.md README.md

# ② 看一眼暂存区，确认没有垃圾混进去
git status --short

# ③ 提交
git commit -m "新文章: 标题"

# ④ 提交后再核对一次：文件数对不对
git show --stat --oneline HEAD

git push origin main
```

commit message 用中文，结尾加 `Co-Authored-By: <当前模型> <noreply@anthropic.com>`。

### 步骤 8：确认部署

GitHub Pages 自动构建部署，1–5 分钟生效。

**⚠️ 验证刚推的内容，别用 `raw.githubusercontent.com`。** 它前面挂了 CDN，
**刚推完去拉很可能拿到旧内容**，会让人误判成"推送失败"，白查一轮。

用这两种：

```powershell
# ① 本地直接看已提交的内容（最可靠）
git show HEAD:_posts/2026-XX-XX-slug.md

# ② 要走网络就用 GitHub API（不走 raw 的 CDN）
$u = 'https://api.github.com/repos/Ann-luo/effective-pancake/contents/_posts/2026-XX-XX-slug.md?ref=main'
(Invoke-RestMethod -Uri $u -Headers @{ Accept = 'application/vnd.github.raw'; 'User-Agent' = 'verify' })
```

线上页面（这一步可以等一会儿再验）：

```powershell
# 首页能看到新文章标题
(Invoke-WebRequest -Uri 'https://ann-luo.github.io/effective-pancake/' -UseBasicParsing).Content -match '文章标题'
```

新文章地址格式为 `https://ann-luo.github.io/effective-pancake/:year/:month/:day/:title.html`，应返回 200。

若 Actions 失败，去仓库 Actions 页看构建日志 —— **`post_url` 拼错是最常见原因**。

## 分类清单（categories 只能取这九个值）

| index.md / README 区块标题 | front matter 里的取值 |
|---|---|
| 一、VS Code & GitHub Copilot | `"VS Code & GitHub Copilot"` |
| 二、Windows 技巧 | `"Windows 技巧"` |
| 三、GitHub & 博客搭建 | `"GitHub & 博客搭建"` |
| 四、Claude Code & AI 工具 | `"Claude Code & AI 工具"` |
| 五、杂项 | `"杂项"` |
| 六、Codex & Computer Use | `"Codex & Computer Use"` |
| 七、日志 | `"日志"` |
| 八、DSH & 插件生态 | `"DSH & 插件生态"` |
| 九、调试与排查方法 | `"调试与排查方法"` |

注意：front matter 里**不带**中文数字前缀（不带「六、」），前缀只出现在 index.md / README 的区块标题里。

**分类规则**：文章必须放进最匹配的大类。现有大类都不合适时**新开一个大类**（编号顺延），
并把新值同时加进这张表 —— 不要塞进「五、杂项」，杂项只放真正无法归类的零散内容。

## 仓库约定（容易踩的坑）

- **正文里的一切站内链接都要能通过博客访问**（GitHub 上点得开 ≠ 博客上点得开）：
  - 引用别的文章 → **分两种情况**：
    - **index.md 首页导航** → 用 `{% post_url YYYY-MM-DD-slug %}`（只在博客上看，GitHub 不展示这个文件）
    - **文章正文里互链** → 用**完整 URL** `https://ann-luo.github.io/effective-pancake/YYYY/MM/DD/slug.html`。
      **原因**：GitHub 的 Markdown 预览不执行 Liquid，写 `post_url` 在 GitHub 上是**一行红字原文**，夹在别的蓝色链接中间就像坏了。完整 URL 两边都能点（permalink 已在 `_config.yml` 写死，不用担心失效）
  - 引用附件 → 用绝对路径 `/effective-pancake/assets/...`。**不要用 `../assets/...`** —— 文章网址是 `/2026/06/12/slug.html` 这种带层级的，`../` 会指向错误的位置
  - 引用 `skills/` 下的 skill 文件 → 用 GitHub 地址（`https://github.com/Ann-luo/effective-pancake/blob/main/skills/...`）。因为带 front matter 的 `SKILL.md` 会被 Jekyll 渲染成 `.html`，`.md` 链接会 404；不带 front matter 的则反之。直接指向 GitHub 最省事
- **permalink 已显式设置**为 `/:year/:month/:day/:title:output_ext`，URL 里**不含 categories**。所以改分类名不会改 URL；反过来说，别把 categories 当路径用
- **`_config.yml` 里有 `exclude`**，其中 `post/` 和 `README.md` 不会被发布。旧文不要往 `post/` 里放
- **`.gitignore` 已忽略 `_site/`、`.jekyll-cache/`**。本地若装了 Ruby 跑过 `jekyll build`，别把生成目录提交上来
- **⚠️ Jekyll 未来日期陷阱**：Jekyll 默认 `future: false`，构建时跳过 date 晚于构建时间的文章。GitHub Actions 用 UTC（= CST-8）。所以 `date` 统一用 `12:00:00 +0800`，别用晚上时间
- **⚠️ Skill 类型不要搞混**：附带 Skill 时先确认是 Claude Code、DSH 还是 Codex 用的。Codex Skill 不要写 `cp -r ... ~/.claude/skills/`
- **三个文件必须同步**：`_posts/`（front matter）+ `index.md`（导航）+ `README.md`（目录表 + 结构图，两处）
- **备份不要放在 `_posts/` 里**：`git add _posts/` 会连备份一起提交。写仓库外（`C:\tmp\`、桌面）
- **提交前核对动了哪些文件**：`git status --short` → 提交后 `git show --stat --oneline HEAD`。
  **`git add <目录>/` 是个坑**，会捎带未跟踪的临时文件
- **推送后一定要验证**：CI 构建成功 ≠ 链接都对。构建完成后抽查新文章的网址和首页上的站内链接，死了就补一次提交

---

## ⚠️ 推送失败怎么办：先开 Cloudflare WARP

**症状**：

```
fatal: unable to access 'https://github.com/Ann-luo/effective-pancake/':
Failed to connect to github.com:443 after 21088 ms: Could not connect to server
```

### ✅ 第一件事：开 Cloudflare WARP

**这个网络环境下，推 GitHub 需要开 WARP。** 用户实测：**用 Claude Code 时也是不开 WARP 就推不上去。**

开启后 `github.com` 直连立刻恢复 —— 实测 HTTP 200 / 4.3 秒（DNS 解析的 IP 和失败时**是同一个**，
所以不是"某个 IP 被干扰"，**就是缺 WARP**）。

### 别急着判定"网络断了"

不开 WARP 时的实测表现，很容易让人误判：

| 目标 | 不开 WARP | 开了 WARP |
|---|---|---|
| `api.github.com` | ✅ 200 | ✅ 200 |
| 博客站 `ann-luo.github.io` | ✅ 200 | ✅ 200 |
| 百度 / 其他站 | ✅ 全通 | ✅ 全通 |
| **`github.com`** | ❌ **超时** | ✅ **200** |

**只有 `github.com` 连不上 = WARP 没开**，不是网络故障、不是仓库问题、不是权限问题。

### 应急绕法（确实不想开 WARP 时）

只对这一次命令生效，不改系统 hosts：

```powershell
git -c http.curloptResolve="github.com:443:20.205.243.166" push origin main
```

实测可用的 IP：

```
20.205.243.166
140.82.114.4
140.82.121.4
20.27.177.113
140.82.113.4
```

> ⚠️ 但实测发现：**开着 WARP 时，不加这个参数直连也是通的** ——
> 所以这个绕法属于"能用，但多半不必要"，**优先开 WARP**。

### 提交不会丢

推送失败时 `git status -sb` 会显示 `ahead 1` —— **提交安全躺在本地**，
开了 WARP（或换 IP）后直接再 `push` 就行，**不需要重新提交**。

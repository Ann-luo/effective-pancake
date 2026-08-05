---
layout: post
title: "9956行→7438行：手机桌面模拟器v2模块化重构全记录"
date: 2026-08-04 12:00:00 +0800
categories: ["Claude Code & AI 工具"]
tags: [p-ent-phone, 模块化, 重构, Git, 拆分]
---

> 从零到一的 v1 做完了。但 9956 行塞在一个文件里，每次改代码都要在一座山里面找一行字。是时候拆了。

---

## 目录

1. [为什么要拆](#ch1)
2. [Git，告别27个备份文件](#ch2)
3. [游戏拆分：第一个胜利](#ch3)
4. [CSS拆分：89KB一刀切](#ch4)
5. [存储层：三个小函数](#ch5)
6. [let→var：89处改动的地基](#ch6)
7. [API层的三次失败](#ch7)
8. [批量拆分：七个模块一口气](#ch8)
9. [script标签位置的血案](#ch9)
10. [居中消失之谜](#ch10)
11. [总结](#ch11)
12. [v2.1：多模型支持](#ch12)
13. [模型管理页面](#ch13)
14. [Dock 自定义](#ch14)
15. [Phone 设置简化](#ch15)
16. [v2.1 总结](#ch16)

---

<h2 id="ch1">1. 为什么要拆</h2>

v1 做完了。9956 行，一个 `index.html`，零依赖，双击就能跑。听起来很酷——但写代码的时候一点也不酷。

每次改一行 CSS，要在 560KB 的文件里找到那个选择器。每次修一个函数，身边全是无关的代码。更致命的是：**AI 改代码靠字符串匹配，文件越大匹配越容易出错。** 之前 PowerShell 正则误伤、花括号反复调、单行函数语法崩溃——根因全是"文件太大"。

所以 v2 的核心任务不是加功能，是**拆文件**。目标：把 9956 行的巨石切成十几个独立模块，每个模块管一件事，改哪个动哪个。

---

<h2 id="ch2">2. Git，告别27个备份文件</h2>

v1 时代我的"版本管理"是手动复制到备份文件夹，文件名从 `p-ent-phone (2).html` 一直排到 `(30).html`。

v2 第一天就 `git init`，推上 GitHub：`Ann-luo/p-ent-phone`。

三条命令替代三十个备份：

```bash
git add .                        # "我改了什么，全拍照"
git commit -m "修了什么bug"       # "给这张照片写个标题"
git push                         # "发到GitHub"
```

从此每一个版本都有记录、能回退、能看 diff。改挂了一行 `git checkout .` 秒回退，再也不用翻备份文件夹找"那个能跑的版本"了。

**教训**：Git 不是专业程序员的专利。小白用三条命令就够了，比手动备份快得多。

---

<h2 id="ch3">3. 游戏拆分：第一个胜利</h2>

七个游戏（2048、五子棋、猜数字、石头剪刀布、21点、贪吃蛇、扫雷）是最理想的拆分目标——**完全独立，不依赖任何全局变量，纯函数。**

每个游戏一个文件，放进 `js/games/`：

```
js/games/
├── 2048.js
├── gomoku.js
├── guess.js
├── rps.js
├── blackjack.js
├── snake.js
└── minesweeper.js
```

`index.html` 里原来的游戏代码删掉，换成七行：

```html
<script src="js/games/2048.js"></script>
<script src="js/games/gomoku.js"></script>
...
```

9956 → 8400 行，一次成功，没黑屏。

**但紧接着就踩了第一个坑**：我把 `<script src="...">` 标签塞在了主 `<script>` 块**里面**。浏览器把 HTML 标签当 JS 解析 → 语法炸了 → 黑屏。

原因是 `c.replace("</script>", games + "</script>")` 替换的是**第一个** `</script>`（属于一个 15 行的小脚本块），不是主脚本的结尾。

**教训**：在多个 `<script>` 块的文件里插入外部脚本，用 `lastIndexOf("</script>")` 而不是 `replace`。并且 `<script src>` 标签必须放在 `</script>` **外面**，不能嵌套。

---

<h2 id="ch4">4. CSS拆分：89KB一刀切</h2>

CSS 是第二安全的拆分目标——纯样式，零 JS 依赖。

原始文件有三个 `<style>` 块，共 89,958 字符（约 2400 行）。合并成一个 `css/style.css`，HTML 里换成一行：

```html
<link rel="stylesheet" href="css/style.css">
```

9956 → 7507 行。打开正常，样式没丢。

**但这里埋了这次重构最诡异的 bug——居中消失。** 放到后面说。

---

<h2 id="ch5">5. 存储层：三个小函数</h2>

`idbGet`、`idbPut`、`idbDelete`——三个纯工具函数，只依赖 IndexedDB API，不碰任何全局变量。

```javascript
function idbGet(key) { ... }   // 读
function idbPut(key, val) { ... }  // 写
function idbDelete(key) { ... }    // 删
```

抽到 `js/storage.js`，放在第一个 `<script>` 块之前加载。1101 字符，零风险，打开正常。

---

<h2 id="ch6">6. let→var：89处改动的地基</h2>

接下来想拆通知、导出、主题、天气这些模块。但它们都依赖主脚本里的全局变量——`_pnotifs`、`apiKey`、`activeAgentId` 等等。

问题来了：这些变量是用 `let` 声明的。`let` 是**块作用域**——外部 `<script>` 文件访问不到。

改成 `var` 就行。`var` 在顶层创建 `window` 属性，跨脚本可见。

主脚本里有 **89 个** `let` 声明。一个个改太容易漏，写了个脚本：

```javascript
// 把所有顶层的 "let " 替换为 "var "
if (trimmed.startsWith("let ") && !在函数内部) {
  改成 var;
}
```

89 处改动，一次提交。这是基础设施——没这步，后面的拆分全做不了。

---

<h2 id="ch7">7. API层的三次失败</h2>

API 层是第一个真正依赖全局变量的模块。包含六个函数：

- `callDeepSeek`（主聊天 API，流式）
- `papiFetch`（非流式）
- `papiStream`（流式封装）
- `papiRetry`（重试）
- `callDeepSeekForSMS`（短信专用）
- `papiErrorToast`（错误提示）

### 第一次尝试：直接拆

把函数抽到 `js/api.js`，加 `<script src>` 标签。黑屏。

原因：`let apiKey` 改成 `var` 了，但 `api.js` 加载在脚本块**里面**。`<script src>` 不能嵌套。

### 第二次尝试：把标签放外面

把 `<script src="js/api.js">` 放在 `</script>` 之后。还是黑屏。

原因：虽然 `let` 改 `var` 了，但 `api.js` 加载时主脚本还没跑，`apiKey` 还是 `undefined`。虽然 API 函数在**调用时**才读 `apiKey`（此时已赋值），但脚本里有其他初始化代码在加载时就引用了 API。

### 第三次尝试：标签放两个脚本之间

放在第一个 `</script>` 之后、第二个 `<script>` 之前。依然黑屏。

原因更复杂——虽然 `var apiKey` 在第二个脚本里声明，但赋值（从 IndexedDB 读设置）是异步的，`apiKey` 在 API 文件加载时确实是 `undefined`。

**最终决定：不拆 API 层。**

不是不能拆，是成本太高。API 函数和全局状态耦合太紧，硬拆需要重构整个初始化流程。收益（减 ~200 行）远小于风险。

**教训**：不是所有东西都值得拆。能拆的标准是"零共享状态"——游戏、CSS、存储层能满足，但 API 层和 App 层不行。

---

<h2 id="ch8">8. 批量拆分：七个模块一口气</h2>

有了 `let→var` 的地基，剩下能拆的七个模块一口气搞定：

| 模块 | 文件 | 内容 |
|------|------|------|
| 🔔 通知 | `js/notifications.js` | `pnotify`、`pshowNC`、通知中心 |
| 📤 导出 | `js/export.js` | `saveFileToDevice`、备份分享面板 |
| 🎨 主题 | `js/theme.js` | `pTHEMES`、`psetTheme` |
| 🌤️ 天气 | `js/weather.js` | `pgetWeather`、`prWeather`、wttr.in |
| 💰 钱包 | `js/wallet.js` | `pwallet`、`pcheckin` |
| 📌 便签 | `js/note.js` | `pnoteLoad`、`pnoteEdit` |
| 📷 媒体 | `js/apps/media.js` | 相机、相册、文件管理 |

9956 → 7438 行。能安全拆的都拆了。

---

<h2 id="ch9">9. script标签位置的血案</h2>

七个模块的 `<script src>` 标签要放在两个 `<script>` 块之间，不能嵌套。听起来简单——但在代码里操作字符串就翻了三次车。

### 翻车1：标签插在注释里

第一版脚本先提取函数（删代码）再插入标签。但插入位置在提取**之前**算的——提取后 HTML 变短了，插入位置偏移，标签被塞进了一段 HTML 注释里。

结果：浏览器把一半标签当注释忽略，模块没加载，天气、相机、相册、文件全挂。

### 翻车2：同行的函数被误删

第二版尝试精确匹配每个函数——找到函数开头，数大括号找结尾，只删这一段。但主脚本里**多个函数写在同一行**：

```javascript
var _pnotifs=[];function pnotify(o){...};function pshowNC(){...};
```

提取 `var _pnotifs=[];` 的时候，如果按"行"删除，整行都没了——同行的 `pnotify`、`pshowNC` 也一起被删了。

修复：改成按**字符串片段**精确删除——找到函数开头，数到匹配的 `}`，只删这一段，不影响同行其他代码。

### 翻车3：两次"成功了但其实没成功"

前两次我都以为拆好了，push 了 GitHub，结果一打开——第一个版本 script 标签显示为可见文字（因为在注释里），第二个版本相机按了没反应（因为 `pcam` 函数连同行一起被删了）。

每次都是用户测试才发现。以后每拆一个模块必须：**打开 → 测 → 确认无误 → 再 commit**。

---

<h2 id="ch10">10. 居中消失之谜</h2>

CSS 拆到外部文件后，出现了一个诡异的问题：Phone 聊天界面在桌面端全屏时偏左了。

但**CSS 内容一模一样**——我逐字节对比了 v1 的 `<style>` 块和 v2 的 `css/style.css`，完全一致。

更诡异的是：
- v1 原版（CSS 内联）→ 居中 ✅
- v2（CSS 外链）→ 偏左 ❌
- v2 把 CSS 塞回内联 → 还是偏左 ❌
- v1 HTML + v2 CSS 外链 → ？

最后的测试文件 `v1_with_v2css.html` 还没测。如果是居中的，说明 v2 HTML 有问题；如果偏左，说明 CSS 的**加载方式**（`<link>` vs `<style>`）影响了 `file://` 协议下的渲染。

（写这篇文章时这个 bug 还在排查中）

**更新**：删掉所有外链 `<script>` 标签后依然偏左——说明不是 JS 加载的问题。问题锁定在 CSS 和 HTML 结构的交互上。

**破案**：根因找到了。CSS 提取脚本把 HTML 里的 **三个** `<style>` 块都抽出来了。

第一个（89141 字符）是主应用样式，有 `body{display:flex;justify-content:center}`——正确。

但第二个（428 字符）和第三个（386 字符）**不是**主应用样式！它们在 JavaScript 代码块里面，是导出功能生成的 HTML 页面的内联样式。包含：

```css
/* 导出相册页面 */
body{font-family:sans-serif;max-width:600px;margin:0 auto;...}

/* 导出聊天记录页面 */
body{flex:1;overflow-y:auto;padding:14px;line-height:1.5}
```

这些规则覆盖了主应用的 `body{display:flex;justify-content:center}`。因为三个 `<style>` 块在 HTML 里都有，CSS 级联规则让后面（817 字符的导出样式）覆盖前面（89141 字符的主应用样式）。

在原始 v1 中这三个 `<style>` 都存在，但导出样式也覆盖了主样式——v1 靠 `max-width:600px;margin:0 auto` 来居中，看起来和 flexbox 居中的效果差不多所以没发现。

修复：只提取第一个 `<style>` 块的 CSS，后面两个（在 `<script>` 字符串里的导出样式）不提取。

---

<h2 id="ch11">11. 总结</h2>

### 拆了什么

```
✅ js/games/         7 个游戏     (7 文件)
✅ css/style.css     所有样式     (1 文件, 89KB)
✅ js/storage.js     IndexedDB    (3 函数)
✅ js/notifications.js  通知     (7 函数)
✅ js/export.js      导出模块     (3 函数)
✅ js/theme.js       主题        (3 函数)
✅ js/weather.js     天气        (4 函数)
✅ js/wallet.js      钱包        (2 函数)
✅ js/note.js        便签        (2 函数)
✅ js/apps/media.js  相机/相册/文件 (11 函数)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ js/apps/music.js   音乐 (14 函数)
✅ js/apps/memo.js    备忘录 (3 函数)
✅ js/apps/calendar.js 日历 (2 函数)
✅ js/apps/clock.js   时钟 (2 函数, 闹钟内联)
✅ js/apps/calc.js    计算器 (2 函数)
✅ js/apps/dialer.js  拨号 (3 函数)
✅ js/apps/settings.js 设置 (1 函数)
✅ js/apps/store.js   商店 (1 函数)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ js/api.js         API层 (放弃了, let 耦合太深)
❌ Phone/SMS/查手机   核心聊天 (互相依赖太多, 不值得拆)
```

**更新**：居中 bug 破案后，继续拆了剩余 App——音乐、备忘录、日历、时钟、拨号、设置、商店。时钟因为 `palarmPopup` 和 `delAl` 跟计算器共享代码行，单独拆时黑屏，最终保留两个小函数内联解决。

### 最终数字

```
9956 行 → 7446 行 (瘦了 25%)
1 个文件 → 24 个文件
89 处 let→var
0 个备份文件 → Git 版本管理
18 次 Git commit
```

### 学到的

1. **能拆的标准是"零共享状态"**——`let` 变量的块作用域是跨脚本的最大障碍
2. **`<script src>` 不能嵌套**——必须放在 `</script>` 外面
3. **字符串操作要算好偏移**——先提取再插入，位置会变
4. **每拆一个就测一个**——批量拆出 bug 太难排查
5. **Git 三条命令替代三十个备份**——不学就亏了
6. **不是所有东西都值得拆**——API 层三次失败后放弃，省了时间

### v2 现在的样子

```
p-ent-phonev2/
├── index.html              ← 7438行 (原9956)
├── css/style.css           ← 所有样式
├── js/
│   ├── storage.js          ← 存储层
│   ├── notifications.js    ← 通知
│   ├── export.js           ← 导出
│   ├── theme.js            ← 主题
│   ├── weather.js          ← 天气
│   ├── wallet.js           ← 钱包
│   ├── note.js             ← 便签
│   ├── apps/
│   │   ├── weather.js      ← 天气
│   │   ├── wallet.js       ← 钱包
│   │   ├── note.js         ← 便签
│   │   ├── media.js        ← 相机/相册/文件
│   │   ├── music.js        ← 音乐
│   │   ├── memo.js         ← 备忘录
│   │   ├── calendar.js     ← 日历
│   │   ├── clock.js        ← 时钟
│   │   ├── calc.js         ← 计算器
│   │   ├── dialer.js       ← 拨号
│   │   ├── settings.js     ← 设置
│   │   └── store.js        ← 商店
│   └── games/              ← 7个游戏
│       ├── 2048.js
│       ├── gomoku.js
│       ├── guess.js
│       ├── rps.js
│       ├── blackjack.js
│       ├── snake.js
│       └── minesweeper.js
├── README.md
├── LICENSE (CC BY-NC 4.0)
└── .gitignore
```

---

*居中 bug 破案，App 拆分也全部完成。接下来是 v2.1——多模型支持、Dock 自定义、模型管理页面。*

---

<h2 id="ch12">12. v2.1：多模型支持</h2>

### 需求

DeepSeek 好用，但用户想切到通义千问、GPT、Claude——不同的模型有不同的性格和价格。核心需求：

- 12 个供应商一键切换（国内 8 个 + 国际 4 个）
- 每供应商独立 API Key、base URL、模型列表
- Claude 用 Messages API（x-api-key），其余 11 家用 OpenAI 兼容格式（Bearer token）
- 支持手动拉取模型列表（OpenAI/Kimi/Mistral 有 `/models` 端点）
- 旧 `apiKey`/`modelName` 自动迁移，向后兼容

### 实现

新建 `js/provider.js`——12 家供应商注册表 + 统一 `pchatCompletion()` 入口。

**供应商清单（2026 年 8 月最新模型）**：

| # | 供应商 | 最新模型 |
|---|--------|------|
| 1 | DeepSeek | deepseek-v4-flash, deepseek-v4-pro |
| 2 | 通义千问 | qwen3.7-max, qwen3.7-plus, qwen3.7-flash |
| 3 | 百度文心 | ernie-4.5-turbo-128k, ernie-5.0 |
| 4 | 字节豆包 | doubao-pro-32k, doubao-lite-32k |
| 5 | Kimi | moonshot-v1-8k/32k/128k |
| 6 | 智谱 GLM | glm-4-flash, glm-4-plus, glm-4-long |
| 7 | 讯飞星火 | spark-lite, spark-pro, spark-max |
| 8 | MiniMax | MiniMax-M3, MiniMax-M2.5 |
| 9 | GPT | gpt-5, gpt-5-nano, gpt-4.1 |
| 10 | Claude | claude-sonnet-5, claude-opus-5, claude-haiku-4-5 |
| 11 | Gemini | gemini-2.5-flash, gemini-2.5-pro |
| 12 | Mistral | mistral-medium-3.5, mistral-small-4 |

**Claude 特殊处理**：唯一的非 OpenAI 兼容供应商。`/v1/messages` 端点 + `x-api-key` 头 + system 提示词放到顶层 + SSE 事件是 `content_block_delta` 而不是 `choices[0].delta.content`。在 `pchatCompletion` 里做了格式转换。

**自动迁移**：`pinit()` 启动时检测——如果 IndexedDB 里没有 `providerConfigs`，把旧 `apiKey`/`modelName` 迁移为 DeepSeek 条目，其他 11 个供应商预设空 Key + 内置模型。

**7 个 API 调用点全部重构**：

```javascript
// 之前：硬编码 DeepSeek
fetch('https://api.deepseek.com/v1/chat/completions', {
  headers: { 'Authorization': 'Bearer ' + apiKey }
})

// 之后：动态供应商
pgetActive().baseUrl + '/chat/completions'
headers: { 'Authorization': 'Bearer ' + pgetActive().apiKey }
```

0 个 `api.deepseek.com` 残留——全部 API 调用走 `pgetActive()` 动态路由。

---

<h2 id="ch13">13. 模型管理页面</h2>

新建 `js/apps/model-manager.js`，从设置页进入。

功能：
- 📋 **供应商列表**：12 家，每个显示名称 + ✅（已配 Key）/ ❌（未配），点击切换
- 🔑 **API Key**：密码输入框，切换供应商自动切换对应 Key
- 📦 **模型选择**：内置模型 + 自定义模型下拉框
- ➕ **手动添加模型**：输入框 + 添加按钮
- 🔄 **自动拉取模型**：Kimi/GPT/Mistral 支持，调 `/models` 端点，实时获取
- 🔌 **测试连接**：发一个探针请求，返回 ✅ 或 ❌
- 💾 **保存**：全量存到 IndexedDB `global_settings`

Phone 设置弹窗简化了——去掉了 API Key 和模型选择器，只剩 Temperature/TopP 滑块 + "管理 AI 模型与 API Key →"链接。所有模型配置统一在模型管理页面。

---

<h2 id="ch14">14. Dock 自定义</h2>

新建 `js/dock.js`——Dock 图标不再是硬编码的四个。

- 默认：Phone / 短信 / 相册 / 设置
- 长按（500ms）→ 弹出替换面板，选其他 App 替换
- 桌面端：鼠标长按；手机端：触摸长按（10px 容忍度防误触）
- 配置存 `localStorage pent_dock`，可持久化

**踩坑：引号转义地狱**

Dock 长按搞了五轮才稳定——

1. **内联 handler 引号炸了**：`ontouchstart="pdockLongPress(event,\''+da.id+'\')"`——在单引号 JS 字符串里嵌套转义单引号，`\\'` 到底是反斜杠加引号还是转义的引号？试了四种组合才蒙对
2. **事件委托 vs 内联**：内联 handler 每次渲染要重新计算引号转义，极易出错。改为在 `prenderDT` 后给 Dock 容器绑事件委托，用 `closest('.papp')` 找目标图标
3. **点击误触**：mousedown 设 500ms 计时器，mouseup 清除——但写成了 Dock 容器级，鼠标移出 Dock 再松手清不掉。改为 document 级 mouseup/touchend 无条件清除计时器

**重置按钮**：设置页 → "📌 重置 Dock 栏" → 恢复默认四个图标。

---

<h2 id="ch15">15. Phone 设置简化</h2>

冲突演进——最初 Phone 设置弹窗里有 API Key 输入和模型选择器，和模型管理页面功能重复。

用户要求：Phone 只保留 Temperature/TopP，模型和 Key 统一在设置 → AI 模型管理里改。

删字段时多删了一个 `</div>`——Phone 设置弹窗出现裸 `/div>` 乱码。原因是去掉 modelSelect 和 apiKeyInput 的 `<div class="field">` 时，闭标签被一起删了但另一个没对齐。

---

<h2 id="ch16">16. v2.1 总结</h2>

```
新增文件：
  js/provider.js         ← 12供应商注册表 + pchatCompletion
  js/dock.js             ← Dock自定义（长按替换）
  js/apps/model-manager.js ← 模型管理页面

修改文件：
  index.html             ← 7个API调用点重构 + 设置弹窗简化
  js/apps/settings.js    ← AI 模型管理入口

30+ commits，从模块化到多模型到交互打磨
```

最大的感受：**引号转义是单文件 JS 开发的头号敌人。** 五轮 Dock 修复、三次回退、N 次黑屏——根因全是 `'` `"` `\` 的排列组合。其次是**别在了一个地方改两个相关的 UI**——Phone 设置简化 + 跳转链接 + HTML 结构，一改就漏标签。

---

*下一篇：v2 稳定后，要不要开 v3——Service Worker 离线缓存 + 推送通知。*

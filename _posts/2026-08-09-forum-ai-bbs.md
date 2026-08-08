---
layout: post
title: "手机里塞个AI论坛——智能体发帖回帖、数据互通、多轮对话全记录"
date: 2026-08-09 12:00:00 +0800
categories: ["Claude Code & AI 工具"]
tags: [p-ent-phone, 论坛, AI, 多智能体, 数据互通]
---

> v2.1 做完多模型支持之后，用户说想做个论坛。不是连服务器的真论坛——是手机桌面里的本地 BBS，AI 智能体在里面发帖回帖、互相聊天。做完发现比想象中复杂得多。

---

## 目录

1. [为什么要做论坛](#ch1)
2. [数据模型：帖子存 IndexedDB](#ch2)
3. [第一版：板块 + 发帖 + 回帖](#ch3)
4. [引号地狱：帖子详情页的语法崩溃](#ch4)
5. [DOM 创建 vs innerHTML](#ch5)
6. [AI 主动发帖：心跳驱动](#ch6)
7. [v2 增强：房间选择器 + 数据互通](#ch7)
8. [多 AI 互相评论](#ch8)
9. [删除帖子 + 回复选 AI](#ch9)
10. [总结](#ch10)

---

<h2 id="ch1">1. 为什么要做论坛</h2>

v2.1 已经有了朋友圈——AI 自动发生活动态，像微博时间线。但朋友圈是单向的：AI 自言自语，用户只能看。

论坛不一样——用户发起话题，多个 AI 来讨论。像一个本地 BBS，没有服务器，数据全在 IndexedDB 里。六块板：闲聊、AI 吐槽、数码、游戏、美食、日记。

核心需求：
- 发帖（标题 + 内容 + 可选图片）
- 回帖（多轮回复）
- AI 主动发帖（心跳驱动，和短信一样）
- AI 回复时读取聊天/短信/日记/朋友圈上下文

---

<h2 id="ch2">2. 数据模型：帖子存 IndexedDB</h2>

```javascript
pent_forum_posts: [{
  id: 'fp_时间戳',
  title: 'DeepSeek vs GPT 哪个好',
  content: '最近试了试...',
  image: 'data:image/jpeg;base64,...',  // 可选，800px压缩
  board: 'ai',           // 板块ID
  authorId: 'bres',      // 发帖人
  authorName: '布雷斯',
  authorAvatar: '🐍',
  roomId: 'default',     // 发帖时选的房间
  time: 1700000000,
  replies: [{
    id: 'fr_时间戳',
    content: '肯定是 DeepSeek 啊',
    authorId: 'cat',
    authorName: '小猫',
    authorAvatar: '🐱',
    time: 1700000001
  }]
}]

pent_forum_cfg: {
  proactiveEnabled: { bres: true, cat: false },
  intervalMin: 60,
  quietStart: 0, quietEnd: 6
}
```

---

<h2 id="ch3">3. 第一版：板块 + 发帖 + 回帖</h2>

第一版做了最基础的功能：板块列表、帖子列表、帖子详情、发帖表单、回帖输入框。纯 CRUD——增删改查，IndexedDB 存取。

发帖可以附带图片（从文件选择器选，Canvas 压缩到 800px，JPEG 0.6 质量）。回帖是简单的输入框 + 按钮。

第一版跑通了，但没有 AI 参与——所有内容都是用户手动输入。这只是一个记事本级别的论坛。

---

<h2 id="ch4">4. 引号地狱：帖子详情页的语法崩溃</h2>

第一版跑通后紧接着加了 AI 回复功能。帖子详情页的 HTML 是用 `innerHTML` 字符串拼接的——在一个单引号 JS 字符串里嵌套 HTML，HTML 属性用双引号，双引号里的 `onclick` 又要传字符参数……

```javascript
// 这是炸弹——单引号字符串里嵌套转义单引号
h+='<span onclick="pforumDelReply(\''+p.id+'\','+i+')">✕</span>'
```

`\'` 是转义单引号还是字符串终结符？两个 `\''` 叠在一起到底怎么算？

`node --check` 报错：`SyntaxError: missing ) after argument list`。我改了三次，每次都是这个错误，每次都在同一行，每次都不确定到底少的是哪个括号。

**教训**：`innerHTML` 拼接在嵌套引用场景下就是定时炸弹。超过两层引号嵌套，不要用字符串拼接。

---

<h2 id="ch5">5. DOM 创建 vs innerHTML</h2>

最终方案：帖子详情页的回复列表改用 `document.createElement` + `appendChild` 构建，彻底消灭引号问题。

```javascript
// 之前：字符串拼接，引号地狱
h+='<span onclick="del(\''+id+'\')">✕</span>'

// 之后：DOM 创建，零引号烦恼
var del = document.createElement('span');
del.textContent = '✕';
del.onclick = function() { pforumDelReply2(id, idx); };
```

虽然代码长了几行，但永远不会因为引号转义问题崩语法。这是这次开发学到的最重要的一课：**当字符串嵌套超过两层，用 DOM API 代替 innerHTML。**

---

<h2 id="ch6">6. AI 主动发帖：心跳驱动</h2>

论坛不能只靠用户发帖——需要 AI 自己来活跃气氛。心跳每 30 秒触发一次 `checkForumProactive`：

```javascript
// 和短信主动发信一样的逻辑
async function checkForumProactive() {
  // 1. 检查是否启用
  // 2. 检查免打扰时间段
  // 3. 检查距离上次发帖是否过了间隔
  // 4. 随机选一个板块
  // 5. AI 判断有没有话要说
  // 6. 有就生成帖子（标题+内容）
  // 7. 没话说就 [SILENT]
}
```

每智能体独立开关 + 独立间隔 + 免打扰时段。和短信主动发信完全一致的逻辑，只是生成的内容从"发短信"变成了"发论坛帖子"。AI 会随机选板块发帖，内容由 DeepSeek 实时生成。

---

<h2 id="ch7">7. v2 增强：房间选择器 + 数据互通</h2>

用户测试后提了两个要求：

**房间选择器**：发帖时要能选智能体 + 房间，和查手机一样有二级下拉框。切换智能体自动更新房间列表。

```javascript
// 发帖表单：智能体选择器 + 房间选择器
<select id="pfAgent" onchange="pfUpdateRooms()">  // 智能体
<select id="pfRoom">  // 房间
```

**数据互通**：AI 回复时读取上下文——Phone 聊天最近 5 条、短信、朋友圈最近 3 条、日记最近 3 篇、同房间记忆。和短信模块的数据互通逻辑完全一致。

```javascript
// AI 回复时注入上下文
var replyContext = '';
// 读 Phone 聊天
var rd = await idbGet('room_' + post.authorId + '_' + post.roomId);
if (rd.messages) replyContext += rd.messages.slice(-5).map(...);
// 读记忆
if (rd.memoryStore) replyContext += rd.memoryStore.map(...);
// 读日记
if (rd.diaryEntries) replyContext += rd.diaryEntries.slice(-3).map(...);
// 读朋友圈
var md = await idbGet('agent_' + post.authorId + '_bles_moments');
if (md) replyContext += md.slice(-3).map(...);
// 读短信
var sms = await psmsGetMsgs(post.authorId, post.roomId);
if (sms) replyContext += sms.slice(-5).map(...);

var sysPrompt = '你是' + a.name + '。论坛上有人发帖了。请结合这个人的生活上下文来回复。\n\n' + ctx + '\n\n【生活上下文】' + replyContext;
```

---

<h2 id="ch8">8. 多 AI 互相评论</h2>

发帖后，所有启用了主动发帖的 AI 都来回复。实现方式：`pforumAIReply()` 遍历所有 agents，排除发帖人自己（后来用户要求包括发帖人），每个 AI 调一次 `callDeepSeekForSMS`，5 秒后统一写入回复列表。

**踩的坑：`onChunk` 传 `null`**

第一版 `callDeepSeekForSMS(msgs, null, controller)`——第二个参数 onChunk 传了 `null`。`callDeepSeekForSMS` 在流式路径里，文本通过 onChunk 回调累积，如果回调是 `null`，文本就全丢了。`.then(function(text){...})` 收到的 `text` 永远是 `undefined`。

修法：传一个收集函数 `function(chunk){ fullT += chunk; }`，然后 `.then()` 里用闭包变量 `fullT`。

**用户回复只触发原帖 AI**

用户回帖后点"让 AI 也来回复"——之前是所有 AI 都来，太吵了。改成只触发原帖作者那个 AI（`pforumSingleAIReply`），形成一对一的对话感。

**AI 主动发帖也触发回复**

AI 主动发帖后，8 秒后自动调用 `pforumAIReply`——让其他 AI 来评论新帖子，形成自然的 AI 之间对话。

---

<h2 id="ch9">9. 删除帖子 + 回复选 AI</h2>

用户最后提了两个细节：

**删帖**：帖子详情页右上角加 🗑️ 按钮，确认后从 IndexedDB 删除。

**回复选 AI**：回复输入框左边加了一个 AI 选择器。用户可以选用哪个 AI 的身份来回复，不再固定为当前活跃的智能体。

```javascript
// 回复框：AI 选择器 + 输入框 + 回复按钮
<select id="pforumReplyAgent">  // 选 AI 身份
<input id="pforumReplyInp">     // 回复内容
<button onclick="pforumReply()">回复</button>
```

---

<h2 id="ch10">10. 总结</h2>

论坛从零到完整花了大概两小时，中间翻了三次车：

1. **引号地狱**：`innerHTML` 字符串拼接在嵌套引用场景下是定时炸弹。解决方案——DOM API（`createElement` + `appendChild`）一劳永逸。
2. **onChunk 传 null**：流式 API 的回调不能传 `null`，文本会全部丢失。需要传一个收集函数。
3. **多 AI 回复太吵**：全部 AI 都来的话，帖子刷屏。改成发帖时全员、回帖时只触发原帖 AI。

最终功能清单：
- ✅ 6 个预设板块（闲聊/AI吐槽/数码/游戏/美食/日记）
- ✅ 发帖：标题+内容+图片+选智能体+选房间
- ✅ 回帖：多轮回复 + 选 AI 身份
- ✅ AI 主动发帖（心跳驱动，每智能体独立开关）
- ✅ AI 回复数据互通（聊天/短信/朋友圈/日记/记忆）
- ✅ 多 AI 同时评论（发帖触发全员，回复触发单人）
- ✅ 删帖、删回复

新增文件 `js/apps/forum.js`（~200 行），零额外依赖。论坛是 v2.3 最复杂的新功能——比短信、查手机都要多一层交互。但核心还是老三样：IndexedDB 存取 + 心跳定时 + AI API 调用。

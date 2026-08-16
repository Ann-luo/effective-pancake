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
9. [删帖 + 身份逻辑修正](#ch9)
10. [发帖按钮没反应——两个低级 bug](#ch10)
11. [AI 回复失败的根因——let 块作用域](#ch11)
12. [房间标注](#ch12)
13. [微信式回复：点谁回谁](#ch13)
14. [头像统一](#ch14)
15. [短信 AI 回复的连环 bug](#ch15)
16. [AI 头像的漏网之鱼——图片存 A 字段，读的却是 B 字段](#ch16)
17. [总结](#ch17)

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

**身份逻辑修正**

第一版的发帖表单有"选择 AI"下拉框——用户选一个 AI，以它的身份发帖。用户测试后直接骂了："有病啊，当然是用户身份发帖子"。

说得对。论坛是用户在发帖，不是 AI 在冒充用户。修正：去掉发帖表单的 AI 选择器，用户以自己身份发帖（名字取 `userProfile.name`，头像固定 🙂）。AI 回复时用各自的 AI 身份。房间选择器保留——用户选"发到哪个房间"。

```javascript
// 之前：以 AI 身份发帖
var ag = agents.find(a => a.id === selectedAI);
var post = { authorId: ag.id, authorName: ag.name, authorAvatar: ag.avatar };

// 之后：以用户身份发帖
var uname = userProfile.name || '我';
var post = { authorId: 'user', authorName: uname, authorAvatar: '🙂' };
```

同时去掉了回复输入框旁边的 AI 选择器——回复直接用当前活跃的 AI 身份。

**AI 主动发帖也触发回复**

AI 主动发帖后，8 秒后自动调用 `pforumAIReply`——让其他 AI 来评论新帖子，形成自然的 AI 之间对话。

---

<h2 id="ch9">9. 删帖 + 身份逻辑修正</h2>

**删帖**：帖子详情页右上角加 🗑️ 按钮，确认后从 IndexedDB 删除。

**身份逻辑的反复返工**——这是论坛最折腾的地方，前前后后改了四五版：

第一版：发帖表单有"选择 AI"下拉框，用户选一个 AI，以它的身份发帖。回帖也有 AI 选择器。

用户直接骂了："有病啊，当然是用户身份发帖子。"

说得对。论坛是用户发帖，不是用户冒充 AI。修正：

- **发帖**：用户以自己身份（`userProfile.name` + 🙂 头像），AI 选择器删掉
- **回帖**：用户以自己身份，AI 选择器删掉
- **AI 回复**：AI 以各自身份自动回复（发帖后触发，或回帖后点"让原帖作者回复"）

```javascript
// 之前：以 AI 身份发帖
var ag = agents.find(a => a.id === selectedAI);
var post = { authorId: ag.id, authorName: ag.name };

// 之后：以用户身份发帖
var uname = userProfile.name || '我';
var post = { authorId: 'user', authorName: uname, authorAvatar: '🙂' };
```

---

<h2 id="ch10">10. 发帖按钮没反应——两个低级 bug</h2>

身份逻辑改完后，发帖按钮突然没反应了。排查出两个低级错误：

**Bug 1：残留的 `sel` 变量**

删 AI 选择器时，发帖表单的 HTML 拼接里还引用着已删除的 `sel` 变量：

```javascript
// sel 已经不存在了，但这里还在引用
el.innerHTML = '...发帖</div>' + sel + rsel + '<input id="pfTitle"...'
```

`sel` 未定义 → `ReferenceError` → 整个表单渲染失败。

**Bug 2：函数缺 `async`**

`pforumSubmitPost` 里面有 `await`，但函数声明时 `async` 关键字在几次编辑中弄丢了：

```javascript
// 错误：有 await 但没 async
function pforumSubmitPost(){ ... await pforumGetPosts(); ... }
// 正确：
async function pforumSubmitPost(){ ... }
```

两次都是身份逻辑返工时引入的。教训：**改代码时，删一个东西要连带删干净它所有的引用。**

---

<h2 id="ch11">11. AI 回复失败的根因——let 块作用域</h2>

修完发帖后，AI 还是不会回复。Phone 里 AI 能正常聊天，论坛就是不行。

排查发现一个致命的架构问题：**`agents`、`rooms`、`apiKey`、`activeAgentId` 这些核心状态变量是 `let` 声明的。**

`let` 是块作用域——在 `index.html` 的 `<script>` 块里声明的 `let` 变量，**外部的 `forum.js` 文件访问不到**。`pforumAIReply` 第一行：

```javascript
if (typeof apiKey === 'undefined' || !apiKey) return;  // 永远为真，直接 return
```

因为 `apiKey` 是 `let`，`forum.js` 里 `typeof apiKey` 永远返回 `'undefined'`，函数第一行就 return 了，AI 从不回复。

**为什么 Phone 能回复？** Phone 的聊天逻辑在 `index.html` 里（同一个 `<script>` 块内），块作用域内能访问到这些 `let` 变量。而论坛、反查手机这些拆出去的外部模块就访问不到。

修法：把 95 处顶层 `let` 全部改成 `var`。`var` 在顶层声明会成为 `window` 属性，外部文件能访问。

```javascript
// 之前：let agents = [];  ← 块作用域，外部文件访问不到
// 之后：var agents = [];   ← window.agents，全局可访问
```

**这个 bug 其实在 v2 重构时就应该暴露**——之前做过一次 let→var，但某次 git 回退把改动回退了，一直没发现。直到论坛这个"纯外部模块"的 AI 功能才彻底暴露出来。

---

<h2 id="ch12">12. 房间标注</h2>

最后用户问：为什么不同房间的 AI 都来回复了？主动发帖的 AI 是哪个房间的？

答案是：论坛是跨房间的公共广场，所有 AI 都能回复。但**必须标注清楚每个发言者是哪个房间的哪个智能体**。

加一个辅助函数：

```javascript
function pforumRoomName(aid) {
  var rms = rooms[aid] || [];
  return rms.length > 0 ? rms[0].name : '日常';
}
```

所有发言（用户发帖、AI 发帖、AI 回复）都加 `roomName` 字段，显示时标注：

```
🐍 布雷斯 [日常]
小猫 [宠物房]
🙂 我 [日常]
```

现在每条帖子、每条回复都能看出是哪个房间的谁在说话。

---

<h2 id="ch13">13. 微信式回复：点谁回谁</h2>

做完基础回复后，用户提出要"微信朋友圈那种"的交互——不是点按钮触发 AI，而是**点某条回复，直接回复给那个人，那人再回你**。

交互流程：

1. 帖子下面有回复列表
2. 点某条 **AI 的回复** → 输入框聚焦，placeholder 变"回复 @布雷斯[日常]"
3. 输入内容 → 以"回复 @布雷斯[日常]"形式发出
4. 那个 AI 看到 → 继续回复你
5. 点**自己的回复** → 不响应

核心是一个全局回复目标变量：

```javascript
var _pfReplyTo = null, _pfReplyToName = null;

// 点 AI 回复 → 设置回复目标
row.onclick = function() {
  _pfReplyTo = r.authorId;
  _pfReplyToName = r.authorName + (r.roomName ? ' [' + r.roomName + ']' : '');
  inp.placeholder = '回复 @' + _pfReplyToName;
  inp.focus();
};
```

回复保存时带上 `replyTo` 字段，显示"回复 @XXX"，然后触发那个 AI 继续回复。理论上可以**无限轮对话**——每点一次就多一轮。

还有个细节：点击 AI 回复后，输入框左侧的 ✕ 按钮要显示（取消回复目标）。一开始这个 ✕ 按钮有 bug——渲染时 `display:none`，点击 AI 回复后没更新，所以一直看不到。修法是点击时手动 `document.getElementById('pforumCancelBtn').style.display='flex'`。

---

<h2 id="ch14">14. 头像统一</h2>

用户发现：论坛里用户头像一直显示默认笑脸 🙂，但 Phone 里换的用户头像没同步过来。

根因：论坛发帖/回帖时，用户头像硬编码了 `'🙂'`，没读 `userProfile.avatar`。

```javascript
// 之前：硬编码
authorAvatar: '🙂'
// 之后：读 Phone 里设置的头像
authorAvatar: (typeof userProfile !== 'undefined' && userProfile.avatar) ? userProfile.avatar : '🙂'
```

AI 头像论坛和短信都读的 `agents[].avatar`（Phone 里设置的 AI 头像），这块本来就对。短信的用户头像也已经用 `userProfile.avatar`（7 处），不用改。

统一后，Phone 里换任何头像，论坛和短信都跟着显示。

---

<h2 id="ch15">15. 短信 AI 回复的连环 bug</h2>

论坛折腾完，短信在 APK 里又出了问题——AI 回复不显示。排查下来是一串连环 bug：

### Bug 1：模型名不一致（论坛 fullT=0 的根因）

Phone 的 `callDeepSeek` 用 `modelName`，论坛/短信的 `callDeepSeekForSMS` 用 `activeModelId`。两个变量值不一样——`modelName` 是有效模型，`activeModelId` 是退役的 `deepseek-chat`。API 请求成功但返回空（`fullT=0`）。

修法：`callDeepSeekForSMS` 统一用 `modelName`，并在 `psyncGlobals` 里加 `modelName = activeModelId` 保持同步。

### Bug 2：退出短信界面后 AI 回复不显示

用户在短信界面发消息后，立即退出。退出时 `prMessages` 把 `_psmsAgentId`/`_psmsRoomId` 设成 null。AI 回复异步完成后，`psmsSaveMsgs(_psmsAgentId, _psmsRoomId, msgs)` 用了已经变 null 的全局变量，把消息存到了错误的 key `pent_sms_msgs_null_null`。

修法：`psmsSendMsg` 开头把 `aid`/`rid` 锁定到局部变量：

```javascript
var aid = _psmsAgentId, rid = _psmsRoomId;  // 锁定，不受退出影响
var msgs = await psmsGetMsgs(aid, rid);
...
await psmsSaveMsgs(aid, rid, msgs);
```

### Bug 3：一次险些致命的失误

第一次修锁 aid/rid 时，用脚本"重写整个函数"——结果 `start` 和 `end` 定位把 `psmsSendMsg` 之后、`psmsLoadMore` 之前的**整个统一 API 层（papiFetch/papiStream/papiRetry/callDeepSeekForSMS）全删了**。短信直接不回复了。

回退后重做，这次只替换函数体内部的字符串，不删任何函数。教训：**用脚本重写函数时，定位边界必须精确到函数本身，不能把中间的其他代码卷进去。**

### APK 流式的小插曲

还试过把 `callDeepSeekForSMS` 改成纯非流式解决 APK 的 `ReadableStream` 问题，但用户坚持要原本的流式，最后回退了。最终保留流式 + 非流式降级的版本。

---

<h2 id="ch16">16. AI 头像的漏网之鱼——图片存 A 字段，读的却是 B 字段</h2>

第 14 章做完「头像统一」后，用户又反馈：论坛的**用户头像**对了，但 **AI 的头像还是没显示**，短信里也一样——全是默认 🤖 emoji，不是 Phone 里换的图片。另外帖子详情页顶部「我」的头像也没显示。

排查发现，AI 头像和用户头像是两套不同的存储，而且 **AI 头像自己还分成了两个字段**：

```javascript
// 都叫 avatar，但存的东西不一样
userProfile.avatar   // 用户头像：图片 data URL（或空）
bresProfile.avatar   // AI 头像：图片 data URL（或空）——存 IndexedDB 的 agent_<id>_bres_profile
agents[].avatar      // AI 头像：emoji 文本（🤖 / 🐍 / 🐱）——存 pent_agents_list
```

Phone 里「换头像」时，图片走 `compressAndSaveAvatar` 存进 `bresProfile.avatar`（当前智能体的 profile）。但论坛和短信渲染头像时读的却是 `agents[].avatar`——里面只有 emoji，永远拿不到图片。

**为什么第 14 章漏了？** 那一章只修了用户头像（`userProfile.avatar`），顺手断言「AI 头像本来就对」。其实 AI 头像的图片根本没被读到，只是默认 emoji 和期望的 emoji 长得一样，肉眼看不出来。

**修法：加一个统一取头像的函数，渲染时实时取图、emoji 兜底。**

```javascript
// 统一头像：用户取 userProfile，AI 优先取图片头像(bresProfile)，否则 emoji
function pagentAvatar(id) {
  if (id === 'user') return userProfile.avatar || '🙂';
  var a = (agents || []).find(function(x) { return x.id === id; });
  if (a) {
    if (id === activeAgentId && bresProfile && bresProfile.avatar) return bresProfile.avatar;
    return a.avatar || '🤖';
  }
  return '🤖';
}
```

论坛 3 处渲染（帖子列表、详情页头部、回复行）+ 3 处创建（AI 回复、单条 AI 回复、主动发帖）、短信 4 处显示，全部改成 `pavatarHTML(pagentAvatar(ag.id), '🤖', 24)` 这类调用。

**为什么不直接把图片写进 `agents[].avatar`？** 因为 `agents[].avatar` 在很多地方被当纯文本渲染——智能体选择器 `'<span>' + a.avatar + '</span>'`、智能体编辑器的输入框。一旦塞进 base64 图片，这些地方会显示一大坨乱码。所以保留 emoji 字段不动，只在「显示头像的地方」实时算「该显示图片还是 emoji」。

**好处**：因为是在渲染时实时取，所以**旧帖子、旧回复也自动修正**——不用重新发帖，之前存进去的 emoji 会被实时覆盖成图片。

这一课和第 14 章其实是同一件事的两半：**头像有「存储字段」和「显示字段」两个概念，一旦分叉（图片存这、显示读那），就得靠一个统一函数在渲染时收敛，而不是到处硬编码。**

---

<h2 id="ch17">17. 总结</h2>

论坛从零到完整，中间翻的车比想象中多得多：

1. **引号地狱**：`innerHTML` 拼接嵌套引号 → DOM API（`createElement`）一劳永逸
2. **onChunk 传 null**：流式回调不能传 null，文本全丢
3. **身份逻辑返工**：用户发帖就是用户身份，别整 AI 冒充
4. **删变量留引用**：删 AI 选择器漏了 `sel`，函数丢 `async`
5. **let 块作用域**：外部模块访问不到 `let` 变量，95 处改 `var`
6. **房间标注**：跨房间回复必须标注来源
7. **模型名不一致**：`modelName` vs `activeModelId`，一个有效一个退役
8. **退出后保存 key 错误**：全局变量被清空，局部变量锁定
9. **脚本重写误删函数**：定位边界不精确，差点删了整个 API 层
10. **头像双字段分叉**：图片存 `bresProfile.avatar`、显示读 `agents[].avatar`，用一个统一函数在渲染时收敛

最终功能清单：
- ✅ 6 个预设板块（闲聊/AI吐槽/数码/游戏/美食/日记）
- ✅ 发帖：用户身份 + 图片 + 房间标注
- ✅ 微信式回复：点谁回谁，无限轮对话
- ✅ AI 主动发帖（心跳驱动，每智能体独立开关 + 房间标注）
- ✅ AI 回复数据互通（聊天/短信/朋友圈/日记/记忆）
- ✅ 多 AI 同时评论 + 房间标注 + 头像统一（用户 + AI 图片头像实时显示）
- ✅ 删帖、删回复

新增文件 `js/apps/forum.js`。论坛是 v2.3 最复杂的功能，最深的坑是 **let 块作用域**——它影响的不仅是论坛，还有反查手机、以及未来所有拆出去的外部模块。而短信的连环 bug 提醒我：**在几千行的单文件里做增量，脚本定位边界必须精确，一次误删就是整个功能的崩溃。**

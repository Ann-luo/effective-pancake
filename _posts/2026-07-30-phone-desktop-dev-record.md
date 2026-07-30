# 给 HTML 加个手机桌面：一个 AI 聊天应用的"操作系统化"尝试

> 2026-07-30 · 纯前端 · 单文件 · 手机桌面模拟器

---

## 前言

布雷斯项目做到 9600 行的时候，我突然冒出一个想法：它已经是个完整的微信风格聊天应用了——有聊天、朋友圈、日记、待办、歌单、钱包。但每次打开就是聊天界面，感觉不像一个"手机"，更像一个"App"。

能不能给它加个桌面？像真手机一样——开机有锁屏，解锁后是满屏 App 图标，点 Phone 图标才进聊天。锁屏有日期时间，桌面能换壁纸，通知会弹横幅。

这篇文章记录整个过程——从零搭建一个手机桌面系统，嵌入现有的聊天应用。整个过程踩了无数坑，CSS 冲突、数据隔离、壁纸上传死活调不通……写出来给同样想折腾的朋友参考。

---

## 架构设计：图层，不是页面

一开始想过两种方案：

**方案 A：iframe 嵌入。** 桌面是一个 HTML，聊天是另一个，桌面里用 `<iframe>` 加载聊天。简单，但 iframe 和父页面通信麻烦，`file://` 协议下 iframe 加载跨目录文件还会被安全策略拦截。

**方案 B：图层覆盖。** 桌面和聊天在同一个 HTML 里，桌面用 `position: fixed` + 高 `z-index` 盖在聊天上面。桌面隐藏时聊天露出来。

选了 B。核心就一句话：桌面系统是**聊天应用的顶层遮罩**，不是独立页面。

```
┌──────────────────────────┐
│  pent-ls  锁屏 z-index:999999  │  ← 最顶层
├──────────────────────────┤
│  pent-dt  桌面 z-index:88888   │
├──────────────────────────┤
│  #app     聊天应用             │  ← 被遮住
└──────────────────────────┘
```

JS 动态创建锁屏和桌面元素，`document.body.appendChild` 添加到 DOM。不用写 HTML——所有东西都是 `document.createElement` 拼出来的。

---

## 锁屏：点击解锁，深蓝渐变

第一个做的是锁屏。两个需求：显示时间日期，点击解锁。

CSS 很简单——`position: fixed; inset: 0; z-index: 999999`，深蓝渐变背景，flexbox 居中文字。

```css
.pent-ls {
  position: fixed; inset: 0; z-index: 999999;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: linear-gradient(180deg, #1a1a2e, #16213e, #0f3460);
}
```

时间用 `new Date()` 获取，`setInterval` 每 30 秒刷新一次。日期用中文格式 `7月30日 星期三`。

解锁逻辑：点击 → 加 `unlocking` 类 → CSS `transform: translateY(-100%)` 上滑淡出 → 400ms 后 `display: none`，同时桌面出现。

一开始做的是触摸上滑解锁，监听 `touchstart` + `touchmove`。后来发现在桌面端鼠标没法上滑——只有点击。改成了直接 `onclick`，点一下就走。手机端和桌面端都能用。

---

## 桌面：图标网格 + 底部 Dock

桌面用 `position: fixed` 叠加在聊天上面，`z-index: 88888`。默认 `display: none`，解锁后加上 `.show` 类变成 `display: flex`。

结构：
- 两页图标网格（`scroll-snap` 左右滑动翻页）
- 底部 Dock 栏（Phone/短信/相册/设置四个常驻图标）
- 页码指示器（两个小圆点）

```javascript
var PAPPS = [
  {id:'phone', icon:'💬', label:'Phone'},
  {id:'paMessages', icon:'💬', label:'短信'},
  {id:'paDialer', icon:'📞', label:'电话'},
  // ... 15 个 App
];
```

点图标 → `popenApp(id)` → 隐藏桌面 → 显示对应 App 页面。App 页面也是动态创建的 `<div>`，`position: fixed; z-index: 77777`。

### 图标拖拽排序

用户提了需求：能不能像真手机一样拖动图标换位置？

实现思路：`touchstart` 开始计时 → 500ms 后进入拖拽模式 → `touchmove` 检测手指下方是哪个图标 → `touchend` 交换两个图标在 `PAPPS` 数组中的位置 → 重新渲染桌面 → 新顺序存 `localStorage`。

```javascript
// 核心交换逻辑
var tmp = PAPPS[_dragIdx];
PAPPS[_dragIdx] = PAPPS[overIdx];
PAPPS[overIdx] = tmp;
localStorage.setItem('pent_app_order', JSON.stringify(PAPPS.map(x => x.id)));
prenderDT();
```

拖拽时图标 `opacity: 0.4; transform: scale(1.1)`，目标位置高亮。短按依然是打开 App，通过 `_dragMoved` 标志位区分。

### Bug：拖拽后点不动

第一版里拖拽松手后，被拖的那个图标再也点不开了。排查发现：拖拽时触发了 `touchstart`，松手时 `touchend` 在 500ms 内完成，`_dragMoved` 被设为 `false`，按理说下次点击应该正常。但实际上 `_dragMoved` 在 `touchend` 里被重置之前，`click` 事件已经触发了——`onclick` 里判断 `!_dragMoved` 为 `false`，阻止了打开 App。

修法：`touchend` 里用 `setTimeout(() => { _dragMoved = false }, 100)` 延迟重置，给 click 事件留出判断窗口。

---

## 踩坑：CSS 冲突，微信黑屏

桌面系统加到 phone.html 之后，打开页面直接黑屏。排查了半天发现三个原因：

### 1. `#app{display:none!important}`

为了在桌面模式下隐藏聊天界面，我加了 `#app{display:none!important}`。但忘了在点 Phone 时恢复显示——`popenApp('phone')` 里只做了 `_pdt.classList.remove('show')`（隐藏桌面），没有恢复 `#app` 的 display。

修法：加 `#app.pent-show{display:flex!important}`，点 Phone 时追加 `pent-show` 类。

### 2. 微信锁屏被禁用后又恢复

phone.html 自带了锁屏系统（`#lockScreen`）——密码/问答模式。一开始我加了 `#lockScreen{display:none!important}` 禁用掉，用我自己的锁屏。后来用户说"要微信锁屏"，我又恢复。一禁一启之间，逻辑乱了套。

最终方案：桌面用简单点击解锁（无密码），微信锁屏只在**离开 Phone App 回到桌面时**自动触发。`pcloseApp` 里加一行：

```javascript
setTimeout(function() {
  if (lockConfig.enabled && !lockActive) lockNow();
}, 300);
```

### 3. 滚动按钮脚本提前报错

phone.html 自带了一个聊天滚动按钮的 `<script>` 块，在手机端 DOM 还没加载完时就 `document.getElementById('scrollBtns')`——返回 null，`.addEventListener` 报错，阻塞了整个页面的 JS 执行。删掉这个脚本块之后恢复正常。

### 4. 变量名混乱

备份版壁纸函数用 `pdt.style.backgroundImage`，但桌面元素创建时的变量名是 `_pdt`。`pdt` 是 `undefined`，静默失败，壁纸换不了。改掉所有引用统一成 `_pdt`。

---

## 14 个 App 逐个实现

每个 App 都是一个 `<div class="pent-app">`，里面放 header（返回按钮 + 标题）和 body（内容区）。点桌面图标 → 显示对应 div → 渲染内容。

### 📷 相机

`<input type="file" accept="image/*" capture="environment">`，`capture="environment"` 告诉浏览器调后置摄像头。选完照片 → `FileReader` 读 → 压缩到 400px JPEG 0.5 → base64 存 `localStorage pent_photos`。

### 🖼️ 相册

从 `localStorage` 读照片数组，CSS Grid 3 列展示。点击全屏查看（`position: fixed` 覆盖全屏 + 点击关闭）。右上角 ✕ 删除。

加了上传按钮，调同样的 file input 逻辑，上限 10MB，自动压缩。

### 📁 文件管理

和相册一样的数据模型——`<input type="file">` → `FileReader.readAsDataURL` → 存 `localStorage pent_files`。列表展示文件名 + 大小 + 删除按钮。

### ⏰ 时钟 + 秒表 + 倒计时 + 闹钟

时钟是最复杂的 App。四个标签切换：时钟（实时数字钟）、秒表、倒计时、闹钟。

**秒表**第一版用 `setInterval(100ms)`——每 100ms 读 `Date.now()` 算差值。结果疯狂闪动。原因是 `setInterval` 不跟屏幕刷新率同步，100ms 内可能重绘 0-3 次，数值跳跃。

改 `requestAnimationFrame` + `performance.now()`：

```javascript
var st = performance.now();
function tic() {
  var e = performance.now() - st;
  var s = Math.floor(e / 1000);
  var ms = Math.floor((e % 1000) / 100);
  document.getElementById('pswd').textContent = s + '.' + ms;
  requestAnimationFrame(tic);
}
```

每帧更新一次，丝滑不闪。加了暂停/继续/重置按钮，用 `_swElapsed` 累计已跑时间，暂停时冻结。

**闹钟**：用户选时间 → 算出距离现在的毫秒数 → `setTimeout` 到点弹通知。页面关了失效——纯前端限制。

**Bug：标签切换失灵。** 第一版用 `onclick="pct('sw',event)"` 传事件对象，但 `pct()` 里用 `e.target.classList.add('active')`。当 `prClock()` 初始化调用 `pct('clk')` 没有传 event 时，`e` 为 undefined，`e.target` 报错。

修法：不用 `onclick` 属性，改用 JS 直接 `.onclick = function(){}` 绑定，全局变量 `_pct` 记住当前标签，`pctRender()` 统一渲染。

### 其他 App

- 📅 日历：月视图 Grid 7 列，◀▶ 箭头切月，`_calYear/_calMonth` 状态变量
- 📟 计算器：`eval()` 求值（别喷，纯前端计算器用 eval 够了）
- 📞 电话：3×4 数字键盘，拨号模拟，点拨打弹通知
- 🗺️ 地图：iframe 加载 OpenStreetMap 太慢 → 改成一键打开百度地图

---

## 通知系统

全局函数 `pnotify({title, text, icon})`——创建顶部横幅（`position: fixed; top: 48px`），3 秒自动消失。存入 `_pnotifs` 数组。下滑通知中心（监听 `touchmove`，手指从顶部下滑 > 60px 触发）展示所有历史通知。

```javascript
var _pnotifs = [];
function pnotify(o) {
  var n = {title: o.title, text: o.text, icon: o.icon, time: Date.now()};
  _pnotifs.unshift(n);
  // 顶部横幅弹入
  document.getElementById('pnb').classList.add('show');
  setTimeout(() => document.getElementById('pnb').classList.remove('show'), 3000);
}
```

---

## 壁纸：七次尝试

这是整个项目调得最痛苦的功能。前后试了七种方案：

1. **`<label>` + 隐藏 `<input>`**（备份版原生方案）——WebView 里 label 不触发
2. **JS 动态创建 input + `click()`** ——不 append 到 body，部分浏览器拦截
3. **append 到 body + click** ——还是不行
4. **`style.background` 设置** ——和 `backgroundImage` 冲突，被覆盖
5. **`style.backgroundImage`** ——和 CSS 里的 `background` shorthand 冲突
6. **去掉 CSS background 默认值** ——壁纸能显示了，但默认背景变黑
7. **最终版**：`<label>` + 隐藏 `<input onchange="psetWP(this)">` + `_pdt.style.backgroundImage = 'url(...)'` + 创建时设 `_pdt.style.background = 'linear-gradient(...)'` 兜底

最后发现其实就是两个小问题叠在一起：变量名不统一（`pdt` vs `_pdt`）和 CSS 属性覆盖（`background` vs `backgroundImage`）。修好之后壁纸终于能换了。

---

## 数据隔离：三个数据库互不干扰

布雷斯、Phone、p-ent-phone 三个项目用同一个浏览器打开时，数据不能串。

| 项目 | IndexedDB | localStorage 前缀 |
|------|-----------|------------------|
| 布雷斯 | `bles_db_v1` | `bles_*` |
| Phone | `phone_db_v1` | `phone_*` |
| p-ent-phone | `pent_db_v1` | `pent_*` |

p-ent-phone 内嵌的 Phone App 走 `phone_db_v1`，桌面系统数据走 `pent_*` localStorage keys。同一页面两个数据库同时在跑，井水不犯河水。

---

## 锁屏系统的三次返工

### 第一次：加密码锁屏

用户说"桌面端也要有密码锁屏，像微信那样"。于是我照搬了 Phone App 的锁屏逻辑——PIN 码六位圆点 + 虚拟数字键盘 + 物理键盘双支持，还有问答模式（"我最喜欢的颜色？"）。密码输错 5 次锁定，有"重置锁屏密码"入口。

代码写了一大堆：`plsShowChallenge()` 动态创建 PIN UI、`plsPinKeyHandler()` 监听物理键盘、`plsTapPin()` 处理虚拟键盘触摸、`plsCheckQA()` 验证问答。CSS 也加了几十个类——圆点动画、numpad 布局、错误提示、按钮样式。

结果用户一点锁屏——**没反应**。

### 第二次：修点击事件

排查发现是 `e.target.closest()` 的问题。当用户点"点击解锁"四个字时，浏览器 `e.target` 是**文本节点**（Text Node，`nodeType === 3`），不是 Element。文本节点没有 `.closest()` 方法——`TypeError: e.target.closest is not a function`，整个 click handler 静默死亡。

修法：手动遍历 DOM 树，而不是依赖 `.closest()`：

```javascript
_pls.addEventListener('click', function(e) {
  var t = e.target;
  while (t && t.nodeType === 3) t = t.parentElement;  // 文本节点 → 父元素
  var el = t;
  while (el && el !== _pls) {
    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') return;
    el = el.parentElement;
  }
  // 到达 _pls 本身 → 处理点击
});
```

### 第三次：全部回退

密码锁屏修好后，用户说"算了，桌面端不需要密码，锁屏一次就够了"。于是把所有 PIN/QA 逻辑全删——200+ 行代码、几十个 CSS 类、动态 UI 创建函数——回归到最初的三行点击解锁。同时也删掉了自动锁屏定时器，回归到离开浏览器时锁屏（`visibilitychange` 事件 + `plsLockShow()`）。

**教训**：不是所有功能都需要做复杂。桌面锁屏的价值在于"进入时那一瞬间的仪式感"——上滑解锁的动画、深蓝渐变背景、时间日期——就够了。密码留给 Phone App 内部的锁屏系统处理，不要重复造轮子。

---

## 壁纸升级：Canvas 压缩 + 变量统一

第一版壁纸上传直接把原始文件的 base64 塞进 `localStorage`。一个 2MB 的 JPEG → base64 约 2.7MB，两张壁纸就能超 5MB 限额，静默写入失败。用户换了壁纸，刷新一下又变回默认——体验极差。

修了两处：

**1. Canvas 压缩**

```javascript
function psetWP(inp) {
  var f = inp.files[0];
  if (f.size > 10 * 1024 * 1024) { /* 拒绝 */ }
  var r = new FileReader();
  r.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var c = document.createElement('canvas');
      var s = Math.min(1, 1920 / img.width);  // 最大 1920px 宽
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      var d = c.toDataURL('image/jpeg', 0.7);  // JPEG 70% 质量
      localStorage.setItem('pent_wp', d);
      _pdt.style.background = 'url(' + d + ') center/cover';
    };
    img.src = e.target.result;
  };
  r.readAsDataURL(f);
  inp.value = '';  // 允许重复选同一文件
}
```

1920px JPEG 0.7 质量，典型照片从 2MB 压缩到 ~150KB，base64 约 200KB——远低于 localStorage 5MB 限额。

**2. 变量名统一**

备份版里壁纸函数用 `pdt.style.backgroundImage`（浏览器 ID 全局变量），但桌面元素创建用的是 `var _pdt`。`pdt` 和 `_pdt` 是两个不同的东西——前者依赖浏览器的"命名元素自动全局"特性，后者是正经 JS 变量。全局搜索 `pdt.` 和 `document.getElementById('pls')` 全部改成 `_pdt` 和 `_pls`。

同时用 CSS `background` 简写替代分离的 `backgroundImage` + `backgroundSize` + `backgroundPosition`，确保壁纸始终 `center/cover`。

---

## 导航栏：加上又删掉

为了让用户在各 App 之间方便切换，加了一个底部导航栏——三个按钮：▷ 返回、○ 桌面、▢ 通知。`position: fixed; bottom: 0`，`backdrop-filter: blur(12px)` 毛玻璃效果。

做完之后用户说"太碍事了"。所有 App 页面本身已经有顶部 `‹` 返回按钮，左上角也有 🏠 主场键。底部再加三个按钮纯属多余——遮挡内容、占用空间。

于是又全删。CSS、HTML、JS 引用全部清理干净。**加功能之前先想清楚是不是真的需要**——这是反复踩坑后的反思。

---

## 文件管理：从 localStorage 到 IndexedDB

最初的 `prFiles()` 只是显示"文件管理"四个字的占位符。用户说要"能上传文件、删除和查看"。

第一版用 `localStorage` 存 base64——和壁纸一样的套路。但用户问了一句："保存到 db 不行吗？"确实——localStorage 5MB 上限对文件来说太紧了，一张稍大的图片就爆仓。

切到 IndexedDB（`pent_db_v1`）：

```javascript
async function prFiles() {
  var a = await idbGet('pent_files') || [];
  // 渲染文件列表...
}
async function paddFile() {
  var f = inp.files[0];
  if (f.size > 50 * 1024 * 1024) { /* 拒绝 */ }
  var r = new FileReader();
  r.onload = async function(e) {
    var a = await idbGet('pent_files') || [];
    a.unshift({name: f.name, size: f.size, data: e.target.result, time: Date.now()});
    await idbPut('pent_files', a);
    prFiles();
  };
  r.readAsDataURL(f);
  inp.click();
}
```

单文件上限从 5MB 提到 **50MB**，最多存 50 个文件。数据持久化，刷新不丢。

还加了文件查看器——点击文件名弹出全屏预览：
- **图片**（png/jpg/gif/webp/svg）→ `<img>` 全屏展示
- **PDF** → `<iframe>` 内嵌
- **文本**（txt/json/xml/html/css/js/md/log/csv）→ `atob()` 解码 base64 后 `<pre>` 展示（最多 50 万字符）
- **其他格式** → 显示文件名 + 大小 +"📥 下载查看"按钮

---

## 通知中心独立为桌面 App

原本的通知中心只能通过屏幕顶部下滑手势触发（`touchmove` 监听），桌面端鼠标没法下滑。改成了独立的桌面 App——🔔 图标，点进去看所有历史通知。

改动很小：`PAPPS` 数组加一个 `{id:'paNotify', icon:'🔔', label:'通知'}`，`popenApp` 加一个分支调用 `prNotify()`，再加一个 `<div class="pent-app" id="paNotify">` 面板。`prNotify()` 直接从全局 `_pnotifs` 数组渲染列表——和通知横幅共享同一份数据。

这样桌面端和手机端都能方便查看通知，不用记"下滑"这个隐藏手势。

---

## 音乐 App：从占位符到多平台播放器

音乐是最初 14 个 App 之一，但一直只是个占位符——点进去显示"音乐"就没了。这次做了完整升级：

### 本地文件导入

`<input type="file" accept="audio/*,video/*">`，支持 MP3/MP4/WebM 等格式。和文件管理一样走 IndexedDB（`pent_music`），单文件上限 200MB。

### 多平台链接识别

直接贴链接播放在多数情况下是行不通的——大多数音视频网站不提供直链。参考微信的"分享歌单"体验，改成**识别平台、对应处理**：

| 平台 | 链接特征 | 播放方式 |
|------|----------|----------|
| 网易云音乐 | `music.163.com/#/song?id=xxx` | iframe 内嵌播放器 |
| QQ 音乐 | `y.qq.com/songDetail/xxx` | iframe 内嵌播放器 |
| B 站 | `bilibili.com/video/BVxxx` | iframe 内嵌播放器 |
| YouTube | `youtube.com/watch?v=xxx` | iframe 内嵌播放器 |
| 酷狗/酷我/抖音 | `kugou.com`/`kuwo.cn`/`douyin.com` | 跳浏览器打开（平台限制无法嵌入） |
| 直链 | `.mp3`/`.mp4` 结尾 | 原生 `<audio>`/`<video>` 播放 |

URL 解析用正则逐层匹配：

```javascript
var m163 = url.match(/music\.163\.com.*[?&;]id=(\d+)/i);
var mQQ  = url.match(/y\.qq\.com.*song(?:Detail|id)[=/](\w+)/i);
var mBili = url.match(/bilibili\.com\/video\/(BV\w+)/i);
var mYT  = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/i);
// ...更多平台
```

### 播放器 UI

统一的播放器面板——进度条拖拽、播放/暂停、上/下一首、随机播放全部。视频自动切换为 16:9 `<video>` 容器。歌单显示平台图标（🎶 音乐 / 🎬 视频 / 🌐 直链 / 📁 本地），一目了然。

---

## 总结

桌面系统主体 ~500 行 CSS + ~600 行 JS = ~1100 行。大部分时间没花在写代码上——花在调 CSS 图层冲突、变量名不一致、壁纸上传的七次尝试、时钟标签的事件绑定方式切换。

最大的教训：**在 9600 行的现有文件上加功能，改一个 CSS 属性能影响三处、改一个变量名能静默失败四个地方。** 备份文件救了很多次命——每次大改动前先 `cp` 一份，不行就回退。

现在这个 9775 行的 HTML 文件，打开是一个手机桌面——锁屏、图标、17 个 App（拍照、相册、文件、音乐、备忘录、日历、时钟、计算器、天气、电话、短信、地图、商店、设置、通知、Phone、小游戏）、通知、壁纸。点 Phone 图标进入完整 AI 聊天应用。双击就用，零依赖。

整个开发过程最深的感受：**在已有的复杂代码上做增量，最大的成本不是写新代码，而是弄清楚旧代码的每一行在干什么。** 备份-修改-验证-回退的循环跑了不下十次，每次回退都学到一点东西——CSS 简写和分离属性的优先级、`!important` 对 inline style 的覆盖、文本节点的 `.closest()` 陷阱、IndexedDB 存大文件比 localStorage 靠谱得多。

---

*下一篇：文件系统的进一步优化——IndexedDB 直接存 Blob 而非 base64，以及让桌面短信变身真正的聊天 App。*

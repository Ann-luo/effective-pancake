# 给 HTML 加个手机桌面：一个 AI 聊天应用的"操作系统化"尝试

> 2026-07-30 · 纯前端 · 单文件 · 手机桌面模拟器

---


## 目录

1. [前言](#前言)
2. [架构设计：图层，不是页面](#架构设计图层不是页面)
3. [锁屏：点击解锁，深蓝渐变](#锁屏点击解锁深蓝渐变)
4. [桌面：图标网格 + 底部 Dock](#桌面图标网格-底部-dock)
5. [踩坑：CSS 冲突，微信黑屏](#踩坑css-冲突微信黑屏)
6. [14 个 App 逐个实现](#14-个-app-逐个实现)
7. [通知系统](#通知系统)
8. [壁纸：七次尝试](#壁纸七次尝试)
9. [数据隔离：三个数据库互不干扰](#数据隔离三个数据库互不干扰)
10. [锁屏系统的三次返工](#锁屏系统的三次返工)
11. [壁纸升级：Canvas 压缩 + 变量统一](#壁纸升级canvas-压缩-变量统一)
12. [导航栏：加上又删掉](#导航栏加上又删掉)
13. [文件管理：从 localStorage 到 IndexedDB](#文件管理从-localstorage-到-indexeddb)
14. [通知中心独立为桌面 App](#通知中心独立为桌面-app)
15. [音乐 App：从占位符到多平台播放器](#音乐-app从占位符到多平台播放器)
16. [锁屏与微信锁的协同](#锁屏与微信锁的协同)
17. [CSS 清理：重复规则与黑色背景](#css-清理重复规则与黑色背景)
18. [PowerShell 正则的"误伤"事件](#powershell-正则的误伤事件)
19. [闹钟：从小通知到全屏弹窗](#闹钟从小通知到全屏弹窗)
20. [天气：每日随机生成](#天气每日随机生成)
21. [短信：从 prompt() 到内联输入框](#短信从-prompt-到内联输入框)
22. [应用管理：拖拽排序保留，删除移到商店](#应用管理拖拽排序保留删除移到商店)
23. [壁纸存储：双保险](#壁纸存储双保险)
24. [通知：清全部 + 单独删](#通知清全部-单独删)
25. [文件导出（未完成）](#文件导出未完成)
26. [相册和文件管理的"失而复得"](#相册和文件管理的失而复得)
27. [短信 App 重构：AI 主动发信 + 仿微信聊天](#短信-app-重构ai-主动发信-仿微信聊天)
28. [数据互通：短信 <-> 微信四区共享](#数据互通短信-微信四区共享)
29. [拖拽排序：加上又删掉](#拖拽排序加上又删掉)
30. [相机拍照：压缩 + 刷新相册](#相机拍照压缩-刷新相册)
31. [五个独立小游戏](#五个独立小游戏)
32. [游戏商店化](#游戏商店化)
33. [桌面翻页适配](#桌面翻页适配)
34. [总结](#总结)


---

## 2. 架构设计：图层，不是页面

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

## 3. 锁屏：点击解锁，深蓝渐变

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

## 4. 桌面：图标网格 + 底部 Dock

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

## 5. 踩坑：CSS 冲突，微信黑屏

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

## 6. 14 个 App 逐个实现

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

## 7. 通知系统

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

## 8. 壁纸：七次尝试

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

## 9. 数据隔离：三个数据库互不干扰

布雷斯、Phone、p-ent-phone 三个项目用同一个浏览器打开时，数据不能串。

| 项目 | IndexedDB | localStorage 前缀 |
|------|-----------|------------------|
| 布雷斯 | `bles_db_v1` | `bles_*` |
| Phone | `phone_db_v1` | `phone_*` |
| p-ent-phone | `pent_db_v1` | `pent_*` |

p-ent-phone 内嵌的 Phone App 走 `phone_db_v1`，桌面系统数据走 `pent_*` localStorage keys。同一页面两个数据库同时在跑，井水不犯河水。

---

## 10. 锁屏系统的三次返工

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

## 11. 壁纸升级：Canvas 压缩 + 变量统一

第一版壁纸上传直接把原始文件的 base64 塞进 `localStorage`。一个 2MB 的 JPEG → base64 约 2.7MB，两张壁纸就能超 5MB 限额，静默写入失败。用户换了壁纸，刷新一下又变回来——体验极差。

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

## 12. 导航栏：加上又删掉

为了让用户在各 App 之间方便切换，加了一个底部导航栏——三个按钮：▷ 返回、○ 桌面、▢ 通知。`position: fixed; bottom: 0`，`backdrop-filter: blur(12px)` 毛玻璃效果。

做完之后用户说"太碍事了"。所有 App 页面本身已经有顶部 `‹` 返回按钮，左上角也有 🏠 主场键。底部再加三个按钮纯属多余——遮挡内容、占用空间。

于是又全删。CSS、HTML、JS 引用全部清理干净。**加功能之前先想清楚是不是真的需要**——这是反复踩坑后的反思。

---

## 13. 文件管理：从 localStorage 到 IndexedDB

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
- **音频/视频** → `<audio>`/`<video>` 播放
- **文本**（txt/json/xml/html/css/js/md/log）→ `atob()` 解码 base64 后 `<pre>` 展示
- **其他格式** → 显示"此文件格式不支持预览"

---

## 14. 通知中心独立为桌面 App

原本的通知中心只能通过屏幕顶部下滑手势触发（`touchmove` 监听），桌面端鼠标没法下滑。改成了独立的桌面 App——🔔 图标，点进去看所有历史通知。

改动很小：`PAPPS` 数组加一个 `{id:'paNotify', icon:'🔔', label:'通知'}`，`popenApp` 加一个分支调用 `prNotify()`，再加一个 `<div class="pent-app" id="paNotify">` 面板。`prNotify()` 直接从全局 `_pnotifs` 数组渲染列表——和通知横幅共享同一份数据。

这样桌面端和手机端都能方便查看通知，不用记"下滑"这个隐藏手势。

---

## 15. 音乐 App：从占位符到多平台播放器

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

## 16. 锁屏与微信锁的协同

### 锁屏状态变量 Bug

在某次自检中发现，桌面锁屏的状态变量混乱——`_plocked` 在 3 处引用但从未用 `var` 声明，`_plsLocked` 声明了但从未赋值。更严重的是，`visibilitychange` 事件处理器调用了不存在的 `plsLockShow()` 函数，而这个处理器还写在了 Phone App 的闭包内部，访问不到全局变量。

修法：把锁屏状态管理集中在全局桌面代码区，定义 `var _plsLocked = true`（初始为锁定状态），实现 `plsLockShow()`（显示桌面锁屏）和 `plsUnlock()`（解锁），统一替换所有 `_plocked` 引用为 `_plsLocked`。`visibilitychange` 监听器也从 Phone 闭包移到全局。

### 锁屏后回到原界面

之前解锁后总是跳转到桌面——不管用户之前在哪个 App。原因是 `plsUnlock()` 只是简单显示桌面，没有记录锁屏前打开的是什么。

修法：加一个 `_pBeforeLock` 变量。`plsLockShow()` 锁屏时保存 `_pcurApp`，`plsUnlock()` 解锁时恢复。如果是切 Tab 触发的锁屏（`visibilitychange`），保存状态并恢复；如果是用户主动按 Home 离开微信，清掉状态回到桌面。

```javascript
function plsLockShow(saveState) {
  if (_plsLocked) return;
  _plsLocked = true;
  if (saveState !== false) _pBeforeLock = _pcurApp;  // 切 Tab 保存，主动离开不保存
  // 显示锁屏...
}
function plsUnlock() {
  _plsLocked = false;
  // 恢复 _pBeforeLock 对应的 App，无则显示桌面
  if (_pBeforeLock === 'phone') { /* 回到微信 */ }
  else if (_pBeforeLock) { /* 回到对应 App */ }
  else { /* 回到桌面 */ }
}
```

### 桌面锁屏与微信锁屏双层机制

用户的两个需求：（1）只要离开微信就锁屏（2）切换浏览器 Tab 也锁屏。而且"如果一起触发就一起锁，桌面端优先"。

最直接的实现：
- **在微信中切 Tab**：`visibilitychange` → 桌面锁屏（`z-index: 999999`）弹出覆盖一切，同时调用微信的 `lockNow()` 触发微信密码锁。用户解锁桌面后，微信锁屏还在底下等着。
- **在微信中按 Home/返回**：`pcloseApp()` / `_pgoHome()` 中检测 `_pcurApp === 'phone'` → 调用微信 `lockNow()` 但不触发桌面锁屏——用户自己想回桌面，不需要桌面锁从中拦截。
- **进入微信时检查锁状态**：`popenApp('phone')` 恢复了对 `lockConfig.enabled && !lockActive` 的检查。如果微信密码锁已启用且未解锁 → 先弹密码锁，通过后才进微信。

### 导航栏：加回来但要分场景

用户说"去掉导航栏吧太碍事了"之后，我在某次重构时把整个 `pnavbar` HTML div 和 CSS 全部清理了。结果 JS 里还有 `document.getElementById('pnavbar').classList.add('show')` 的引用——找 ID 返回 null，静默失败。

修复 pnavbar 回归后，按场景分区：
- **桌面 App（相册/文件/设置等）**：显示导航栏（返回/桌面/通知），底部适配 `safe-area-inset-bottom`
- **Phone/微信**：`popenApp('phone')` 里主动隐藏导航栏——微信有自己的界面，不需要桌面导航

---

## 17. CSS 清理：重复规则与黑色背景

### 重复的 .pent-ls 规则块

不知道哪次合并代码时，`.pent-ls` 完整定义出现了两次——含 `!important` 版本和不含的版本，连子规则 `.pls-time`、`.pls-date`、`.pls-hint` 和 `@keyframes plsPulse` 都重复了一遍。虽然没造成视觉 bug（两个版本属性完全一致），但让 CSS 凭空多了 15 行垃圾。

### 桌面默认黑屏

`.pent-dt` 的 CSS 默认背景是 `background-color: #000`（纯黑）。当用户没设壁纸时，桌面显示黑色而非蓝色渐变——和锁屏的深蓝完全不搭。

修复：CSS 默认值从 `background-color: #000` 改为 `background: linear-gradient(180deg, #1a1a2e, #16213e, #0f3460)`——和锁屏一模一样的渐变。设了壁纸后 inline style 会覆盖 CSS，一切正常。

---

## 18. PowerShell 正则的"误伤"事件

用 PowerShell 给文件加 pnavbar 时，写了个 `(?=</body>)` 正则往前插 HTML。结果这个正则在聊天记录导出功能的 JS 代码里也匹配到了——那段代码拼了个 `fullHtml = '<!DOCTYPE html>...' + innerHTML + '</body></html>'` 字符串。

pnavbar 的 `<div>` 被直接塞进了那个单引号字符串内部，活生生把 JS 语法炸了。`new Function()` 检测到 "Invalid or unexpected token"，整个页面的 JS 不执行——黑屏。

教训：**在混合 HTML 和 JS 的大文件里用正则做全局替换极其危险。** 字符串里随时可能出现和 HTML 一模一样的片段。应该用更精确的定位方式，或者至少替换完后做一次完整的语法检查。

---

## 19. 闹钟：从小通知到全屏弹窗

闹钟到时间后最初只是调 `pnotify()` 发一条顶部横幅通知——3 秒消失，很容易错过。用户说"闹钟设置到达时间后弹窗通知弹出来"。

改成了**全屏模态弹窗**：

```
  ⏰
  闹钟
  08:30
  时间到！
  [🔕 关闭]
```

- `z-index: 9999999`——比桌面锁屏（999999）还高一层，**在任何界面都会弹出**
- 附带 base64 WAV 提示音（`new Audio().play()`）
- 最多同时设置 10 个闹钟
- 淡入缩放动画

纯前端限制：闹钟只在页面打开时有效（`setTimeout`），页面关闭闹钟失效。

---

## 20. 天气：每日随机生成

天气最初是死数据——永远是"☀️ 晴 28°"和固定的三天预报。用户说要"每天随机生成，可以显示有不一样感一点"。

用当日日期做伪随机种子：

```javascript
function prWeather() {
  var seed = parseInt(new Date().toISOString().split('T')[0].replace(/-/g, '')) % 100;
  var conditions = [
    {e: '☀️', t: '晴'}, {e: '⛅', t: '多云'}, {e: '🌧️', t: '小雨'},
    {e: '⛈️', t: '雷阵雨'}, {e: '🌤️', t: '晴间多云'}, {e: '☁️', t: '阴'},
    {e: '🌦️', t: '阵雨'}, {e: '🌫️', t: '雾'}
  ];
  var today = conditions[seed % conditions.length];
  // 温度在基准值上下浮动 ±2°
  // 明天/后天/大后天依次取后续天气
}
```

每天换一个天气，温度有小幅波动，三天预报各不相同。页面底部标注"📍 基于当日随机生成"——诚实比装逼重要。

---

## 21. 短信：从 prompt() 到内联输入框

最初的短信输入用的是 `prompt('短信内容:')`——浏览器原生弹窗，在手机端体验很差：键盘可能遮挡、不能换行、和页面风格割裂。

改成和备忘录一样的**内联输入框 + 发送按钮**：

```html
<input id="psmsInp" placeholder="输入短信内容…">
<button onclick="paddSMS()">发送</button>
```

删除了 `paddSMS()` 里的 `prompt()`，改为读 `document.getElementById('psmsInp').value`。每条短信带时间戳和删除按钮。

---

## 22. 应用管理：拖拽排序保留，删除移到商店

### 长按删除和拖拽排序的冲突

最初桌面上同时挂了长按删除（`oncontextmenu`）和拖拽排序（`touchstart` 500ms + `touchmove`），两个手势都依赖"按住不动"这个动作，在移动端互相干扰——长按弹删除确认时拖拽也激活了，两个都不生效。

### 取舍：保留拖拽，删除移入商店

拖拽排序没有其他替代方案（图标位置必须通过拖拽来改），而删除有商店这条退路。

- 桌面图标去掉 `oncontextmenu` 属性，只有 `onclick` 打开 + `touch` 拖拽排序
- 商店里每个已安装应用显示**🗑️ 卸载**按钮，点确认后从桌面移除
- 已卸载应用显示**📥 下载**按钮，点后恢复
- Phone / 商店 / 设置标记为**🔒 系统**，不可卸载

```javascript
function prStore() {
  var prot = ['phone', 'paStore', 'paSettings'];
  PAPPS.forEach(function(a) {
    if (已卸载) → '📥 下载'
    else if (系统应用) → '🔒 系统'
    else → '🗑️ 卸载'
  });
}
```

卸载和安装都走 `pent_removed` localStorage 列表，操作后自动重建桌面图标布局。

---

## 23. 壁纸存储：双保险

壁纸压缩后通常只有 150-200KB，localStorage 完全够用。但压缩过程可能失败（图片损坏、格式不支持、Canvas 被污染），失败时的 raw base64 可能远超 5MB 限额直接写爆。

加了三层保障：

```javascript
// 层级 1：FileReader 错误
r.onerror = function() { pnotify({title: '读取失败', text: '文件无法读取，请重试'}) };

// 层级 2：Image 加载错误
img.onerror = function() { pnotify({title: '图片无效', text: '不支持此图片格式'}) };

// 层级 3：localStorage 写满 → 降级到 IndexedDB
try {
  localStorage.setItem('pent_wp', d);
} catch(ex) {
  idbPut('pent_wp', {d: d, t: Date.now()}).then(function() {
    pnotify({title: '🖼️ 壁纸已更新', text: '已存入IndexedDB'});
  });
}
```

页面加载恢复壁纸时也先查 localStorage，查不到再查 IndexedDB。两个存储互为备份。

---

## 24. 通知：清全部 + 单独删

通知系统最初只有"下滑查看"和"3 秒自动消失"，无法主动清理。用户问"通知界面能不能清除通知？"

加了三个操作：

- **通知中心顶部"清除全部"按钮** → `pclearNotifs()` 直接清空 `_pnotifs` 数组
- **每条通知右侧 ✕** → `pdelNotif(i)` 删单条 → 但这里有个坑：点击 ✕ 事件冒泡到通知中心遮罩的 `onclick="if(event.target===this)phideNC()"`，导致通知面板在删除后立刻关闭。修法是 ✕ 的 onclick 加上 `event.stopPropagation()`
- **通知 App（paNotify）底部"清除全部通知"按钮** → 和通知中心同一个 `pclearNotifs()`

---

## 25. 文件导出（未完成）

文件预览器里加过下载按钮，试图做微信同款的文件导出：调用 `navigator.share()` 弹系统分享面板，分享失败降级到 `<a download>`。但 APK 的 WebView 中 `navigator.share` 不可用，`<a>` 的 `click()` 虽然 append 了 DOM 但在部分 WebView 里仍然不触发下载——因为没有原生 DownloadListener 接管。

反复试了 `window.open(blobUrl)`、`fetch` 转 blob 再分享、底部弹面板等好几个方案，始终无法在 APK 里稳定导出文件。最终决定暂时砍掉下载功能——文件管理器回归纯预览：在线看图、播音频视频、读文本，不导出。Web 环境写文件系统的硬限制摆在那里，与其给用户半成品，不如不做。

---

## 26. 相册和文件管理的"失而复得"

在多次备份恢复和代码合并的过程中，相册和文件管理 App 的功能被反复覆盖丢失——有时只剩静态网格、有时只剩占位文字。对照早期备份 `p-ent-phone (2).html` 逐个恢复：

| 功能 | 丢失时状态 | 恢复后 |
|------|-----------|--------|
| 相册上传 | 无按钮 | 📷 上传照片（≤10MB 自动压缩）|
| 相册查看 | 无点击 | 全屏查看 + 右上角 ✕ 关闭 |
| 相册删除 | 无 | 每张照片右上角 ✕ 删除 |
| 文件上传 | 无 | ➕ 添加文件 |
| 文件删除 | 无 | 每行 ✕ 删除 |
| 文件预览 | 无 | 图片/音频/视频/PDF/文本在线预览 |
| 日历翻月 | 无 ◀▶ | ◀ 年+月 ▶ 切月 |
| 时钟秒表 | 无 | 时钟/秒表(rAF)/倒计时/闹钟 四 Tab |

核心教训：**在备份和正式文件之间频繁切换时，永远从已知完好的备份出发，加完一个功能立刻验证，确认无误再继续。** 一次改太多、改完不验，出了 bug 完全不知道哪个改动引起的。

---


---

## 27. 短信 App 重构：AI 主动发信 + 仿微信聊天

### 从记事本到聊天 App

最初的短信就是一个记事本——输入文字、存 localStorage、列表展示。没有任何 AI、没有任何聊天感。重构分了三步走。

### 第一版：绑定微信房间

思路是把短信挂在微信房间下——同一个 Agent 同一个房间，微信聊天和短信共享记忆/日记/朋友圈上下文。prMessages() 彻底重写：聊天气泡（AI 左灰、用户右绿）、输入框 + 发送按钮、50 条分页、长按删除。AI 回复直接调 DeepSeek API。

主动发信挂到现有心跳（15s tick），检查间隔时间 + 免打扰时段 -> AI 自己判断有没有话要说 -> 有就生成消息 -> 弹通知 "Agent名 发来短信"。

### 第二版：独立于微信

用户说不对——短信应该有自己的 Agent 切换和房间切换，不跟着微信走。于是加了 _psmsAgentId / _psmsRoomId（短信自己的状态变量），仿短信收件箱的联系人列表。每个 Agent x 房间组合是一个"对话"，点击进入聊天。

设置面板里每个智能体独立开关——勾选布雷斯但关掉小猫，布雷斯会主动发短信、小猫不会。设置独立于微信。

### 第三版：最终方案

最终 SMS 有三个界面：联系人列表（所有 Agent x 房间，显示最后一条预览）、聊天（气泡 + 输入）、设置（多 Agent 开关 + 间隔 + 免打扰）。

短信使用自己的 Agent/Room 状态变量（_psmsAgentId / _psmsRoomId），和微信的 activeAgentId / activeRoomId 完全独立。主动发信遍历所有已启用的 Agent x 房间组合。

### 存储设计

pent_db_v1:
  pent_sms_msgs_<agentId>_<roomId>  -> [{id, role, text, time}]
  pent_sms_cfg                      -> {proactiveEnabled: {agentId: bool}, intervalMin, quietStart, quietEnd}

每个 Agent x 房间组合一条消息数组，最多 1000 条。设置全局一份。

---

## 28. 数据互通：短信 <-> 微信四区共享

智能体在短信、微信、朋友圈、日记四个区域的数据可以互相读取。这是整个短信 App 最有价值的特性。

### 写入隔离

所有数据存在同一个 pent_db_v1，但写入严格隔离：

| | 短信写 | 微信写 |
|------|:--:|:--:|
| 短信 Key (pent_sms_*) | OK | 从不 |
| 微信 Key (room_*, agent_*) | 从不 | OK |

只读不写——短信可以读微信的记忆和朋友圈来丰富 AI 回复，但绝对不会修改微信数据。反之亦然。

### 微信 AI 能读到什么

buildSystemPrompt 在每次 AI 回复时注入：

| 数据 | 条数 | 来源 |
|------|:--:|------|
| 微信聊天 | ~80 条 | callDeepSeek 上下文 |
| 短信消息 | 30 条 | _psmsAllContext（当前 Agent 当前房间） |
| 朋友圈 | 8 条 | Agent 级（含用户发的） |
| 日记 | 5 篇 | 同房间 |
| 记忆 | 全部 | 同房间 memoryStore |

### 短信 AI 能读到什么

psmsBuildWxContext 在短信回复前注入：

| 数据 | 条数 | 来源 |
|------|:--:|------|
| 短信消息 | 50 条 | 当前窗口 |
| 微信聊天 | 30 条 | 同房间 |
| 记忆 | 全部 | 同房间 |
| 日记 | 5 篇 | 同房间 |
| 朋友圈 | 5 条 | Agent 级（含用户发的） |

### 实现

微信读短信：psmsUpdateAllContext() 在每次短信消息变化时，把最近 30 条短信拼成字符串存到全局变量 _psmsAllContext。buildSystemPrompt() 构建提示词时追加。

短信读微信：psmsBuildWxContext() 在短信 AI 回复前被调用，读取同房间的 room_<aid>_<rid>（含聊天记录、记忆、日记）和 agent_<aid>_bles_moments（朋友圈），拼成上下文注入系统提示词。

---

## 29. 拖拽排序：加上又删掉

拖拽排序是桌面最"炫"的功能——按住图标 500ms -> 进入拖拽模式 -> 手指滑到目标位置 -> 松手交换。touchmove 里 preventDefault() 阻止页面滚动，elementFromPoint() 检测手指下方图标。

结果在移动端不灵。排查发现 touchmove 事件监听器没加 {passive: false}——移动端浏览器默认把 touchmove 设为 passive，preventDefault() 被静默忽略。加了之后好了，但用户说"没啥用，删了吧"。

于是 _addDrag() 整个函数删除，_dragMoved / _dragIdx / _dragEl 三个变量删除，onclick 里的 if(!_dragMoved) 判断删除。桌面图标回归纯点击打开。

教训：不是所有"看起来很酷"的功能都值得做。拖拽排序从实现到 debug 到删除，花的时间够修三个 bug。


---

## 30. 相机拍照：压缩 + 刷新相册

APK 里拍照一直有个问题：拍完照片，软件相册里看不到。排查 pcam() 发现两个原因：

**1. 没压缩。** 手机摄像头拍的照片动辄 5-10MB，base64 编码后更庞大，localStorage 5MB 限额直接爆仓，静默写入失败。

**2. 没刷新。** 拍照存完后调的是 pcloseApp()（关掉相机 App），而不是 prPhotos()（刷新相册界面）。照片确实存了——但相册 App 不知道有新照片，看不到。

修法：拍照后走和 paddPhoto 一样的压缩流程（Canvas 缩小到 400px + JPEG 0.5 质量），存完调 prPhotos() 刷新。不再 pcloseApp 直接关——拍完自动跳到相册，照片已经在里面了。

---

## 31. 五个独立小游戏

Phone App 的 + 菜单里已经有 14 个 AI 驱动的聊天游戏（猜数字、井字棋等）——本质是给 AI 发一段指令，在聊天框里玩。用户要的是"单独做 App，完全独立，不依赖 Phone"。

做了 5 个真正独立的 HTML/JS 小游戏：

| 游戏 | 类型 | 实现 |
|------|------|------|
| 2048 | 滑动 | 4x4 格子，键盘方向键 / 触摸滑动，合并数字 |
| 五子棋 | 策略 | 15x15 Canvas 棋盘，本地评分 AI 对战 |
| 猜数字 | 推理 | 1-100 二分查找，步数越少越好 |
| 石头剪刀布 | 对战 | 三局两胜，AI 随机出拳 |
| 21点 | 卡牌 | 经典扑克规则，要牌/停牌 vs 庄家 |

每个游戏是独立的 function pgameXXX()——创建全屏 overlay（z-index: 999999），自己画 UI，自己处理输入。不调 DeepSeek API，不依赖 Phone App 的任何状态。

### 五子棋 AI：本地评分算法

五子棋的 AI 不联网——在浏览器里跑评分算法。扫描每个空格，计算四个方向的连子模式并打分：活四/冲四 100000 分、活三 10000 分、活二 100 分、活一 1 分。同时算自己的进攻分 + 堵对手的防守分，选总分最高的位置落子。

15x15 棋盘，Canvas 绘制。AI 看一步——不是真正的博弈树搜索，是单步评估。这意味着你可以用"双杀"策略赢它：同时造两条活三，AI 只能堵一条。

### 游戏开发的三个坑

**坑 1：appendChild 顺序。** 五子棋的 render() 里要用 document.getElementById 获取 Canvas。但 render() 调用时 overlay 还没 appendChild 到 body——不在 DOM 树里，getElementById 返回 null，Canvas 永远画不出来。21点、猜拳都有同样的问题。修法：先 appendChild，再 render。

**坑 2：innerHTML 里的 JS 代码。** 猜拳的按钮最早用 onclick="window._pgRPSplay(0)"——把函数挂到 window 上，让 inline onclick 能调到。结果在部分浏览器里 window._pgRPSplay 死活不生效。最后改用 class="rps-btn" data-v="0" + addBtns() 函数统一 querySelectorAll 绑定——不用 inline 事件，不用全局变量。

**坑 3：游戏默认隐藏的持久化。** 五个游戏默认不在桌面显示——通过 pent_removed 列表控制。初始化时一个 IIFE 把 5 个游戏 ID 写入 pent_removed。但这个 IIFE 每次页面加载都执行——用户从商店下载游戏后刷新页面，IIFE 又把它加回去了。修法：加一个 pent_games_init 标记，只在首次运行时写入，之后尊重用户的选择。

---

## 32. 游戏商店化

游戏默认藏在商店里，不占用桌面空间。用户自己选择安装/卸载。

PAPPS 数组加了 5 个游戏条目，popenApp 加路由：pgame_ 前缀的 ID 不找 .pent-app div，直接调 popenGame()。游戏 App（paGames）桌面图标显示已安装的游戏列表，点开始直接玩。商店底部有"小游戏"分区，显示图标 + 名字 + 描述 + 安装/卸载按钮。

商店用纯 DOM 构建（createElement + appendChild），不走 innerHTML 拼接字符串——彻底避开 < 字符被浏览器误解析为 HTML 标签的问题。这个决定是血的教训换来的——之前 innerHTML 版因为字符串里 <PAPPS.length 被浏览器当标签解析，整个页面炸掉。更离谱的是有一次旧版 prStore 函数代码被错误插入到文件第一行（<!DOCTYPE html> 之前），浏览器直接把它当文本渲染，锁屏解锁时满屏 JS 代码。

---

## 33. 桌面翻页适配

桌面图标网格用 scroll-snap 分页（16 个/页）。之前页码指示器硬编码 2 个点——不管实际有几个页面。游戏隐藏后只有 16 个 App，全在一页上，第二页是空的。用户滑动过去了看到白屏，像"跳过内容跳到第三页"。

改成动态计算：Math.ceil(visibleApps / 16)，几个页面就几个点。一页满时只有一个点，滑动无效。

## 34. 总结

桌面系统主体 ~500 行 CSS + ~850 行 JS = ~1350 行。大部分时间没花在写代码上——花在调 CSS 图层冲突、变量名不一致、壁纸上传的七次尝试、时钟标签的事件绑定方式切换、锁屏状态变量的修复、PowerShell 正则误伤排查。

最大的教训：**在 9700 行的现有文件上加功能，改一个 CSS 属性能影响三处、改一个变量名能静默失败四个地方。** 备份文件救了很多次命——每次大改动前先 `cp` 一份，不行就回退。

现在这个 ~9830 行的 HTML 文件，打开是一个手机桌面——锁屏、图标、17 个 App（拍照、相册、文件、音乐、备忘录、日历、时钟、计算器、天气、电话、短信、地图、商店、设置、通知、Phone、小游戏）、通知、壁纸。点 Phone 图标进入完整 AI 聊天应用。双击就用，零依赖。

整个开发过程最深的感受：**在已有的复杂代码上做增量，最大的成本不是写新代码，而是弄清楚旧代码的每一行在干什么。** 备份-修改-验证-回退的循环跑了不下十次，每次回退都学到一点东西——CSS 简写和分离属性的优先级、`!important` 对 inline style 的覆盖、文本节点的 `.closest()` 陷阱、IndexedDB 存大文件比 localStorage 靠谱得多、PowerShell 正则不要往混合 HTML/JS 的大文件里瞎怼。

---

*下一篇：文件系统的进一步优化——IndexedDB 直接存 Blob 而非 base64，以及让桌面短信变身真正的聊天 App。*

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

## 总结

桌面系统主体 ~500 行 CSS + ~600 行 JS = ~1100 行。大部分时间没花在写代码上——花在调 CSS 图层冲突、变量名不一致、壁纸上传的七次尝试、时钟标签的事件绑定方式切换。

最大的教训：**在 9600 行的现有文件上加功能，改一个 CSS 属性能影响三处、改一个变量名能静默失败四个地方。** 备份文件救了很多次命——每次大改动前先 `cp` 一份，不行就回退。

现在这个 9800 行的 HTML 文件，打开是一个手机桌面——锁屏、图标、App、通知、壁纸。点 Phone 图标进入完整 AI 聊天应用。双击就用，零依赖。

---

*下一篇：短信系统升级——让桌面短信变身真正的聊天 App。*

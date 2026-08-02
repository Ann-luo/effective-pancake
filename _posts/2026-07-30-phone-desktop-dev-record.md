# 给 HTML 加个手机桌面：一个 AI 聊天应用的"操作系统化"尝试

> 2026-07-30 · 纯前端 · 单文件 · 手机桌面模拟器

---


## 目录

2. [架构设计：图层，不是页面](#ch2)
3. [锁屏：点击解锁，深蓝渐变](#ch3)
4. [桌面：图标网格 + 底部 Dock](#ch4)
5. [踩坑：CSS 冲突，微信黑屏](#ch5)
6. [14 个 App 逐个实现](#ch6)
7. [通知系统](#ch7)
8. [壁纸：七次尝试](#ch8)
9. [数据隔离：三个数据库互不干扰](#ch9)
10. [锁屏系统的三次返工](#ch10)
11. [壁纸升级：Canvas 压缩 + 变量统一](#ch11)
12. [导航栏：加上又删掉](#ch12)
13. [文件管理：从 localStorage 到 IndexedDB](#ch13)
14. [通知中心独立为桌面 App](#ch14)
15. [音乐 App：从占位符到多平台播放器](#ch15)
16. [锁屏与微信锁的协同](#ch16)
17. [CSS 清理：重复规则与黑色背景](#ch17)
18. [PowerShell 正则的"误伤"事件](#ch18)
19. [闹钟：从小通知到全屏弹窗](#ch19)
20. [天气：每日随机生成](#ch20)
21. [短信：从 prompt() 到内联输入框](#ch21)
22. [应用管理：拖拽排序保留，删除移到商店](#ch22)
23. [壁纸存储：双保险](#ch23)
24. [通知：清全部 + 单独删](#ch24)
25. [文件导出（未完成）](#ch25)
26. [相册和文件管理的"失而复得"](#ch26)
27. [短信 App 重构：AI 主动发信 + 仿微信聊天](#ch27)
28. [数据互通：短信 <-> 微信四区共享](#ch28)
29. [拖拽排序：加上又删掉](#ch29)
30. [相机拍照：压缩 + 刷新相册](#ch30)
31. [五个独立小游戏](#ch31)
32. [游戏商店化](#ch32)
33. [桌面翻页适配](#ch33)
34. [查手机 App：AI 帮你检查手机里的所有数据](#ch34)
35. [统一 API 层：重试 + 错误 Toast](#ch35)
36. [桌面图标角标](#ch36)
37. [桌面主题切换](#ch37)
38. [一键备份恢复](#ch38)
39. [桌面小组件](#ch39)
40. [欢迎弹窗的 z-index 之谜](#ch40)
41. [真实天气：wttr.in](#ch41)
42. [关键发现：你的 APK 是 HTML5+ 打包的](#ch42)
43. [相册与文件的导出之路](#ch43)
44. [聊天统计](#ch44)
45. [桌面便签与小组件](#ch45)
46. [自由移动：一场拖拽的苦战](#ch46)
47. [文件夹：点选式的胜利](#ch47)
48. [桌面小组件扩充](#ch48)
49. [全局搜索](#ch49)
50. [贪吃蛇与扫雷](#ch50)
51. [钱包：签到 + 成就 + 积分](#ch51)
52. [全局搜索：从无结果到可用](#ch52)
53. [桌面布局重构：小组件嵌进分页](#ch53)
54. [日历备注：从圆点到文字](#ch54)
55. [贪吃蛇方向控制的苦战](#ch55)
56. [扫雷标旗：从长按到模式按钮](#ch56)
57. [游戏代码插入位置的教训](#ch57)
58. [积分用途：解锁隐藏主题](#ch58)
59. [总结](#ch59)


---


---

<h2 id="ch2">2. 架构设计：图层，不是页面</h2>
{: #ch2}

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

<h2 id="ch3">3. 锁屏：点击解锁，深蓝渐变</h2>
{: #ch3}

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

<h2 id="ch4">4. 桌面：图标网格 + 底部 Dock</h2>
{: #ch4}

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

<h2 id="ch5">5. 踩坑：CSS 冲突，微信黑屏</h2>
{: #ch5}

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

<h2 id="ch6">6. 14 个 App 逐个实现</h2>
{: #ch6}

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

<h2 id="ch7">7. 通知系统</h2>
{: #ch7}

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

<h2 id="ch8">8. 壁纸：七次尝试</h2>
{: #ch8}

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

<h2 id="ch9">9. 数据隔离：三个数据库互不干扰</h2>
{: #ch9}

布雷斯、Phone、p-ent-phone 三个项目用同一个浏览器打开时，数据不能串。

| 项目 | IndexedDB | localStorage 前缀 |
|------|-----------|------------------|
| 布雷斯 | `bles_db_v1` | `bles_*` |
| Phone | `phone_db_v1` | `phone_*` |
| p-ent-phone | `pent_db_v1` | `pent_*` |

p-ent-phone 内嵌的 Phone App 走 `phone_db_v1`，桌面系统数据走 `pent_*` localStorage keys。同一页面两个数据库同时在跑，井水不犯河水。

---

<h2 id="ch10">10. 锁屏系统的三次返工</h2>
{: #ch10}

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

<h2 id="ch11">11. 壁纸升级：Canvas 压缩 + 变量统一</h2>
{: #ch11}

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

<h2 id="ch12">12. 导航栏：加上又删掉</h2>
{: #ch12}

为了让用户在各 App 之间方便切换，加了一个底部导航栏——三个按钮：▷ 返回、○ 桌面、▢ 通知。`position: fixed; bottom: 0`，`backdrop-filter: blur(12px)` 毛玻璃效果。

做完之后用户说"太碍事了"。所有 App 页面本身已经有顶部 `‹` 返回按钮，左上角也有 🏠 主场键。底部再加三个按钮纯属多余——遮挡内容、占用空间。

于是又全删。CSS、HTML、JS 引用全部清理干净。**加功能之前先想清楚是不是真的需要**——这是反复踩坑后的反思。

---

<h2 id="ch13">13. 文件管理：从 localStorage 到 IndexedDB</h2>
{: #ch13}

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

<h2 id="ch14">14. 通知中心独立为桌面 App</h2>
{: #ch14}

原本的通知中心只能通过屏幕顶部下滑手势触发（`touchmove` 监听），桌面端鼠标没法下滑。改成了独立的桌面 App——🔔 图标，点进去看所有历史通知。

改动很小：`PAPPS` 数组加一个 `{id:'paNotify', icon:'🔔', label:'通知'}`，`popenApp` 加一个分支调用 `prNotify()`，再加一个 `<div class="pent-app" id="paNotify">` 面板。`prNotify()` 直接从全局 `_pnotifs` 数组渲染列表——和通知横幅共享同一份数据。

这样桌面端和手机端都能方便查看通知，不用记"下滑"这个隐藏手势。

---

<h2 id="ch15">15. 音乐 App：从占位符到多平台播放器</h2>
{: #ch15}

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

<h2 id="ch16">16. 锁屏与微信锁的协同</h2>
{: #ch16}

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

<h2 id="ch17">17. CSS 清理：重复规则与黑色背景</h2>
{: #ch17}

### 重复的 .pent-ls 规则块

不知道哪次合并代码时，`.pent-ls` 完整定义出现了两次——含 `!important` 版本和不含的版本，连子规则 `.pls-time`、`.pls-date`、`.pls-hint` 和 `@keyframes plsPulse` 都重复了一遍。虽然没造成视觉 bug（两个版本属性完全一致），但让 CSS 凭空多了 15 行垃圾。

### 桌面默认黑屏

`.pent-dt` 的 CSS 默认背景是 `background-color: #000`（纯黑）。当用户没设壁纸时，桌面显示黑色而非蓝色渐变——和锁屏的深蓝完全不搭。

修复：CSS 默认值从 `background-color: #000` 改为 `background: linear-gradient(180deg, #1a1a2e, #16213e, #0f3460)`——和锁屏一模一样的渐变。设了壁纸后 inline style 会覆盖 CSS，一切正常。

---

<h2 id="ch18">18. PowerShell 正则的"误伤"事件</h2>
{: #ch18}

用 PowerShell 给文件加 pnavbar 时，写了个 `(?=</body>)` 正则往前插 HTML。结果这个正则在聊天记录导出功能的 JS 代码里也匹配到了——那段代码拼了个 `fullHtml = '<!DOCTYPE html>...' + innerHTML + '</body></html>'` 字符串。

pnavbar 的 `<div>` 被直接塞进了那个单引号字符串内部，活生生把 JS 语法炸了。`new Function()` 检测到 "Invalid or unexpected token"，整个页面的 JS 不执行——黑屏。

教训：**在混合 HTML 和 JS 的大文件里用正则做全局替换极其危险。** 字符串里随时可能出现和 HTML 一模一样的片段。应该用更精确的定位方式，或者至少替换完后做一次完整的语法检查。

---

<h2 id="ch19">19. 闹钟：从小通知到全屏弹窗</h2>
{: #ch19}

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

<h2 id="ch20">20. 天气：每日随机生成</h2>
{: #ch20}

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

<h2 id="ch21">21. 短信：从 prompt() 到内联输入框</h2>
{: #ch21}

最初的短信输入用的是 `prompt('短信内容:')`——浏览器原生弹窗，在手机端体验很差：键盘可能遮挡、不能换行、和页面风格割裂。

改成和备忘录一样的**内联输入框 + 发送按钮**：

```html
<input id="psmsInp" placeholder="输入短信内容…">
<button onclick="paddSMS()">发送</button>
```

删除了 `paddSMS()` 里的 `prompt()`，改为读 `document.getElementById('psmsInp').value`。每条短信带时间戳和删除按钮。

---

<h2 id="ch22">22. 应用管理：拖拽排序保留，删除移到商店</h2>
{: #ch22}

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

<h2 id="ch23">23. 壁纸存储：双保险</h2>
{: #ch23}

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

<h2 id="ch24">24. 通知：清全部 + 单独删</h2>
{: #ch24}

通知系统最初只有"下滑查看"和"3 秒自动消失"，无法主动清理。用户问"通知界面能不能清除通知？"

加了三个操作：

- **通知中心顶部"清除全部"按钮** → `pclearNotifs()` 直接清空 `_pnotifs` 数组
- **每条通知右侧 ✕** → `pdelNotif(i)` 删单条 → 但这里有个坑：点击 ✕ 事件冒泡到通知中心遮罩的 `onclick="if(event.target===this)phideNC()"`，导致通知面板在删除后立刻关闭。修法是 ✕ 的 onclick 加上 `event.stopPropagation()`
- **通知 App（paNotify）底部"清除全部通知"按钮** → 和通知中心同一个 `pclearNotifs()`

---

<h2 id="ch25">25. 文件导出（未完成）</h2>
{: #ch25}

文件预览器里加过下载按钮，试图做微信同款的文件导出：调用 `navigator.share()` 弹系统分享面板，分享失败降级到 `<a download>`。但 APK 的 WebView 中 `navigator.share` 不可用，`<a>` 的 `click()` 虽然 append 了 DOM 但在部分 WebView 里仍然不触发下载——因为没有原生 DownloadListener 接管。

反复试了 `window.open(blobUrl)`、`fetch` 转 blob 再分享、底部弹面板等好几个方案，始终无法在 APK 里稳定导出文件。最终决定暂时砍掉下载功能——文件管理器回归纯预览：在线看图、播音频视频、读文本，不导出。Web 环境写文件系统的硬限制摆在那里，与其给用户半成品，不如不做。

---

<h2 id="ch26">26. 相册和文件管理的"失而复得"</h2>
{: #ch26}

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

<h2 id="ch27">27. 短信 App 重构：AI 主动发信 + 仿微信聊天</h2>
{: #ch27}

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

<h2 id="ch28">28. 数据互通：短信 <-> 微信四区共享</h2>
{: #ch28}

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

<h2 id="ch29">29. 拖拽排序：加上又删掉</h2>
{: #ch29}

拖拽排序是桌面最"炫"的功能——按住图标 500ms -> 进入拖拽模式 -> 手指滑到目标位置 -> 松手交换。touchmove 里 preventDefault() 阻止页面滚动，elementFromPoint() 检测手指下方图标。

结果在移动端不灵。排查发现 touchmove 事件监听器没加 {passive: false}——移动端浏览器默认把 touchmove 设为 passive，preventDefault() 被静默忽略。加了之后好了，但用户说"没啥用，删了吧"。

于是 _addDrag() 整个函数删除，_dragMoved / _dragIdx / _dragEl 三个变量删除，onclick 里的 if(!_dragMoved) 判断删除。桌面图标回归纯点击打开。

教训：不是所有"看起来很酷"的功能都值得做。拖拽排序从实现到 debug 到删除，花的时间够修三个 bug。


---

<h2 id="ch30">30. 相机拍照：压缩 + 刷新相册</h2>
{: #ch30}

APK 里拍照一直有个问题：拍完照片，软件相册里看不到。排查 pcam() 发现两个原因：

**1. 没压缩。** 手机摄像头拍的照片动辄 5-10MB，base64 编码后更庞大，localStorage 5MB 限额直接爆仓，静默写入失败。

**2. 没刷新。** 拍照存完后调的是 pcloseApp()（关掉相机 App），而不是 prPhotos()（刷新相册界面）。照片确实存了——但相册 App 不知道有新照片，看不到。

修法：拍照后走和 paddPhoto 一样的压缩流程（Canvas 缩小到 400px + JPEG 0.5 质量），存完调 prPhotos() 刷新。不再 pcloseApp 直接关——拍完自动跳到相册，照片已经在里面了。

---

<h2 id="ch31">31. 五个独立小游戏</h2>
{: #ch31}

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

<h2 id="ch32">32. 游戏商店化</h2>
{: #ch32}

游戏默认藏在商店里，不占用桌面空间。用户自己选择安装/卸载。

PAPPS 数组加了 5 个游戏条目，popenApp 加路由：pgame_ 前缀的 ID 不找 .pent-app div，直接调 popenGame()。游戏 App（paGames）桌面图标显示已安装的游戏列表，点开始直接玩。商店底部有"小游戏"分区，显示图标 + 名字 + 描述 + 安装/卸载按钮。

商店用纯 DOM 构建（createElement + appendChild），不走 innerHTML 拼接字符串——彻底避开 < 字符被浏览器误解析为 HTML 标签的问题。这个决定是血的教训换来的——之前 innerHTML 版因为字符串里 <PAPPS.length 被浏览器当标签解析，整个页面炸掉。更离谱的是有一次旧版 prStore 函数代码被错误插入到文件第一行（<!DOCTYPE html> 之前），浏览器直接把它当文本渲染，锁屏解锁时满屏 JS 代码。

---

<h2 id="ch33">33. 桌面翻页适配</h2>
{: #ch33}

桌面图标网格用 scroll-snap 分页（16 个/页）。之前页码指示器硬编码 2 个点——不管实际有几个页面。游戏隐藏后只有 16 个 App，全在一页上，第二页是空的。用户滑动过去了看到白屏，像"跳过内容跳到第三页"。

改成动态计算：Math.ceil(visibleApps / 16)，几个页面就几个点。一页满时只有一个点，滑动无效。


<h2 id="ch34">34. 查手机 App：AI 帮你检查手机里的所有数据</h2>
{: #ch34}

### 一个手机管家的诞生

短信、朋友圈、日记、相册、文件、待办、闹钟——数据散落在 17 个 App 里。没有一个地方能一眼看到手机里现在发生了什么。让 AI 帮忙查手机——不止是数据汇总，而是让 AI 用角色的人格来分析。布雷斯查手机会吐槽"你有 2 个待办拖了好几天了！"，小猫查手机就是"喵~你照片好多哦"。

### 数据收集

核心是 pchkCollect(aid, rid)——遍历所有模块收集数据，拼接成自然语言文本注入 AI 系统提示词：

- 各 Agent 的消息总数和比例（用户 vs AI）
- 当前房间的全部记忆、最近 5 条微信聊天 + 5 条短信
- 最近 3 篇日记 + 3 条朋友圈、待办数量
- Agent 当前心情、相册/文件/音乐数量

### App 设计

桌面 App paCheck，顶部有 Agent 选择器和房间选择器。点开始检查 -> 收集数据 -> 显示明细 -> 调 DeepSeek -> AI 用选定 Agent 的性格给出分析。

结果同时写三处：查手机 App 内显示、Phone 微信聊天里追加一条消息、顶部弹一条通知。

Phone 同步是最折腾的部分——查手机时 Phone App 通常是隐藏的，DOM 不在可见区域。试了 IDB 直接写、saveRoomData、appendMessageRow 好几个方案，最终稳定方案是messages.push() + appendMessageRow() + saveRoomData() 三件套。

### 定时自动检查

挂到现有心跳，可选自动模式。默认关闭，需进设置手动开。间隔 60 分钟起步（60/120/240/480），有免打扰时段。

和手动检查共用一把 _pchkRunning 互斥锁。lastCheck 首次初始化为当前时间，避免一开就触发。

上次翻车就是因为 lastCheck 初始为 0，开关逻辑反转，_pchkRunning 锁被误删——全是小 bug，修掉就稳了。

### 用 Agent 的性格说话

系统提示词注入 Agent 的 personaTemplate——不是冰冷的汇报，是以 Agent 身份来分析。想吐槽就吐槽，想关心就关心。

---

<h2 id="ch35">35. 统一 API 层：重试 + 错误 Toast</h2>
{: #ch35}

### 为什么要做

查手机、短信、朋友圈、日记……一共 8 处直接调 DeepSeek API。每处都自己写 fetch，错误处理五花八门——有的返回离线回复、有的直接断掉、有的静默失败。用户问了一个很实在的问题："Key 错了能不能明确提示？网络抖动能不能重试？"

### 设计方案

不做大重构，加一个统一 API 层，让现有调用点逐步接入：

- papiFetch() —— 单次非流式请求，返回 {ok, status, data}
- papiStream() —— 单次流式请求，onChunk 回调
- papiRetry() —— 带重试的包装（3 次，1s/3s/8s 退避）
- papiErrorToast() —— 错误分类提示

```javascript
// 核心：错误分类
function papiErrorToast(status) {
  if (status === 401 || status === 403) {
    // Key 无效 → 红 Toast，10 秒内不重复弹
    return 'key';
  }
  if (status === 429) { return 'busy'; }
  return 'default';
}

// 重试循环
async function papiRetry(messages, opts) {
  var delays = [1000, 3000, 8000];
  for (var attempt = 0; attempt <= 3; attempt++) {
    var r = await papiFetch(messages, opts);
    if (r.ok) return r;
    if (r.status === 401 || r.status === 403 || r.status === 429) return r;
    await new Promise(function(res){ setTimeout(res, delays[attempt]); });
  }
  return r;
}
```

### Bug：两个 return 之间缺分号

写完跑语法检查，报 "Unexpected token 'return'"。定位半天发现：

```javascript
if (e.name === 'AbortError') return {...aborted:true} return {...error:e}
//                                   ^ 这里缺分号，第二个 return 变成语法错误
```

修法：if 块用大括号包住。

### 效果

- Key 错误 → 红 Toast"🔑 API Key 无效"，不再假装网络问题
- 429 限流 → "⏳ 请求太频繁"
- 网络抖动 → 3 次重试后还失败才报错
- 查手机的定时检查已接入 papiRetry，短信主动发信保持流式不走重试（流式重试容易重复输出）
---

<h2 id="ch36">36. 桌面图标角标</h2>
{: #ch36}

### 需求

短信、通知有未读时，用户不点进去根本不知道。要像真手机一样在图标右上角显示红点数字。

### 数据来源

- 通知角标 = _pnotifs 数组长度（未清除的通知数）
- 短信角标 = 统计所有 Agent × 房间短信里 role==='ai' 且 time > 上次打开时间的条数

### 已读时间戳

短信"已读"需要一个基准时间。用一个 localStorage key 记录上次打开短信的时刻：

```javascript
function pmarkSMSRead() {
  localStorage.setItem('pent_sms_lastread', String(Date.now()));
  pupdateBadges();
}
function pupdateBadges() {
  // 遍历所有 Agent 所有房间的短信
  // 统计 ai 消息且 time > lastread 的条数
  // 写入 #badge_paMessages 红点
}
```

打开短信列表或任意聊天窗口都调 pmarkSMSRead()，角标清零。

### CSS 红点

```css
.papp-badge{
  position:absolute;top:-4px;right:-4px;
  min-width:18px;height:18px;border-radius:9px;
  background:#ff3b30;color:#fff;font-size:11px;
  display:flex;align-items:center;justify-content:center;
}
```

.papp-img 加 position:relative，红点定位到右上角。

### Bug：清空通知后角标变回 1

pclearNotifs() 清空 _pnotifs 后调 pnotify({title:'通知已清除'})——又 push 了一条新通知，角标立刻显示 1。用户刚清完看到红点还在，很困惑。

修法：给 pnotify 加 silent 选项，清除通知这种"系统消息"不更新角标。

```javascript
if (o.silent !== true) pupdateBadges();
pnotify({title:'通知已清除', icon:'✅', silent:true});
```
---

<h2 id="ch37">37. 桌面主题切换</h2>
{: #ch37}

### 需求

桌面一直是固定深蓝渐变。用户想要几套预设一键切——深蓝/暗黑/浅色。

### 实现

不重写 CSS 变量系统（风险大），只切桌面背景渐变 + 图标文字颜色：

```javascript
var pTHEMES = {
  blue:  'linear-gradient(180deg,#1a1a2e,#16213e,#0f3460)',
  dark:  'linear-gradient(180deg,#0d0d0d,#161616,#222)',
  light: 'linear-gradient(180deg,#e9edf2,#d9dfe6,#c6cfd9)',
};
function psetTheme(name) {
  localStorage.setItem('pent_theme', name);
  _pdt.style.background = pTHEMES[name] + ' center/cover';
  var dark = name === 'light';
  // 浅色时图标文字变深，否则白色看不清
  document.querySelectorAll('.pdt-page .papp-label, .pdock .papp-label')
    .forEach(el => el.style.color = dark ? '#333' : '#fff');
}
```

### 和壁纸的优先级

主题和壁纸是两套东西。加载时：有壁纸用壁纸，没壁纸用主题。

```javascript
var _pw = localStorage.getItem('pent_wp');
if (_pw) _pdt.style.background = 'url(...)';
if (!_pw) papplyTheme();
```

恢复默认壁纸（presetWP）时也调 papplyTheme，这样"恢复壁纸"回到的是当前主题而不是硬编码深蓝。

### 设置 UI

设置 App 里加三行：🌌 深蓝 / 🖤 暗黑 / ☀️ 浅色，当前主题打 ✓。
---

<h2 id="ch38">38. 一键备份恢复</h2>
{: #ch38}

### 需求

数据全在 IndexedDB 和 localStorage，但用户无法迁移——换手机、重装 APK 数据全丢。要一键导出全部数据为 JSON，换设备导入。

### 导出逻辑

```javascript
async function pbackup() {
  var data = { v:1, ls:{}, idb:{}, t:Date.now() };
  // 1. 遍历 localStorage，收集所有 pent_ 开头的 key
  // 2. 打开 pent_db_v1，getAll() 收集全部记录
  // 3. JSON.stringify 打包
}
```

包含：所有 Agent 的聊天记录（room_*）、朋友圈、记忆、短信、照片、文件、音乐——全部。

### 导入逻辑

读回 JSON → localStorage.setItem 恢复 → idbPut 恢复 → 提示刷新生效。

```javascript
for (var k in data.ls) { localStorage.setItem(k, data.ls[k]); }
for (var idbk in data.idb) { await idbPut(idbk, data.idb[idbk]); }
```

### 踩的坑：下载失败

导出后要下载 JSON 文件。第一版用 <a download> blob——浏览器正常，但 APK 里静默失败（WebView 没配 DownloadListener）。

第二版试 navigator.share——APK 里根本不存在这个 API，还是不弹。

折腾半天发现项目里有个 saveFileToDevice 函数，Phone 导出记忆、导出聊天、导出待办全用它，一直能用！它内部判断：

```javascript
if (_isApp && plus.io) {
  // HTML5+ 环境：plus.io 写 _doc/ + plus.share.sendWithSystem 弹分享面板
} else {
  // 浏览器：<a download>
}
```

关键发现：这个 APK 是 HTML5+（HBuilder）打包的，不是普通 WebView！项目里有 plus 全局对象，能调原生能力。我一开始用错 API（navigator.share），绕过了本来就该用的 saveFileToDevice。

修法：备份导出的"保存"按钮直接调 saveFileToDevice，和 Phone 导出一模一样。
---

<h2 id="ch39">39. 桌面小组件</h2>
{: #ch39}

### 需求

用户不想点进 App 才能看时间和天气——要像真手机桌面一样，时钟和天气直接显示在桌面上。

### 布局

桌面顶部加一行小组件栏：

```html
<div class="pdt-widgets">
  <div class="pdt-w-clock"><span id="pdtwtime">--:--</span><span id="pdtwdate"></span></div>
  <div class="pdt-w-weather" onclick="popenApp('paWeather')"></div>
</div>
```

时钟组件 30 秒刷新，天气组件点一下跳进天气 App。

### 复用天气逻辑

原来 prWeather 里生成天气的代码直接重构成 pgetWeather() 返回对象，小组件和 App 共用：

```javascript
function pgetWeather() {
  // 返回 {icon, type, high, low, fh}
}
function prWeather() { var w = pgetWeather(); ... }
function pdtUpdateWidgets() { var w = pgetWeather(); ... }
```

一处生成，两处使用，避免天气不一致。

### CSS

半透明毛玻璃卡片（backdrop-filter: blur），和桌面深蓝背景融合。时钟 28px 细体数字，天气显示图标 + 温度。
---

<h2 id="ch40">40. 欢迎弹窗的 z-index 之谜</h2>
{: #ch40}

### 症状

"👋 欢迎使用"弹窗不出现了，只在通知中心里能找到——横幅根本不显示。

### 排查

1. 通知确实进了 _pnotifs（通知中心能看到），说明 pnotify 被调用了
2. 但横幅 .pent-nb 不显示

看 CSS：

```css
.pent-nb { z-index: 6000; }      /* 通知横幅 */
.pent-ls { z-index: 999999; }    /* 锁屏 */
```

锁屏 999999 完全盖住了横幅 6000。欢迎弹窗在锁屏时触发，横幅被锁屏挡在下面。

而且逻辑还有个条件 if(!_plsLocked)——要求已解锁才弹。初始锁屏时 _plsLocked=true，2 秒后没解锁就永远不弹。

### 修复

1. 横幅 z-index 从 6000 提到 9999999（比锁屏高，锁屏也能看通知——和真手机一致）
2. 去掉 if(!_plsLocked) 条件，欢迎弹窗总是显示

```css
.pent-nb { z-index: 9999999; }
```

修完锁屏时也能看到通知横幅弹出了。
---

<h2 id="ch41">41. 真实天气：wttr.in</h2>
{: #ch41}

### 需求

随机生成的天气毕竟是假的。用户想要"联网获取真实天气"，但保留随机作为默认。

### 方案

保留随机生成 + 天气 App 里加一个"🌐 联网获取真实天气"按钮。

用 wttr.in 免费 API——无 key、按 IP 自动定位城市、浏览器和 APK 都通用、不申请任何系统权限：

```javascript
var resp = await fetch('https://wttr.in/?format=j1&lang=zh',
  { signal: AbortSignal.timeout(8000) });
var data = await resp.json();
var cur = data.current_condition[0];   // 实时温度、体感
var loc = data.nearest_area[0];         // 城市名
var days = data.weather.slice(0, 3);    // 今天/明天/后天预报
```

### 天气代码映射

wttr.in 返回天气代码（weatherCode），要映射成 emoji：

```javascript
function pwxIcon(code) {
  var m = { 113:'☀️', 116:'⛅', 119:'☁️', 176:'🌧️', 200:'⛈️', 227:'🌨️' };
  return m[code] || '🌤️';
}
```

### 失败兜底

8 秒超时 + try/catch，失败提示"请检查网络后重试"，不崩溃。获取成功后有"🔄 返回随机天气"按钮切回去。
---

<h2 id="ch42">42. 关键发现：你的 APK 是 HTML5+ 打包的</h2>
{: #ch42}

### 为什么备份导出折腾了那么久

用户反复说"微信导出可以，我的备份为什么不行"。追查发现根因是我用错了 API：

| 我用的 | 实际该用的 |
|--------|-----------|
| navigator.share（Web API） | plus.share.sendWithSystem（HTML5+ 原生） |
| <a download>（需要 DownloadListener） | plus.io 写 _doc/（直接写 App 目录） |

项目里一直有个 saveFileToDevice 函数，Phone 的导出记忆、导出聊天、导出待办全用它，在 APK 里一直能用。它内部：

```javascript
if (_isApp && typeof plus !== 'undefined' && plus.io) {
  // HTML5+ 环境：plus.io 写文件 + plus.share.sendWithSystem 弹分享
  return true;
}
// 浏览器：<a download>
```

### 大白话解释

这个 APK 不是普通的"网页套壳"，而是用 HBuilder（HTML5+）打包的。HBuilder 打包时会往网页里塞一个 plus 对象——它是网页和手机系统之间的翻译官，让网页能调写文件、分享面板等原生能力。

微信导出能用，是因为它调 Android 原生分享 Intent；我的备份一开始用网页通用 API（navigator.share），这个 APK 的 WebView 不支持——不是代码问题，是 API 选错了。

### 教训

在 HBuilder 打包的项目里做文件操作，优先找项目里已有的 plus 封装函数（saveFileToDevice），而不是自己发明网页 API 方案。项目里能用的东西一直在那儿，只是我没先翻代码。

### 换打包方式的后果

| 打包方式 | plus 对象 | 备份/导出 |
|---------|-----------|-----------|
| HBuilder (HTML5+) | 有 | ✅ 完美 |
| 普通 WebView 套壳 | 无 | ⚠️ 退回 <a download> |
| 浏览器 | 无 | ✅ 下载正常 |

所以代码里做了双保险：有 plus 走 plus，没 plus 退回浏览器下载——两套都能跑。
---

<h2 id="ch43">43. 相册与文件的导出之路</h2>
{: #ch43}

### 需求

用户问：相册和文件管理系统能不能也做个导出功能，走 saveFileToDevice 那套？浏览器和 APK 一套方案。

### 相册导出

顶部加"📤 导出相册"按钮 → 生成 HTML 相册（所有照片 base64 内嵌，双列瀑布流）→ saveFileToDevice。

每张照片下方加"⬇ 下载原图"链接——APK 里触发 plus 下载，浏览器里下载。

```javascript
async function pexportAlbum() {
  var a = await idbGet('pent_photos') || [];
  var h = '<!DOCTYPE html>...' + a.length + '张</div>';
  for (var i = 0; i < a.length; i++) {
    h += '<img src="' + a[i].d + '"><a href="' + a[i].d +
         '" download="photo_' + (i+1) + '.jpg">⬇ 下载原图</a>';
  }
  saveFileToDevice('相册_日期.html', h, 'text/html;charset=utf-8');
}
```

### 文件导出

文件查看器右上角加"📤"按钮。踩了个坑：直接 saveFileToDevice(f.data) 导出的是 data URL 文本（data:image/png;base64,... 这串字），不是真实文件。

智能处理：

- 文本类（txt/md/json/csv 等）→ atob 解码 base64 → 导出原文
- 二进制（图片/音视频/PDF）→ 生成 HTML 展示页（能直接看/播 + 内含"⬇ 下载原文件"链接）

```javascript
if (/.(txt|md|log|json|xml|html|css|js|csv)$/i.test(name)) {
  var txt = decodeURIComponent(escape(atob(b64)));  // 导出原文
} else {
  // 生成 HTML：图片直接显示/音频播放/视频播放/PDF内嵌
  // + <a href="dataUrl" download>⬇ 下载原文件</a>
}
```

### 统一方案

相册、文件、备份三处全部走 saveFileToDevice——一个函数，APK 走 plus，浏览器走下载，一套代码两端适配。
---

<h2 id="ch44">44. 聊天统计</h2>
{: #ch44}

### 需求

数据散落在各 App 里，没有一个地方能一眼看到"聊天情况怎么样"。查手机 App 已经有数据收集能力，顺手加个统计面板——纯前端算数字，不调 API。

### 实现

查手机 App 头部加 📈 按钮 → 打开统计面板。纯遍历 IndexedDB 算统计：

```javascript
async function pchkStats() {
  // 遍历所有 Agent × 房间的 room_ 数据
  // 统计：总消息数、今日消息、查手机次数、短信条数
  // 各 Agent 的主动发送次数排行
  // 用户 vs AI 消息占比条
}
```

### 统计项

- 4 个数字卡片：总消息数 / 今日消息 / 查手机次数 / 短信条数
- AI 主动发送排行（各 Agent 含 📊 消息的条数排序）
- 用户 vs AI 占比条（绿色用户 / 蓝色 AI）

和查手机的 pchkCollect 共用同一套 IndexedDB 遍历逻辑，改动小。
---

<h2 id="ch45">45. 桌面便签与小组件</h2>
{: #ch45}

### 桌面便签

需求：不想点进备忘录才能看便签，要直接贴在桌面上。

桌面小组件栏下面加一条全宽便签条，点击 prompt 输入，存 localStorage `pent_note`，刷新后显示。

```javascript
function pnoteLoad() {
  var n = localStorage.getItem('pent_note');
  document.getElementById('pdtnotetext').textContent = n || '点击添加便签';
}
function pnoteEdit() {
  var v = prompt('桌面便签：', localStorage.getItem('pent_note') || '');
  if (v === null) return;
  if (v.trim()) localStorage.setItem('pent_note', v.trim());
  else localStorage.removeItem('pent_note');
  pnoteLoad();
}
```

### 小组件固定第一页

最开始做小组件时把时钟、天气、便签做成了三个并排的卡片，想支持拖动换位。用户测试后明确说：**小组件固定第一页，不需要移动**。

于是删掉小组件拖拽 + 锁定逻辑，小组件固定在桌面顶部第一页。这个"删功能"的决策反而让桌面更稳定——功能不是越多越好。
---

<h2 id="ch46">46. 自由移动：一场拖拽的苦战</h2>
{: #ch46}

### 需求

用户要"软件可以跟随鼠标移动，自由拖动换位置"。听起来简单，实际是这次开发最折腾的部分，前前后后修了五六轮。

### 第一轮：交换能用了，但图标不跟手

最早只有"交换"——拖 A 到 B 上，两个图标互换位置。能用了，但拖动时图标不动，用户看不到拖到哪。

### 第二轮：空位插入

用户进一步要"拖到空白处固定"。于是加空位插入逻辑：`elementFromPoint` 找鼠标下的图标，找不到就当空白，算插入位置。

结果**空位插入永远不触发**——因为桌面图标 grid 排列，gap 才 12px，鼠标在"看起来空白"的地方，`elementFromPoint` 还是落在某个图标上（图标有 pointer-events），dragOver 永远有值，永远走交换分支。

### 第三轮：拖动跟手 + 踩出新坑

为了让图标跟手，拖动时 `position:fixed` 跟随鼠标。结果又引入新 bug：**图标盖在鼠标上，`elementFromPoint` 永远返回图标自己**。

- 小组件交换：检测到自己 → dragOver 永远 null → 不交换
- App 空位：最近图标算到自己 → 插回原位 → "无法固定新位置"

修复：拖动时加 `pointer-events:none` 穿透 + 空位计算排除自身。

### 第四轮：重复绑定

排查中还发现 `pdtSetupDrag` 在每次 `prenderDT` 重渲染后重复调用，document 级事件监听器累积绑定。加 `_pdtDragBound` 标志只绑一次。

### 最终决策：放弃空位，只保留交换

折腾多轮后，用户说"不能移动到空白处无所谓"。于是砍掉空位插入，只保留：

- 拖动跟手（fixed 跟随）
- 拖到另一个图标上 → 交换
- 拖到空白 → 弹回原位

### 诊断经验

盲改多轮无效后，加了调试弹窗（🐛 显示 dragOver=xxx、before=数字），让用户告诉我实际跑到哪一步，才定位到 elementFromPoint 自己挡自己的问题。**遇到搞不清的 bug，先加诊断让用户反馈，比盲改高效得多。**
---

<h2 id="ch47">47. 文件夹：点选式的胜利</h2>
{: #ch47}

### 需求

22 个 App 桌面放不下，要归类。吸取拖拽的教训，用户选了个更稳的方案：**点选式文件夹**——长按 App 弹菜单选文件夹，不做拖动进出。

### 核心设计：不动 PAPPS

文件夹独立存 `pent_folders`，App 数组 PAPPS **完全不变**：

```javascript
pent_folders = [
  {id:'fld_1', name:'游戏', appIds:['pgame_2048','pgame_bj','pgame_gomoku']},
  {id:'fld_2', name:'工具', appIds:['paCalc','paClock']}
]
```

好处：popenApp、商店、角标、聊天统计读 PAPPS 的代码**一行不用改**。只在 prenderDT 渲染时把文件夹内 App 过滤掉，文件夹图标显示在最前。

### 功能

- 长按 App（500ms 计时器）→ 底部菜单：新建文件夹 / 移入已有 / 移出
- 文件夹图标：📁 + 名字 + 内 App 图标堆叠预览，显示在网格最前
- 点文件夹 → 全屏面板，内 App 网格，点击即用

### Bug：移入的软件移不出来

用户反馈"移入文件夹的软件没法移出来"。排查发现根因是**设计缺陷**：App 移入后从桌面隐藏，用户**找不到它长按**来移出——桌面不显示，文件夹面板里点击直接打开 App。

修复：文件夹面板里的 App 也支持长按（500ms）→ 弹菜单 → 移出文件夹。

### 删除文件夹：软件自动归位

用户问"删除文件夹能不能让里面软件自动归位"——其实**天然实现**：删除文件夹（从 pent_folders 移除）后，App 不再属于任何文件夹，prenderDT 自动不再过滤它们，直接回桌面。所以删除逻辑只是 `folders.filter(f => f.id !== fid)`。

```javascript
function pfolderDelete(fid) {
  if (!confirm('删除文件夹？里面的App会回到桌面。')) return;
  folders = folders.filter(f => f.id !== fid);
  localStorage.setItem('pent_folders', JSON.stringify(folders));
  prenderDT();  // App 自动归位
}
```

### 教训

拖拽文件夹（嵌套数据模型 + 拖动进出）风险高，点选式（独立存储 + 菜单选择）风险低——**效果接近，复杂度天差地别**。遇到复杂交互，先想能不能用更简单的交互达成同样的目的。
---

<h2 id="ch48">48. 桌面小组件扩充</h2>
{: #ch48}

### 需求

之前桌面只有时钟 + 天气两个小组件。用户要日历、待办也上桌面。

### 实现

在时钟/天气下面加第二行小组件：日历 + 待办。

- 日历小组件：显示今天日期 + 星期，点击进日历 App
- 待办小组件：读当前房间待办的未完成数，点击进待办页

### 复用 pdtUpdateWidgets

小组件内容填充都在 pdtUpdateWidgets 里，一个函数更新时钟/天气/日历/待办四个卡片。待办数需要异步读 IndexedDB，函数改成 async。

### 待办跳转

待办页在 Phone App 里（pageTodo），所以 popenTodo() 要先打开 Phone 再切到待办页。
---

<h2 id="ch49">49. 全局搜索</h2>
{: #ch49}

### 需求

22 个 App + 多个联系人，桌面找起来费劲。要一个全局搜索框。

### 实现

桌面搜索框，输入实时筛选。数据源：App 遍历 PAPPS 匹配 label/id，联系人遍历 agents[] 匹配 name。

### 点击外部关闭

document 监听 click，点击搜索框和结果之外的地方 -> 隐藏结果面板。防止结果一直挂着。
---

<h2 id="ch50">50. 贪吃蛇与扫雷</h2>
{: #ch50}

### 需求

游戏区从 5 个补到 7 个——贪吃蛇、扫雷。

### 贪吃蛇

DOM 网格渲染（和 2048 一个路子），15x15：蛇身数组存坐标，键盘方向键 + 屏幕方向按钮，速度随分数加快（180ms -> 最快 70ms），撞墙/撞自己游戏结束。

### 扫雷

9x9 网格 10 个雷：点击翻开，右键/长按标旗，翻到 0 递归展开，全部非雷格子翻开胜利。

### 商店自动识别

PGAMES 数组加 2 个条目，popenGame 加 2 个路由分支——商店、桌面、安装逻辑全自动适配，不用额外改。
---

<h2 id="ch51">51. 钱包：签到 + 成就 + 积分</h2>
{: #ch51}

### 需求

查手机统计面板太干，加签到/成就/积分让它有养成感。

### 签到

每天首次点签到 +10 积分，连续天数累计。存 localStorage pent_wallet。

### 成就

6 项预设成就，基于现有数据实时判断：聊天新手 >=1 条、百条消息 >=100、拍照达人 >=5 张、文件收藏家 >=5 个、音乐爱好者 >=10 首、手机管家 >=3 次查手机。

### 积分卡

统计面板顶部：💰 积分 + 已签到天数 + 金色签到按钮。成就区显示每项达成状态和总数。

### Bug：替换边界定位错误

给 pchkStats 插入钱包区时，用 indexOf 定位替换边界，结果停在关键字前面，替换后整段重复，JS 语法炸了。修复：去掉重复片段。indexOf 返回关键字开始位置，oldHdr 不包含它，newHdr 又含它，就重复了。替换区间要覆盖到关键字完整结尾。
---

<h2 id="ch52">52. 全局搜索：从无结果到可用</h2>
{: #ch52}

### 第一版：搜索不出结果

搜索框做完了（第 49 章），但用户反馈搜什么都不出结果。排查发现两个问题：

**1. 搜索框在第二页。** 桌面分页翻到第二页才能看到搜索框，用户在第一页自然看不到结果。

**2. 结果面板被遮挡。** `.pdt-searchres` 的 z-index 不够高，结果弹出后被桌面图标区挡住。z-index 提到 99999 后解决。

### 桌面翻页与搜索

为了让搜索任何时候都能用，最终方案是搜索框跟随小组件放在桌面第二页。用户向左滑 → 第一页（时钟/天气/便签），再向左滑 → 第二页（日历/待办/搜索框）。搜索输入时实时筛选 App 名和联系人名，点击跳转。

这里有一个交互上的取舍：搜索框不在第一页意味着用户需要滑一下才能搜。但好处是桌面第一页干净、不被搜索框挤占 App 图标空间。

### 点击外部关闭

document 监听 click，点击搜索框和结果之外的地方自动隐藏结果面板，防止结果一直挂在那里遮挡桌面。

---

<h2 id="ch53">53. 桌面布局重构：小组件嵌进分页</h2>
{: #ch53}

### 需求变化

第 39 章和 45 章做了桌面小组件（时钟/天气/便签/日历/待办），第 49 章加了全局搜索，当时全部堆在桌面顶部——不分页，全局显示。用户测试后明确要求：

> "日期天气、便签固定在第一页，你怎么又变成全局了？日历和待办、全局搜索挪到第二页。"

而且用户还反馈"小部件遮挡 App"——小组件区太高，把图标挤到屏幕外。

### 第一版：滚动监听切换

小组件区放在分页外面，监听 `.pdt-pages` 的 `scroll` 事件，根据 `scrollLeft` 切换两组小组件的 `display`。

```javascript
pdtpages.addEventListener("scroll", function() {
  var page = Math.round(pdtpages.scrollLeft / w);
  if (page === 0) { /* 显示第一组 */ }
  else { /* 显示第二组 */ }
});
```

结果不可靠。用户滑到第二页，小组件区没切换——`scroll-snap` 的 `scroll` 事件触发时机不稳定。反复调了好几次花括号（多一个 `}` 少一个 `}`），每次修完语法检查都报错，折腾了好几轮。

### 最终方案：小组件直接嵌进每个 page

放弃滚动监听，在 `prenderDT` 里把小组件 HTML 直接拼进每页开头：

```javascript
// 第一页：时钟 + 天气 + 便签
h += "<div style=\"grid-column:1/-1;display:flex;gap:10px;margin-bottom:6px\">"
  + "<div class=\"pdt-w-clock\">...</div><div class=\"pdt-w-weather\">...</div></div>";
h += "<div style=\"grid-column:1/-1;...\">📌 便签</div>";

// 第二页：日历 + 待办 + 搜索
h2 += "<div style=\"grid-column:1/-1;display:flex;gap:10px;margin-bottom:6px\">"
  + "<div class=\"pdt-w-cal\">...</div><div class=\"pdt-w-todo\">...</div></div>";
h2 += "<div style=\"grid-column:1/-1;...\"><input id=\"pdtsearchInp\" ...></div>";
```

小组件天然跟随分页——滑到第一页看到时钟/天气，滑到第二页看到日历/待办/搜索。零监听、零切换逻辑。删掉了顶部固定小组件区和所有滚动监听代码。

### 小组件遮挡问题

`.pdt-pages` 加 `min-height:0` + `overflow-y:hidden`，防止小组件挤压/溢出遮挡桌面图标。

### 便签形状

用户说"便签做成全局搜索那种扁扁的长形态"。之前用 `.pdt-note` CSS 类在 grid 布局里显示异常（一坨），改成内联样式强制全宽横条：

```html
<div style="grid-column:1/-1;display:flex;align-items:center;padding:8px 12px;
     border-radius:20px;width:calc(100% - 28px)">
  📌 <span>便签文字</span>
</div>
```

### 教训

"小组件跟随分页"如果用滚动监听做，依赖用户滚动行为和事件触发时机——极其脆弱。直接把小组件渲染进每个 page，天然正确，零监听。**能用结构解决的问题，不要用事件。**

---

<h2 id="ch54">54. 日历备注：从圆点到文字</h2>
{: #ch54}

### 需求

用户反馈日历备注功能"没什么用"——之前备注只显示一个小圆点，看不见内容。用户要求"备注了就显示在日历当天下方"。

### 修改

`prCal` 渲染日期格子时，有备注的格子直接显示备注文字：

```javascript
if (cnObj[key]) {
  cn = "<br><span style=\"font-size:8px;color:#ff9500;display:block;
     overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
     max-width:100%\">" + cnObj[key] + "</span>";
}
```

小字橙黄色、超长省略号截断。

### 备注编辑交互

`paddCN` 改进交互逻辑：已有备注再点击 → 先确认"已有备注，确定删除？" → 输入空则删除备注。不再需要手动清空输入框来删除。

---

<h2 id="ch55">55. 贪吃蛇方向控制的苦战</h2>
{: #ch55}

贪吃蛇是第 50 章做的。做完之后用户反馈"箭头按键按了没反应"或"按了上再按下没反应"。前前后后修了五六轮，根因不止一个。

### 第一层：函数定义在错误的 script 块

这是最致命的 bug。游戏代码用 `c.replace("</script>", games + "</script>")` 插入——**替换的是文件里第一个 `</script>`**（script1，只有十几行的小脚本块），而不是最后一个。结果贪吃蛇/扫雷被塞进了 script1，而 `popenGame` 在 script2。更糟的是贪吃蛇代码有语法错误 → script1 整体崩溃 → 所有在 script1 定义的函数未定义 → 打开游戏"pgamesnake is not defined"。

```javascript
// 错误：replace 只替换第一个匹配
c = c.replace("</script>", games + "</script>");
// 正确：找到最后一个 </script>
var lastIdx = c.lastIndexOf("</script>");
c = c.substring(0, lastIdx) + games + c.substring(lastIdx);
```

### 第二层：单行函数语法错误

贪吃蛇/扫雷之前是手写的单行函数——几百个字符挤在一行，引号、括号、分号极易出错。扫雷的 style 属性拼接尤其坑：

```javascript
// 文件里是：style=""+cls+"" — 两个空引号，HTML 属性没有引号包裹
// 需要改成：style=\"\""+cls+"\"\" — 反斜杠转义引号，生成 style="具体样式"
```

用 `node --check` 逐函数验证语法，用 `String.fromCharCode(34)` 做字节级精确替换，折腾了好几轮才把转义引号修对。

### 第三层：方向按钮事件绑定失效

贪吃蛇每次 `render()` 重建 DOM（innerHTML 重写整个游戏区域），之前绑定的按钮事件全部丢失。第一版用 `ov` 容器 click 事件委托，但委托在 DOM 重建后也可能被覆盖。

最终改用 `render()` 里 `querySelectorAll("[data-dir]").forEach` 直接绑定——每次重建都重新绑，不会再丢：

```javascript
ov.querySelectorAll("[data-dir]").forEach(function(btn) {
  btn.onclick = function(e) {
    e.stopPropagation();
    turn(parseInt(this.getAttribute("data-dir")));
  };
});
```

### 第四层：180 度掉头保护的逻辑错误

贪吃蛇不能直接掉头撞自己——往右走时不能直接左转——这是标准规则。但之前用 `dir`（当前实际方向）判断，导致问题：蛇正在向右（dir.x===1），用户按"上"（nextDir 变上），再按"左"——此时 `dir.x===1` 拒绝左转。正确应该看 `nextDir`（即将的方向）来判断：

```javascript
// 错误：用 dir 判断 → 连续变向被误拦
if (d === 2 && dir.x !== 1) { nextDir = {x:-1, y:0}; }
// 正确：用 nextDir 判断 → 允许上→左→下→右连续变向
if (d === 2 && nextDir.x !== 1) { nextDir = {x:-1, y:0}; }
```

修完之后，用户可以做"上→左→下→右"绕圈走，只有真正 180° 掉头（正在上时直接按下）被拒绝。

### 第五层：棋盘大小适配手机

之前 15×15 棋盘在手机上 button 跑出屏幕外。缩小到 10×10，`cell = Math.floor(Math.min(320, window.innerWidth-30)/cols)`，方向按钮在屏幕内稳定可见。

### 教训

- **手写大型单行函数极其容易出错**——多行书写，写完立刻 `node --check`。
- **跨 script 块插入代码用 `lastIndexOf`**，不是 `replace`（replace 只匹配第一个）。
- **DOM 重建后事件绑定全部丢失**——要么用事件委托放在不重建的容器上，要么在 `render()` 里重新绑。

---

<h2 id="ch56">56. 扫雷标旗：从长按到模式按钮</h2>
{: #ch56}

扫雷是第 50 章和贪吃蛇一起做的。桌面端右键标旗一直正常。手机端的标旗经历了好几个版本才稳定下来。

### 第一版：只有右键

桌面端用 `oncontextmenu`（右键）标旗。手机没有右键，只能点开格子。用户在手机上完全没法标雷。

### 第二版：长按定时器

加 `touchstart` 设置 400ms 定时器，到期标旗。两个问题：

1. **标旗后松手就没了。** 长按标旗后松手，`click` 事件紧接着触发 → 翻开格子 → 旗子被覆盖。`_msFlagged` 标记设在 cell 元素上，但 `render()` 重建网格后新 cell 没有这个标记 → 跳过失效。
2. 手机系统长按菜单、微小移动都会取消长按。

### 第三版：闭包变量 + touchend 判断

改用闭包变量 `justFlagged`（函数作用域，不随 DOM 重建丢失）。`touchend` 时判断：时长 ≥ 350ms 且位移 < 10px → 标旗 → 设 `justFlagged=true`。随后的 `click` 检查到标记 → 跳过翻开。

手机长按仍有不稳定的情况（移动端 350ms 阈值和系统手势容易冲突）。

### 第四版：标旗模式按钮（最终方案）

用户建议"要不设置个按钮在旁边，点击即设置旗子"。这是最可靠的方案——加一个 "🚩 标旗模式" 切换按钮：

```javascript
var flagMode = false;

// 点击按模式处理
cells[i].onclick = function() {
  if (gameOver) return;
  var idx = parseInt(this.getAttribute("data-idx"));
  if (flagMode) {
    if (!revealed[idx]) { flagged[idx] = !flagged[idx]; render(); }
  } else {
    reveal(Math.floor(idx/cols), idx%cols); render();
  }
};

// 按钮切换
mb.onclick = function() { flagMode = !flagMode; render(); };
```

| 模式 | 点格子 | 桌面右键 |
|------|:------:|:------:|
| 标旗模式:关（默认，灰按钮） | 翻开格子 | 标旗 🚩 |
| 标旗模式:开（橙色按钮） | 标旗 🚩 | 标旗 🚩 |

手机上：切到"标旗模式:开"（按钮变橙）→ 点格子标旗 → 切回"关"（按钮变灰）→ 翻开。

100% 可靠，彻底告别长按时序问题。右键始终保留，不受模式影响。

### 教训

**手机端长按是非常不靠谱的交互**——系统手势、菜单、微小移动都会干扰。当长按不可靠时，加一个显式的模式切换按钮比继续调长按阈值明智得多。这个决策和文件夹从拖拽改成点选式（第 47 章）是同一个道理。

---

<h2 id="ch57">57. 游戏代码插入位置的教训</h2>
{: #ch57}

### 问题

文件里有 **两个 `<script>` 块**：

| script | 位置 | 内容 |
|--------|------|------|
| script1 | 行 2464-2479 | 聊天滚动按钮（小脚本，~15 行） |
| script2 | 行 3267-9883 | 全部桌面和游戏逻辑（~6600 行） |

游戏代码需要插入 script2。但 `c.replace("</script>", games + "</script>")` —— JavaScript 的 `String.replace` 只替换**第一个**匹配，也就是 script1 的 `</script>`。游戏进了 script1 → script1 崩了 → 游戏函数未定义。

### 修复

用 `lastIndexOf` 找到最后一个 `</script>`，精确插入 script2 末尾：

```javascript
var lastIdx = c.lastIndexOf("</script>");
c = c.substring(0, lastIdx) + games + c.substring(lastIdx);
```

### script1 的清理

修复后 script1 干净（只有原来的滚动按钮逻辑），script2 包含全部游戏函数。用 `node --check` 两个脚本各自验证语法。

### 教训

在混合多个 `<script>` 块的大文件里做字符串替换，**永远用 `lastIndexOf` 定位目标块**，不要假设 `replace` 会匹配到你想要的那个。`replace` 永远是第一个。

---

<h2 id="ch58">58. 积分用途：解锁隐藏主题</h2>
{: #ch58}

### 需求

第 51 章做了钱包（签到 + 成就 + 积分）。用户问"积分有啥用？"——积了分但不能花，确实不像"钱包"。

### 方案

给积分加一个消费场景：**积分解锁隐藏壁纸主题**。

在钱包区加说明："💰 当前积分：XX · 满 50 分解锁隐藏主题"。让签到和成就不再是空洞的数字，有累积的动力。

同时让成就判定重读积分：首次加载时根据已有数据计算成就进度，而非每次从零开始。

---

<h2 id="ch59">59. 总结</h2>
{: #ch59}






桌面系统主体 ~500 行 CSS + ~850 行 JS = ~1350 行。大部分时间没花在写代码上——花在调 CSS 图层冲突、变量名不一致、壁纸上传的七次尝试、时钟标签的事件绑定方式切换、锁屏状态变量的修复、PowerShell 正则误伤排查。

最大的教训：**在 9700 行的现有文件上加功能，改一个 CSS 属性能影响三处、改一个变量名能静默失败四个地方。** 备份文件救了很多次命——每次大改动前先 `cp` 一份，不行就回退。

现在这个 ~9970 行的 HTML 文件，打开是一个手机桌面——锁屏、小组件、22 个 App（拍照、相册、文件、音乐、备忘录、日历、时钟、计算器、天气、电话、短信、地图、商店、设置、通知、Phone、查手机、7 个小游戏）、通知、壁纸、主题切换。点 Phone 图标进入完整 AI 聊天应用。双击就用，零依赖。

整个开发过程最深的感受：**在已有的复杂代码上做增量，最大的成本不是写新代码，而是弄清楚旧代码的每一行在干什么。** 备份-修改-验证-回退的循环跑了不下十次，每次回退都学到一点东西——CSS 简写和分离属性的优先级、`!important` 对 inline style 的覆盖、文本节点的 `.closest()` 陷阱、IndexedDB 存大文件比 localStorage 靠谱得多、PowerShell 正则不要往混合 HTML/JS 的大文件里瞎怼。

这次的额外教训是：**交互方案的选择优先级：结构 > 事件 > 定时器。** 小组件跟随分页用结构解决（嵌进 page）比滚动监听可靠；扫雷标旗用显式按钮比长按定时器可靠；文件夹管理用点选式比拖拽进出可靠。每次从"事件/定时器"退回到"结构/按钮"，代码都更简单、bug 更少。

---

*下一篇：文件系统的进一步优化——IndexedDB 直接存 Blob 而非 base64，以及让桌面短信变身真正的聊天 App。*

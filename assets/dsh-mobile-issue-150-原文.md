> 这是提交给 [saya-ch/dsh-mobile](https://github.com/saya-ch/dsh-mobile) 的 issue 正文原文。
> 在线地址：**https://github.com/saya-ch/dsh-mobile/issues/150**
> 提交时间：2026-10-02 22:40（北京时间）

---

### 环境

- dsh-mobile `0.5.2`
- DSH `0.2.0-rc.2`（官方 DSH Desktop，Windows 11 x64）
- Android App（官网 Release 的 APK）
- 访问方式：**局域网**（插件管理的私有 CA，`https://<局域网IP>:3443`）

### 现象

在手机上打开某个第三方插件的设置面板并点保存，弹出：

```
⚠ 设置保存失败：method_not_allowed
已自动重试一次。若持续失败，请检查 DSH 数据目录是否可写。
```

改动**不落盘**。同一台电脑上、用桌面端打开同一个面板保存，一切正常。

### 复现

1. 装一个通过 `ctx.webServer.register()` 注册路由、并用 `PUT` 保存设置的插件
   （我这边是 `dsh-whale-widget` `0.3.17`，它保存设置时发
   `PUT /dsh-whale/size.json`）
2. 手机 App 经局域网连接电脑
3. 在手机上打开该插件的设置面板，改任意一项后点保存
4. 弹出上面的 `method_not_allowed`

### 根因

`lib/index.mjs` 的 `handleExternalRequest()` 里（`0.5.2` 为第 3997 行）：

```js
if (request.method !== "GET" && request.method !== "HEAD" && request.method !== "POST"
    && requestedExtension?.kind !== "route")
  throw new HttpError(405, "method_not_allowed");
```

网关对 **DSH 的普通路由只放行 `GET` / `HEAD` / `POST`**。第三方插件若用
`PUT` / `PATCH` / `DELETE` 保存设置（走 DSH 自己的 `webServer.register()`，
而不是 dsh-mobile 的「扩展路由」），请求会在网关这里被 405 拒掉，**根本到不了插件**。

只有 `requestedExtension?.kind === "route"`（即注册为 dsh-mobile 扩展路由）才豁免这个限制。
`webServer.register()` 注册的普通路由不在豁免范围内。

### 影响面

**所有用 `PUT` / `PATCH` / `DELETE` 保存设置的第三方插件，在移动端都写不进去。**
DSH 自带设置走 `POST`，不受影响 —— 所以这个问题看起来像"某个插件坏了"，容易被误报成插件 bug。

### 关于是否放宽的一点权衡（请作者判断，我不确定这是不是有意为之）

放宽方法白名单之后，这类插件在手机上确实就能保存了。但请注意一个连带效果：

`lib/index.mjs` 的 `sanitizeRequestHeaders()`（`0.5.2` 为第 3086 行）会**把 `Host` 头无条件改写**为上游回环地址：

```js
const headers = { host: upstream.host };   // 例如 127.0.0.1:<dsh web port>
```

因此，那些"**写操作只接受来自本机（回环）**"的插件，其自身防护在经网关转发时会被这个改写绕过
—— 它们看到的 `Host` 是 `127.0.0.1`，会认为请求来自本机。

（举例：`dsh-whale-widget` 的 `writeRejection()` 用 `isLoopbackHostname(host)` 判断，
`127.0.0.1` 直接放行。它的 README 说"从局域网访问时写会被拒"，但那条只适用于
**不经 dsh-mobile 网关**的直连场景；经网关时 `Host` 已变回环。）

所以这个改动等于**让每台已配对手机都获得"本机"身份**。
考虑到 README 已经把配对设备定义为「完全可信」，这也许是可接受的；
但如果这是你有意维持的保守默认，那这个 issue 就当作**文档说明**即可 ——
希望能明确写一句"移动端不支持 `PUT`/`PATCH`/`DELETE` 写接口"，省得其他人也去插件仓库误报。

### 我这边不着急

已知规避方式：在桌面端改插件设置，手机端只读。功能不受影响。

感谢维护。

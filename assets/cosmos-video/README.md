# 宇宙短片 · 源代码（纯代码生成视频）

配套文章：[用代码而不是 AI 生成视频：一支 60 秒宇宙短片的完整做法](https://ann-luo.github.io/effective-pancake/2026/10/02/用代码生成60秒宇宙短片.html)

成片：[cosmos-60s-1080p.mp4](/effective-pancake/assets/videos/cosmos-60s-1080p.mp4)（60 秒 / 1080p / 含音频）

---

## 这是什么

一段 60 秒的宇宙主题短片，**每一帧都是代码算出来的**，不依赖任何素材图、不用 AI 视频模型。

流程是：`HTML + Canvas 写动画` → `Chrome 无头逐帧截图` → `ffmpeg 合成 MP4`。

---

## 文件说明

| 文件 | 作用 |
|---|---|
| `cosmos.html` | **动画本体**。定义 `window.renderFrame(frameIndex)`，7 个镜头 + 中英双语字幕都在这里 |
| `render.js` | **逐帧渲染器**（通用）。换主题只改 HTML，这个不用动 |
| `add-audio.js` | 加音轨（纯 ffmpeg 合成，不需要外部音频素材） |
| `scene-test.html` | 最小样例（3 秒），用来验证工具链是否跑通 |
| `package.json` | 只有两个依赖：`puppeteer-core` + `ffmpeg-static` |

---

## 怎么跑

```bash
# 1. 装依赖（不会下载 Chromium，用的是你本机已装的 Chrome）
npm install

# 2. 渲染（60 秒 1080p 约 5 分钟）
node render.js cosmos.html --fps 30 --dur 60

# 3. 加音频（可选）
node add-audio.js output/cosmos.html-xxxx.mp4
```

**前置条件**：Node.js 18+，本机装了 Chrome 或 Edge。

> `render.js` 会自动在几个常见路径找 Chrome；找不到可以用 `CHROME_PATH` 环境变量指定。

---

## 几个关键点（改的时候注意）

- **随机数必须用固定种子**（`mulberry32(20261002)`），否则每帧星点位置都变，视频会闪。
- **星星等静态元素要在渲染循环外生成一次**，不能在 `renderFrame` 里重新生成。
- **`-pix_fmt yuv420p` 必须加**，否则部分播放器打不开。
- **ffmpeg 要处理背压**（`stdin.write` 返回 false 时等 `drain`），不然编码跟不上会爆内存。
- 黑洞那个镜头用的是**真实引力透镜偏折** `θ_out = r + R_E²/r`，不是画圈——这是画面像不像的关键。

---

## 音频那块的坑（我在文章里写过，这里简记）

1. `tremolo` 滤镜的 `f` 最低只能 0.1Hz，做不了"几十秒一次的缓慢起伏" → 改用 `aevalsrc` 振幅调制
2. 想让频率线性下滑，必须用**相位积分** `φ = 2π(f₀t − kt²/2)`，直接乘 `t` 不对
3. `[标签]` 只能写在 filtergraph 里，**不能放进 `-i` 的输入描述**
4. 第一个 `-i` 是视频文件（占 index 0），后面音源的索引从 **1** 开始

---

## 授权

随你改，随便用。

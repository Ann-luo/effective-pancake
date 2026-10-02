#!/usr/bin/env node
/**
 * 给视频加简单音频（纯 ffmpeg 合成，不需要外部音频素材）
 *
 * 音效设计：
 *   - 低频 pad：55Hz + 82.5Hz（纯五度）+ 36.7Hz，各自带缓慢振幅调制
 *   - 空气声：粉红噪声带通滤波，营造空旷感
 *   - 转场音：每个镜头切换点一个短促下坠 tone（880→240Hz）
 *
 * 用法: node add-audio.js <输入mp4> [输出mp4]
 *
 * 踩过的坑（别重犯）：
 *   1. tremolo 的 f 最低只能 0.1Hz，做不了"几十秒一次的缓慢起伏"
 *      → 用 aevalsrc 的振幅调制表达
 *   2. 想让频率线性下滑不能写 sin(2π(f0−k·t)·t)，要用相位积分 φ = 2π(f0·t − k·t²/2)
 *   3. `[标签]` 只能出现在 filtergraph 里，**不能写在 -i 的输入描述中**
 *   4. 第一个 -i 是视频文件（占 index 0），所以 lavfi 音源索引从 **1** 开始
 */

const fs = require('fs');
const { spawnSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const IN = process.argv[2];
if (!IN) { console.error('用法: node add-audio.js <输入mp4> [输出mp4]'); process.exit(1); }
const OUT = process.argv[3] || IN.replace(/\.mp4$/i, '-audio.mp4');

const DUR = 60;
// 分镜切换点（秒）——与 cosmos.html 的 SHOTS 对齐
const CUTS = [0.15, 8.5, 17.0, 25.5, 34.0, 43.5, 52.0];

// ---------- 音源 ----------
const PAD_A =
  `aevalsrc='(0.09*sin(2*PI*55*t)+0.05*sin(2*PI*82.5*t))` +
  `*(0.65+0.35*sin(2*PI*0.055*t))*(0.85+0.15*sin(2*PI*0.017*t))':d=${DUR}:s=48000`;
const PAD_B =
  `aevalsrc='0.11*sin(2*PI*36.7*t)*(0.6+0.4*sin(2*PI*0.031*t))':d=${DUR}:s=48000`;
const AIR = `anoisesrc=duration=${DUR}:color=pink:sample_rate=48000:amplitude=0.35`;

// 转场音：相位积分，频率 880 → 240 Hz 线性下滑
const TD = 0.7;
const F0 = 880, F1 = 240;
const K = (F0 - F1) / TD;
const TRANS = `aevalsrc='0.13*sin(2*PI*(${F0}*t-${(K / 2).toFixed(3)}*t*t))':d=${TD}:s=48000`;

// 输入顺序：[0]=视频, [1]=PAD_A, [2]=PAD_B, [3]=AIR, [4..]=转场音
const inputArgs = [
  '-f', 'lavfi', '-i', PAD_A,
  '-f', 'lavfi', '-i', PAD_B,
  '-f', 'lavfi', '-i', AIR,
];

const parts = [
  '[1:a]anull[pa]',
  '[2:a]anull[pb]',
  '[3:a]highpass=f=900,lowpass=f=5200,volume=0.030[air]',
  '[pa][pb][air]amix=inputs=3:normalize=0[pad]',
];

const cutRefs = [];
CUTS.forEach((t, i) => {
  inputArgs.push('-f', 'lavfi', '-i', TRANS);
  const idx = 4 + i;
  parts.push(
    `[${idx}:a]afade=t=in:st=0:d=0.04,afade=t=out:st=${(TD - 0.3).toFixed(2)}:d=0.3,` +
    `adelay=${Math.round(t * 1000)}[c${i}]`
  );
  cutRefs.push(`[c${i}]`);
});

parts.push(`[pad]${cutRefs.join('')}amix=inputs=${1 + cutRefs.length}:normalize=0[mixed]`);
parts.push('[mixed]alimiter=limit=0.92,afade=t=in:st=0:d=2.5,afade=t=out:st=57:d=3[aout]');

const args = [
  '-y',
  '-i', IN,
  ...inputArgs,
  '-filter_complex', parts.join(';'),
  '-map', '0:v',
  '-map', '[aout]',
  '-c:v', 'copy',
  '-c:a', 'aac',
  '-b:a', '192k',
  '-ac', '2',
  '-shortest',
  '-movflags', '+faststart',
  OUT,
];

console.log('[音频] 底噪: 55Hz + 82.5Hz + 36.7Hz（慢速振幅调制）+ 粉红噪声空气声');
console.log('[音频] 转场音: ' + CUTS.length + ' 处 → ' + CUTS.join('s, ') + 's（880→240Hz 下坠）');

const r = spawnSync(ffmpegPath, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
if (r.status !== 0) {
  console.error('[音频] ❌ ffmpeg 失败');
  console.error((r.stderr || '').split('\n').slice(-20).join('\n'));
  process.exit(1);
}

const size = fs.statSync(OUT).size;
console.log('[音频] ✅ ' + OUT);
console.log('[音频] 大小: ' + (size / 1048576).toFixed(2) + ' MB');
console.log('OUTPUT_FILE=' + OUT);

#!/usr/bin/env node
/**
 * 代码生成视频：无头 Chrome 逐帧渲染 HTML 动画 → ffmpeg 合成 MP4
 *
 * 用法:
 *   node render.js <html文件> [选项]
 *
 * 选项:
 *   --fps 30          帧率
 *   --dur 5           时长（秒）
 *   --width 1920      宽
 *   --height 1080     高
 *   --out out.mp4     输出文件（默认 output/<html名>-<时间戳>.mp4）
 *   --keep-frames     保留 PNG 帧（调试用）
 *
 * 原理: HTML 里定义 window.renderFrame(frameIndex) 做确定性逐帧渲染，
 *       本脚本用 CDP 截图取每帧，通过 stdin 管道喂给 ffmpeg。
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpegPath = require('ffmpeg-static');

// ---------- 找系统 Chrome ----------
function findChrome() {
  const cands = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  for (const p of cands) if (fs.existsSync(p)) return p;
  throw new Error('找不到 Chrome/Edge，可用 CHROME_PATH 环境变量指定');
}

// ---------- 参数 ----------
function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      opt[k] = v;
    } else pos.push(a);
  }
  return { pos, opt };
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const htmlFile = pos[0];
if (!htmlFile) {
  console.error('用法: node render.js <html文件> [--fps 30] [--dur 5] [--width 1920] [--height 1080] [--out x.mp4]');
  process.exit(1);
}
if (!fs.existsSync(htmlFile)) {
  console.error('找不到文件: ' + htmlFile);
  process.exit(1);
}

const FPS = parseFloat(opt.fps || '30');
const DUR = parseFloat(opt.dur || '5');
const WIDTH = parseInt(opt.width || '1920', 10);
const HEIGHT = parseInt(opt.height || '1080', 10);
const FRAMES = Math.round(FPS * DUR);
const KEEP = !!opt.keepFrames;

const stamp = () => {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
const OUT_DIR = path.join(__dirname, '..', '成片');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = opt.out
  ? path.resolve(opt.out)
  : path.join(OUT_DIR, `${path.basename(htmlFile, '.html')}-${stamp()}.mp4`);

// ---------- 主流程 ----------
(async () => {
  const chrome = findChrome();
  console.log('[渲染] HTML   : ' + path.basename(htmlFile));
  console.log('[渲染] Chrome : ' + chrome);
  console.log('[渲染] 规格   : ' + WIDTH + 'x' + HEIGHT + ' @ ' + FPS + 'fps  ' + DUR + 's  = ' + FRAMES + ' 帧');
  console.log('[渲染] 输出   : ' + outFile + '\n');

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-gpu-sandbox',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--window-size=' + WIDTH + ',' + HEIGHT,
      '--disable-lcd-text',
      '--font-render-hinting=none',
      '--allow-file-access-from-files',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });

  const url = 'file:///' + path.resolve(htmlFile).replace(/\\/g, '/') +
    '?fps=' + FPS + '&dur=' + DUR + '&w=' + WIDTH + '&h=' + HEIGHT;
  await page.goto(url, { waitUntil: 'load' });

  // 等页面里的 renderFrame 就绪
  await page.waitForFunction('window.READY === true && typeof window.renderFrame === "function"', { timeout: 20000 });
  const totalInPage = await page.evaluate('window.TOTAL_FRAMES');
  console.log('[渲染] 页面声明的总帧数: ' + totalInPage);

  // ---------- 启动 ffmpeg ----------
  const ff = spawn(ffmpegPath, [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-r', String(FPS),
    '-i', 'pipe:0',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outFile,
  ], { stdio: ['pipe', 'ignore', 'pipe'] });

  let ffErr = '';
  ff.stderr.on('data', (d) => { ffErr += d.toString(); });
  const ffDone = new Promise((res, rej) => {
    ff.on('close', (code) => (code === 0 ? res() : rej(new Error('ffmpeg 退出码 ' + code + '\n' + ffErr.slice(-1500)))));
    ff.on('error', rej);
  });

  // ---------- 逐帧渲染 ----------
  const t0 = Date.now();
  for (let i = 0; i < FRAMES; i++) {
    await page.evaluate((f) => window.renderFrame(f), i);
    const buf = await page.screenshot({ type: 'png', optimizeForSpeed: true });

    // 写进 ffmpeg，处理背压
    if (!ff.stdin.write(buf)) {
      await new Promise((r) => ff.stdin.once('drain', r));
    }

    if (i % 10 === 0 || i === FRAMES - 1) {
      const done = i + 1;
      const el = (Date.now() - t0) / 1000;
      const eta = done > 0 ? (el / done) * (FRAMES - done) : 0;
      process.stdout.write(`\r  帧 ${done}/${FRAMES}  ${(el).toFixed(1)}s  预计剩余 ${eta.toFixed(0)}s   `);
    }
  }
  process.stdout.write('\n');

  ff.stdin.end();
  await ffDone;
  await browser.close();

  const size = fs.statSync(outFile).size;
  console.log('\n[渲染] ✅ 完成: ' + outFile);
  console.log('[渲染] 大小: ' + (size / 1048576).toFixed(2) + ' MB');
  console.log('OUTPUT_FILE=' + outFile);
})().catch((e) => {
  console.error('\n[渲染] ❌ ' + e.message);
  process.exit(1);
});

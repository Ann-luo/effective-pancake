#!/usr/bin/env node
/**
 * 导出 DSH 会话记录为可读 JSONL
 *
 * ===== 难点：这是「多帧 zstd 拼接」文件 =====
 * session.v4.jsonl.zstd 不是一整个 zstd 流，而是 N 个独立帧首尾相接。
 * 所以 zlib.zstdDecompressSync(整个文件) 只能解出第一帧（表现为「1 行、0 KB」）。
 *
 * ===== 正确的帧长算法：遍历块头 =====
 * 试过两条错路，都失败：
 *   ✗ 手工按 RFC 8878 算帧头长度 —— 标志位含义对不上，一帧都解不出
 *   ✗ eng.bytesWritten 拿流式消耗量 —— 始终是 0
 * 可行做法是遍历帧内的「块」：
 *   每块 3 字节头 → b0 = [Last_Block(1) | Block_Type(2) | Block_Size 低5位]
 *                   b1 = 大小中 8 位,  b2 = 大小高 8 位
 *   Block_Type: 0=Raw 1=RLE 2=Compressed 3=保留(非法)
 *   RLE 块负载只有 1 字节，其余按 Block_Size 跳过
 *   遇到 Last_Block 就停；若 FHD 的 Content_Checksum_Flag=1 再跳 4 字节
 * 实测：单会话 2.5 MB / 2093 帧，零失败完整读穿。
 *
 * ===== 用法 =====
 *   node tools/export-sessions.js                    # 列出所有会话
 *   node tools/export-sessions.js 1                  # 按编号导出
 *   node tools/export-sessions.js <sid> [输出.jsonl]  # 按会话 id 导出
 * ⚠️ 输出别写 C:\tmp（不可写），默认落到工作区根目录。
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SESSION_ROOT = path.join(process.env.USERPROFILE || process.env.HOME, '.dsh', 'sessions');
const MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

/** 算出一个 zstd 帧的长度；不合法返回 null */
function frameLength(buf, p) {
  if (p + 5 > buf.length) return null;
  for (let i = 0; i < 4; i++) if (buf[p + i] !== MAGIC[i]) return null;

  const fhd = buf[p + 4];
  const csFlag = (fhd >> 6) & 3;
  const singleSeg = (fhd >> 5) & 1;
  const checksum = (fhd >> 2) & 1;
  const dictFlag = fhd & 3;

  let q = p + 5;
  if (!singleSeg) q += 1;                  // Window_Descriptor
  q += [0, 1, 2, 4][dictFlag];             // Dictionary_ID
  if (csFlag !== 0) q += (1 << csFlag);    // Frame_Content_Size（跳过，长度靠块算）

  let blocks = 0;
  while (q + 3 <= buf.length) {
    const b0 = buf[q], b1 = buf[q + 1], b2 = buf[q + 2];
    const last = b0 & 1;
    const btype = (b0 >> 1) & 3;
    const bsize = (b0 >> 3) | (b1 << 5) | (b2 << 13);
    if (btype === 3) return null;          // 保留类型 = 非法
    q += 3 + (btype === 1 ? 1 : bsize);    // RLE 只占 1 字节
    if (last) break;
    if (++blocks > 100000) return null;
  }
  if (checksum) q += 4;
  const len = q - p;
  return len > 6 ? len : null;
}

/** 逐帧解压整个文件 */
function decompressAll(buf) {
  const parts = [];
  let pos = 0, frames = 0, skipped = 0;

  while (pos < buf.length - 4) {
    const len = frameLength(buf, pos);
    if (len) {
      try {
        parts.push(zlib.zstdDecompressSync(buf.subarray(pos, pos + len)));
        frames++;
        pos += len;
        continue;
      } catch (e) { /* 落到下面找下一个魔数 */ }
    }
    let next = pos + 1;
    while (next < buf.length - 4 &&
           !(buf[next] === MAGIC[0] && buf[next + 1] === MAGIC[1] &&
             buf[next + 2] === MAGIC[2] && buf[next + 3] === MAGIC[3])) next++;
    skipped += next - pos;
    pos = next;
  }
  return { text: Buffer.concat(parts).toString('utf8'), frames, skipped };
}

function collectSessions() {
  const out = [];
  if (!fs.existsSync(SESSION_ROOT)) return out;
  for (const ws of fs.readdirSync(SESSION_ROOT)) {
    const wsDir = path.join(SESSION_ROOT, ws);
    try { if (!fs.statSync(wsDir).isDirectory()) continue; } catch (e) { continue; }
    for (const sid of fs.readdirSync(wsDir)) {
      const f = path.join(wsDir, sid, 'session.v4.jsonl.zstd');
      if (!fs.existsSync(f)) continue;
      const st = fs.statSync(f);
      out.push({ sid, file: f, size: st.size, mtime: st.mtime });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

// ---------------- 入口 ----------------
const arg = process.argv[2];
const sessions = collectSessions();
if (!sessions.length) { console.error('没找到会话: ' + SESSION_ROOT); process.exit(1); }

if (!arg) {
  console.log('共 ' + sessions.length + ' 个会话（按最近修改排序）:\n');
  sessions.forEach((s, i) => {
    console.log('  ' + String(i + 1).padStart(2) + ') ' + s.sid);
    console.log('      ' + (s.size / 1048576).toFixed(2) + ' MB    ' + s.mtime.toLocaleString('zh-CN'));
  });
  console.log('\n导出: node tools/export-sessions.js <编号或完整 sid> [输出.jsonl]');
  process.exit(0);
}

const target = /^\d+$/.test(arg)
  ? sessions[Number(arg) - 1]
  : sessions.find((s) => s.sid === arg || s.sid.startsWith(arg));
if (!target) { console.error('找不到会话: ' + arg); process.exit(1); }

console.log('会话: ' + target.sid);
console.log('大小: ' + (target.size / 1048576).toFixed(2) + ' MB   修改: ' + target.mtime.toLocaleString('zh-CN'));

const buf = fs.readFileSync(target.file);
const t0 = Date.now();
const { text, frames, skipped } = decompressAll(buf);
const lines = text.split('\n').filter((l) => l.trim());

console.log('解出: ' + frames + ' 帧 → ' + lines.length + ' 行 → ' + (text.length / 1024).toFixed(0) + ' KB 文本');
console.log('耗时: ' + ((Date.now() - t0) / 1000).toFixed(1) + 's' +
            (skipped ? '   ⚠ 跳过 ' + skipped + ' 字节' : '   无跳过 ✓ 完整读穿'));

const outFile = process.argv[3] || path.join(__dirname, '..', 'session-export.jsonl');
fs.writeFileSync(outFile, text, 'utf8');
console.log('已写出: ' + outFile);

const types = {};
let bad = 0;
lines.forEach((l) => {
  try { const t = JSON.parse(l).type || '?'; types[t] = (types[t] || 0) + 1; } catch (e) { bad++; }
});
console.log('JSON 解析失败行: ' + bad + (bad === 0 ? '  ✓' : '  ⚠'));
const top = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 8);
if (top.length) console.log('事件类型 top8: ' + top.map(([k, v]) => k + '×' + v).join('  '));

console.log('\n=== 头 2 行 ===');
lines.slice(0, 2).forEach((l, i) => console.log('  [' + i + '] ' + l.slice(0, 96)));
console.log('=== 尾 1 行 ===');
if (lines.length) console.log('  ' + lines[lines.length - 1].slice(0, 96));

#!/usr/bin/env node
/**
 * 直接读取 DSH 会话内容（不用先导出成文件）
 *
 * 用法：
 *   node tools/read-session.js                  读最新会话的最后 20 轮
 *   node tools/read-session.js 3                读第 3 个会话
 *   node tools/read-session.js 3 -n 50          读第 3 个会话的最后 50 轮
 *   node tools/read-session.js <sid> --all      读全部轮次
 *   node tools/read-session.js --search "关键词" 在所有会话里搜
 *   node tools/read-session.js --thinking       附带 AI 的思考过程
 *   node tools/read-session.js --tools          附带工具调用记录
 *
 * 默认只显示**对话正文**（用户说的话 + AI 的实际回复）。
 * 思考过程默认藏起来 —— 实测一篇回复里思考常占 80% 以上，
 * 全打出来真正的对话会被淹掉。
 *
 * 和 export-sessions.js 的区别：
 *   export  把原始 JSONL 落盘（给程序用 / 存档）
 *   read    直接在终端打印可读对话（给人看）
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

const ROOT = path.join(process.env.USERPROFILE || os.homedir(), '.dsh', 'sessions');
const MAGIC = [0x28, 0xb5, 0x2f, 0xfd];

// ---------- 多帧 zstd 解压（算法说明见同目录 export-sessions.js）----------
function frameLength(buf, p) {
  if (p + 5 > buf.length) return null;
  for (let i = 0; i < 4; i++) if (buf[p + i] !== MAGIC[i]) return null;
  const fhd = buf[p + 4];
  const csFlag = (fhd >> 6) & 3, singleSeg = (fhd >> 5) & 1, checksum = (fhd >> 2) & 1, dictFlag = fhd & 3;
  let q = p + 5;
  if (!singleSeg) q += 1;
  q += [0, 1, 2, 4][dictFlag];
  if (csFlag !== 0) q += (1 << csFlag);
  let blocks = 0;
  while (q + 3 <= buf.length) {
    const b0 = buf[q], b1 = buf[q + 1], b2 = buf[q + 2];
    const last = b0 & 1, btype = (b0 >> 1) & 3, bsize = (b0 >> 3) | (b1 << 5) | (b2 << 13);
    if (btype === 3) return null;
    q += 3 + (btype === 1 ? 1 : bsize);
    if (last) break;
    if (++blocks > 100000) return null;
  }
  if (checksum) q += 4;
  const len = q - p;
  return len > 6 ? len : null;
}

function readEvents(file) {
  const buf = fs.readFileSync(file);
  const out = [];
  let pos = 0;
  while (pos < buf.length - 4) {
    const len = frameLength(buf, pos);
    if (len) {
      try {
        const txt = zlib.zstdDecompressSync(buf.subarray(pos, pos + len)).toString('utf8');
        txt.split('\n').filter((l) => l.trim()).forEach((l) => {
          try { out.push(JSON.parse(l)); } catch (e) {}
        });
        pos += len;
        continue;
      } catch (e) {}
    }
    let next = pos + 1;
    while (next < buf.length - 4 && !(buf[next] === MAGIC[0] && buf[next + 1] === MAGIC[1] && buf[next + 2] === MAGIC[2] && buf[next + 3] === MAGIC[3])) next++;
    pos = next;
  }
  return out;
}

// 剥掉注入类的噪声：system-reminder / attachment 说明等。
// 这些是系统自动附在用户消息里的（比如 AGENTS.md 变更通知、图片附件说明），
// 不是用户真正说的话 —— 留着会把对话淹掉。
function clean(s) {
  if (!s) return s;
  return s
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/gi, '')
    .replace(/<[a-z-]*attachment[^>]*>[\s\S]*?<\/[a-z-]*attachment>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------- 把事件流转成对话 ----------
// 思考和工具调用分开存，默认不显示 —— 否则一篇回复里大半是推理过程，真正的对话会被淹掉
function toConversation(events) {
  const turns = [];
  for (const e of events) {
    const d = e.data || {};
    let role = null;
    const text = [], thinking = [], tools = [];

    if (e.type === 'user/message') {
      role = 'user';
      text.push(...(d.content || []).filter((c) => c.type === 'text').map((c) => c.text));
    } else if (e.type === 'agent/inbox/spliced') {
      role = 'user';
      for (const it of (d.inserted || [])) {
        text.push(...(it.content || []).filter((c) => c.type === 'text').map((c) => c.text));
      }
    } else if (e.type === 'assistant/message') {
      role = 'assistant';
      for (const c of ((d.message || {}).content || [])) {
        if (c.type === 'text') text.push(c.text);
        else if (c.type === 'reasoning') thinking.push(c.text);
        else if (c.type === 'tool-call' || c.type === 'tool_use') {
          tools.push((c.name || c.toolName || '?') + ' ' + JSON.stringify(c.input || c.arguments || {}).slice(0, 120));
        }
      }
    }
    if (role && (text.filter(Boolean).length || thinking.filter(Boolean).length || tools.length)) {
      turns.push({ role, text: text.filter(Boolean).join('\n'), thinking, tools });
    }
  }
  return turns;
}

function fmtTurn(t, i) {
  const head = t.role === 'user' ? '👤 用户' : '🤖 AI';
  let body = clean(t.text);
  if (!body) body = '（这一轮没有文字回复，只有工具调用或思考）';
  let extra = '';
  if (flagThinking && t.thinking.length) {
    extra += '\n\n〔思考过程〕\n' + clean(t.thinking.join('\n'));
  }
  if (flagTools && t.tools.length) {
    extra += '\n\n〔工具调用〕\n' + t.tools.map((x) => '  · ' + x).join('\n');
  }
  return `\n${'─'.repeat(70)}\n[${i + 1}] ${head}\n${'─'.repeat(70)}\n${body}${extra}`;
}

// ---------- 会话列表 ----------
function collectSessions() {
  const out = [];
  if (!fs.existsSync(ROOT)) return out;
  for (const ws of fs.readdirSync(ROOT)) {
    const d = path.join(ROOT, ws);
    try { if (!fs.statSync(d).isDirectory()) continue; } catch (e) { continue; }
    for (const sid of fs.readdirSync(d)) {
      const f = path.join(d, sid, 'session.v4.jsonl.zstd');
      if (!fs.existsSync(f)) continue;
      const st = fs.statSync(f);
      out.push({ sid, file: f, size: st.size, mtime: st.mtime });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

// ---------- 入口 ----------
const argv = process.argv.slice(2);
const flagThinking = argv.includes('--thinking');
const flagTools = argv.includes('--tools');
const flagAll = argv.includes('--all');
const searchIdx = argv.indexOf('--search');
const searchKey = searchIdx >= 0 ? argv[searchIdx + 1] : null;
const nIdx = argv.indexOf('-n');
const limit = flagAll ? Infinity : (nIdx >= 0 ? Number(argv[nIdx + 1]) : 20);

const positional = argv.filter((a, i) => {
  if (a === '--thinking' || a === '--tools' || a === '--all') return false;
  if (a === '--search' || a === '-n') return false;
  if (searchIdx >= 0 && i === searchIdx + 1) return false;
  if (nIdx >= 0 && i === nIdx + 1) return false;
  return true;
});

const sessions = collectSessions();
if (!sessions.length) { console.error('没找到会话: ' + ROOT); process.exit(1); }

// ---- 搜索模式：在所有会话里找关键词 ----
if (searchKey) {
  console.log(`在所有会话里搜索「${searchKey}」...\n`);
  let total = 0;
  for (const s of sessions) {
    const turns = toConversation(readEvents(s.file));
    turns.forEach((t, i) => {
      if (t.text.includes(searchKey)) {
        total++;
        const pos = t.text.indexOf(searchKey);
        const snippet = t.text.slice(Math.max(0, pos - 80), pos + 120).replace(/\n/g, ' ');
        console.log(`  [${s.sid.slice(0, 16)}… 第${i + 1}轮 ${t.role === 'user' ? '👤' : '🤖'}]`);
        console.log(`    …${snippet}…\n`);
      }
    });
  }
  console.log(total ? `共命中 ${total} 处` : '没找到');
  process.exit(0);
}

// ---- 读取模式 ----
let target;
if (positional[0] && /^\d+$/.test(positional[0])) target = sessions[Number(positional[0]) - 1];
else if (positional[0]) target = sessions.find((s) => s.sid === positional[0] || s.sid.startsWith(positional[0]));
else target = sessions[0];

if (!target) { console.error('找不到会话: ' + positional[0]); process.exit(1); }

const turns = toConversation(readEvents(target.file));

console.log(`会话: ${target.sid}`);
console.log(`大小: ${(target.size / 1048576).toFixed(2)} MB   修改: ${target.mtime.toLocaleString('zh-CN')}`);
console.log(`共 ${turns.length} 轮对话` + (limit === Infinity ? '（显示全部）' : `（显示最后 ${Math.min(limit, turns.length)} 轮）`));

const start = limit === Infinity ? 0 : Math.max(0, turns.length - limit);
const shown = turns.slice(start);
console.log(`\n默认只显示对话正文。加 --thinking 看思考过程，--tools 看工具调用，--all 看全部轮次。\n${'='.repeat(70)}`);
shown.forEach((t, i) => console.log(fmtTurn(t, start + i)));
console.log('\n' + '='.repeat(70));
console.log(`（以上是最后 ${shown.length} 轮；全程共 ${turns.length} 轮）`);

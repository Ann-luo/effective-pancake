#!/usr/bin/env node
/**
 * Codex CDP Helper — 通过 Chrome DevTools Protocol 与 Codex (OpenAI 桌面客户端) 通信
 *
 * 用法:
 *   node codex_cdp_helper.js send "你的消息"
 *   node codex_cdp_helper.js read
 *   node codex_cdp_helper.js find       (仅查找 Codex 页面 ID)
 *
 * 前置: Codex 桌面客户端已启动（自动暴露 CDP 端口 9229）
 * 依赖: ws (npm install ws)
 */

const { WebSocket } = (() => {
  try { return require('ws'); } catch (e) {
    console.error('{"status":"MISSING_DEP","error":"ws package not found, installing..."}');
    require('child_process').execSync('npm install ws', { cwd: __dirname, stdio: 'inherit' });
    return require('ws');
  }
})();
const http = require('http');
const https = require('https');

// ── helpers ──────────────────────────────────────────────────────────────────

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error(`Parse error: ${e.message}, body: ${data.slice(0,200)}`)); }
      });
    }).on('error', reject);
  });
}

// ── CDP connection ───────────────────────────────────────────────────────────

async function findCodexPage() {
  const pages = await httpGet('http://127.0.0.1:9229/json');
  const targets = Array.isArray(pages) ? pages : [];
  const codex = targets.find(t =>
    t.type === 'page' &&
    ((t.url || '').toLowerCase().includes('codex') ||
     (t.title || '').toLowerCase().includes('codex'))
  );
  if (!codex) {
    throw new Error(
      `NO_CODEX_PAGE: Found ${targets.length} CDP target(s) but none with "codex" in URL or title. ` +
      `Titles found: ${targets.filter(t=>t.type==='page').map(t=>t.title).join(', ')}. ` +
      'Is the Codex desktop app running?'
    );
  }
  return codex;
}

function connectCDP(wsUrl, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    let msgId = 0;
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('CDP connection timeout'));
    }, timeoutMs);

    ws.on('open', () => clearTimeout(timer));

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.id !== undefined && pending.has(msg.id)) {
          const { resolve: res, reject: rej } = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) rej(new Error(`CDP error: ${msg.error.message || JSON.stringify(msg.error)}`));
          else res(msg.result);
        }
      } catch (e) { /* ignore parse errors on non-JSON frames */ }
    });

    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(new Error(`CDP WebSocket error: ${err.message}`));
    });

    ws.on('close', () => {
      // Reject all pending
      for (const [id, p] of pending) {
        p.reject(new Error('CDP connection closed'));
      }
      pending.clear();
    });

    const send = (method, params = {}) => {
      return new Promise((res, rej) => {
        const id = ++msgId;
        pending.set(id, { resolve: res, reject: rej });
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    ws.on('open', () => resolve({ ws, send }));
  });
}

// ── send message ─────────────────────────────────────────────────────────────

async function sendMessage(text) {
  console.error(`[codex-cdp] Finding Codex page...`);
  const page = await findCodexPage();
  console.error(`[codex-cdp] Connected to: ${page.url}`);

  const { send } = await connectCDP(page.webSocketDebuggerUrl);

  // Step 1: Store message text in a global variable (avoids JS string escaping issues)
  await send('Runtime.evaluate', {
    expression: `window.__claude_msg = ${JSON.stringify(text)}`,
  });
  console.error(`[codex-cdp] Stored message text`);

  // Step 2: Insert text into ProseMirror editor and dispatch input event
  const fillResult = await send('Runtime.evaluate', {
    expression: `
(function(){
  const msg = window.__claude_msg;
  // Find the ProseMirror editor div
  const pm = document.querySelector('.ProseMirror');
  if (!pm) return { ok: false, error: 'ProseMirror not found' };

  // Clear existing content
  pm.innerHTML = '';

  // Insert text node
  const textNode = document.createTextNode(msg);
  pm.appendChild(textNode);

  // Trigger input event so Codex detects the change
  pm.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, data: msg, inputType: 'insertText' }));

  // Also trigger compositionupdate for some Electron versions
  pm.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: msg }));
  pm.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: msg }));

  // Focus the editor
  pm.focus();

  // Verify
  return { ok: true, charCount: pm.textContent.length, preview: pm.textContent.slice(0, 80) };
})()
    `,
  });
  console.error(`[codex-cdp] Fill result: ${JSON.stringify(fillResult.result?.value || fillResult.result)}`);

  // Small delay for the editor to process the input
  await new Promise(r => setTimeout(r, 150));

  // Step 3: Send Enter key via dispatchKeyEvent (most reliable for Electron/ProseMirror)
  const KEY_CODE = 13;
  const MODIFIERS = 0;

  // rawKeyDown
  await send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: 'Enter',
    code: 'Enter',
    keyCode: KEY_CODE,
    windowsVirtualKeyCode: KEY_CODE,
    nativeVirtualKeyCode: KEY_CODE,
    modifiers: MODIFIERS,
  });
  console.error('[codex-cdp] rawKeyDown sent');

  // char
  await send('Input.dispatchKeyEvent', {
    type: 'char',
    text: '\r',
    key: 'Enter',
    code: 'Enter',
    keyCode: KEY_CODE,
    windowsVirtualKeyCode: KEY_CODE,
    nativeVirtualKeyCode: KEY_CODE,
    modifiers: MODIFIERS,
  });
  console.error('[codex-cdp] char sent');

  // keyUp
  await send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Enter',
    code: 'Enter',
    keyCode: KEY_CODE,
    windowsVirtualKeyCode: KEY_CODE,
    nativeVirtualKeyCode: KEY_CODE,
    modifiers: MODIFIERS,
  });
  console.error('[codex-cdp] keyUp sent');

  return {
    status: 'SENT',
    pageUrl: page.url,
    textPreview: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
    textLength: text.length,
  };
}

// ── read messages ────────────────────────────────────────────────────────────

async function readMessages() {
  console.error(`[codex-cdp] Finding Codex page...`);
  const page = await findCodexPage();
  console.error(`[codex-cdp] Connected to: ${page.url}`);

  const { send } = await connectCDP(page.webSocketDebuggerUrl);

  const result = await send('Runtime.evaluate', {
    expression: `
(function(){
  const messages = [];

  // Strategy 1: Look for conversation articles in the main area
  const main = document.querySelector('main');
  if (!main) return { messages: [], source: 'none', note: 'no <main> element found' };

  // Common selectors for Codex message containers:
  // - article[data-testid] or just article elements
  // - .group or [data-message-author-role]
  // - div elements with prose class

  // Try to find articles first (most structured)
  const articles = main.querySelectorAll('article');
  if (articles.length > 0) {
    for (const article of articles) {
      const text = article.textContent?.trim();
      if (text && text.length > 5) {
        // Try to determine role from aria-labels, data attributes, or position
        const ariaLabel = article.getAttribute('aria-label') || '';
        const dataRole = article.getAttribute('data-message-author-role') || '';
        const isUser = ariaLabel.toLowerCase().includes('user') ||
                       dataRole === 'user' ||
                       article.closest('[data-message-author-role="user"]');
        const isAssistant = ariaLabel.toLowerCase().includes('assistant') ||
                            dataRole === 'assistant' ||
                            article.closest('[data-message-author-role="assistant"]');

        let role = 'unknown';
        if (isUser && !isAssistant) role = 'user';
        else if (isAssistant && !isUser) role = 'assistant';
        else {
          // Heuristic: most assistants go second, alternating
          if (messages.length === 0) role = 'user';
          else role = messages[messages.length - 1].role === 'user' ? 'assistant' : 'user';
        }

        messages.push({ role, content: text });
      }
    }
    if (messages.length > 0) return { messages, source: 'articles', count: messages.length };
  }

  // Strategy 2: Fallback to text-based extraction from main
  const mainText = main.textContent?.trim() || '';
  if (mainText.length > 10) {
    // Try to find prose-marked sections as message boundaries
    const proseBlocks = main.querySelectorAll('.prose, [class*="prose"], [class*="message"]');
    if (proseBlocks.length > 0) {
      for (const block of proseBlocks) {
        const text = block.textContent?.trim();
        if (text && text.length > 5) {
          messages.push({ role: 'unknown', content: text });
        }
      }
      if (messages.length > 0) return { messages, source: 'prose-blocks', count: messages.length };
    }
  }

  // Strategy 3: Just return the full main text as one blob
  return { messages: [{ role: 'full', content: mainText.slice(0, 5000) }], source: 'main-text', count: 1 };
})()
    `,
    returnByValue: true,
  });

  const value = result.result?.value;
  if (!value) {
    return { status: 'ERROR', error: 'No result from Runtime.evaluate', raw: JSON.stringify(result.result) };
  }

  return {
    status: 'OK',
    ...value,
    timestamp: new Date().toISOString(),
  };
}

// ── find (just locate Codex page) ────────────────────────────────────────────

async function findOnly() {
  try {
    const page = await findCodexPage();
    console.log(JSON.stringify({
      status: 'FOUND',
      id: page.id,
      url: page.url,
      ws: page.webSocketDebuggerUrl,
    }));
  } catch (e) {
    console.log(JSON.stringify({ status: 'ERROR', error: e.message }));
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

const command = process.argv[2];

(async () => {
  try {
    switch (command) {
      case 'send': {
        const text = process.argv[3];
        if (!text || text.trim().length === 0) {
          console.error('Usage: node codex_cdp_helper.js send "your message here"');
          process.exit(1);
        }
        const result = await sendMessage(text);
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }

      case 'read': {
        const result = await readMessages();
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      }

      case 'find': {
        await findOnly();
        process.exit(0);
      }

      default:
        console.error([
          'Codex CDP Helper — communicate with the Codex desktop app via CDP',
          '',
          'Usage:',
          '  node codex_cdp_helper.js send "message"    Send a message to Codex',
          '  node codex_cdp_helper.js read               Read messages from Codex conversation',
          '  node codex_cdp_helper.js find               Find Codex CDP page info',
          '',
          'Requires: Codex desktop app running, ws npm package',
        ].join('\n'));
        process.exit(1);
    }
  } catch (e) {
    console.error(`[codex-cdp] FATAL: ${e.message}`);
    console.log(JSON.stringify({ status: 'ERROR', error: e.message }));
    process.exit(1);
  }
})();

---
name: codex-chat
description: 通过 CDP (Chrome DevTools Protocol) 与 Codex (OpenAI 桌面客户端) 通信——发消息、读回复、多轮对话。当用户提到 "codex"、"和 codex 聊天"、"给 codex 发消息"、"codex 回复"、"回复 codex"、"跟 codex 对话" 或使用 /codex-chat 时触发。
tools: Bash
---

# Codex Chat Skill

通过 CDP 协议远程控制 Codex (OpenAI 的 Electron 桌面客户端) 的聊天输入框，
发送消息并读取 Codex 的回复。支持多轮对话。

## 前置条件

- Codex 桌面客户端已启动（Codex 是基于 Electron 的应用，启动后会自动开启 CDP 调试端口 9229）
- `ws` npm 包可用（如未安装，脚本会自动安装）
- 辅助脚本位于: `~/.claude/skills/codex-chat/scripts/codex_cdp_helper.js`

## 工作流程

### 1. 确认 Codex CDP 端口是否就绪

```bash
curl -s http://127.0.0.1:9229/json | node -e "process.stdin.resume(); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{try{const p=JSON.parse(d);const t=p.find(e=>e.type==='page'&&e.url&&e.url.includes('codex'));if(t)console.log(JSON.stringify({id:t.id,url:t.url,ws:t.webSocketDebuggerUrl}));else console.log(JSON.stringify({error:'NO_CODEX_PAGE',pages:p.length}));}catch(e){console.log(JSON.stringify({error:'CDP_DOWN',msg:e.message}));}})"
```

如果在 `http://127.0.0.1:9229/json` 里找不到包含 "codex" 的页面 URL，需要先启动 Codex。

### 2. 发送消息给 Codex

```bash
node ~/.claude/skills/codex-chat/scripts/codex_cdp_helper.js send "你的消息内容"
```

脚本会自动：
- 连接到 Codex 的 CDP WebSocket
- 通过 `Runtime.evaluate` 将消息填入 ProseMirror 编辑器
- 用 `Input.dispatchKeyEvent` 发送 Enter 键提交消息
- 返回发送结果

### 3. 读取 Codex 的最新回复

```bash
node ~/.claude/skills/codex-chat/scripts/codex_cdp_helper.js read
```

返回 Codex 对话区域的最新消息列表（含角色和内容）。

### 4. 读取并自动回复（多轮对话）

```bash
node ~/.claude/skills/codex-chat/scripts/codex_cdp_helper.js read
```

拿到 Codex 的回复后，根据对话上下文生成回复，再用 `send` 发送回去。

## 多轮对话策略

执行完整对话循环时：

1. **读取** Codex 的最新回复
2. **理解** Codex 说了什么，提取其问题/意图
3. **生成** 友好的回复（保持 Claude Code 身份，语气自然，不做作）
4. **发送** 回复
5. 如果用户要继续对话，重复步骤 1-4

## 技术原理（供参考）

Codex 是 Electron 应用，启动时开启 `--remote-debugging-port=9229`。
通过 CDP WebSocket 可以直接控制页面 DOM 和输入事件。

核心技巧（经过多轮调试验证）：
1. **填充文本**: `Runtime.evaluate` 执行 JS 在 ProseMirror 编辑器 DIV 中插入文本节点并触发 `input` 事件
2. **安全传参**: 使用 `window.__claude_msg = msg` 全局变量避免字符串转义问题
3. **发送消息**: `Input.dispatchKeyEvent` 模拟 Enter 键（rawKeyDown + char + keyUp），比点击按钮更可靠
4. **读取消息**: `Runtime.evaluate` 查询 `document.querySelector('main')` 或遍历 `.prose` 元素提取对话内容

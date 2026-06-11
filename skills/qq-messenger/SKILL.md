---
name: qq-messenger
description: "Send messages through QQ on Windows using Computer Use automation. Use when the user asks to send a QQ message, chat with someone on QQ, or automate QQ conversations."
---

# QQ Messenger

Send QQ messages via Windows Computer Use automation.

## Workflow

### 1. Setup

```js
const { sky } = await import("@oai/sky");
const t = sky.transport;
const orig = t.request;
t.request = function(...args) {
  return orig.apply(this, [args[0], args[1], {
    ...(args[2] || {}),
    createElicitation: globalThis.nodeRepl?.createElicitation
  }]);
};
```

### 2. Find Window

```js
const apps = await sky.list_apps();
const qq = apps.find(a => a.id === "QQ");
const win = qq.windows.find(w => w.title === "NAME")  // target contact name
  || qq.windows.find(w => w.title === "QQ")
  || qq.windows[0];
```

### 3. Activate & Refresh

Windows may be minimized. Activate first, then get a fresh window handle via `list_apps`.

```js
await sky.activate_window({ window: win });
await new Promise(r => setTimeout(r, 1500));

// Refresh window handle — do NOT use sky.get_window (expects numeric id)
const appsR = await sky.list_apps();
const qqR = appsR.find(a => a.id === "QQ");
const winR = qqR.windows.find(w => w.title === win.title);
```

### 4. Send

```js
const state = await sky.get_window_state({ window: winR });
const ss = state.screenshots[0];

// Click input area: center-bottom of the window (QQ input box)
// coordinates are window-relative; (0,0) is top-left
await sky.click({
  window: state.window,
  x: Math.round(ss.width * 0.5),
  y: Math.round(ss.height * 0.93)
});
await new Promise(r => setTimeout(r, 400));

// Clear any existing text
await sky.press_key({ window: state.window, key: "Control_L+a" });
await sky.press_key({ window: state.window, key: "Delete" });

// Type the message
await sky.type_text({ window: state.window, text: "message" });

// Send: try Enter first, fall back to Return
await sky.press_key({ window: state.window, key: "Enter" });
// If message wasn't sent, retry with:
// await sky.press_key({ window: state.window, key: "Return" });
```

## Send Keys

QQ supports two send modes ("Enter sends" / "Ctrl+Enter sends"). The right key depends on the user's setting.

| Key | Result |
|-----|--------|
| `Enter` | Try first; works when QQ is in Enter send mode |
| `Return` | Try if `Enter` didn't send; works when QQ is in Ctrl+Enter send mode |
| `Ctrl+Enter` | May crash kernel — avoid |
| Click send button | Last resort; coordinate depends on QQ layout |

## Troubleshooting

- **"elicitations are unavailable"**: transport patch needed (Step 1)
- **"node_repl exec context not found"**: do `js_reset`, then re-run setup + the whole workflow in one call; avoid referencing variables from prior calls
- **"window is minimized"**: call `activate_window`, refresh window handle via `list_apps` (not `get_window`), then retry `get_window_state`
- **"id must be an integer >= 0"**: `sky.get_window` expects an opaque numeric id, but the QQ skill uses UUID window ids from `@oai/sky` direct import. Refresh via `list_apps` instead.
- **"Identifier 'x' has already been declared"**: use `var` for redeclarable top-level bindings, or reset with `js_reset` and start fresh with unique variable names
- **Message not sent with Enter**: try `Return` instead — QQ send mode mismatch. Also verify click coordinates hit the input area (center-bottom of window).
- **Typed text not visible in input**: click position may be off. Adjust `x`/`y` ratios in Step 4; typical QQ input box is at y=0.90–0.95, centered horizontally.

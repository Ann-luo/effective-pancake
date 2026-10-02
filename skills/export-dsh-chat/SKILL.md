
# 读 / 导出 DSH 会话记录

DSH **完整保存**了所有会话，只是格式不友好。本 skill 带两个已跑通的工具：

| 工具 | 干什么 | 给人看还是给程序看 |
|---|---|---|
| **`read-session.js`** | **直接在终端读对话**（默认） | 给人看 |
| `export-sessions.js` | 落盘成 JSONL | 给程序看 / 存档 |

> ⚠️ **别说"DSH 看不到记录"** —— 这句话是错的，会让用户以为数据丢了。
> 正确的说法是：**AI 的上下文看不到其他会话**，但**记录一直在磁盘上，能读也能导出**。

---

## 会话文件在哪

```
C:\Users\<用户名>\.dsh\sessions\<工作区目录>\<session-id>\session.v4.jsonl.zstd
```

- 工作区目录名 = 工作区路径把斜杠冒号换成 `-`，例：`--D-User-...-default-workspace--`
- 每个会话一个目录，里面的 `session.v4.jsonl.zstd` 就是全部记录
- **文件 mtime 最新的那个 = 最近活跃的会话**（可用来判断"哪个窗口在干活"）

---

## 怎么用

两个脚本都在 skill 目录里。**先设置一次路径**：

```powershell
# 用你自己的路径替换（装到哪就写哪）
$sk = "$env:USERPROFILE\.agents\skills\export-dsh-chat"
```

### ① 直接读（默认用这个，不落盘）

```powershell
# 读最新会话的最后 20 轮
node $sk\read-session.js

# 读某个会话（用编号，或完整 sid）
node $sk\read-session.js 3

# 只要最后 50 轮 / 要全部
node $sk\read-session.js 3 -n 50
node $sk\read-session.js 3 --all

# 跨会话搜关键词 —— 想找"以前聊过什么"时用这个
node $sk\read-session.js --search "关键词"

# 附带 AI 的思考过程 / 工具调用记录
node $sk\read-session.js --thinking
node $sk\read-session.js --tools
```

> **默认只显示对话正文。** 思考过程藏起来是有意的 ——
> 实测一篇回复里思考常占 80% 以上，全打出来真正的对话会被淹掉。

### ② 导出成文件（要存档或给程序处理时才用）

```powershell
$sk2 = "$env:USERPROFILE\.agents\skills\export-dsh-chat\export-sessions.js"

node $sk2                                 # 列出所有会话（编号 / 大小 / 时间）
node $sk2 1                               # 导出第 1 个
node $sk2 session-fd26279c-... 输出.jsonl  # 指定输出文件名
```

**导出前先 `cd` 到想要文件落地的目录**（不指定输出时写在当前目录）。

> ⚠️ **输出别写 `C:\tmp`** —— 那个目录不可写（`EPERM`）。建议 `cd` 到工作区或桌面。

### 导出结果长什么样

**JSONL 格式**，一行一个事件，每行带 `type` 字段：

| type | 含义 |
|---|---|
| `session` | 会话头（id / createdAt / cwd） |
| `assistant/message` | AI 的回复（**含 reasoning 内容**） |
| `tool/call` / `tool/result` | 工具调用与结果 |
| `step/start` / `step/end` | 每步开始结束 |
| `approval/asked` | 权限申请 |
| `agent/inbox/spliced` | 用户输入 |

**实测效果**（2.53 MB 的会话）：

```
解出 2109 帧 → 3421 行 → 6555 KB 文本
耗时 0.2s       无跳过 ✓ 完整读穿
JSON 解析失败行: 0 ✓
```

---

## 技术要点（别重走弯路）

`session.v4.jsonl.zstd` **不是一整个 zstd 流**，而是 **2000+ 个独立 zstd 帧首尾拼接**：

```
[帧0][帧1][帧2]……[帧2109]
```

**所以 `zlib.zstdDecompressSync(整个文件)` 只会解出第一帧** ——
表现为「解压出来只有 1 行、0 KB」。这个坑查了好几轮。

### 三条路，只有第三条通

| 做法 | 结果 |
|---|---|
| ✗ 按 RFC 8878 手工算帧头长度 | **一帧都解不出**（标志位含义对不上） |
| ✗ `eng.bytesWritten` 拿流式消耗量 | **始终是 0** |
| ✅ **遍历帧内的「块头」算帧长** | **2093 帧零失败完整读穿** |

### 正确的帧长算法

```
每块 3 字节头:
  b0 = [Last_Block(1bit) | Block_Type(2bit) | Block_Size 低 5 位]
  b1 = Block_Size 中 8 位
  b2 = Block_Size 高 8 位

Block_Type: 0=Raw  1=RLE  2=Compressed  3=保留(非法，遇到判失败)
RLE 块负载只有 1 字节，其余按 Block_Size 跳过
遇到 Last_Block 就停；若 FHD 的 Content_Checksum_Flag=1 再跳 4 字节
```

帧头部分（用于定位第一个块）：
`魔数(4B) + FHD(1B) + [Window_Descriptor(1B)] + [Dictionary_ID(0/1/2/4B)] + [Content_Size(1/2/4/8B)]`

**算法已经实现在工具里，直接用，不要重写。**

---

## 其他工具对比（用户可能会问）

| 工具 | 位置 | 格式 | 好不好读 |
|---|---|---|---|
| **DSH** | `~/.dsh/sessions/.../session.v4.jsonl.zstd` | 多帧 zstd | ❌ 要本工具 |
| **Claude Code** | `~/.claude/*.jsonl` | 明文 JSONL | ✅ 直接打开 |
| **Codex** | `~/.codex/logs_2.sqlite` | SQLite | ⚠️ 要数据库工具 |

---

## 注意

- **`~/.dsh/storages/session_projcache/sessions/*.json`** 是界面投影缓存（明文，`record.rows`），
  **不是完整对话**，别拿它当记录源
- **导出的是快照**：会话还在进行时文件会继续变大，导完再看可能又长了
- **不要删除或改动 `~/.dsh/sessions/` 里的文件** —— 那是 DSH 的运行时数据，只读

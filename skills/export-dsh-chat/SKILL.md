---
name: export-dsh-chat
description: 导出 DSH 的聊天记录 / 会话记录。当用户说"导出聊天记录""导出会话""我的聊天记录在哪""把对话导出来""看看历史会话""上次那个会话的记录"时使用。DSH 的会话存成多帧 zstd，普通解压只能解出第一帧，必须用本 skill 带的工具。
---

# 导出 DSH 会话记录

DSH **完整保存**了所有会话，只是格式不友好。本 skill 带一个已跑通的导出工具。

> ⚠️ **别说"DSH 看不到记录"** —— 这句话是错的，会让用户以为数据丢了。
> 正确的说法是：**AI 的上下文看不到其他会话**，但**记录一直在磁盘上，也能导出**。

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

工具在 skill 目录里。**先设置一次脚本路径，后面直接用 `$sk`**：

```powershell
# 用你自己的路径替换（安装到哪就写哪）
$sk = "$env:USERPROFILE\.agents\skills\export-dsh-chat\export-sessions.js"

# 列出所有会话（编号 / 大小 / 最后修改时间）
node $sk

# 导出（可用编号，也可用完整 sid）
node $sk 1
node $sk session-fd26279c-... 输出.jsonl
```

**导出前先 `cd` 到想要输出文件落地的目录**（不指定输出时，默认写在当前目录）。

> ⚠️ **输出别写 `C:\tmp`** —— 那个目录不可写（`EPERM`）。
> 建议 `cd` 到工作区或桌面再跑。

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

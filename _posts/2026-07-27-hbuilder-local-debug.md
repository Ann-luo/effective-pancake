---
layout: post
title: "HBuilder 本地调试实录 — 不消耗云打包额度"
date: 2026-07-27 12:00:00 +0800
categories: [Claude Code, AI工具]
tags: [HBuilder, Android, AVD, APK, 调试, 模拟器, 网络]
---
# HBuilder 本地调试实录 — 不消耗云打包额度

你在 HBuilder X 里做一个 HTML 转 APK 的项目，每次改完都得"发行 → 原生 App-云打包"上传到 DCloud 服务器编译成 APK。来来回回改个字号调个颜色都打包一次，免费额度一天就那么几次，用完了就只能干等着。

有没有办法不消耗额度，在本地反复跑着调试？有，很简单 — **模拟器 + ADB**。

这篇文章记录了我从踩坑到最终搞定的完整过程，写得比较随性，看完你应该能少走很多弯路。

---

## 一、HBuilder X 的调试逻辑，先搞懂

HBuilder X 本质上就是个上了 Buff 的 VS Code（基于它改的），它有两种部署方式：

| 方式 | 原理 | 消耗额度 | 适合什么时候用 |
|------|------|----------|----------------|
| 云端打包 | 项目上传到 DCloud 服务器，云端编译成 APK | 消耗 | 最终发布，生成正式安装包 |
| 运行到手机/模拟器 | 通过 ADB 把编译产物推到本地设备上跑 | 不消耗 | 日常调试，反复改反复测 |

所以你日常开发就应该用"运行到手机或模拟器"，只有准备发布了才去云打包。这个逻辑跟前端开发**本地 `npm run dev` 调试 → 最后 `npm run build` 上线**完全一样。HBuilder 只是把 `dev` 这一步的目标从浏览器换成了模拟器。

## 二、第一翻车：雷电模拟器

机器上有雷电模拟器 `D:\leidian`，我想直接用。结果 HBuilder X 报错：

```
ADB 反向代理创建失败，将使用局域网连接
error: closed
```

**原因很简单**：雷电把自己的核心进程 `LDPlayerSvr` 注册成了 Windows 系统服务。这个服务一直占着 `ldplayerservice.exe`，Windows 不让你删正在被打开的文件。加上我当前用户不是管理员，连 `Stop-Service`、`takeown`、`sc stop` 全被 Access is denied 挡回来。

所以雷电这条线直接放弃 — 连文件夹都删不掉，更别说调试了。

> 补充：所有 Android 模拟器（BlueStacks、雷电、MEmu）都需要底层虚拟化服务来管理网络驱动、ADB 桥接、多开等功能，这是刚需，不是这些厂商故意耍流氓。只是雷电的卸载流程写得比较糙，服务没停就放任用户手动删文件，体验确实不好。

## 三、第二翻车：BlueStacks 中国版

装了个 BlueStacks 5 中国版（安装路径：`C:\Program Files\BlueStacks_nxt_cn`）。ADB 能连上，`adb devices` 显示 `emulator-5554 device`，看起来一切正常。

但 HBuilder X 运行后**还是报同样的错**：`ADB 反向代理创建失败`。

这次我仔细排查了：

```powershell
# 用 BlueStacks 自带的 ADB（版本 1.0.36）
> HD-Adb.exe -s emulator-5554 reverse --list
# 返回: error: closed

> HD-Adb.exe -s emulator-5554 shell "echo hello"
# 返回: error: closed
```

连最基本的 `adb shell` 都进不去，说明问题不在 HBuilder，而在 **BlueStacks 模拟器内部的 adbd 服务有问题**。

**知识点**：`adb reverse` 是 HBuilder 调试 uni-app 的关键命令。它做的就是把模拟器里的某个端口反向映射到宿主机的端口上，这样模拟器才能访问到 HBuilder 的本地调试服务器。但 `adb reverse` 是 Android 5.0+ 才引入的功能，很多模拟器基于的 AOSP 版本要么太旧，要么 adbd 实现不完整，直接返回 `error: closed`。

BlueStacks 这条线也断了。

## 四、最终方案：Android SDK + AVD 官方模拟器

那什么模拟器的 ADB 最靠谱？当然是 Google 亲儿子的 **Android 虚拟设备 (AVD)**，Android Studio 自带的那个。

但我**不装完整的 Android Studio** — 太大了（1.5GB+），我也只需要模拟器 + ADB，不需要 Java/Kotlin 编辑器。所以走**命令行方式**，只装最小依赖。

全部手动安装过程如下，每一步都验证过。

### 4.1 装 JDK 21

Android SDK 的命令行工具需要 Java 才能跑。

```powershell
# 下载 Temurin JDK 21 (ZIP 包，解压即用)
Invoke-WebRequest -Uri "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.4%2B7/OpenJDK21U-jdk_x64_windows_hotspot_21.0.4_7.zip" -OutFile "$env:TEMP\jdk21.zip"

# 解压到目标目录
Expand-Archive -Path "$env:TEMP\jdk21.zip" -DestinationPath "D:\Program Files\Android\jdk" -Force

# 临时设一下环境变量，验证是否可用
$env:JAVA_HOME = "D:\Program Files\Android\jdk\jdk-21.0.4+7"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
java -version
# 输出: openjdk version "21.0.4" 2024-07-16 LTS
```

**为什么选 Adoptium（Temurin）JDK？** 开源，免登录下载，ZIP 包解压即用，不用跑安装程序，干净。

### 4.2 装 Android SDK Command Line Tools

```powershell
# 下载命令行工具（约 155MB）
Invoke-WebRequest -Uri "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip" -OutFile "$env:TEMP\cmdline-tools.zip"

# 解压并整理成标准布局
Expand-Archive -Path "$env:TEMP\cmdline-tools.zip" -DestinationPath "D:\Program Files\Android\cmdline-tools\tmp" -Force
Move-Item "D:\Program Files\Android\cmdline-tools\tmp\cmdline-tools" "D:\Program Files\Android\cmdline-tools\latest" -Force
```

**标准布局长这样：**

```
D:\Program Files\Android\
  cmdline-tools\
    latest\          ← sdkmanager 要求的路径
      bin\
        sdkmanager.bat
        avdmanager.bat
  jdk\
    jdk-21.0.4+7\
```

### 4.3 装 SDK 核心组件

在装之前先理清一个概念：Google 把 Android 开发工具拆成了很多独立包。就"做一个能用的模拟器"这件事，需要这些东西：

- **build-tools** — 编译工具（aapt、aidl、apksigner 等）
- **platform** — Android 框架 API，比如 `android.jar`
- **platform-tools** — adb、fastboot 等命令行工具
- **system-images** — 模拟器的系统镜像（相当于刷机包）
- **emulator** — 模拟器程序本身

一个一个装：

```powershell
# 先设置环境变量（后续每个命令都要用到）
$env:JAVA_HOME = "D:\Program Files\Android\jdk\jdk-21.0.4+7"
$env:PATH = "$env:JAVA_HOME\bin;D:\Program Files\Android\cmdline-tools\latest\bin;$env:PATH"
$env:ANDROID_HOME = "D:\Program Files\Android"

# 接受 license（管道输入 y，不然会卡在交互界面）
echo "y" | sdkmanager --sdk_root="D:\Program Files\Android" "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

Android 35 是目前最新稳定版，也是我们 AVD 将要用的系统版本。

### 4.4 装系统镜像 + 模拟器

```powershell
# 下载系统镜像（约 1GB，等了大概 3 分钟）
echo "y" | sdkmanager --sdk_root="D:\Program Files\Android" "system-images;android-35;google_apis;x86_64"
```

这里选的是 Google APIs 而不是 Google Play 版本 — 用于开发调试不需要 Play Store，Google APIs 包含了 Maps、Location 等 API 足够用了。`x86_64` 是因为 PC 是 x86 架构，千万别选 ARM，会卡到你怀疑人生。

### 4.5 创建 AVD 虚拟设备

```powershell
avdmanager create avd -n Pixel_API_35 -k "system-images;android-35;google_apis;x86_64" -d pixel_6
```

这会创建一个叫 `Pixel_API_35` 的虚拟 Pixel 6 手机，512MB SD 卡。AVD 数据默认存到：

```
C:\Users\你的用户名\.android\avd\Pixel_API_35.avd\
```

验证：

```powershell
> avdmanager list avd
# 输出:
# Name: Pixel_API_35
# Device: pixel_6 (Google)
# Target: Google APIs | Android API 35 | x86_64
```

### 4.6 写系统环境变量

```powershell
# 写入用户级环境变量（不需要管理员权限）
[Environment]::SetEnvironmentVariable("ANDROID_HOME", "D:\Program Files\Android", "User")

# 把模拟器和 ADB 都加到 PATH
$oldPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newPart = "D:\Program Files\Android\platform-tools;D:\Program Files\Android\emulator"
[Environment]::SetEnvironmentVariable("Path", "$oldPath;$newPart", "User")
```

这样以后在任何终端都能直接用 `adb` 和 `emulator` 命令。

### 4.7 改 AVD 配置：键盘 + GPU + 剪贴板

默认创建的 AVD 键盘输入是关的，得手动改配置文件：

```powershell
# 配置文件位置
$config = "$env:USERPROFILE\.android\avd\Pixel_API_35.avd\config.ini"

# 改两个关键项
(Get-Content $config) -replace 'hw\.keyboard = no', 'hw.keyboard = yes' | Set-Content $config
(Get-Content $config) -replace 'hw\.gpu\.enabled = no', 'hw.gpu.enabled = yes' | Set-Content $config
```

| 配置项 | 默认 | 改成 | 作用 |
|--------|------|------|------|
| `hw.keyboard` | no | yes | 物理键盘输入 |
| `hw.gpu.enabled` | no | yes | GPU 加速，流畅度暴涨 |

剪贴板共享**不用配** — AVD 模拟器天生就支持宿主机和模拟器之间复制粘贴。

### 4.8 创建快捷方式

```powershell
$wshell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath("Desktop")
$startmenu = [Environment]::GetFolderPath("StartMenu") + "\Programs"

foreach ($path in @($desktop, $startmenu)) {
    $shortcut = $wshell.CreateShortcut("$path\Android Emulator.lnk")
    $shortcut.TargetPath = "D:\Program Files\Android\emulator\emulator.exe"
    $shortcut.Arguments = "-avd Pixel_API_35"
    $shortcut.Description = "Android AVD Emulator - Pixel_API_35"
    $shortcut.WorkingDirectory = "D:\Program Files\Android\emulator"
    $shortcut.Save()
}
```

桌面和开始菜单各一个"Android Emulator"，双击即开。

## 五、HBuilder X 最后一步配置

AVD 在跑（设备 `emulator-5556` 在线），还需要在 HBuilder X 里指定用 Android SDK 的 ADB 而不是它自带的那个：

1. 菜单 → **工具 → 设置**
2. 搜索 `adb`
3. 找到 **运行配置 → ADB 路径**
4. 填上：
   ```
   D:\Program Files\Android\platform-tools\adb.exe
   ```
5. 保存

现在回到你的项目，点 **运行 → 运行到手机或模拟器**：

```
以前 → ADB 反向代理创建失败，error: closed

现在 → 项目编译 → adb reverse 建立连接 → 自动装到模拟器
       全程本地跑，0 额度消耗
```

## 六、最关键的几个坑，讲明白

### Q: 为什么 `adb reverse` 在 BlueStacks 上报 `error: closed`？

**A:** BlueStacks 5 中国版基于 Android 9（SDK 28），模拟器内部的 adbd 实现不完整。`adb reverse` 是 Android 5.0 引入的高级功能，需要设备端 adbd 的对应支持。Google 官方的 AVD 基于主线 AOSP，adbd 实现完整，不报这个错。

直观看对比：

```powershell
# BlueStacks (ADB v1.0.36)
> HD-Adb.exe -s emulator-5554 shell "echo hello"
error: closed

# AVD (ADB v1.0.41)  
> adb -s emulator-5556 shell "echo hello"
reverse_works
```

### Q: 为什么删不掉雷电和 BlueStacks 的文件夹？

**A:** 两个原因叠在一起：
1. 它们的核心进程注册成了 Windows 服务（`LDPlayerSvr`、`BstkSVC`），文件被进程死锁
2. 当前用户不是管理员，无法停止系统服务，也无法通过 `takeown` 抢文件所有权

**怎么解决**：要么用管理员身份跑 PowerShell 一口气执行 `sc stop 服务名; rd /s /q 文件夹`，要么装个 LockHunter 之类的解锁工具。BlueStacks 卸载程序其实已经跑过了 — 所有文件都改名成了 `.deleted` 后缀，重启电脑后通常就自动清了。

### Q: 为什么不用完整的 Android Studio？

**A:** 如果将来需要写 Kotlin/Java 原生代码，装一个没问题。但仅仅为了模拟器去下 1.5GB 的 IDE 不值当 — 命令行工具链加起来约 2GB，但是按需装的，不用走任何图形安装步骤，流程全可脚本化，下次重装系统一条命令就能复现。

## 七、最终目录一览

```text
D:\Program Files\Android\
  ├── cmdline-tools\latest\  ← sdkmanager, avdmanager
  ├── emulator\              ← 模拟器程序
  ├── jdk\jdk-21.0.4+7\      ← Java 21 运行时
  ├── platform-tools\        ← adb 1.0.41
  ├── platforms\android-35\  ← Android 35 API
  ├── build-tools\35.0.0\    ← 编译工具链
  └── system-images\android-35\google_apis\x86_64\  ← 系统镜像
```

```text
C:\Users\你的用户名\.android\avd\Pixel_API_35.avd\
  ├── config.ini   ← hw.keyboard=yes, hw.gpu.enabled=yes
  └── ...          ← AVD 磁盘文件（userdata.img, system.img 等）
```

桌面和开始菜单各一个 `Android Emulator` 快捷方式。

---

**That is it.** 从删不掉雷电文件夹的郁闷，到 BlueStacks 反复 `error: closed`，到最终靠 AVD 命令行装出一套干净可用的调试环境 — 绕了一大圈，但全是可复现的步骤。下次谁再问"HBuilder 怎么不消耗额度调试"，把这篇文章甩给他。

## 八、第四翻车 + 终极修复：AVD 网络不通

前面说"AVD 的 ADB reverse 完美支持" — 确实，ADB 通道一路畅通。但跑起来之后发现：**模拟器上不了网**。这是坑中坑。

### 8.1 现象

模拟器里的 HTML 应用 `fetch('https://api.deepseek.com/v1/chat/completions')` 请求失败。一排查：

```powershell
> adb shell ping api.deepseek.com
ping: unknown host api.deepseek.com
> adb shell ping 223.5.5.5
connect: Network is unreachable
> adb shell ip addr show eth0
eth0: <BROADCAST,MULTICAST> state DOWN
```

网卡都没起来，更别说 DNS 了。

### 8.2 试过的所有方法（全失败了）

按时间线排列：

| 尝试 | 方法 | 结果 |
|------|------|------|
| 1 | 冷启动 `-no-snapshot` | eth0 仍 DOWN |
| 2 | `-wipe-data` 全清冷启动 | eth0 仍 DOWN |
| 3 | `adb root` + `ip link set eth0 up` + 手工配 IP | eth0 UP，但 `ip route add default via 10.0.2.2` 报 Network unreachable |
| 4 | 删掉 AVD 重建 + `-engine classic` | FATAL: classic 引擎不支持 x86_64 |
| 5 | 重建 AVD 正常冷启动 | eth0 UP + IP 自动分配，但路由不通 |
| 6 | QEMU `-netdev user,id=mynet` 直传参数 | 无变化 |
| 7 | `-dns-server 223.5.5.5` 参数注入 | DNS 能设上但 eth0 不通也没用 |
| 8 | 下载 Android 34 镜像（降级测试） | Google CDN 下到 700MB 断了，重试也一样 |
| 9 | 下载 Android 33 镜像 | 同上，网络不稳 |

期间还发现一个槽点：**每次删 AVD 重建，`hw.keyboard` 和 `hw.gpu.enabled` 都会被重置回 `no`**，键盘又不能用了。得关模拟器 → 改 config.ini → `-no-snapshot-load` 冷启动才能恢复。

### 8.3 突破口

排查到 `dumpsys connectivity`，看见一行刺眼的输出：

```
Active default network: none
```

系统里 Wi-Fi 驱动报了一堆错（`Unknown iface name: wlan0`），蜂窝网络没有 SIM 卡也不会工作。eth0 虽然网卡起来了、IP 配好了、路由也设了——但 Android 的 `ConnectivityService` 根本不知道它的存在。以太网服务（`cmd ethernet`）在 Android 35 的 Google APIs 镜像里直接没包含。

我把关键日志给截出来了：

```bash
> adb shell dumpsys connectivity
Active default network: none
Current Networks:
# ← 空的！没有任何注册的网络
```

然后死马当活马医地试了一行：

```bash
> adb shell svc wifi disable
```

Boom——`dumpsys connectivity` 变了：

```
Active default network: 101
```

系统终于找到了一个能用的网络。再试网络：

```bash
> adb shell ping baidu.com
# baidu.com resolved to 110.242.74.102 ← DNS 通了！！！
# 但 ping 100% 丢包 ← ICMP 被 QEMU SLIRP 拦了

> adb shell am start -a android.intent.action.VIEW -d https://www.baidu.com
# Chrome 弹出来，百度页面加载成功！！！
```

### 8.4 根因分析

**Android 35 的 "Google APIs" 系统镜像的 Wi-Fi HAL 实现有 bug。** Wi-Fi 驱动一直在尝试初始化但反复失败（`Failed to register radio mode change callback`），同时**阻塞了整个网络栈**，导致 `ConnectivityService` 没有注册任何网络。

关掉 Wi-Fi 之后，系统强制 fallback 到了一个隐藏的网络提供者（网络 ID 101）——这个提供者绑定了 eth0 接口。

UDP 通路（DNS）是通的，TCP（HTTP/HTTPS）也是通的，只有 ICMP（ping）被 QEMU 的 SLIRP 虚拟网络栈屏蔽了。**ping 不通不代表网络不通，要实打实用 TCP 去测。**

### 8.5 持久化

为防重启后 Wi-Fi 又活过来，写死到系统设置：

```bash
adb root
adb shell settings put global wifi_on 0
adb shell settings put global wifi_scan_always_enabled 0
```

这样 `svc wifi disable` 的效果就是永久的了。

### 8.6 键盘配置容易丢

每次重建 AVD（比如删了重新 `avdmanager create`），`config.ini` 里的键盘和 GPU 配置都会被重置成默认值。修复步骤：

```powershell
# 关模拟器
Get-Process -Name "emulator" | Stop-Process -Force

# 改配置
$config = "$env:USERPROFILE\.android\avd\Pixel_API_35.avd\config.ini"
(Get-Content $config) -replace 'hw\.keyboard=no', 'hw.keyboard=yes' `
                      -replace 'hw\.gpu\.enabled=no', 'hw.gpu.enabled=yes' `
| Set-Content $config

# 冷启动（不要从快照恢复，否则旧配置继续生效）
emulator -avd Pixel_API_35 -no-snapshot-load
```

正常关机后配置会写进新快照，下次就不需要 `-no-snapshot-load` 了。

### 8.7 关于剪贴板

AVD 模拟器默认就支持宿主机和模拟器之间的剪贴板共享，**不需要额外配置**。Ctrl+C/V 直接用。如果失效了，模拟器窗口菜单 → "Clipboard" 确认勾上了。

### 8.8 下载镜像失败的教训

如果 Google CDN 下载镜像老是断，可能换成 `default` 类型的镜像（比 `google_apis` 小）或者挂代理。最稳妥的还是等网络好的时候一次性下完，别在中途中断。

---

## 九、完整故障排查思维模型

回头看这一整天的踩坑路线，其实可以抽象成一个排查优先级：

```
模拟器上不了网？
  1. DNS 通不通？（ping 域名）
     └─ 不通 → ping IP 通不通？
        └─ 不通 → 网卡起来了没？（ip addr）
           └─ 没起来 → 路由通不通？（ip route）
  2. DNS 通但 TCP 不通？
     └─ 用浏览器打开一个网页试试，别只信 ping
  3. 什么都不通？
     └─ dumpsys connectivity 看 Active default network
        └─ none → 系统没有注册网络 → 关 Wi-Fi 试试
```

最深的坑是**信了 ping**——它 100% 丢包不代表网络真断了，只是 ICMP 被 SLIRP 拦了。拿 TCP（浏览器/curl）去测才是真金。

---

**最终结论：** 从雷电的删不掉，到 BlueStacks 的 `error: closed`，到 AVD 的网络 `Active default network: none`，到一行 `svc wifi disable` 解决问题——兜了一大圈，但每一步排查都有明确的线索可循。现在 HBuilder X 点"运行到手机或模拟器"，ADB reverse 正常，模拟器网络正常，API 请求正常，0 额度消耗。到此为止，这套调试环境算是真正生产就绪了。


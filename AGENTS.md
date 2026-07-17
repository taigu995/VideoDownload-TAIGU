# AGENTS.md

## 项目概览
VideoSniffer - 浏览器式视频嗅探与下载工具，支持网页浏览、书签管理、视频嗅探下载，可一键打包为 Windows EXE 桌面程序。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: Tailwind CSS + shadcn/ui 风格
- **桌面**: Electron (BrowserView + IPC)
- **后端**: yt-dlp (Python) 用于视频解析、下载和格式转换

## 目录结构
```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── parse/route.ts         # 视频解析 API
│   │   │   ├── download/route.ts      # 视频下载 API
│   │   │   └── package/route.ts       # EXE 打包下载 API
│   │   ├── page.tsx                   # 主页面（浏览器式 UI）
│   │   └── layout.tsx                 # 根布局
│   └── components/ui/                 # UI 组件库
├── electron/
│   ├── main.js                        # Electron 主进程（BrowserView + IPC）
│   ├── preload.js                     # 主窗口预加载脚本
│   └── webview-preload.js             # BrowserView 预加载脚本
├── public/                            # 静态资源
├── AGENTS.md                          # 项目说明
└── DESIGN.md                          # 设计规范
```

## 核心功能

### 1. 浏览器式网页浏览
- 地址栏：输入 URL 或搜索关键词
- 导航按钮：前进、后退、刷新
- 标签页管理
- 使用 iframe（Web 版）或 BrowserView（Electron 桌面版）渲染网页

### 2. 书签管理
- 书签栏：显示常用网站快捷入口
- 添加书签：点击地址栏右侧星标
- 删除书签：悬停书签后点击 X
- 书签持久化：localStorage 存储

### 3. 视频嗅探
- 点击 "Scan Videos" 按钮扫描当前页面视频资源
- 检测 video 标签、source 标签、iframe 嵌入、m3u8/mp4 链接
- Electron 版通过 BrowserView 注入脚本实现深度嗅探

### 4. 视频下载与转换
- 选择嗅探到的视频进行下载
- 自动转换为 MP4 格式
- 下载路径可通过设置面板修改（Electron 版支持原生文件夹选择对话框）

### 5. 一键打包 EXE (/api/package)
- 输出：ZIP 包，包含完整 Electron 项目
- 使用方式：
  1. 下载 ZIP 并解压
  2. 在 Windows 上双击 `build.bat`
  3. 等待构建完成，EXE 在 `dist` 目录
- 依赖：Node.js 18+、pnpm

## 开发命令
```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
```

## 注意事项
- Web 版使用 iframe 加载网页，部分网站可能因 X-Frame-Options 限制无法嵌入
- Electron 桌面版使用 BrowserView，可正常浏览所有网站
- 后端依赖 yt-dlp，需确保 Python 环境已安装
- EXE 打包功能需要在本地 Windows 环境执行
- 视频下载自动转换为 MP4 格式

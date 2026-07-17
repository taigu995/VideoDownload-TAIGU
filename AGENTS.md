# AGENTS.md

## 项目概览
VideoSniffer - Web 视频嗅探与下载工具，支持一键打包为 Windows EXE 程序。

## 技术栈
- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI**: Tailwind CSS + shadcn/ui 风格
- **后端**: yt-dlp (Python) 用于视频解析和下载

## 目录结构
```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── parse/route.ts      # 视频解析 API
│   │   │   ├── download/route.ts   # 视频下载 API
│   │   │   └── package/route.ts    # EXE 打包下载 API
│   │   ├── page.tsx                # 主页面
│   │   └── layout.tsx              # 根布局
│   └── components/ui/              # UI 组件库
├── electron/
│   ├── main.js                     # Electron 主进程
│   └── preload.js                  # Electron 预加载脚本
├── public/                         # 静态资源
└── DESIGN.md                       # 设计规范
```

## 核心功能

### 1. 视频嗅探 (/api/parse)
- 输入：视频页面 URL
- 输出：视频信息（标题、封面、时长）+ 可用格式列表
- 支持：YouTube、Bilibili、TikTok、Twitter/X、Instagram 等 1000+ 网站
- 依赖：yt-dlp

### 2. 视频下载 (/api/download)
- 输入：URL + format_id + ext
- 输出：视频文件流
- 流程：yt-dlp 下载 → 临时文件 → 流式返回

### 3. 一键打包 EXE (/api/package)
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
- 后端依赖 yt-dlp，需确保 Python 环境已安装
- 沙箱环境可能无法访问外部视频网站（网络限制）
- EXE 打包功能需要在本地 Windows 环境执行
- 所有 API 均使用 yt-dlp，支持 User-Agent 和 Referer 头以绕过反爬

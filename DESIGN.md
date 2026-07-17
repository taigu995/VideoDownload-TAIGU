# DESIGN.md

## 品牌与视觉方向
- 产品名：VideoSniffer
- 定位：专业视频嗅探与下载工具，暗色系科技感界面
- 气质：高效、专业、极简，类似专业工具软件的视觉语言

## Design Tokens

### 色彩
- 背景：深色渐变 slate-950 → slate-900 → indigo-950
- 主色：violet-600 → cyan-500 渐变（按钮、强调元素）
- 辅助色：cyan-400/500（音频标签、次要操作）
- 文字：白色主文字、slate-400 次要文字、slate-500 辅助文字
- 错误：red-500/10 背景 + red-500/20 边框 + red-300 文字
- 卡片：white/[0.03~0.06] 背景 + white/[0.06~0.10] 边框

### 字体
- 系统默认字体栈（Tailwind 默认）

### 圆角
- 大容器：rounded-2xl
- 标签/按钮：rounded-lg / rounded-xl
- 图标容器：rounded-xl / rounded-3xl

### 阴影与光效
- 按钮：shadow-lg shadow-violet-500/20
- 毛玻璃：backdrop-blur-xl + bg-white/[0.02]

## 交互与状态
- 按钮悬停：渐变色变亮
- 禁用态：opacity-40 + cursor-not-allowed
- 加载态：animate-spin 旋转图标
- 卡片悬停：背景色加深 + 边框变亮

## 设计禁忌
- 不使用亮色/白色背景
- 不使用过多装饰元素
- 不使用圆角过小的按钮

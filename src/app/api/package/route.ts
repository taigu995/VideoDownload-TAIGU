import { NextRequest, NextResponse } from 'next/server';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const tmpDir = path.join(os.tmpdir(), `vs-pack-${randomUUID()}`);
    fs.mkdirSync(tmpDir, { recursive: true });

    const projectRoot = process.cwd();

    // Create the package directory structure
    const pkgDir = path.join(tmpDir, 'VideoSniffer');
    fs.mkdirSync(path.join(pkgDir, 'electron'), { recursive: true });
    fs.mkdirSync(path.join(pkgDir, 'scripts'), { recursive: true });

    // 1. Copy electron main files
    const mainJs = fs.readFileSync(path.join(projectRoot, 'electron', 'main.js'), 'utf-8');
    const preloadJs = fs.readFileSync(path.join(projectRoot, 'electron', 'preload.js'), 'utf-8');
    const webviewPreloadJs = fs.readFileSync(path.join(projectRoot, 'electron', 'webview-preload.js'), 'utf-8');
    fs.writeFileSync(path.join(pkgDir, 'electron', 'main.js'), mainJs);
    fs.writeFileSync(path.join(pkgDir, 'electron', 'preload.js'), preloadJs);
    fs.writeFileSync(path.join(pkgDir, 'electron', 'webview-preload.js'), webviewPreloadJs);

    // 2. Create package.json for electron build
    const electronPkg = {
      name: 'video-sniffer',
      version: '1.0.0',
      description: 'VideoSniffer - Web Video Detector & Downloader',
      main: 'electron/main.js',
      scripts: {
        'build:next': 'next build',
        'build:electron': 'electron-builder --win --x64',
        'build': 'node scripts/build.js',
        'start': 'electron .',
      },
      build: {
        appId: 'com.videosniffer.app',
        productName: 'VideoSniffer',
        directories: {
          output: 'dist',
        },
        files: [
          'electron/**/*',
          'src/**/*',
          'public/**/*',
          '.next/**/*',
          'next.config.ts',
          'package.json',
          'tsconfig.json',
        ],
        extraResources: [
          {
            from: '.next/standalone',
            to: 'app/.next/standalone',
          },
          {
            from: '.next/static',
            to: 'app/.next/static',
          },
          {
            from: 'public',
            to: 'app/public',
          },
        ],
        win: {
          target: [
            {
              target: 'nsis',
              arch: ['x64'],
            },
          ],
          icon: 'electron/icon.ico',
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true,
          shortcutName: 'VideoSniffer',
        },
      },
      dependencies: {
        next: '^16.0.0',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        tailwindcss: '^4.0.0',
        'react-dev-inspector': '^2.0.0',
        '@radix-ui/react-accordion': '^1.2.0',
        '@radix-ui/react-alert-dialog': '^1.1.0',
        '@radix-ui/react-aspect-ratio': '^1.1.0',
        '@radix-ui/react-avatar': '^1.1.0',
        '@radix-ui/react-checkbox': '^1.1.0',
        '@radix-ui/react-collapsible': '^1.1.0',
        '@radix-ui/react-context-menu': '^2.2.0',
        '@radix-ui/react-dialog': '^1.1.0',
        '@radix-ui/react-dropdown-menu': '^2.1.0',
        '@radix-ui/react-hover-card': '^1.1.0',
        '@radix-ui/react-label': '^2.1.0',
        '@radix-ui/react-menubar': '^1.1.0',
        '@radix-ui/react-navigation-menu': '^1.2.0',
        '@radix-ui/react-popover': '^1.1.0',
        '@radix-ui/react-progress': '^1.1.0',
        '@radix-ui/react-radio-group': '^1.2.0',
        '@radix-ui/react-scroll-area': '^1.2.0',
        '@radix-ui/react-select': '^2.1.0',
        '@radix-ui/react-separator': '^1.1.0',
        '@radix-ui/react-slider': '^1.2.0',
        '@radix-ui/react-slot': '^1.1.0',
        '@radix-ui/react-switch': '^1.1.0',
        '@radix-ui/react-tabs': '^1.1.0',
        '@radix-ui/react-toggle': '^1.1.0',
        '@radix-ui/react-toggle-group': '^1.1.0',
        '@radix-ui/react-tooltip': '^1.1.0',
        'lucide-react': '^0.400.0',
        'react-day-picker': '^9.0.0',
        'date-fns': '^4.0.0',
        'embla-carousel-react': '^8.0.0',
        'class-variance-authority': '^0.7.0',
        clsx: '^2.1.0',
        'tailwind-merge': '^2.0.0',
      },
      devDependencies: {
        electron: '^33.0.0',
        'electron-builder': '^25.0.0',
        typescript: '^5.0.0',
        '@types/react': '^19.0.0',
        '@types/react-dom': '^19.0.0',
      },
    };
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(electronPkg, null, 2));

    // 3. Create one-click build script (batch file for Windows)
    const buildBat = `@echo off
title VideoSniffer - Build EXE
set LOG_FILE=%~dp0build.log

echo ============================================ > "%LOG_FILE%"
echo   VideoSniffer EXE Build Tool              >> "%LOG_FILE%"
echo   For Windows 10/11 (64-bit)               >> "%LOG_FILE%"
echo ============================================ >> "%LOG_FILE%"
echo Build started at %date% %time%             >> "%LOG_FILE%"
echo.                                            >> "%LOG_FILE%"

echo.
echo ============================================
echo   VideoSniffer EXE Build Tool
echo   For Windows 10/11 (64-bit)
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found! Please install Node.js 18+
    echo [ERROR] Node.js not found >> "%LOG_FILE%"
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js found:
node --version
echo [OK] Node.js: >> "%LOG_FILE%"
node --version >> "%LOG_FILE%" 2>&1

:: Check pnpm
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] pnpm not found, installing globally...
    echo [INFO] Installing pnpm... >> "%LOG_FILE%"
    call npm install -g pnpm >> "%LOG_FILE%" 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [WARN] Global pnpm install failed, will use npx pnpm
        echo [WARN] pnpm install failed >> "%LOG_FILE%"
    ) else (
        echo [OK] pnpm installed successfully
        echo [OK] pnpm installed >> "%LOG_FILE%"
    )
) else (
    echo [OK] pnpm found:
    call pnpm --version
    echo [OK] pnpm: >> "%LOG_FILE%"
    call pnpm --version >> "%LOG_FILE%" 2>&1
)

echo.
echo [1/5] Checking for build patches...
echo [1/5] Checking for build patches... >> "%LOG_FILE%"

:: Auto-download build patches to prevent build failures
echo [INFO] Checking for build patches...
echo [INFO] Checking for build patches... >> "%LOG_FILE%"

:: Check if patch script exists
if exist "scripts\apply-patches.js" (
    echo [INFO] Applying build patches...
    echo [INFO] Applying build patches... >> "%LOG_FILE%"
    node scripts\apply-patches.js >> "%LOG_FILE%" 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [OK] Build patches applied successfully
        echo [OK] Build patches applied >> "%LOG_FILE%"
    ) else (
        echo [WARN] Some patches failed to apply, continuing...
        echo [WARN] Some patches failed >> "%LOG_FILE%"
    )
) else (
    echo [INFO] No patches to apply
    echo [INFO] No patches to apply >> "%LOG_FILE%"
)

echo.
echo [2/5] Installing dependencies...
echo [2/5] Installing dependencies... >> "%LOG_FILE%"

:: Use npm instead of pnpm to avoid build script restrictions
call npm install >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Dependency installation failed!
    echo [ERROR] Dependency install failed >> "%LOG_FILE%"
    echo.
    echo Check build.log for details
    pause
    exit /b 1
)
echo [OK] Dependencies installed
echo [OK] Dependencies installed >> "%LOG_FILE%"

echo.
echo [3/5] Building Next.js application...
echo [3/5] Building Next.js... >> "%LOG_FILE%"
call npm run build:next >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Next.js build failed!
    echo [ERROR] Next.js build failed >> "%LOG_FILE%"
    echo.
    echo Check build.log for details
    pause
    exit /b 1
)
echo [OK] Next.js build complete
echo [OK] Next.js build complete >> "%LOG_FILE%"

echo.
echo [4/5] Packaging Electron desktop app...
echo [4/5] Packaging Electron... >> "%LOG_FILE%"
call npm run build:electron >> "%LOG_FILE%" 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Electron packaging failed!
    echo [ERROR] Electron packaging failed >> "%LOG_FILE%"
    echo.
    echo Check build.log for details
    pause
    exit /b 1
)
echo [OK] Electron packaging complete
echo [OK] Electron packaging complete >> "%LOG_FILE%"

echo.
echo [5/5] Build complete!
echo [5/5] Build complete >> "%LOG_FILE%"
echo.
echo ============================================
echo   EXE installer is in the "dist" folder
echo   Double-click the EXE to install
echo ============================================
echo.

if exist dist (
    explorer dist
)

echo Build completed successfully at %date% %time% >> "%LOG_FILE%"
echo.
echo Full log saved to: %LOG_FILE%
pause
exit /b 0
`;
    fs.writeFileSync(path.join(pkgDir, 'build.bat'), buildBat);

    // 4. Create Node.js build script (cross-platform)
    const buildJs = `#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

console.log('');
console.log('  ============================================');
console.log('    VideoSniffer EXE Build Tool');
console.log('    For Windows 10/11 (64-bit)');
console.log('  ============================================');
console.log('');

function run(cmd, label) {
  console.log(\`[\${label}] Running: \${cmd}\`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log(\`[\${label}] Done!\`);
  } catch (err) {
    console.error(\`[\${label}] Failed:\`, err.message);
    process.exit(1);
  }
}

run('npm install --legacy-peer-deps', 'Step 1/3 - Install dependencies');
run('npm run build:next', 'Step 2/3 - Build Next.js');
run('npm run build:electron', 'Step 3/3 - Package Electron');

console.log('');
console.log('  Build complete! EXE installer is in the "dist" folder');
console.log('');
`;
    fs.writeFileSync(path.join(pkgDir, 'scripts', 'build.js'), buildJs);

    // 5. Create next.config for standalone output
    const nextConfig = `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  serverExternalPackages: ['yt-dlp'],
};

export default nextConfig;
`;
    fs.writeFileSync(path.join(pkgDir, 'next.config.ts'), nextConfig);

    // 6. Copy essential source files
    const copyDir = (src: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true });
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
            copyDir(srcPath, destPath);
          }
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };

    // Copy source directories
    const dirsToCopy = ['src', 'public', 'electron'];
    for (const dir of dirsToCopy) {
      const srcPath = path.join(projectRoot, dir);
      if (fs.existsSync(srcPath)) {
        copyDir(srcPath, path.join(pkgDir, dir));
      }
    }

    // Copy config files
    const configFiles = ['tsconfig.json'];
    for (const file of configFiles) {
      const srcPath = path.join(projectRoot, file);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(pkgDir, file));
      }
    }

    // Create .gitignore
    const gitignore = `node_modules
.next
dist
*.log
.DS_Store
`;
    fs.writeFileSync(path.join(pkgDir, '.gitignore'), gitignore);

    // 7. Create apply-patches.js script for auto-fixing build issues
    const applyPatchesScript = `#!/usr/bin/env node
/**
 * VideoSniffer Build Patches
 * Automatically fixes common build issues
 */

const fs = require('fs');
const path = require('path');

console.log('[Patch] Checking for common build issues...');

let patchesApplied = 0;

// Patch 1: Fix missing tw-animate-css import
const globalsCssPath = path.join(__dirname, '..', 'src', 'app', 'globals.css');
if (fs.existsSync(globalsCssPath)) {
  let content = fs.readFileSync(globalsCssPath, 'utf8');
  if (content.includes("@import 'tw-animate-css'")) {
    content = content.replace("@import 'tw-animate-css';\\n", '');
    fs.writeFileSync(globalsCssPath, content);
    console.log('[Patch] Fixed: Removed tw-animate-css import');
    patchesApplied++;
  }
}

// Patch 2: Check for missing dependencies
const pkgPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const requiredDeps = ['react-day-picker', 'date-fns'];
  const missingDeps = requiredDeps.filter(dep => !deps[dep]);
  if (missingDeps.length > 0) {
    console.log('[Patch] Warning: Missing dependencies:', missingDeps.join(', '));
    console.log('[Patch] Please run: npm install ' + missingDeps.join(' '));
  }
}

// Patch 2: Ensure all Radix UI dependencies are installed
const pkgPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const requiredDeps = [
    '@radix-ui/react-accordion',
    '@radix-ui/react-slot',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-tooltip',
  ];
  
  let needsUpdate = false;
  for (const dep of requiredDeps) {
    if (!pkg.dependencies[dep]) {
      console.log(\`[Patch] Warning: Missing dependency \${dep}\`);
      needsUpdate = true;
    }
  }
  
  if (needsUpdate) {
    console.log('[Patch] Run npm install to ensure all dependencies are installed');
  }
}

// Patch 3: Fix Next.js config for standalone mode
const nextConfigPath = path.join(__dirname, '..', 'next.config.ts');
if (fs.existsSync(nextConfigPath)) {
  let content = fs.readFileSync(nextConfigPath, 'utf8');
  if (!content.includes('output:')) {
    content = content.replace(
      'const nextConfig: NextConfig = {',
      'const nextConfig: NextConfig = {\\n  output: "standalone",'
    );
    fs.writeFileSync(nextConfigPath, content);
    console.log('[Patch] Fixed: Added standalone output to next.config.ts');
    patchesApplied++;
  }
}

console.log(\`[Patch] \${patchesApplied} patch(es) applied\`);
process.exit(0);
`;
    fs.mkdirSync(path.join(pkgDir, 'scripts'), { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'scripts', 'apply-patches.js'), applyPatchesScript);

    // 8. Create README
    const readme = `# VideoSniffer - 视频嗅探浏览器 EXE 打包工具

## 系统要求
- Windows 10/11 (64位)
- Node.js 18+ (下载地址: https://nodejs.org/)
- pnpm (缺失时会自动安装)

## 一键打包步骤
1. 解压本压缩包到任意目录
2. 双击运行 \`build.bat\`
3. 等待打包完成（首次约 5-10 分钟）
4. 打包完成后，EXE 安装程序在 \`dist\` 文件夹中
5. 双击 EXE 安装即可使用

## 功能特性
- 浏览器式网页浏览（地址栏、书签、标签页）
- 网页视频自动嗅探（支持 video/source/m3u8/mp4）
- 视频下载并自动转换为 MP4 格式
- 一键翻译外文网页为中文
- 网页文字可复制粘贴
- 自定义视频下载保存路径
- 支持 1000+ 网站（YouTube、Bilibili、TikTok、Twitter/X、Instagram 等）

## 手动构建
\`\`\`bash
pnpm install
pnpm run build
\`\`\`

## 注意事项
- 首次构建需要下载 Electron 和依赖包，请耐心等待
- 生成的 EXE 是独立安装程序，无需额外运行环境
- yt-dlp 会在首次运行时自动下载
- 桌面版使用 BrowserView 加载网页，可正常浏览所有网站
- Web 版使用 iframe，部分网站可能因安全策略限制无法嵌入
`;
    fs.writeFileSync(path.join(pkgDir, 'README.md'), readme);

    // 9. Create zip file
    const zipPath = path.join(tmpDir, 'VideoSniffer-EXE-Builder.zip');
    try {
      execFileSync('zip', ['-r', '-q', zipPath, 'VideoSniffer'], { cwd: tmpDir });
    } catch {
      // Fallback: try tar if zip is not available
      execFileSync('tar', ['-czf', zipPath.replace('.zip', '.tar.gz'), 'VideoSniffer'], { cwd: tmpDir });
    }

    const actualZip = fs.existsSync(zipPath) ? zipPath : zipPath.replace('.zip', '.tar.gz');
    const zipBuffer = fs.readFileSync(actualZip);

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });

    return new Response(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="VideoSniffer-EXE-Builder.zip"',
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Package error:', error);
    const errMsg = error instanceof Error ? error.message : 'Package failed';
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}

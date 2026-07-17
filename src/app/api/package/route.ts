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
    fs.writeFileSync(path.join(pkgDir, 'electron', 'main.js'), mainJs);
    fs.writeFileSync(path.join(pkgDir, 'electron', 'preload.js'), preloadJs);

    // 2. Create package.json for electron build
    const electronPkg = {
      name: 'video-sniffer',
      version: '1.0.0',
      description: 'VideoSniffer - Web Video Detector & Downloader',
      main: 'electron/main.js',
      scripts: {
        'build:next': 'pnpm run build',
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
      },
      devDependencies: {
        electron: '^33.0.0',
        'electron-builder': '^25.0.0',
      },
    };
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(electronPkg, null, 2));

    // 3. Create one-click build script (batch file for Windows)
    const buildBat = `@echo off
chcp 65001 >nul
title VideoSniffer - Build EXE
echo.
echo  ============================================
echo    VideoSniffer EXE Builder
echo    One-click build for Windows
echo  ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found! Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

:: Check pnpm
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Installing pnpm...
    npm install -g pnpm
)

echo [1/4] Installing dependencies...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [2/4] Building Next.js application...
call pnpm run build:next
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build Next.js
    pause
    exit /b 1
)

echo.
echo [3/4] Packaging Electron application...
call pnpm run build:electron
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to build Electron
    pause
    exit /b 1
)

echo.
echo [4/4] Build complete!
echo.
echo  ============================================
echo    EXE file is in the "dist" folder
echo  ============================================
echo.

explorer dist
pause
`;
    fs.writeFileSync(path.join(pkgDir, 'build.bat'), buildBat);

    // 4. Create Node.js build script (cross-platform)
    const buildJs = `#!/usr/bin/env node
const { execSync } = require('child_process');
const path = require('path');

console.log('');
console.log('  ============================================');
console.log('    VideoSniffer EXE Builder');
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

run('pnpm install', 'Step 1/3');
run('pnpm run build:next', 'Step 2/3');
run('pnpm run build:electron', 'Step 3/3');

console.log('');
console.log('  Build complete! EXE file is in the "dist" folder.');
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
    const configFiles = ['tsconfig.json', 'package.json'];
    for (const file of configFiles) {
      const srcPath = path.join(projectRoot, file);
      if (fs.existsSync(srcPath) && file !== 'package.json') {
        fs.copyFileSync(srcPath, path.join(pkgDir, file));
      }
    }

    // 7. Create README
    const readme = `# VideoSniffer EXE Builder

## Requirements
- Windows 10/11 (64-bit)
- Node.js 18+ (https://nodejs.org/)
- pnpm (will be auto-installed if missing)

## Quick Build (One Click)
Double-click \`build.bat\` and wait for the build to complete.
The EXE file will be generated in the \`dist\` folder.

## Manual Build
\`\`\`bash
pnpm install
pnpm run build
\`\`\`

## Notes
- First build may take 5-10 minutes (downloads Electron + dependencies)
- The generated EXE is a standalone installer, no additional runtime needed
- yt-dlp is bundled and will be auto-downloaded on first run
- Supported sites: YouTube, Bilibili, TikTok, Twitter/X, Instagram, and 1000+ more
`;
    fs.writeFileSync(path.join(pkgDir, 'README.md'), readme);

    // 8. Create zip file
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

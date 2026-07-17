import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { unlink } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { url, formatId, ext } = await request.json();

    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid URL' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const outputTemplate = path.join(tmpdir(), `yt-${randomUUID()}.%(ext)s`);
    const targetExt = ext || 'mp4';

    // Build yt-dlp args for downloading
    const args = [
      '--no-playlist',
      '--no-warnings',
      '-f', formatId || 'best',
      '-o', outputTemplate,
      '--merge-output-format', targetExt,
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--referer', url,
      url,
    ];

    // Create a readable stream from yt-dlp output
    const process = spawn('yt-dlp', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let outputPath = '';
    let stderr = '';

    // Capture stderr for debugging
    process.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      // yt-dlp outputs progress to stderr
      const match = data.toString().match(/\[download\] Destination: (.+)/);
      if (match) {
        outputPath = match[1];
      }
    });

    // Wait for the process to finish
    await new Promise<void>((resolve, reject) => {
      process.on('close', (code: number) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr.slice(-500)}`));
        }
      });
      process.on('error', reject);
    });

    // If outputPath wasn't captured from stderr, try to find the file
    if (!outputPath) {
      const { readdir } = await import('fs/promises');
      const files = await readdir(tmpdir());
      const ytFile = files.find(f => f.startsWith('yt-') && f.endsWith(`.${targetExt}`));
      if (ytFile) {
        outputPath = path.join(tmpdir(), ytFile);
      }
    }

    if (!outputPath) {
      throw new Error('Download completed but output file not found');
    }

    // Read the file and stream it
    const { createReadStream, statSync } = await import('fs');
    const stat = statSync(outputPath);
    const fileStream = createReadStream(outputPath);

    // Clean up temp file after streaming
    fileStream.on('close', () => {
      unlink(outputPath).catch(() => {});
    });

    // Sanitize filename
    const filename = `video_${Date.now()}.${targetExt}`;

    return new Response(fileStream as unknown as ReadableStream, {
      headers: {
        'Content-Type': targetExt === 'mp4' ? 'video/mp4' : `application/octet-stream`,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stat.size.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('Download error:', error);
    const errMsg = error instanceof Error ? error.message : 'Download failed';
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  url?: string;
  protocol?: string;
  fps?: number;
  tbr?: number;
  format_note?: string;
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  webpage_url?: string;
  description?: string;
  formats: VideoFormat[];
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Please provide a valid URL' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Use yt-dlp to extract video info
    const args = [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      '--flat-playlist',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--referer', url,
      url,
    ];

    const { stdout } = await execFileAsync('yt-dlp', args, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const info: VideoInfo = JSON.parse(stdout);

    // Filter and sort formats - prioritize video+audio formats
    const usableFormats = info.formats
      .filter((f: VideoFormat) => {
        // Filter out formats without URL (dash manifests, etc.)
        if (f.protocol && f.protocol.includes('mhtml')) return false;
        return true;
      })
      .map((f: VideoFormat) => ({
        format_id: f.format_id,
        ext: f.ext || 'mp4',
        resolution: f.resolution || 'audio only',
        filesize: f.filesize || undefined,
        vcodec: f.vcodec,
        acodec: f.acodec,
        fps: f.fps,
        tbr: f.tbr,
        format_note: f.format_note,
      }))
      .sort((a: VideoFormat, b: VideoFormat) => {
        // Sort by resolution (video first, then audio)
        const aHasVideo = a.vcodec && a.vcodec !== 'none';
        const bHasVideo = b.vcodec && b.vcodec !== 'none';
        if (aHasVideo && !bHasVideo) return -1;
        if (!aHasVideo && bHasVideo) return 1;
        // Then by filesize
        return (b.filesize || 0) - (a.filesize || 0);
      });

    return NextResponse.json({
      id: info.id,
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration,
      uploader: info.uploader,
      webpage_url: info.webpage_url || url,
      description: info.description?.slice(0, 200),
      formats: usableFormats,
    });
  } catch (error: unknown) {
    console.error('Parse error:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';

    if (errMsg.includes('Unsupported URL')) {
      return NextResponse.json(
        { error: 'This website is not supported' },
        { status: 400 }
      );
    }
    if (errMsg.includes('Video unavailable') || errMsg.includes('Private video')) {
      return NextResponse.json(
        { error: 'Video is unavailable or private' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: `Parse failed: ${errMsg.slice(0, 200)}` },
      { status: 500 }
    );
  }
}

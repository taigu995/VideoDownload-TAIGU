import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: 'VideoSniffer - Web Video Detector & Downloader',
  description:
    'Detect and download video resources from YouTube, Bilibili, TikTok, Twitter/X, Instagram and 1000+ websites. One-click EXE build for Windows.',
  keywords: [
    'video downloader',
    'video sniffer',
    'yt-dlp',
    'download video',
    'EXE browser',
  ],
  authors: [{ name: 'Coze Code Team', url: 'https://code.coze.cn' }],
  generator: 'Coze Code',
  // icons: {
  //   icon: '',
  // },
  openGraph: {
    title: 'VideoSniffer - Web Video Detector & Downloader',
    description:
      'Detect and download video resources from 1000+ websites. Build EXE for Windows.',
    url: 'https://code.coze.cn',
    siteName: 'VideoSniffer',
    locale: 'zh_CN',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}

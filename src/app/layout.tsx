import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: 'VideoSniffer - 视频嗅探浏览器',
  description:
    '浏览器式视频嗅探与下载工具，支持网页浏览、书签管理、一键翻译外文网页、视频嗅探下载，可打包为 Windows EXE 桌面程序。',
  keywords: [
    '视频下载',
    '视频嗅探',
    '网页翻译',
    '浏览器',
    'yt-dlp',
    'EXE浏览器',
  ],
  authors: [{ name: 'Coze Code Team', url: 'https://code.coze.cn' }],
  generator: 'Coze Code',
  // icons: {
  //   icon: '',
  // },
  openGraph: {
    title: 'VideoSniffer - 视频嗅探浏览器',
    description:
      '浏览器式视频嗅探与下载工具，支持网页翻译、视频嗅探下载，一键打包为 Windows EXE。',
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
    <html lang="zh-CN">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import GlobalErrorHandler from '@/components/global-error-handler';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '家政共创平台',
    template: '%s | 家政共创平台',
  },
  description: '多角色家政服务共创平台 - 连接阿姨、经纪人、招生、讲师、客户',
  keywords: ['家政', '共创平台', '阿姨', '经纪人', '培训'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`antialiased`}>
        <GlobalErrorHandler />
        {children}
      </body>
    </html>
  );
}

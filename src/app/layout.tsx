import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UGC Ad Studio',
  description: 'Turn one product brief into structured UGC ad angles, hooks, and creator-ready strategy.',
  icons: {
    icon: '/brand/ugc-ad-studio-favicon.png',
    shortcut: '/brand/ugc-ad-studio-favicon.png',
    apple: '/brand/ugc-ad-studio-favicon.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

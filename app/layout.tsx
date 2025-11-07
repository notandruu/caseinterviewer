import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { Web3Provider } from '@/components/providers/Web3Provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Case Interviewer - Your Toughest Interviewer Yet',
  description:
    'Stop the practice. Start real pressure. Your sharp, structured AI built to challenge how you think, just like a real McKinsey interviewer would. Loved by 10,000+ ambitious candidates.',
  keywords: [
    'case interview',
    'consulting interview',
    'McKinsey',
    'BCG',
    'Bain',
    'interview practice',
    'case prep',
    'consulting prep',
    'AI interviewer',
  ],
  authors: [{ name: 'Andrew Liu' }, { name: 'Farouk Ramzan' }],
  creator: 'Case Interviewer Inc',
  publisher: 'Case Interviewer Inc',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://caseinterviewer.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://caseinterviewer.com',
    title: 'Case Interviewer - Your Toughest Interviewer Yet',
    description:
      'Stop the practice. Start real pressure. Your sharp, structured AI built to challenge how you think, just like a real McKinsey interviewer would.',
    siteName: 'Case Interviewer',
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Case Interviewer Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Case Interviewer - Your Toughest Interviewer Yet',
    description:
      'Stop the practice. Start real pressure. AI-powered case interview practice that challenges you like a real McKinsey interviewer.',
    images: ['/logo.png'],
    creator: '@caseinterviewer',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/favicon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.png',
  },
  manifest: '/site.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Web3Provider>
          {children}
        </Web3Provider>
        <Analytics />
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from 'react-hot-toast'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: {
    default: 'DoramaFlix - Stream Your Favorite Asian Dramas',
    template: '%s | DoramaFlix',
  },
  description: 'Watch the latest K-dramas, J-dramas, C-dramas and more. Stream unlimited Asian content with premium quality.',
  keywords: [
    'kdrama',
    'jdrama',
    'cdrama',
    'asian drama',
    'streaming',
    'netflix',
    'dorama',
    'korean drama',
    'japanese drama',
    'chinese drama',
  ],
  authors: [{ name: 'DoramaFlix Team' }],
  creator: 'DoramaFlix',
  publisher: 'DoramaFlix',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    title: 'DoramaFlix - Stream Your Favorite Asian Dramas',
    description: 'Watch the latest K-dramas, J-dramas, C-dramas and more. Stream unlimited Asian content with premium quality.',
    siteName: 'DoramaFlix',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'DoramaFlix - Asian Drama Streaming Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DoramaFlix - Stream Your Favorite Asian Dramas',
    description: 'Watch the latest K-dramas, J-dramas, C-dramas and more. Stream unlimited Asian content with premium quality.',
    images: ['/og-image.jpg'],
    creator: '@doramaflix',
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
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  category: 'entertainment',
  classification: 'Entertainment, Streaming, Drama',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased bg-black text-white`}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            containerClassName=""
            containerStyle={{}}
            toastOptions={{
              className: '',
              duration: 4000,
              style: {
                background: '#1a1a1a',
                color: '#fff',
                border: '1px solid #404040',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
              loading: {
                iconTheme: {
                  primary: '#6b7280',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
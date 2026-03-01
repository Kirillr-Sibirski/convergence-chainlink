import './globals.css'
import type { Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'AEEIA | Truth Oracle',
  description: 'Multi-source prediction market oracle powered by Chainlink CRE',
  icons: {
    icon: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

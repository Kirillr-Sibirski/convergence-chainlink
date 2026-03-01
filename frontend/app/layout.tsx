import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Aletheia | Truth Oracle',
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
      <head>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" defer></script>
        <script src="/liquidGL.js" defer></script>
      </head>
      <body className="bg-gradient-to-br from-gray-50 via-white to-gray-100 text-black antialiased">{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'E-NOSE System | Periodontal Diagnostics',
  description: 'Real-time breath analysis and AI-driven periodontal diagnosis system powered by electronic nose technology.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${outfit.variable} font-sans min-h-screen bg-slate-950 text-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  )
}

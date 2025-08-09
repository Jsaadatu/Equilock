import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'EquiLock - Tokenized Private Equity Trading',
  description: 'Compliant tokenized private equity trading on Stacks blockchain',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* TODO: Add providers for Stacks Connect, Apollo Client, etc. */}
        {children}
      </body>
    </html>
  )
}
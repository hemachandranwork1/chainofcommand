import './globals.css'

export const metadata = {
  title: 'ChainOfCommand',
  description: 'Dual-layer blockchain verification for defense procurement',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

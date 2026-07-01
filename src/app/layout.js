import '@/styles/globals.css';
import PWARegistration from '@/components/PWARegistration';

export const metadata = {
  title: 'X botting - Plataforma de Atendimento IA WhatsApp',
  description: 'Gerenciamento de Agentes Inteligentes e Atendimento Humano para WhatsApp Cloud API',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'X botting',
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  }
};

export const viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const savedTheme = localStorage.getItem('theme') || 'dark';
                document.documentElement.setAttribute('data-theme', savedTheme);
              })();
            `,
          }}
        />
      </head>
      <body>
        <PWARegistration />
        {children}
      </body>
    </html>
  );
}

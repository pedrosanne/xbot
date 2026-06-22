import '@/styles/globals.css';
import PWARegistration from '@/components/PWARegistration';

export const metadata = {
  title: 'X bot - Plataforma de Atendimento IA WhatsApp',
  description: 'Gerenciamento de Agentes Inteligentes e Atendimento Humano para WhatsApp Cloud API',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Xbot',
  },
};

export const viewport = {
  themeColor: '#8b5cf6',
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

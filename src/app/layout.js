import '@/styles/globals.css';
import PWARegistration from '@/components/PWARegistration';

export const metadata = {
  title: 'X bot - Plataforma de Atendimento IA WhatsApp',
  description: 'Gerenciamento de Agentes Inteligentes e Atendimento Humano para WhatsApp Cloud API',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ZapFlow',
  },
};

export const viewport = {
  themeColor: '#8b5cf6',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <PWARegistration />
        {children}
      </body>
    </html>
  );
}

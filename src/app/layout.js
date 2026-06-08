import '@/styles/globals.css';

export const metadata = {
  title: 'X bot - Plataforma de Atendimento IA WhatsApp',
  description: 'Gerenciamento de Agentes Inteligentes e Atendimento Humano para WhatsApp Cloud API',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}

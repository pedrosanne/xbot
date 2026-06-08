const http = require('http');

const PORT = 3000;
const PATH = '/api/webhook';

// Simulated WhatsApp Webhook Payload
const payload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'simulated_business_id',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '5511999999999', phone_number_id: 'simulated_phone_id' },
            contacts: [
              {
                profile: { name: 'João Simulado' },
                wa_id: '5511999999999'
              }
            ],
            messages: [
              {
                from: '5511999999999',
                id: `wamid_simulated_cli_${Date.now()}`,
                timestamp: Math.floor(Date.now() / 1000).toString(),
                type: 'text',
                text: { body: 'Olá! Gostaria de saber qual o horário de funcionamento de vocês?' }
              }
            ]
          },
          field: 'messages'
        }
      ]
    }
  ]
};

const data = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: PORT,
  path: PATH,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Enviando payload de simulação para http://localhost:3000/api/webhook...');

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Resposta do Servidor (${res.statusCode}):`);
    console.log(body);
    console.log('\nSucesso! Verifique os logs do servidor Next.js para ver o enfileiramento e processamento do agente.');
  });
});

req.on('error', (error) => {
  console.error('Erro na requisição. Certifique-se de que o Next.js está rodando na porta 3000 com "npm run dev".');
  console.error(error.message);
});

req.write(data);
req.end();

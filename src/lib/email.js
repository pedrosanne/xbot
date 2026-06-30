/**
 * Email Sender Helper using direct REST API calls
 */

export async function sendEmail({ provider, apiKey, sender, to, subject, html }) {
  if (!provider || !apiKey || !sender || !to || !subject || !html) {
    throw new Error('Missing required email parameters');
  }

  if (provider === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: sender,
        to: [to],
        subject,
        html
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Erro ao enviar e-mail via Resend');
    }
    return data;
  } 
  
  if (provider === 'brevo') {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sender: { email: sender },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Erro ao enviar e-mail via Brevo');
    }
    return data;
  }

  throw new Error(`Provedor de e-mail não suportado: ${provider}`);
}

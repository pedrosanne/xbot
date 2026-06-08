import fs from 'fs';
import path from 'path';
import { getSystemSettings } from './settings';

export async function textToSpeech(text) {
  const settings = await getSystemSettings();
  const { elevenLabsApiKey, elevenLabsVoiceId } = settings;

  if (!elevenLabsApiKey || !elevenLabsVoiceId) {
    console.warn('ElevenLabs TTS not configured. Skipping voice generation.');
    return null;
  }

  const voiceId = elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel fallback
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json',
        'accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs API Error:', errText);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = `voice_${Date.now()}.mp3`;
    
    // Verifica se estamos no ambiente da Vercel ou se a pasta public não existe/não é gravável
    const isVercel = process.env.VERCEL === '1' || !fs.existsSync(path.join(process.cwd(), 'public'));
    
    let filePath;
    let fileUrl;
    
    if (isVercel) {
      filePath = path.join('/tmp', filename);
      fileUrl = `/api/uploads/${filename}`;
    } else {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      filePath = path.join(uploadDir, filename);
      fileUrl = `/uploads/${filename}`;
    }

    fs.writeFileSync(filePath, buffer);
    console.log(`Saved TTS voice file at: ${filePath}`);
    return fileUrl;
  } catch (error) {
    console.error('Error generating TTS:', error);
    return null;
  }
}

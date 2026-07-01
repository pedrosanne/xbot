import fs from 'fs';
import path from 'path';
import { getSystemSettings } from './settings';
import { prisma } from './prisma';
import { logToDb } from './log';
import { execFile } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import os from 'os';

export async function textToSpeech(text, customAgentId = null) {
  const settings = await getSystemSettings();
  let apiKey = settings.elevenLabsApiKey;
  let voiceId = settings.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel fallback

  if (customAgentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: customAgentId }
    });
    if (agent) {
      if (agent.elevenLabsApiKey) apiKey = agent.elevenLabsApiKey;
      if (agent.elevenLabsVoiceId) voiceId = agent.elevenLabsVoiceId;
    }
  }

  if (!apiKey || !voiceId) {
    console.warn('ElevenLabs TTS not configured. Skipping voice generation.');
    return null;
  }

  const voiceIdToUse = voiceId;
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceIdToUse}?output_format=opus_48000_64`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
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

    const filename = `voice_${Date.now()}.ogg`;
    
    // Save generated voice directly to database to support Vercel and serverless architectures safely
    await prisma.upload.create({
      data: {
        filename,
        mimeType: 'audio/ogg',
        data: buffer
      }
    });

    // Log AI Usage (ElevenLabs charges by characters. $0.30 per 1000 chars roughly for standard models)
    try {
      const charCount = text.length;
      const estimatedCost = (charCount / 1000) * 0.30;
      await prisma.aiUsage.create({
        data: {
          provider: 'ELEVENLABS',
          model: 'eleven_multilingual_v2',
          action: 'tts',
          tokens: charCount,
          cost: estimatedCost
        }
      });
    } catch (logErr) {
      console.error('Failed to log ElevenLabs TTS usage:', logErr);
    }

    console.log(`Saved TTS voice file to database: ${filename}`);
    return `/api/uploads/${filename}`;
  } catch (error) {
    console.error('Error generating TTS:', error);
    return null;
  }
}

export async function voiceChanger(audioBuffer, mimeType = 'audio/mpeg', customAgentId = null) {
  const settings = await getSystemSettings();
  let apiKey = settings.elevenLabsApiKey;
  let voiceId = settings.elevenLabsVoiceId || '21m00Tcm4TlvDq8ikWAM';

  if (customAgentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: customAgentId }
    });
    if (agent) {
      if (agent.elevenLabsApiKey) apiKey = agent.elevenLabsApiKey;
      if (agent.elevenLabsVoiceId) voiceId = agent.elevenLabsVoiceId;
    }
  }

  if (!apiKey || !voiceId) {
    console.warn('ElevenLabs API credentials not configured for Voice Changer.');
    return null;
  }

  const voiceIdToUse = voiceId;
  const url = `https://api.elevenlabs.io/v1/speech-to-speech/${voiceIdToUse}?output_format=opus_48000_64`;

  try {
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    
    // Append the audio file as a Blob with a filename
    formData.append('audio', blob, 'input.mp3');
    formData.append('model_id', 'eleven_multilingual_sts_v2');
    
    // Voice settings configuration for consistent tone matching
    formData.append('voice_settings', JSON.stringify({
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true
    }));

    console.log(`Sending audio to ElevenLabs Speech-to-Speech with Voice ID: ${voiceIdToUse}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        // Let boundary be set automatically by not adding Content-Type manually
      },
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs Speech-to-Speech API Error:', errText);
      await logToDb('ERROR', 'API', `Erro na API ElevenLabs Speech-to-Speech: ${errText}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error in voiceChanger:', error);
    return null;
  }
}

export async function convertToOggOpus(inputBuffer) {
  return new Promise((resolve, reject) => {
    const tempDir = os.tmpdir();
    const inputPath = path.join(tempDir, `input_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
    const outputPath = `${inputPath}.ogg`;

    // Write input buffer to temp file
    fs.writeFileSync(inputPath, inputBuffer);

    // Run ffmpeg
    const args = ['-y', '-i', inputPath, '-c:a', 'libopus', '-b:a', '32k', '-ar', '48000', outputPath];

    execFile(ffmpegPath, args, (error, stdout, stderr) => {
      // Clean up input file
      try { fs.unlinkSync(inputPath); } catch (e) {}

      if (error) {
        try { fs.unlinkSync(outputPath); } catch (e) {}
        console.error('ffmpeg conversion error:', stderr);
        return reject(error);
      }

      try {
        const outputBuffer = fs.readFileSync(outputPath);
        try { fs.unlinkSync(outputPath); } catch (e) {}
        resolve(outputBuffer);
      } catch (readErr) {
        reject(readErr);
      }
    });
  });
}

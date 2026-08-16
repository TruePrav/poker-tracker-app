import { Router } from 'express';

export const ttsRoutes = Router();

/**
 * ElevenLabs proxy.
 *
 * The key stays on the server: a browser-side call would ship it in the bundle
 * to everyone at the table, and ElevenLabs does not send CORS headers anyway.
 * Every failure returns a clear status so the client can fall back to the
 * browser's built-in voice rather than going silent mid-game.
 */

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

function apiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY || null;
}

// GET the voices available on the configured account
ttsRoutes.get('/voices', async (_req, res) => {
  const key = apiKey();
  if (!key) {
    return res.status(503).json({ error: 'ELEVENLABS_API_KEY is not set on the server.' });
  }
  try {
    const upstream = await fetch(`${ELEVEN_BASE}/voices`, {
      headers: { 'xi-api-key': key },
    });
    if (!upstream.ok) {
      const detail = await upstream.text();
      return res
        .status(upstream.status)
        .json({ error: 'ElevenLabs rejected the request.', detail: detail.slice(0, 300) });
    }
    const data: any = await upstream.json();
    const voices = (data.voices || []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      // labels usually carry accent/description, useful for spotting Indian voices
      labels: v.labels || {},
      previewUrl: v.preview_url || null,
    }));
    res.json({ voices });
  } catch (err: any) {
    res.status(502).json({ error: 'Could not reach ElevenLabs.', detail: err?.message });
  }
});

// POST synthesise speech; responds with audio/mpeg
ttsRoutes.post('/', async (req, res) => {
  const key = apiKey();
  if (!key) {
    return res.status(503).json({ error: 'ELEVENLABS_API_KEY is not set on the server.' });
  }

  const { text, voiceId, modelId } = req.body || {};
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) {
    return res.status(400).json({ error: 'text is required.' });
  }

  const voice = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!voice) {
    return res.status(400).json({ error: 'voiceId is required (or set ELEVENLABS_VOICE_ID).' });
  }

  try {
    const upstream = await fetch(`${ELEVEN_BASE}/text-to-speech/${encodeURIComponent(voice)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: trimmed,
        // Flash is the low-latency model; announcements should land promptly.
        model_id: modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4 },
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return res
        .status(upstream.status)
        .json({ error: 'ElevenLabs rejected the request.', detail: detail.slice(0, 300) });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.send(buffer);
  } catch (err: any) {
    res.status(502).json({ error: 'Could not reach ElevenLabs.', detail: err?.message });
  }
});

// GET whether the server has a key configured, so the UI can show the option
ttsRoutes.get('/status', (_req, res) => {
  res.json({
    configured: Boolean(apiKey()),
    defaultVoiceId: process.env.ELEVENLABS_VOICE_ID || null,
  });
});

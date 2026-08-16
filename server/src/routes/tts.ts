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

/**
 * Indian English voices from the public shared library.
 *
 * The account itself has no Indian voices, and the shared-library ids work
 * directly in text-to-speech without being added to the account first. Preview
 * URLs are signed with a rotating timestamp, so they are fetched rather than
 * hard-coded, and cached for an hour to keep the settings screen snappy.
 */
const SHARED_TTL_MS = 60 * 60 * 1000;
let sharedCache: { at: number; voices: any[] } | null = null;

async function fetchIndianShared(key: string): Promise<any[]> {
  if (sharedCache && Date.now() - sharedCache.at < SHARED_TTL_MS) return sharedCache.voices;

  const seen = new Map<string, any>();
  for (let page = 0; page < 4; page++) {
    const url = `${ELEVEN_BASE}/shared-voices?page_size=100&accent=indian&language=en&page=${page}`;
    const upstream = await fetch(url, { headers: { 'xi-api-key': key } });
    if (!upstream.ok) break;
    const data: any = await upstream.json();
    const batch = data.voices || [];
    if (batch.length === 0) break;
    for (const v of batch) {
      if (!v.voice_id || !v.preview_url || seen.has(v.voice_id)) continue;
      seen.set(v.voice_id, {
        voiceId: v.voice_id,
        name: v.name,
        labels: {
          accent: v.accent || 'indian',
          description: [v.gender, v.age, v.descriptive].filter(Boolean).join(' '),
          use_case: v.use_case || '',
        },
        previewUrl: v.preview_url,
        shared: true,
        popularity: Number(v.usage_character_count_1y || 0),
      });
    }
  }

  // Most-used first, which is a decent proxy for which ones sound good.
  const voices = [...seen.values()].sort((a, b) => b.popularity - a.popularity);
  sharedCache = { at: Date.now(), voices };
  return voices;
}

// GET the voices on the account plus the Indian English shared-library voices
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
    const own = (data.voices || []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      // labels usually carry accent/description, useful for spotting Indian voices
      labels: v.labels || {},
      previewUrl: v.preview_url || null,
      shared: false,
    }));

    // A shared-library failure must not take the account voices down with it.
    let indian: any[] = [];
    try {
      indian = await fetchIndianShared(key);
    } catch (err: any) {
      console.warn('[tts] shared voice lookup failed:', err?.message);
    }

    res.json({ voices: [...own, ...indian], ownCount: own.length, indianCount: indian.length });
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

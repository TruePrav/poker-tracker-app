import { useEffect, useState } from 'react';
import { Volume2, X, Play, RotateCcw, Info } from 'lucide-react';
import {
  loadVoices,
  rankVoices,
  isIndianVoice,
  isNeuralVoice,
  getSettings,
  saveSettings,
  speak,
  playClip,
  stopAll,
  CLIPS,
} from '../utils/announcer';
import {
  getScripts,
  saveScripts,
  resetScripts,
  DEFAULT_INTRO,
  DEFAULT_LEVEL,
  renderTemplate,
} from '../utils/announcementScripts';

interface Props {
  onClose: () => void;
}

export function AnnouncerSettings({ onClose }: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState(getSettings());
  const [scripts, setScripts] = useState(getScripts());
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);

  useEffect(() => {
    loadVoices().then((v) => setVoices(rankVoices(v)));
  }, []);

  const update = (patch: Partial<ReturnType<typeof getSettings>>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(patch);
  };

  const updateScript = (patch: Partial<ReturnType<typeof getScripts>>) => {
    const next = { ...scripts, ...patch };
    setScripts(next);
    saveScripts(patch);
  };

  const indianVoices = voices.filter(isIndianVoice);
  const otherVoices = voices.filter((v) => !isIndianVoice(v));

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-start sm:items-center justify-center overflow-y-auto p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 sm:p-6 w-full max-w-2xl my-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-gold" /> Announcer Settings
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enable */}
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => update({ enabled: e.target.checked })}
            className="accent-felt w-4 h-4"
          />
          <span className="text-sm text-gray-200">Announcements enabled on this device</span>
        </label>

        {/* Voice */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Voice {indianVoices.length > 0
              ? `— ${indianVoices.length} Indian voice${indianVoices.length > 1 ? 's' : ''} found on this device`
              : '— no Indian voice found, best available listed first'}
          </label>
          <select
            value={settings.voiceURI || ''}
            onChange={(e) => update({ voiceURI: e.target.value || null })}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-felt"
          >
            <option value="">Auto (best Indian voice available)</option>
            {indianVoices.length > 0 && (
              <optgroup label="🇮🇳 Indian voices">
                {indianVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {isNeuralVoice(v) ? '⭐ ' : ''}{v.name} — {v.lang}
                  </option>
                ))}
              </optgroup>
            )}
            {otherVoices.length > 0 && (
              <optgroup label="Other voices">
                {otherVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} — {v.lang}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {voices.length === 0 && (
            <p className="text-[11px] text-yellow-400 mt-1">
              No voices detected yet. Reload the page once; some browsers load them lazily.
            </p>
          )}
          <button
            onClick={() => setShowVoiceHelp((v) => !v)}
            className="mt-2 text-[11px] text-felt hover:underline flex items-center gap-1"
          >
            <Info className="w-3 h-3" /> {showVoiceHelp ? 'Hide' : 'Want more Indian voices?'}
          </button>
          {showVoiceHelp && (
            <div className="mt-2 p-3 bg-gray-800/70 border border-gray-700 rounded-lg text-[11px] text-gray-300 space-y-2">
              <p className="text-white font-semibold">Fastest win: open this page in Microsoft Edge</p>
              <p>
                Edge exposes free Azure neural voices to web pages. You get{' '}
                <span className="text-felt">Microsoft Neerja Online (Natural)</span> and{' '}
                <span className="text-felt">Prabhat Online (Natural)</span> — proper Indian English,
                far better than the built-in ones. No signup, no API key. They show with a ⭐ above.
              </p>
              <p className="text-white font-semibold pt-1">Or install more voices in the OS</p>
              <p>
                <span className="text-gray-100">macOS:</span> System Settings → Accessibility → Spoken
                Content → System Voice → Manage Voices → English (India) → add <em>Rishi</em>.
              </p>
              <p>
                <span className="text-gray-100">Windows:</span> Settings → Time &amp; Language → Speech →
                Manage voices → Add voices → English (India) → gives <em>Heera</em>, <em>Ravi</em>,{' '}
                <em>Priya</em>.
              </p>
              <p className="text-gray-500 pt-1">Reload this page after installing so they appear.</p>
            </div>
          )}
        </div>

        {/* Rate + pitch */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Speed — {settings.rate.toFixed(2)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={settings.rate}
              onChange={(e) => update({ rate: Number(e.target.value) })}
              className="w-full accent-felt"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Pitch — {settings.pitch.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.05"
              value={settings.pitch}
              onChange={(e) => update({ pitch: Number(e.target.value) })}
              className="w-full accent-felt"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => speak('Namaskar! Welcome to the Mahtani Poker Room. Shuffle up and deal!')}
            className="px-3 py-2 bg-felt hover:bg-felt-dark text-white rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <Play className="w-3 h-3" /> Test voice
          </button>
          <button
            onClick={() => playClip(CLIPS.pokerNowStart)}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <Play className="w-3 h-3" /> Test Bhavesh clip
          </button>
          <button
            onClick={stopAll}
            className="px-3 py-2 bg-red-900/50 hover:bg-red-900/80 text-red-200 rounded-lg text-xs font-medium"
          >
            Stop
          </button>
        </div>

        {/* Scripts */}
        <div className="space-y-3 border-t border-gray-800 pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Tournament intro script
            </label>
            <textarea
              value={scripts.intro}
              onChange={(e) => updateScript({ intro: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-felt"
            />
            <button
              onClick={() => speak(scripts.intro)}
              className="mt-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs flex items-center gap-1"
            >
              <Play className="w-3 h-3" /> Preview intro
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              End-of-round script — use {'{level}'}, {'{smallBlind}'}, {'{bigBlind}'}, {'{ante}'}
            </label>
            <textarea
              value={scripts.level}
              onChange={(e) => updateScript({ level: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-felt"
            />
            <button
              onClick={() =>
                speak(renderTemplate(scripts.level, { level: 3, smallBlind: 100, bigBlind: 200, ante: 0 }))
              }
              className="mt-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs flex items-center gap-1"
            >
              <Play className="w-3 h-3" /> Preview round change
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Break script</label>
            <textarea
              value={scripts.breakTime}
              onChange={(e) => updateScript({ breakTime: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-felt"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Buy-ins closed script</label>
            <textarea
              value={scripts.buyinsClosed}
              onChange={(e) => updateScript({ buyinsClosed: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-felt"
            />
          </div>

          <button
            onClick={() => {
              resetScripts();
              setScripts(getScripts());
            }}
            className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset scripts to defaults
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 px-4 py-2.5 bg-felt hover:bg-felt-dark text-white rounded-lg font-medium text-sm"
        >
          Done
        </button>
      </div>
    </div>
  );
}

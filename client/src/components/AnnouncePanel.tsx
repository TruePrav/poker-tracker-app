import { useState } from 'react';
import { Megaphone, Send, Volume2, DoorClosed, Sparkles } from 'lucide-react';
import { queueSpeech, queueClip } from '../api/announcements';
import { getScripts } from '../utils/announcementScripts';

interface Props {
  tournamentId: number;
}

/**
 * Phone-side controls. These queue announcements on the server; the TV display
 * polls the queue and does the actual speaking, so sound always comes out of
 * the machine plugged into the television.
 */
export function AnnouncePanel({ tournamentId }: Props) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  const confirm = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash(''), 2500);
  };

  const send = async (fn: () => Promise<unknown>, msg: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      confirm(msg);
    } catch {
      confirm('Failed — check connection');
    } finally {
      setBusy(false);
    }
  };

  const handleCustom = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    await send(() => queueSpeech(tournamentId, trimmed), 'Sent to TV');
    setText('');
  };

  return (
    <div className="border-t border-gray-800 bg-gray-950 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <Megaphone className="w-3.5 h-3.5" /> Announcements &mdash; plays on the TV
        </p>
        {flash && <span className="text-[11px] text-felt font-medium">{flash}</span>}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        <button
          onClick={() =>
            send(async () => {
              await queueClip(tournamentId, 'pokerNowStart');
              await queueSpeech(tournamentId, getScripts().intro);
            }, 'Intro queued')
          }
          disabled={busy}
          className="px-3 py-2 bg-gold hover:bg-gold-light disabled:opacity-50 text-gray-900 rounded-lg text-xs font-bold flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" /> Start Intro
        </button>
        <button
          onClick={() => send(() => queueClip(tournamentId, 'pokerNowStart'), 'Bhavesh clip queued')}
          disabled={busy}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
        >
          <Volume2 className="w-3.5 h-3.5" /> Bhavesh Clip
        </button>
        <button
          onClick={() =>
            send(async () => {
              await queueSpeech(tournamentId, getScripts().buyinsClosed);
              await queueClip(tournamentId, 'pokerNowStart');
            }, 'Buy-ins closed announced')
          }
          disabled={busy}
          className="px-3 py-2 bg-red-900/50 hover:bg-red-900/80 disabled:opacity-50 text-red-200 rounded-lg text-xs font-medium flex items-center gap-1.5"
        >
          <DoorClosed className="w-3.5 h-3.5" /> Buy-ins Closed
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCustom()}
          placeholder="Say something on the TV..."
          className="flex-1 min-w-0 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-felt text-sm"
        />
        <button
          onClick={handleCustom}
          disabled={busy || !text.trim()}
          className="px-3 py-2 bg-felt hover:bg-felt-dark disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-1 flex-shrink-0"
        >
          <Send className="w-4 h-4" /> <span className="hidden sm:inline">Say</span>
        </button>
      </div>
    </div>
  );
}

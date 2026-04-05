import { useState } from 'react';
import { useRadio } from '../context/RadioContext';

const SPOTIFY_URL = 'https://open.spotify.com/playlist/5VPrfar0asi3UqDAa5emps';

function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

export default function RadioPlayer() {
  const radio = useRadio();
  const [visible, setVisible] = useState(true);

  if (!radio || !radio.tracks.length || !visible) return null;

  const { track, playing, progress, duration, togglePlay, prev, next, seek, tracks } = radio;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black text-white select-none">
      <audio ref={radio.audioRef} preload="metadata" className="hidden" />

      {/* Progress bar */}
      <div
        className="w-full h-px bg-white/20 cursor-pointer"
        onClick={e => seek(e, e.currentTarget)}
      >
        <div
          className="h-full bg-white/60 transition-none"
          style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
        />
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 grid grid-cols-3 items-center h-11 gap-4">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          <span className="text-[9px] tracking-[0.22em] uppercase text-white/50 hidden sm:block whitespace-nowrap">
            Andy Models Radio
          </span>
          <span className="text-[9px] tracking-[0.22em] uppercase text-white/50 sm:hidden">AMR</span>

          <div className="flex items-center gap-2">
            {tracks.length > 1 && (
              <button onClick={prev} className="text-white/40 hover:text-white transition-colors text-xs leading-none" aria-label="Anterior">◁</button>
            )}
            <button
              onClick={togglePlay}
              className="w-6 h-6 flex items-center justify-center rounded-full border border-white/30 hover:border-white transition-colors flex-shrink-0"
              aria-label={playing ? 'Pausar' : 'Tocar'}
            >
              {playing ? (
                <svg className="w-2.5 h-2.5 fill-white" viewBox="0 0 10 12">
                  <rect x="0" y="0" width="3.5" height="12" rx="1" />
                  <rect x="6.5" y="0" width="3.5" height="12" rx="1" />
                </svg>
              ) : (
                <svg className="w-2.5 h-2.5 fill-white" viewBox="0 0 10 12">
                  <polygon points="0,0 10,6 0,12" />
                </svg>
              )}
            </button>
            {tracks.length > 1 && (
              <button onClick={next} className="text-white/40 hover:text-white transition-colors text-xs leading-none" aria-label="Próxima">▷</button>
            )}
          </div>
        </div>

        {/* CENTER */}
        <div className="flex justify-center">
          <a
            href={SPOTIFY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[8px] sm:text-[9px] tracking-[0.18em] uppercase text-white/40 hover:text-white transition-colors text-center leading-tight whitespace-nowrap"
          >
            Nossa Playlist no Spotify ↗
          </a>
        </div>

        {/* RIGHT */}
        <div className="flex items-center justify-end gap-3 min-w-0">
          <div className="min-w-0 text-right hidden sm:block">
            <p className="text-[9px] tracking-[0.15em] uppercase truncate text-white/70 leading-none">
              {track?.title || '—'}
            </p>
            <p className="text-[8px] tabular-nums text-white/30 mt-0.5">
              {fmt(progress)} / {fmt(duration)}
            </p>
          </div>
          <span className="text-[8px] tabular-nums text-white/30 sm:hidden">{fmt(progress)}</span>
          <button
            onClick={() => setVisible(false)}
            className="text-white/20 hover:text-white transition-colors text-xs flex-shrink-0"
            aria-label="Fechar"
          >✕</button>
        </div>

      </div>
    </div>
  );
}

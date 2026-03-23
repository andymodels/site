import { useEffect, useRef, useState } from 'react';

const SPOTIFY_URL = 'https://open.spotify.com/playlist/5VPrfar0asi3UqDAa5emps';

export default function RadioPlayer() {
  const [tracks, setTracks]     = useState([]);
  const [idx, setIdx]           = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visible, setVisible]   = useState(true);
  const audioRef  = useRef(null);
  const loadedRef = useRef(false); // prevent re-fetch on re-render

  // Load tracks only once
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetch('/api/radio')
      .then(r => r.ok ? r.json() : [])
      .then(data => setTracks(data))
      .catch(() => {});
  }, []);

  const track = tracks[idx];

  // Load new track source when idx changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    const wasPlaying = playing;
    audio.src = track.url;
    audio.load();
    if (wasPlaying) audio.play().catch(() => {});
  }, [idx]); // intentionally NOT include `playing` to avoid loop

  // Attach audio event listeners once
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime  = () => setProgress(audio.currentTime);
    const onLoad  = () => setDuration(audio.duration);
    const onEnded = () => setIdx(i => (i + 1) % Math.max(tracks.length, 1));
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoad);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoad);
      audio.removeEventListener('ended', onEnded);
    };
  }, [tracks.length]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  function seek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  function fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  if (!tracks.length || !visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black text-white select-none">
      <audio ref={audioRef} preload="metadata" />

      {/* Progress bar */}
      <div className="w-full h-px bg-white/20 cursor-pointer" onClick={seek}>
        <div
          className="h-full bg-white/60 transition-none"
          style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
        />
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 grid grid-cols-3 items-center h-11 gap-4">

        {/* LEFT — Brand + controls */}
        <div className="flex items-center gap-3">
          <span className="text-[9px] tracking-[0.22em] uppercase text-white/50 hidden sm:block whitespace-nowrap">
            Andy Models Radio
          </span>
          <span className="text-[9px] tracking-[0.22em] uppercase text-white/50 sm:hidden">
            AMR
          </span>

          <div className="flex items-center gap-2">
            {tracks.length > 1 && (
              <button
                onClick={() => setIdx(i => (i - 1 + tracks.length) % tracks.length)}
                className="text-white/40 hover:text-white transition-colors text-xs leading-none"
                aria-label="Anterior"
              >
                ◁
              </button>
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
              <button
                onClick={() => setIdx(i => (i + 1) % tracks.length)}
                className="text-white/40 hover:text-white transition-colors text-xs leading-none"
                aria-label="Próxima"
              >
                ▷
              </button>
            )}
          </div>
        </div>

        {/* CENTER — Spotify link */}
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

        {/* RIGHT — Track info + close */}
        <div className="flex items-center justify-end gap-3 min-w-0">
          <div className="min-w-0 text-right hidden sm:block">
            <p className="text-[9px] tracking-[0.15em] uppercase truncate text-white/70 leading-none">
              {track?.title || '—'}
            </p>
            <p className="text-[8px] tabular-nums text-white/30 mt-0.5">
              {fmt(progress)} / {fmt(duration)}
            </p>
          </div>
          <span className="text-[8px] tabular-nums text-white/30 sm:hidden">
            {fmt(progress)}
          </span>
          <button
            onClick={() => setVisible(false)}
            className="text-white/20 hover:text-white transition-colors text-xs flex-shrink-0"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

      </div>
    </div>
  );
}

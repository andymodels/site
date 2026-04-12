import { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const ORANGE = '#F27121';

/** Playlists de exemplo — só faixas com `url` tocam; resto é visual de prévia */
const MOCK_PLAYLISTS = (lang) => [
  {
    id: 'hits',
    title: lang === 'pt' ? 'HITS DO MOMENTO' : 'CURRENT HITS',
    description: lang === 'pt' ? 'O que está em alta na nossa seleção.' : 'What’s trending in our pick.',
    cover: 'https://picsum.photos/seed/hits/400/400',
    tracks: [
      { id: 'h1', title: 'Coração Partido', artist: 'Luana Silva', thumb: 'https://picsum.photos/seed/h1/80/80', url: null },
      { id: 'h2', title: 'Noite de Verão', artist: 'Banda Aurora', thumb: 'https://picsum.photos/seed/h2/80/80', url: null },
      { id: 'h3', title: 'Luzes da Cidade', artist: 'DJ Norte', thumb: 'https://picsum.photos/seed/h3/80/80', url: null },
    ],
  },
  {
    id: 'manha',
    title: lang === 'pt' ? 'MANHÃ ENERGÉTICA' : 'ENERGETIC MORNING',
    description: lang === 'pt' ? 'Para começar o dia ligado.' : 'To start the day wired.',
    cover: 'https://picsum.photos/seed/manha/400/400',
    tracks: Array.from({ length: 4 }, (_, i) => ({
      id: `m${i}`,
      title: `Faixa ${i + 1}`,
      artist: 'Artista demo',
      thumb: `https://picsum.photos/seed/m${i}/80/80`,
      url: null,
    })),
  },
  {
    id: 'chill',
    title: lang === 'pt' ? 'RÁDIO CHILLOUT' : 'CHILLOUT RADIO',
    description: lang === 'pt' ? 'Respirar e relaxar.' : 'Breathe and unwind.',
    cover: 'https://picsum.photos/seed/chill/400/400',
    tracks: Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`,
      title: `Chill ${i + 1}`,
      artist: 'Lo-Fi Collective',
      thumb: `https://picsum.photos/seed/c${i}/80/80`,
      url: null,
    })),
  },
  {
    id: 'night',
    title: lang === 'pt' ? 'NOITE' : 'NIGHT',
    description: lang === 'pt' ? 'Depois do pôr do sol.' : 'After sunset.',
    cover: 'https://picsum.photos/seed/night/400/400',
    tracks: Array.from({ length: 3 }, (_, i) => ({
      id: `n${i}`,
      title: `Night ${i + 1}`,
      artist: 'Synth Wave',
      thumb: `https://picsum.photos/seed/n${i}/80/80`,
      url: null,
    })),
  },
  {
    id: 'focus',
    title: lang === 'pt' ? 'FOCO / TRABALHO' : 'FOCUS',
    description: lang === 'pt' ? 'Trilha para concentrar.' : 'Concentration tracks.',
    cover: 'https://picsum.photos/seed/focus/400/400',
    tracks: Array.from({ length: 4 }, (_, i) => ({
      id: `f${i}`,
      title: `Focus ${i + 1}`,
      artist: 'Ambient Lab',
      thumb: `https://picsum.photos/seed/f${i}/80/80`,
      url: null,
    })),
  },
  {
    id: 'throwback',
    title: lang === 'pt' ? 'THROWBACK' : 'THROWBACK',
    description: lang === 'pt' ? 'Clássicos que marcam.' : 'Classics that stick.',
    cover: 'https://picsum.photos/seed/throw/400/400',
    tracks: Array.from({ length: 3 }, (_, i) => ({
      id: `t${i}`,
      title: `Throwback ${i + 1}`,
      artist: 'Vintage Set',
      thumb: `https://picsum.photos/seed/t${i}/80/80`,
      url: null,
    })),
  },
];

function fmt(s) {
  if (!s || !Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function RadioHubPage() {
  const { lang } = useLanguage();
  const [playlists, setPlaylists] = useState(() => MOCK_PLAYLISTS(lang));
  const [selectedId, setSelectedId] = useState('hits');
  const [trackIdx, setTrackIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const audioRef = useRef(null);
  const prevTrackKeyRef = useRef(null);

  const selected = useMemo(
    () => playlists.find((p) => p.id === selectedId) || playlists[0],
    [playlists, selectedId],
  );
  const track = selected?.tracks?.[trackIdx];

  useEffect(() => {
    setPlaylists(MOCK_PLAYLISTS(lang));
  }, [lang]);

  useEffect(() => {
    fetch('/api/radio')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const live = {
          id: 'live',
          title: lang === 'pt' ? 'RÁDIO AO VIVO' : 'LIVE RADIO',
          description: lang === 'pt' ? 'Faixas publicadas no site (reprodução real).' : 'Tracks from the site (real playback).',
          cover: '/logo.png',
          tracks: rows.map((r) => ({
            id: `live-${r.id}`,
            title: r.title,
            artist: 'Andy Models Radio',
            thumb: 'https://picsum.photos/seed/live/80/80',
            url: r.url,
          })),
        };
        setPlaylists((prev) => [live, ...prev.filter((p) => p.id !== 'live')]);
        setSelectedId('live');
        setTrackIdx(0);
      })
      .catch(() => {});
  }, [lang]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (!track?.url) {
      a.pause();
      a.removeAttribute('src');
      setPlaying(false);
      setProgress(0);
      setDuration(0);
      prevTrackKeyRef.current = null;
      return;
    }
    const key = `${selectedId}:${track.id}`;
    const changed = prevTrackKeyRef.current !== key;
    prevTrackKeyRef.current = key;
    a.volume = volume;
    if (changed) {
      a.src = track.url;
      a.load();
    }
    if (playing) a.play().catch(() => setPlaying(false));
    else a.pause();
  }, [selectedId, track?.id, track?.url, playing, volume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onMeta = () => setDuration(a.duration || 0);
    const onEnd = () => {
      if (repeat) {
        a.currentTime = 0;
        a.play().catch(() => {});
        return;
      }
      const tr = selected?.tracks;
      if (!tr?.length) return;
      let next = trackIdx + 1;
      if (shuffle) {
        next = Math.floor(Math.random() * tr.length);
      } else if (next >= tr.length) next = 0;
      setTrackIdx(next);
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('loadedmetadata', onMeta);
    a.addEventListener('ended', onEnd);
    return () => {
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('loadedmetadata', onMeta);
      a.removeEventListener('ended', onEnd);
    };
  }, [selected, trackIdx, repeat, shuffle]);

  function togglePlay() {
    const a = audioRef.current;
    if (!track?.url) return;
    if (playing) {
      a.pause();
      setPlaying(false);
    } else {
      a.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    }
  }

  function seekRatio(r) {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = r * duration;
    setProgress(a.currentTime);
  }

  function prevTrack() {
    const tr = selected?.tracks;
    if (!tr?.length) return;
    let i = trackIdx - 1;
    if (i < 0) i = tr.length - 1;
    setTrackIdx(i);
    const nt = tr[i];
    setPlaying(Boolean(nt?.url));
  }

  function nextTrack() {
    const tr = selected?.tracks;
    if (!tr?.length) return;
    let i = trackIdx + 1;
    if (i >= tr.length) i = 0;
    setTrackIdx(i);
    const nt = tr[i];
    setPlaying(Boolean(nt?.url));
  }

  const coverSrc = track?.thumb?.startsWith('http') ? track.thumb : selected?.cover || 'https://picsum.photos/seed/cover/500/500';

  return (
    <main
      className="min-h-screen pt-6 pb-28 px-4"
      style={{
        background: 'linear-gradient(165deg, #f3f4f6 0%, #e8eaef 40%, #f5f0eb 100%)',
      }}
    >
      <audio ref={audioRef} className="hidden" preload="metadata" />

      <div className="max-w-[64.8rem] mx-auto mb-5 flex items-center justify-between px-1">
        <Link
          to="/"
          className="text-[10px] tracking-[0.2em] uppercase text-gray-400 hover:text-black transition-colors"
        >
          ← {lang === 'pt' ? 'Voltar' : 'Back'}
        </Link>
        <span
          className="text-[9px] tracking-[0.25em] uppercase px-3 py-1 rounded-full border border-orange-200 text-orange-600 bg-white/80"
          style={{ borderColor: `${ORANGE}55`, color: ORANGE }}
        >
          {lang === 'pt' ? 'Prévia de layout' : 'Layout preview'}
        </span>
      </div>

      <div
        className="max-w-[64.8rem] w-[94%] mx-auto bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-100/80 overflow-hidden"
        style={{ boxShadow: '0 22px 44px -12px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.02)' }}
      >
        {/* Header card */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: `${ORANGE}18` }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke={ORANGE} strokeWidth="1.5" opacity="0.35" />
                <path
                  d="M12 6v6l4 2"
                  stroke={ORANGE}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M8 9h2M14 9h2M9 14h6" stroke={ORANGE} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.25em] uppercase font-semibold text-gray-800">AndyRadio</p>
            </div>
          </div>
          <img src="/logo.png" alt="" className="h-9 w-auto object-contain opacity-90" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">
            {/* Left: grid playlists */}
            <div className="lg:col-span-4 p-4 sm:p-5 max-h-[min(63vh,576px)] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2.5">
                {playlists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(pl.id);
                      setTrackIdx(0);
                      setPlaying(false);
                    }}
                    className={`text-left rounded-xl overflow-hidden border-2 transition-all bg-white hover:shadow-md ${
                      selectedId === pl.id ? 'ring-2 shadow-md' : 'border-gray-100'
                    }`}
                    style={
                      selectedId === pl.id
                        ? { borderColor: ORANGE, boxShadow: `0 4px 14px ${ORANGE}22` }
                        : {}
                    }
                  >
                    <div className="relative aspect-square">
                      <img src={pl.cover} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <p className="absolute bottom-2 left-2 right-2 text-[9px] sm:text-[10px] font-bold tracking-wide text-white leading-tight line-clamp-2">
                        {pl.title}
                      </p>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[10px] font-semibold text-gray-900 line-clamp-1">{pl.title}</p>
                      <p className="text-[8px] text-gray-400 mt-0.5 line-clamp-2">{pl.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Center: now playing */}
            <div className="lg:col-span-4 p-5 sm:p-6 flex flex-col items-center border-t lg:border-t-0 border-gray-100">
              <div className="w-full max-w-[252px] aspect-square rounded-lg overflow-hidden shadow-md mb-4 bg-gray-100">
                <img src={coverSrc} alt="" className="w-full h-full object-cover" />
              </div>
              <p className="text-[10px] sm:text-[11px] tracking-[0.18em] uppercase text-center text-gray-500 mb-4 px-2">
                {lang === 'pt' ? (
                  <>
                    Curadoria by <span className="text-gray-800 font-medium">OldPlay</span>
                  </>
                ) : (
                  <>
                    Curation by <span className="text-gray-800 font-medium">OldPlay</span>
                  </>
                )}
              </p>
              <h2 className="text-base font-bold text-gray-900 text-center w-full truncate px-2">
                {track?.title || '—'}
              </h2>
              <p className="text-[13px] text-gray-500 mt-1 text-center truncate w-full px-2">{track?.artist || '—'}</p>

              {!track?.url && (
                <p className="text-[10px] text-amber-600 mt-2 text-center">
                  {lang === 'pt'
                    ? 'Faixa de exemplo — reprodução real na playlist “Rádio ao vivo” (se houver áudio no site).'
                    : 'Demo track — real playback in “Live radio” when tracks exist.'}
                </p>
              )}

              <div className="w-full mt-5 space-y-2">
                <div className="flex justify-between text-[10px] tabular-nums text-gray-400">
                  <span>{fmt(progress)}</span>
                  <span>{fmt(duration)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.001}
                  value={duration ? progress / duration : 0}
                  onChange={(e) => seekRatio(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-orange-500"
                  style={{ accentColor: ORANGE }}
                  disabled={!track?.url}
                />
              </div>

              <div className="flex items-center justify-center gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setShuffle((s) => !s)}
                  className={`p-2 rounded-lg transition-colors ${shuffle ? 'text-white' : 'text-gray-300 hover:text-gray-500'}`}
                  style={shuffle ? { background: ORANGE } : {}}
                  aria-label="Shuffle"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 5.5V4h-5.5zm.33 14.41l1.41-1.41 5.17 5.17L22 20.59 16.83 15.42l-1.42 1.41zM14.5 20H20v-5.5l-2.04 2.04-3.96-3.96-1.41 1.41 3.96 3.96L14.5 20z" />
                  </svg>
                </button>
                <button type="button" onClick={prevTrack} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Previous">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!track?.url}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white disabled:opacity-35 disabled:cursor-not-allowed shadow-md"
                  style={{ background: ORANGE }}
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? (
                    <span className="flex gap-1">
                      <span className="w-1.5 h-5 bg-white rounded-sm" />
                      <span className="w-1.5 h-5 bg-white rounded-sm" />
                    </span>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="ml-0.5">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <button type="button" onClick={nextTrack} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Next">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 18h2V6h-2v12zm-11-6l8.5-6v12l-8.5-6z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setRepeat((r) => !r)}
                  className={`p-2 rounded-lg transition-colors ${repeat ? 'text-white' : 'text-gray-300 hover:text-gray-500'}`}
                  style={repeat ? { background: ORANGE } : {}}
                  aria-label="Repeat"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right: queue */}
            <div className="lg:col-span-4 p-4 sm:p-5 flex flex-col max-h-[min(63vh,576px)] border-t lg:border-t-0 border-gray-100">
              <p className="text-[10px] tracking-[0.15em] uppercase text-gray-500 mb-4">
                {lang === 'pt' ? 'Tocando agora: ' : 'Now playing: '}
                <span className="text-gray-900 font-semibold">{selected?.title}</span>
              </p>
              <ul className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1">
                {selected?.tracks?.map((tr, i) => (
                  <li key={tr.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setTrackIdx(i);
                        setPlaying(Boolean(tr.url));
                      }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                        i === trackIdx
                          ? 'bg-orange-50 border-l-4'
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                      style={i === trackIdx ? { borderLeftColor: ORANGE } : {}}
                    >
                      <img src={tr.thumb} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 bg-gray-100" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-gray-400">
                          {i + 1}. {tr.artist}
                        </p>
                        <p className={`text-xs truncate ${i === trackIdx ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                          {tr.title}
                        </p>
                      </div>
                      {!tr.url && (
                        <span className="text-[8px] uppercase text-gray-300 flex-shrink-0">demo</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400 flex-shrink-0">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1 h-1 rounded-full appearance-none"
                  style={{ accentColor: ORANGE }}
                />
              </div>
            </div>
          </div>
      </div>
    </main>
  );
}

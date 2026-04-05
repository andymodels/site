import { useState, useEffect } from 'react';

export default function MusicPlayer() {
  const [settings, setSettings] = useState({ music_enabled: false, spotify_embed_url: '' });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/settings/music')
      .then(r => r.json())
      .then(data => setSettings(data))
      .catch(() => {});
  }, []);

  if (!settings.music_enabled || !settings.spotify_embed_url) return null;

  function toEmbedUrl(url) {
    if (!url) return '';
    if (url.includes('open.spotify.com/embed')) return url;
    return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  }

  const embedUrl = toEmbedUrl(settings.spotify_embed_url);

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col items-start gap-2">
      {open && (
        <iframe
          src={`${embedUrl}?utm_source=generator&theme=0`}
          width="260"
          height="80"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify Player"
          className="rounded shadow-md"
        />
      )}
      <button
        onClick={() => setOpen(v => !v)}
        title={open ? 'Fechar player' : 'Abrir player de música'}
        className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow-sm hover:border-black transition-colors text-gray-500 hover:text-black"
        aria-label={open ? 'Fechar player' : 'Abrir player'}
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
            <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.061z" />
          </svg>
        )}
      </button>
    </div>
  );
}

import { useRadio } from '../context/RadioContext';

export default function RadioMini() {
  const radio = useRadio();

  if (!radio || !radio.tracks.length) return null;

  const { playing, togglePlay } = radio;

  return (
    <button
      onClick={togglePlay}
      title={playing ? 'Pausar rádio' : 'Tocar rádio'}
      aria-label={playing ? 'Pausar rádio' : 'Tocar rádio'}
      className="fixed top-4 left-4 z-50 flex items-center gap-1.5 group"
    >
      {/* Ícone de onda sonora */}
      <svg
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
        className="text-black/40 group-hover:text-black transition-colors"
      >
        {playing ? (
          /* ondas animadas quando tocando */
          <>
            <line x1="11" y1="5" x2="11" y2="19" />
            <line x1="7"  y1="8" x2="7"  y2="16" />
            <line x1="15" y1="8" x2="15" y2="16" />
            <line x1="3"  y1="10" x2="3"  y2="14" />
            <line x1="19" y1="10" x2="19" y2="14" />
          </>
        ) : (
          /* ícone de som mudo / parado */
          <>
            <line x1="11" y1="7" x2="11" y2="17" />
            <line x1="7"  y1="9" x2="7"  y2="15" />
            <line x1="3"  y1="11" x2="3"  y2="13" />
          </>
        )}
      </svg>

      {/* Bolinha pulsando quando tocando */}
      {playing && (
        <span className="w-1 h-1 rounded-full bg-black/30 animate-pulse" />
      )}
    </button>
  );
}

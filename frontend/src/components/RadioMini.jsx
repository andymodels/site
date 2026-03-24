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
      className="fixed top-3 left-4 z-50 flex items-center gap-2 group"
    >
      {/* Equalizador — 5 barras verticais */}
      <svg
        width="24" height="22" viewBox="0 0 24 22"
        fill="none" strokeLinecap="round"
        style={{ overflow: 'visible' }}
      >
        {[
          { x: 2,  delay: '0ms',   hFull: 10, hSmall: 4  },
          { x: 7,  delay: '180ms', hFull: 18, hSmall: 8  },
          { x: 12, delay: '360ms', hFull: 22, hSmall: 10 },
          { x: 17, delay: '180ms', hFull: 18, hSmall: 8  },
          { x: 22, delay: '0ms',   hFull: 10, hSmall: 4  },
        ].map(({ x, delay, hFull, hSmall }) => (
          <line
            key={x}
            x1={x} x2={x}
            y1={playing ? (11 - hFull / 2) : (11 - hSmall / 2)}
            y2={playing ? (11 + hFull / 2) : (11 + hSmall / 2)}
            stroke={playing ? '#E8820C' : '#999'}
            strokeWidth="2.5"
            style={playing ? {
              animation: `soundbar 0.7s ease-in-out infinite`,
              animationDelay: delay,
              transformOrigin: `${x}px 11px`,
            } : {}}
          />
        ))}
      </svg>

      {/* Label ON / OFF */}
      <span className={`text-[8px] tracking-[0.25em] uppercase font-semibold transition-colors ${
        playing ? 'text-[#E8820C]' : 'text-black/30 group-hover:text-black/60'
      }`}>
        {playing ? 'on' : 'off'}
      </span>
    </button>
  );
}

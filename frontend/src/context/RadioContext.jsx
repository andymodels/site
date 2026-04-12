import { createContext, useContext, useEffect, useRef, useState } from 'react';

const RadioContext = createContext(null);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function RadioProvider({ children }) {
  const [tracks, setTracks]     = useState([]);
  const [queue, setQueue]       = useState([]);   // ordem embaralhada
  const [idx, setIdx]           = useState(0);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef  = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    fetch('/api/radio')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setTracks(data);
        setQueue(shuffle(data));
      })
      .catch(() => {});
  }, []);

  const track = queue[idx];
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track?.url) return;
    const wasPlaying = playingRef.current;
    audio.src = track.url;
    audio.load();
    if (wasPlaying) audio.play().catch(() => setPlaying(false));
  }, [idx, queue, track?.url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime  = () => setProgress(audio.currentTime);
    const onLoad  = () => setDuration(audio.duration);
    const onEnded = () => {
      setIdx(i => {
        const next = i + 1;
        if (next >= queue.length) {
          // chegou ao fim — embaralha de novo e recomeça
          setQueue(q => shuffle(q));
          return 0;
        }
        return next;
      });
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onLoad);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onLoad);
      audio.removeEventListener('ended', onEnded);
    };
  }, [queue]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  function prev() { setIdx(i => (i - 1 + queue.length) % queue.length); }
  function next() { setIdx(i => (i + 1) % queue.length); }

  function seek(e, el) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = el.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  return (
    <RadioContext.Provider value={{ tracks, track, playing, progress, duration, togglePlay, prev, next, seek, audioRef }}>
      <audio ref={audioRef} preload="metadata" className="hidden" playsInline />
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  return useContext(RadioContext);
}

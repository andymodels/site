import { createContext, useContext, useEffect, useRef, useState } from 'react';

const RadioContext = createContext(null);

export function RadioProvider({ children }) {
  const [tracks, setTracks]     = useState([]);
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
      .then(data => setTracks(data))
      .catch(() => {});
  }, []);

  const track = tracks[idx];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    const wasPlaying = playing;
    audio.src = track.url;
    audio.load();
    if (wasPlaying) audio.play().catch(() => {});
  }, [idx]);

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

  function prev() { setIdx(i => (i - 1 + tracks.length) % tracks.length); }
  function next() { setIdx(i => (i + 1) % tracks.length); }

  function seek(e, el) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = el.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  return (
    <RadioContext.Provider value={{ tracks, track, playing, progress, duration, togglePlay, prev, next, seek, audioRef }}>
      <audio ref={audioRef} preload="metadata" />
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  return useContext(RadioContext);
}

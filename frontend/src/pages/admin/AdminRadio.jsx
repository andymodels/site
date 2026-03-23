import { useEffect, useRef, useState } from 'react';

export default function AdminRadio() {
  const [tracks, setTracks]     = useState([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle]       = useState('');
  const fileRef = useRef(null);
  const token   = localStorage.getItem('admin_token');

  async function load() {
    try {
      const r = await fetch('/api/admin/radio', { headers: { Authorization: `Bearer ${token}` } });
      setTracks(await r.json());
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileRef.current?.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title || file.name.replace(/\.[^.]+$/, ''));
    try {
      await fetch('/api/admin/radio', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      setTitle('');
      if (fileRef.current) fileRef.current.value = '';
      await load();
    } catch (err) {
      alert('Erro ao enviar: ' + err.message);
    }
    setUploading(false);
  }

  async function toggleActive(track) {
    await fetch(`/api/admin/radio/${track.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: !track.active }),
    });
    load();
  }

  async function del(track) {
    if (!confirm(`Remover "${track.title}"?`)) return;
    await fetch(`/api/admin/radio/${track.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  async function rename(track) {
    const novo = prompt('Novo título:', track.title);
    if (!novo || novo === track.title) return;
    await fetch(`/api/admin/radio/${track.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: novo }),
    });
    load();
  }

  return (
    <div className="bg-white border border-gray-200 p-6 mt-8">
      <h2 className="text-[10px] tracking-[0.25em] uppercase text-gray-400 mb-5">Rádio — Gerenciar Músicas</h2>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-3 mb-6 max-w-xl">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título (opcional)"
          className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black flex-1"
        />
        <label className="flex items-center gap-2 border border-gray-200 px-3 py-2 text-sm cursor-pointer hover:border-black transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-gray-500 text-[11px] tracking-wider">
            {fileRef.current?.files[0]?.name || 'Selecionar MP3'}
          </span>
          <input ref={fileRef} type="file" accept="audio/*,.mp3,.ogg,.wav" className="sr-only"
            onChange={() => setTitle(t => t || fileRef.current?.files[0]?.name?.replace(/\.[^.]+$/, '') || '')} />
        </label>
        <button
          type="submit"
          disabled={uploading}
          className="text-[10px] tracking-[0.2em] uppercase bg-black text-white px-5 py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? 'Enviando…' : '+ Upload'}
        </button>
      </form>

      {/* Track list */}
      {tracks.length === 0 ? (
        <p className="text-[10px] tracking-widest uppercase text-gray-300 py-4">Nenhuma música cadastrada</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {tracks.map((t, i) => (
            <div key={t.id} className="flex items-center gap-4 py-3">
              <span className="text-[10px] text-gray-300 w-5 text-right flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-light truncate">{t.title}</p>
                <p className="text-[9px] text-gray-300 truncate">{t.filename}</p>
              </div>
              <button
                onClick={() => toggleActive(t)}
                className={`text-[9px] tracking-wider uppercase px-2 py-1 border transition-colors ${
                  t.active ? 'border-green-200 text-green-600 hover:border-gray-200 hover:text-gray-400' : 'border-gray-200 text-gray-300 hover:border-black hover:text-black'
                }`}
              >
                {t.active ? 'Ativo' : 'Inativo'}
              </button>
              <button
                onClick={() => rename(t)}
                className="text-[9px] tracking-wider uppercase text-gray-400 hover:text-black transition-colors"
              >
                Renomear
              </button>
              <button
                onClick={() => del(t)}
                className="text-[9px] tracking-wider uppercase text-gray-300 hover:text-red-500 transition-colors"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

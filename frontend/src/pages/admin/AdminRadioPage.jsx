import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const PAGE_SIZE = 50;

export default function AdminRadioPage() {
  const navigate = useNavigate();
  const [tracks, setTracks]       = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [title, setTitle]         = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const fileRef  = useRef(null);
  const token    = localStorage.getItem('admin_token');

  function logout() {
    localStorage.removeItem('admin_token');
    navigate('/admin');
  }

  const load = useCallback(async (p = page) => {
    try {
      const r = await fetch(`/api/admin/radio/admin?page=${p}&limit=${PAGE_SIZE}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 401) { logout(); return; }
      const data = await r.json();
      // Support both array (legacy) and paginated { tracks, total }
      if (Array.isArray(data)) {
        setTracks(data);
        setTotal(data.length);
      } else {
        setTracks(data.tracks ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {}
  }, [page, token]);

  useEffect(() => { load(page); }, [page]);

  async function doUpload(file, titleOverride) {
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', titleOverride || title || file.name.replace(/\.[^.]+$/, ''));

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/admin/radio');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        setUploading(false);
        setUploadProgress(null);
        setTitle('');
        if (fileRef.current) fileRef.current.value = '';
        load(1);
        setPage(1);
        resolve();
      };
      xhr.onerror = () => {
        setUploading(false);
        setUploadProgress(null);
        alert('Erro ao enviar arquivo.');
        resolve();
      };
      xhr.send(fd);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await doUpload(fileRef.current?.files[0]);
  }

  // Drag & drop
  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('audio/') || /\.(mp3|ogg|wav|aac|flac)$/i.test(f.name)
    );
    if (!files.length) return alert('Apenas arquivos de áudio são aceitos.');
    files.forEach(f => doUpload(f, f.name.replace(/\.[^.]+$/, '')));
  }

  async function toggleActive(track) {
    await fetch(`/api/admin/radio/${track.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ active: track.active ? 0 : 1 }),
    });
    load(page);
  }

  async function del(track) {
    if (!confirm(`Remover "${track.title}"?`)) return;
    await fetch(`/api/admin/radio/${track.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    // If last item on page, go back
    if (tracks.length === 1 && page > 1) setPage(p => p - 1);
    else load(page);
  }

  async function rename(track) {
    const novo = prompt('Novo título:', track.title);
    if (!novo || novo === track.title) return;
    await fetch(`/api/admin/radio/${track.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: novo }),
    });
    load(page);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeCount = tracks.filter(t => t.active).length;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-xs font-light tracking-[0.3em] uppercase">Andy Models — Admin</span>
        <div className="flex items-center gap-6">
          <Link to="/admin/dashboard"
            className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
            ← Modelos
          </Link>
          <button onClick={logout}
            className="text-xs tracking-widest uppercase text-gray-400 hover:text-black transition-colors">
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-6 py-8">

        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-[11px] tracking-[0.3em] uppercase text-black mb-1">Rádio</h1>
          <p className="text-[10px] text-gray-400 tracking-wider">
            {total} faixa{total !== 1 ? 's' : ''} cadastrada{total !== 1 ? 's' : ''} · {activeCount} ativa{activeCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Upload area */}
        <div
          className={`border-2 border-dashed p-8 mb-8 text-center transition-colors ${
            dragOver ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <p className="text-[10px] tracking-[0.2em] uppercase text-gray-400 mb-4">
            Arraste arquivos MP3 aqui ou use o formulário abaixo
          </p>
          <p className="text-[9px] text-gray-300 mb-6">MP3 · OGG · WAV · AAC · FLAC · até 50MB por arquivo · múltiplos arquivos via drag & drop</p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título (opcional)"
              className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-black flex-1"
            />
            <label className="flex items-center gap-2 border border-gray-200 px-3 py-2 text-sm cursor-pointer hover:border-black transition-colors bg-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span className="text-gray-500 text-[11px] tracking-wider truncate max-w-[140px]">
                {fileRef.current?.files?.[0]?.name || 'Selecionar arquivo'}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,.mp3,.ogg,.wav,.aac,.flac"
                className="sr-only"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
                }}
              />
            </label>
            <button
              type="submit"
              disabled={uploading}
              className="text-[10px] tracking-[0.2em] uppercase bg-black text-white px-5 py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {uploading ? `Enviando ${uploadProgress ?? 0}%` : '+ Upload'}
            </button>
          </form>

          {/* Upload progress bar */}
          {uploading && uploadProgress !== null && (
            <div className="mt-4 max-w-lg mx-auto">
              <div className="w-full h-0.5 bg-gray-100">
                <div className="h-full bg-black transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Track list */}
        {tracks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[10px] tracking-widest uppercase text-gray-300">Nenhuma música cadastrada</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-[9px] tracking-widest uppercase text-gray-300 font-normal w-10">#</th>
                    <th className="text-left px-5 py-3 text-[9px] tracking-widest uppercase text-gray-300 font-normal">Título</th>
                    <th className="text-left px-5 py-3 text-[9px] tracking-widest uppercase text-gray-300 font-normal hidden md:table-cell">Arquivo</th>
                    <th className="text-left px-5 py-3 text-[9px] tracking-widest uppercase text-gray-300 font-normal hidden sm:table-cell">Status</th>
                    <th className="px-5 py-3 w-36" />
                  </tr>
                </thead>
                <tbody>
                  {tracks.map((t, i) => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-[10px] text-gray-300">
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm font-light">{t.title}</span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <span className="text-[9px] text-gray-300 font-mono">{t.filename}</span>
                      </td>
                      <td className="px-5 py-3 hidden sm:table-cell">
                        <button
                          onClick={() => toggleActive(t)}
                          className={`text-[9px] tracking-wider uppercase px-2 py-1 border transition-colors ${
                            t.active
                              ? 'border-green-200 text-green-600 hover:border-gray-200 hover:text-gray-400'
                              : 'border-gray-200 text-gray-300 hover:border-black hover:text-black'
                          }`}
                        >
                          {t.active ? 'Ativa' : 'Inativa'}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-4 justify-end">
                          <button onClick={() => rename(t)}
                            className="text-[9px] tracking-wider uppercase text-gray-400 hover:text-black transition-colors">
                            Renomear
                          </button>
                          <button onClick={() => del(t)}
                            className="text-[9px] tracking-wider uppercase text-gray-300 hover:text-red-500 transition-colors">
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-[9px] tracking-widest uppercase px-3 py-1.5 border border-gray-200 text-gray-400 hover:border-black hover:text-black transition-colors disabled:opacity-30"
                >
                  ← Anterior
                </button>
                <span className="text-[9px] tracking-wider text-gray-400 px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-[9px] tracking-widest uppercase px-3 py-1.5 border border-gray-200 text-gray-400 hover:border-black hover:text-black transition-colors disabled:opacity-30"
                >
                  Próxima →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

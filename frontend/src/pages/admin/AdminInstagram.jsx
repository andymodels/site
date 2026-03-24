import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const API = '/api';
function getToken() { return localStorage.getItem('admin_token') || ''; }
function authH()    { return { Authorization: `Bearer ${getToken()}` }; }

export default function AdminInstagram() {
  const [posts, setPosts]     = useState([]);
  const [url, setUrl]         = useState('');
  const [imgFile, setImgFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError]     = useState('');
  const [saving, setSaving]   = useState(false);
  const fileRef               = useRef();

  // upload de imagem para post existente sem imagem
  const [uploadFor, setUploadFor]   = useState(null); // post id
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPrev, setUploadPrev] = useState(null);
  const uploadRef = useRef();

  async function load() {
    const r = await fetch(`${API}/instagram`, { headers: authH() });
    const d = await r.json();
    setPosts(Array.isArray(d) ? d : []);
  }
  useEffect(() => { load(); }, []);

  function pickFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setImgFile(f);
    setPreview(URL.createObjectURL(f));
    e.target.value = '';
  }

  function pickUploadFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setUploadFile(f);
    setUploadPrev(URL.createObjectURL(f));
    e.target.value = '';
  }

  async function add(e) {
    e.preventDefault();
    setError('');
    const trimmed = url.trim();
    if (!trimmed.includes('instagram.com/p/') && !trimmed.includes('instagram.com/reel/')) {
      setError('URL inválida. Use o link direto de um post ou reel.');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('url', trimmed);
      if (imgFile) fd.append('image', imgFile);
      const r = await fetch(`${API}/instagram`, { method: 'POST', headers: authH(), body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao salvar.');
      setUrl(''); setImgFile(null); setPreview(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveUpload(id) {
    if (!uploadFile) return;
    const fd = new FormData();
    fd.append('image', uploadFile);
    await fetch(`${API}/instagram/${id}/image`, { method: 'POST', headers: authH(), body: fd });
    setUploadFor(null); setUploadFile(null); setUploadPrev(null);
    await load();
  }

  async function remove(id) {
    if (!confirm('Remover este post?')) return;
    await fetch(`${API}/instagram/${id}`, { method: 'DELETE', headers: authH() });
    await load();
  }

  async function move(id, direction) {
    const idx  = posts.findIndex(p => p.id === id);
    const swap = direction === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= posts.length) return;
    await fetch(`${API}/instagram/${id}`,             { method: 'PATCH', headers: { ...authH(), 'Content-Type': 'application/json' }, body: JSON.stringify({ position: posts[swap].position }) });
    await fetch(`${API}/instagram/${posts[swap].id}`, { method: 'PATCH', headers: { ...authH(), 'Content-Type': 'application/json' }, body: JSON.stringify({ position: posts[idx].position  }) });
    await load();
  }

  const inputClass = 'w-full border border-gray-200 px-4 py-2.5 text-sm font-light outline-none focus:border-black transition-colors bg-white placeholder-gray-400';

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Andy Models" className="h-10 w-auto object-contain" onError={e => { e.target.style.display='none'; }} />
          <span className="text-[10px] font-light tracking-[0.3em] uppercase text-gray-400">Admin</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/admin"              className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">Modelos</Link>
          <Link to="/admin/radio"        className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">Rádio</Link>
          <Link to="/admin/instagram"    className="text-xs tracking-widest uppercase text-black border-b border-black pb-px">Instagram</Link>
          <Link to="/admin/applications" className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">Inscrições</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-[11px] tracking-[0.3em] uppercase text-gray-500 mb-2">Instagram — Posts da Home</h1>
        <p className="text-xs text-gray-400 font-light mb-8">
          Cole a URL do post e faça upload da imagem. Clique na imagem para aparecer na home.
        </p>

        {/* Formulário */}
        <form onSubmit={add} className="space-y-4 mb-10 border border-gray-100 p-6">
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-1.5">URL do post *</label>
            <input type="text" required value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/XXXXXXXX/"
              className={inputClass} />
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-1.5">Imagem do post</label>
            {preview ? (
              <div className="flex items-center gap-4">
                <img src={preview} alt="" className="w-16 h-20 object-cover bg-gray-100" />
                <button type="button" onClick={() => { setImgFile(null); setPreview(null); }}
                  className="text-[10px] tracking-widest uppercase text-gray-400 hover:text-black transition-colors">
                  Remover
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="border border-gray-200 px-4 py-2.5 text-[11px] tracking-[0.14em] uppercase text-gray-500 hover:border-black hover:text-black transition-colors">
                + Selecionar imagem
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} className="hidden" />
            <p className="text-[10px] text-gray-400 mt-1.5">JPG, PNG ou WebP · opcional (pode adicionar depois)</p>
          </div>

          {error && <p className="text-sm text-red-500 font-light">{error}</p>}

          <button type="submit" disabled={saving}
            className="bg-black text-white text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Adicionar post'}
          </button>
        </form>

        {/* Lista */}
        {posts.length === 0 ? (
          <p className="text-sm text-gray-400 font-light">Nenhum post cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {posts.map((post, idx) => (
              <div key={post.id} className="border border-gray-100 p-3 group">
                <div className="flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="w-10 h-12 bg-gray-100 flex-shrink-0 overflow-hidden">
                    {post.image_url
                      ? <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                            <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/>
                          </svg>
                        </div>
                    }
                  </div>

                  {/* Ordenar */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => move(post.id, 'up')}   disabled={idx === 0}               className="text-gray-300 hover:text-black disabled:opacity-20 text-[10px] leading-none">▲</button>
                    <button onClick={() => move(post.id, 'down')} disabled={idx === posts.length - 1} className="text-gray-300 hover:text-black disabled:opacity-20 text-[10px] leading-none">▼</button>
                  </div>

                  <a href={post.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-xs text-gray-500 hover:text-black truncate font-light min-w-0">
                    {post.url}
                  </a>

                  {!post.image_url && (
                    <button onClick={() => { setUploadFor(post.id); setUploadFile(null); setUploadPrev(null); }}
                      className="text-[9px] tracking-widest uppercase text-amber-500 hover:text-black transition-colors flex-shrink-0">
                      + imagem
                    </button>
                  )}

                  <button onClick={() => remove(post.id)}
                    className="text-[10px] tracking-widest uppercase text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 ml-2">
                    Remover
                  </button>
                </div>

                {/* Upload inline para post sem imagem */}
                {uploadFor === post.id && (
                  <div className="mt-3 pl-16 flex items-center gap-3">
                    {uploadPrev
                      ? <img src={uploadPrev} alt="" className="w-12 h-16 object-cover bg-gray-100" />
                      : <button type="button" onClick={() => uploadRef.current?.click()}
                          className="border border-gray-200 px-3 py-1.5 text-[10px] tracking-widest uppercase text-gray-500 hover:border-black transition-colors">
                          Selecionar
                        </button>
                    }
                    {uploadPrev && (
                      <button onClick={() => saveUpload(post.id)}
                        className="bg-black text-white text-[10px] tracking-widest uppercase px-4 py-1.5 hover:bg-gray-800 transition-colors">
                        Salvar
                      </button>
                    )}
                    <button onClick={() => { setUploadFor(null); setUploadFile(null); setUploadPrev(null); }}
                      className="text-[10px] uppercase text-gray-300 hover:text-black transition-colors">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickUploadFile} className="hidden" />

        {posts.length > 0 && (
          <p className="text-[10px] text-gray-300 mt-4 tracking-wide">
            {posts.length} post{posts.length !== 1 ? 's' : ''} · exibidos na home na ordem acima
          </p>
        )}
      </div>
    </div>
  );
}

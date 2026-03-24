import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const API = '/api';
function getToken() { return localStorage.getItem('admin_token') || ''; }
function authH()    { return { Authorization: `Bearer ${getToken()}` }; }

export default function AdminInstagram() {
  const [posts, setPosts]       = useState([]);
  const [url, setUrl]           = useState('');
  const [imgUrl, setImgUrl]     = useState('');
  const [imgFile, setImgFile]   = useState(null);
  const [preview, setPreview]   = useState(null);
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);
  const fileRef                 = useRef();

  const [uploadFor, setUploadFor]     = useState(null);
  const [uploadMode, setUploadMode]   = useState('url'); // 'url' | 'file'
  const [uploadUrl, setUploadUrl]     = useState('');
  const [uploadFile, setUploadFile]   = useState(null);
  const [uploadPrev, setUploadPrev]   = useState(null);
  const uploadRef = useRef();

  async function load() {
    const r = await fetch(`${API}/instagram`, { headers: authH() });
    const d = await r.json();
    setPosts(Array.isArray(d) ? d : []);
  }
  useEffect(() => { load(); }, []);

  function pickFile(e) {
    const f = e.target.files[0]; if (!f) return;
    setImgFile(f); setPreview(URL.createObjectURL(f)); setImgUrl('');
    e.target.value = '';
  }
  function pickUploadFile(e) {
    const f = e.target.files[0]; if (!f) return;
    setUploadFile(f); setUploadPrev(URL.createObjectURL(f));
    e.target.value = '';
  }

  async function add(e) {
    e.preventDefault(); setError('');
    const trimmed = url.trim();
    if (!trimmed.includes('instagram.com/p/') && !trimmed.includes('instagram.com/reel/')) {
      setError('URL inválida. Use o link direto de um post ou reel.'); return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('url', trimmed);
      if (imgFile)       fd.append('image', imgFile);
      else if (imgUrl.trim()) fd.append('image_url', imgUrl.trim());
      const r = await fetch(`${API}/instagram`, { method: 'POST', headers: authH(), body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Erro ao salvar.');
      setUrl(''); setImgFile(null); setPreview(null); setImgUrl('');
      await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function saveUpload(id) {
    const fd = new FormData();
    if (uploadMode === 'file' && uploadFile) fd.append('image', uploadFile);
    else if (uploadMode === 'url' && uploadUrl.trim()) fd.append('image_url', uploadUrl.trim());
    else return;
    await fetch(`${API}/instagram/${id}/image`, { method: 'POST', headers: authH(), body: fd });
    setUploadFor(null); setUploadFile(null); setUploadPrev(null); setUploadUrl('');
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
    const jsonH = { ...authH(), 'Content-Type': 'application/json' };
    await fetch(`${API}/instagram/${id}`,             { method: 'PATCH', headers: jsonH, body: JSON.stringify({ position: posts[swap].position }) });
    await fetch(`${API}/instagram/${posts[swap].id}`, { method: 'PATCH', headers: jsonH, body: JSON.stringify({ position: posts[idx].position  }) });
    await load();
  }

  const inputClass = 'w-full border border-gray-200 px-4 py-2.5 text-sm font-light outline-none focus:border-black transition-colors bg-white placeholder-gray-400';
  const tabClass   = (active) => `text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors cursor-pointer ${active ? 'border-black text-black' : 'border-gray-200 text-gray-400 hover:border-gray-400'}`;

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Andy Models" className="h-10 w-auto object-contain" onError={e=>{e.target.style.display='none';}}/>
          <span className="text-[10px] font-light tracking-[0.3em] uppercase text-gray-400">Admin</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/admin/dashboard"    className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">Dashboard</Link>
          <Link to="/admin/radio"        className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">Rádio</Link>
          <Link to="/admin/instagram"    className="text-xs tracking-widest uppercase text-black border-b border-black pb-px">Instagram</Link>
          <Link to="/admin/applications" className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">Inscrições</Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-[11px] tracking-[0.3em] uppercase text-gray-500 mb-2">Instagram — Posts da Home</h1>
        <p className="text-xs text-gray-400 font-light mb-8">
          Cole a URL do post e adicione a imagem via link ou upload.
        </p>

        <form onSubmit={add} className="space-y-5 mb-10 border border-gray-100 p-6">
          {/* URL do post */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-1.5">URL do post *</label>
            <input type="text" required value={url} onChange={e=>setUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/XXXXXXXX/"
              className={inputClass}/>
          </div>

          {/* Imagem — duas opções */}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-2">Imagem</label>

            {/* Preview se file selecionado */}
            {preview ? (
              <div className="flex items-center gap-4 mb-3">
                <img src={preview} alt="" className="w-14 h-18 object-cover bg-gray-100" style={{height:72}}/>
                <button type="button" onClick={()=>{setImgFile(null);setPreview(null);}}
                  className="text-[10px] tracking-widest uppercase text-gray-400 hover:text-black">Remover</button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Link da imagem */}
                <input type="text" value={imgUrl} onChange={e=>{setImgUrl(e.target.value); setImgFile(null); setPreview(null);}}
                  placeholder="Cole o link direto da imagem (opcional)"
                  className={inputClass}/>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gray-100"/>
                  <span className="text-[10px] text-gray-300 uppercase tracking-widest">ou</span>
                  <div className="flex-1 h-px bg-gray-100"/>
                </div>
                {/* Upload */}
                <button type="button" onClick={()=>fileRef.current?.click()}
                  className="w-full border border-dashed border-gray-200 py-3 text-[11px] tracking-[0.14em] uppercase text-gray-400 hover:border-black hover:text-black transition-colors">
                  + Upload de arquivo
                </button>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} className="hidden"/>
          </div>

          {error && <p className="text-sm text-red-500 font-light">{error}</p>}

          <button type="submit" disabled={saving}
            className="bg-black text-white text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-50">
            {saving ? 'Salvando...' : 'Adicionar post'}
          </button>
        </form>

        {/* Lista */}
        {posts.length === 0
          ? <p className="text-sm text-gray-400 font-light">Nenhum post cadastrado.</p>
          : <div className="space-y-2">
              {posts.map((post, idx) => (
                <div key={post.id} className="border border-gray-100 p-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-12 bg-gray-100 flex-shrink-0 overflow-hidden">
                      {post.image_url
                        ? <img src={post.image_url} alt="" className="w-full h-full object-cover"/>
                        : <div className="w-full h-full flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                              <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/>
                            </svg>
                          </div>
                      }
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button onClick={()=>move(post.id,'up')}   disabled={idx===0}               className="text-gray-300 hover:text-black disabled:opacity-20 text-[10px] leading-none">▲</button>
                      <button onClick={()=>move(post.id,'down')} disabled={idx===posts.length-1}   className="text-gray-300 hover:text-black disabled:opacity-20 text-[10px] leading-none">▼</button>
                    </div>
                    <a href={post.url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-xs text-gray-500 hover:text-black truncate font-light min-w-0">{post.url}</a>

                    {/* Trocar imagem — sempre disponível */}
                    <button onClick={()=>{
                        setUploadFor(uploadFor===post.id ? null : post.id);
                        setUploadMode('url'); setUploadUrl(''); setUploadFile(null); setUploadPrev(null);
                      }}
                      className={`text-[9px] tracking-widest uppercase transition-colors flex-shrink-0 ${!post.image_url ? 'text-amber-500' : 'text-gray-300 opacity-0 group-hover:opacity-100'} hover:text-black`}>
                      {!post.image_url ? '+ imagem' : 'trocar'}
                    </button>
                    <button onClick={()=>remove(post.id)}
                      className="text-[10px] tracking-widest uppercase text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0">
                      Remover
                    </button>
                  </div>

                  {/* Painel inline para adicionar imagem */}
                  {uploadFor === post.id && (
                    <div className="mt-3 pl-16 border-t border-gray-50 pt-3">
                      {/* Tabs */}
                      <div className="flex gap-2 mb-3">
                        <button type="button" className={tabClass(uploadMode==='url')}  onClick={()=>{setUploadMode('url'); setUploadFile(null); setUploadPrev(null);}}>Link</button>
                        <button type="button" className={tabClass(uploadMode==='file')} onClick={()=>{setUploadMode('file'); setUploadUrl('');}}>Upload</button>
                      </div>

                      {uploadMode === 'url' ? (
                        <input type="text" value={uploadUrl} onChange={e=>setUploadUrl(e.target.value)}
                          placeholder="Cole o link direto da imagem"
                          className="w-full border border-gray-200 px-3 py-2 text-xs font-light outline-none focus:border-black mb-3"/>
                      ) : (
                        <div className="mb-3">
                          {uploadPrev
                            ? <img src={uploadPrev} alt="" className="w-14 h-18 object-cover bg-gray-100 mb-2" style={{height:72}}/>
                            : <button type="button" onClick={()=>uploadRef.current?.click()}
                                className="border border-dashed border-gray-200 px-4 py-2 text-[10px] tracking-widest uppercase text-gray-400 hover:border-black hover:text-black transition-colors">
                                Selecionar arquivo
                              </button>
                          }
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={()=>saveUpload(post.id)}
                          className="bg-black text-white text-[10px] tracking-widest uppercase px-4 py-1.5 hover:bg-gray-800 transition-colors">
                          Salvar
                        </button>
                        <button onClick={()=>{setUploadFor(null);setUploadFile(null);setUploadPrev(null);setUploadUrl('');}}
                          className="text-[10px] uppercase text-gray-300 hover:text-black transition-colors px-2">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
        }

        <input ref={uploadRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickUploadFile} className="hidden"/>

        {posts.length > 0 && (
          <p className="text-[10px] text-gray-300 mt-4 tracking-wide">
            {posts.length} post{posts.length!==1?'s':''} · exibidos na home na ordem acima
          </p>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API = '/api';

function getToken() { return localStorage.getItem('admin_token') || ''; }
function authH()    { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

export default function AdminInstagram() {
  const [posts, setPosts]   = useState([]);
  const [url, setUrl]       = useState('');
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch(`${API}/instagram`, { headers: authH() });
    const d = await r.json();
    setPosts(Array.isArray(d) ? d : []);
  }

  useEffect(() => { load(); }, []);

  async function add(e) {
    e.preventDefault();
    setError('');
    const trimmed = url.trim();
    if (!trimmed.includes('instagram.com/p/') && !trimmed.includes('instagram.com/reel/')) {
      setError('URL inválida. Use o link direto de um post ou reel do Instagram.');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/instagram`, {
        method: 'POST',
        headers: authH(),
        body: JSON.stringify({ url: trimmed }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Erro ao salvar.'); }
      setUrl('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
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
    const newPos = posts[swap].position;
    await fetch(`${API}/instagram/${id}`, {
      method: 'PATCH',
      headers: authH(),
      body: JSON.stringify({ position: newPos }),
    });
    await fetch(`${API}/instagram/${posts[swap].id}`, {
      method: 'PATCH',
      headers: authH(),
      body: JSON.stringify({ position: posts[idx].position }),
    });
    await load();
  }

  const inputClass = 'flex-1 border border-gray-200 px-4 py-2.5 text-sm font-light outline-none focus:border-black transition-colors bg-white placeholder-gray-400';

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="Andy Models" className="h-10 w-auto object-contain"
            onError={e => { e.target.style.display = 'none'; }} />
          <span className="text-[10px] font-light tracking-[0.3em] uppercase text-gray-400">Admin</span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/admin" className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
            Modelos
          </Link>
          <Link to="/admin/radio" className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
            Rádio
          </Link>
          <Link to="/admin/applications" className="text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
            Inscrições
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-[11px] tracking-[0.3em] uppercase text-gray-500 mb-8">Instagram — Posts da Home</h1>

        {/* Adicionar post */}
        <form onSubmit={add} className="mb-10">
          <p className="text-xs text-gray-500 mb-3 font-light">
            Cole a URL de um post ou reel do Instagram para exibir na home do site.
          </p>
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/XXXXXXXX/"
              className={inputClass}
              required
            />
            <button
              type="submit"
              disabled={saving}
              className="bg-black text-white text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? '...' : 'Adicionar'}
            </button>
          </div>
          {error && <p className="text-sm text-red-500 mt-2 font-light">{error}</p>}
        </form>

        {/* Lista de posts */}
        {posts.length === 0 ? (
          <p className="text-sm text-gray-400 font-light">Nenhum post cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {posts.map((post, idx) => (
              <div key={post.id} className="flex items-center gap-3 border border-gray-100 px-4 py-3 group">
                {/* Ordem */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => move(post.id, 'up')}
                    disabled={idx === 0}
                    className="text-gray-300 hover:text-black disabled:opacity-20 text-xs leading-none"
                    title="Mover para cima"
                  >▲</button>
                  <button
                    onClick={() => move(post.id, 'down')}
                    disabled={idx === posts.length - 1}
                    className="text-gray-300 hover:text-black disabled:opacity-20 text-xs leading-none"
                    title="Mover para baixo"
                  >▼</button>
                </div>

                {/* URL */}
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-xs text-gray-500 hover:text-black truncate font-light transition-colors"
                >
                  {post.url}
                </a>

                {/* Remover */}
                <button
                  onClick={() => remove(post.id)}
                  className="text-[10px] tracking-widest uppercase text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        {posts.length > 0 && (
          <p className="text-[10px] text-gray-300 mt-6 tracking-wide">
            {posts.length} post{posts.length !== 1 ? 's' : ''} cadastrado{posts.length !== 1 ? 's' : ''} · exibidos na home em ordem acima
          </p>
        )}
      </div>
    </div>
  );
}

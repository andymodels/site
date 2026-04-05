import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../api';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await adminLogin(password);
      localStorage.setItem('admin_token', token);
      navigate('/admin/dashboard');
    } catch {
      setError('Senha incorreta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-sm px-6">
        <h1 className="text-xs font-light tracking-[0.4em] uppercase text-center mb-12">
          Andy Models — Admin
        </h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs tracking-widest uppercase text-gray-400 block mb-2">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 px-4 py-3 text-sm outline-none focus:border-black transition-colors"
              required
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-red-500 tracking-wide">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white text-xs tracking-widest uppercase py-3 hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';

const TOKEN = () => localStorage.getItem('admin_token');

async function fetchStatus() {
  const res = await fetch('/api/admin/sync/status', {
    headers: { Authorization: `Bearer ${TOKEN()}` },
  });
  return res.json();
}

async function triggerSync() {
  const res = await fetch('/api/admin/sync/run', {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN()}` },
  });
  return res.json();
}

function StatusBadge({ running }) {
  return running ? (
    <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-amber-600">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
      Executando
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[9px] tracking-[0.2em] uppercase text-gray-400">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
      Aguardando
    </span>
  );
}

function StatCard({ label, value, color = 'text-black' }) {
  return (
    <div className="border border-gray-100 p-4">
      <p className={`text-2xl font-extralight tabular-nums ${color}`}>{value ?? '—'}</p>
      <p className="text-[9px] tracking-[0.2em] uppercase text-gray-400 mt-1">{label}</p>
    </div>
  );
}

export default function AdminSync() {
  const [status, setStatus] = useState(null);
  const [triggering, setTriggering] = useState(false);
  const [message, setMessage] = useState('');
  const pollRef = useRef(null);

  async function load() {
    try { setStatus(await fetchStatus()); } catch {}
  }

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 4000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function handleSync() {
    setTriggering(true);
    setMessage('');
    try {
      const res = await triggerSync();
      if (res.error) { setMessage(res.error); }
      else { setMessage('Sincronização iniciada.'); load(); }
    } catch { setMessage('Erro ao iniciar sincronização.'); }
    finally { setTriggering(false); }
  }

  const r = status?.lastResult;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link to="/admin/dashboard" className="text-[10px] tracking-widest uppercase text-gray-400 hover:text-black transition-colors">
          ← Dashboard
        </Link>
        <span className="text-gray-200">|</span>
        <span className="text-[11px] font-light tracking-[0.25em] uppercase">Sincronização Drive</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[11px] tracking-[0.25em] uppercase font-medium mb-1">Google Drive Sync</h1>
            <p className="text-xs text-gray-400 font-light">
              Importa modelos das planilhas e baixa imagens das pastas <code className="bg-gray-100 px-1 py-0.5 text-[10px]">site</code> no Drive.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {status && <StatusBadge running={status.running} />}
            <button
              onClick={handleSync}
              disabled={triggering || status?.running}
              className="bg-black text-white text-[10px] tracking-[0.18em] uppercase px-5 py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-40"
            >
              {status?.running ? 'Executando...' : 'Sincronizar agora'}
            </button>
          </div>
        </div>

        {message && (
          <p className="text-xs text-gray-500 font-light border border-gray-200 px-4 py-2.5">{message}</p>
        )}

        {r && (
          <div>
            <p className="text-[9px] tracking-[0.25em] uppercase text-gray-400 mb-4">Último resultado</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard label="Criados"    value={r.total_created}  color="text-green-700" />
              <StatCard label="Atualizados" value={r.total_updated} color="text-blue-700" />
              <StatCard label="Pulados"    value={r.total_skipped}  color="text-gray-500" />
              <StatCard label="Erros"      value={r.errors?.length} color={r.errors?.length ? 'text-red-600' : 'text-gray-500'} />
            </div>

            <div className="flex items-center gap-6 text-[9px] text-gray-400 tracking-wider mb-6">
              <span>Início: {r.started_at ? new Date(r.started_at).toLocaleString('pt-BR') : '—'}</span>
              <span>Fim: {r.finished_at ? new Date(r.finished_at).toLocaleString('pt-BR') : '—'}</span>
              <span className={r.ok ? 'text-green-600' : 'text-red-500'}>{r.ok ? 'OK' : 'COM ERROS'}</span>
            </div>

            {r.errors?.length > 0 && (
              <div className="mb-6">
                <p className="text-[9px] tracking-[0.25em] uppercase text-red-400 mb-2">Erros</p>
                <div className="space-y-1">
                  {r.errors.map((e, i) => (
                    <div key={i} className="flex gap-3 text-xs font-light">
                      <span className="text-gray-400 shrink-0">{e.model}</span>
                      <span className="text-red-500">{e.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {r.warnings?.length > 0 && (
              <div className="mb-6">
                <p className="text-[9px] tracking-[0.25em] uppercase text-amber-400 mb-2">Avisos</p>
                <div className="space-y-1">
                  {r.warnings.map((w, i) => (
                    <div key={i} className="flex gap-3 text-xs font-light">
                      <span className="text-gray-400 shrink-0">{w.model}</span>
                      <span className="text-amber-600">{w.warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {status?.recentLogs?.length > 0 && (
          <div>
            <p className="text-[9px] tracking-[0.25em] uppercase text-gray-400 mb-3">Log recente</p>
            <div className="bg-black rounded-none p-4 overflow-y-auto max-h-80 font-mono text-[10px] space-y-0.5">
              {status.recentLogs.map((line, i) => {
                const color =
                  line.includes('ERRO') || line.includes('ERROR')   ? 'text-red-400' :
                  line.includes('WARN')                             ? 'text-amber-400' :
                  line.includes('CREATE')                           ? 'text-green-400' :
                  line.includes('UPDATE')                           ? 'text-blue-400' :
                  line.includes('═══')                              ? 'text-white font-medium' :
                  'text-gray-400';
                return <p key={i} className={color}>{line}</p>;
              })}
            </div>
          </div>
        )}

        <div className="border border-gray-100 p-5">
          <p className="text-[9px] tracking-[0.25em] uppercase text-gray-400 mb-3">Configuração</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-light text-gray-500">
            <p><span className="text-gray-300">Pasta Feminino:</span> 15Tc0AC60g_67Gd-EujSu2eWGm8I-78bn</p>
            <p><span className="text-gray-300">Pasta Masculino:</span> 1LgDoGg9deOLOjhRtZaLBM6QgTyH3FlEt</p>
            <p><span className="text-gray-300">Máx. imagens por modelo:</span> 10</p>
            <p><span className="text-gray-300">Sync automático:</span> a cada 30 min</p>
          </div>
        </div>

      </div>
    </div>
  );
}

import { useState } from 'react';

const API_BASE = (import.meta.env.VITE_API_URL || '');

const inputClass = `
  w-full border-0 border-b border-gray-200 bg-transparent
  px-0 py-2.5 text-sm font-light text-black placeholder-gray-300
  outline-none focus:border-black transition-colors
`.trim();

function IconEmail() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-gray-400">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <polyline points="2,4 12,13 22,4"/>
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function ContactPage() {
  const [form, setForm]       = useState({ name:'', email:'', phone:'', instagram:'', message:'' });
  const [status, setStatus]   = useState('idle'); // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('');

  function field(key) {
    return {
      value: form[key],
      onChange: e => setForm(p => ({ ...p, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar.');
      setStatus('success');
      setForm({ name:'', email:'', phone:'', instagram:'', message:'' });
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  return (
    <main>
      <div className="max-w-screen-xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 xl:gap-32">

          {/* ── Coluna esquerda ── */}
          <div className="flex flex-col justify-between max-w-sm">
            <div>
              <p className="text-[9px] tracking-[0.35em] uppercase text-gray-400 mb-6">Contato</p>
              <h1 className="text-2xl sm:text-3xl font-extralight tracking-wide leading-snug mb-10">
                Fale com a gente
              </h1>

              <div className="space-y-6 border-t border-gray-100 pt-8">
                {/* Email */}
                <a href="mailto:msn@andymodels.com"
                  className="flex items-center gap-3 group">
                  <IconEmail />
                  <span className="text-sm font-light text-gray-600 group-hover:text-black transition-colors">
                    msn@andymodels.com
                  </span>
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/5527992379073"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.15em] uppercase
                    text-white bg-[#25D366] px-4 py-2.5 hover:bg-[#1ebe5c] transition-colors"
                >
                  <IconWhatsApp />
                  Falar no WhatsApp
                </a>
              </div>
            </div>

            <p className="text-[10px] tracking-[0.1em] text-gray-300 mt-12 hidden lg:block">
              +55 27 99237-9073
            </p>
          </div>

          {/* ── Coluna direita: formulário ── */}
          <div>
            {status === 'success' ? (
              <div className="flex flex-col justify-center h-full min-h-[300px]">
                <p className="text-[10px] tracking-[0.3em] uppercase text-gray-400 mb-3">
                  Mensagem enviada
                </p>
                <p className="text-sm font-light text-gray-500">
                  Recebemos sua mensagem. Entraremos em contato em breve.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-8 text-[10px] tracking-[0.2em] uppercase text-gray-400 hover:text-black transition-colors border-b border-gray-200 pb-px self-start">
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-7">
                <div>
                  <label className="text-[9px] tracking-[0.25em] uppercase text-gray-400 block mb-1">
                    Nome
                  </label>
                  <input type="text" required placeholder="Seu nome"
                    className={inputClass} {...field('name')} />
                </div>

                <div>
                  <label className="text-[9px] tracking-[0.25em] uppercase text-gray-400 block mb-1">
                    Email
                  </label>
                  <input type="email" required placeholder="Seu email"
                    className={inputClass} {...field('email')} />
                </div>

                <div>
                  <label className="text-[9px] tracking-[0.25em] uppercase text-gray-400 block mb-1">
                    Telefone
                  </label>
                  <input type="tel" placeholder="(00) 00000-0000"
                    className={inputClass} {...field('phone')} />
                </div>

                <div>
                  <label className="text-[9px] tracking-[0.25em] uppercase text-gray-400 block mb-1">
                    Instagram
                  </label>
                  <input type="text" placeholder="@seuinstagram"
                    className={inputClass} {...field('instagram')} />
                </div>

                <div>
                  <label className="text-[9px] tracking-[0.25em] uppercase text-gray-400 block mb-1">
                    Mensagem
                  </label>
                  <textarea required placeholder="Como podemos ajudar?"
                    rows={4}
                    className={inputClass + ' resize-none'}
                    {...field('message')} />
                </div>

                {status === 'error' && (
                  <p className="text-[10px] text-red-500">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="text-[10px] tracking-[0.3em] uppercase border border-black px-8 py-3
                    hover:bg-black hover:text-white transition-colors disabled:opacity-40"
                >
                  {status === 'sending' ? 'Enviando…' : 'Enviar'}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </main>
  );
}

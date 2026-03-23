import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
  const { pathname } = useLocation();
  const { lang, t, toggle } = useLanguage();
  const [open, setOpen] = useState(false);

  if (pathname.startsWith('/admin')) return null;

  const NAV = [
    { label: t.nav.home,     to: '/' },
    { label: t.nav.about,    to: '/about' },
    { label: t.nav.women,    to: '/women' },
    { label: t.nav.men,      to: '/men' },
    { label: t.nav.creators, to: '/creators' },
    { label: t.nav.apply,    to: '/inscreva-se' },
    { label: t.nav.contact,  to: '/contact' },
  ];

  function isActive(to) {
    return to === '/' ? pathname === '/' : pathname.startsWith(to);
  }

  return (
    <>
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-6 pt-8 pb-4 flex flex-col items-center">
          <Link to="/" onClick={() => setOpen(false)}>
            <img
              src="/logo.png"
              alt="Andy Models"
              className="h-24 sm:h-28 w-auto object-contain mb-5"
            />
          </Link>

          <div className="hidden md:flex items-center gap-8 lg:gap-10">
            <nav className="flex items-center gap-8 lg:gap-10">
              {NAV.map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  className={`text-[12px] tracking-[0.16em] uppercase transition-colors whitespace-nowrap ${
                    isActive(to)
                      ? 'text-[#C8622A] font-medium'
                      : 'text-gray-500 hover:text-black'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Language toggle */}
            <button
              onClick={toggle}
              className="ml-4 flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase border border-gray-200 px-2.5 py-1 hover:border-black hover:text-black transition-colors text-gray-500"
              aria-label="Toggle language"
            >
              <span className={lang === 'pt' ? 'text-black font-medium' : 'text-gray-300'}>PT</span>
              <span className="text-gray-200">|</span>
              <span className={lang === 'en' ? 'text-black font-medium' : 'text-gray-300'}>EN</span>
            </button>
          </div>

          {/* Mobile: hamburger + lang */}
          <div className="md:hidden flex items-center gap-4 mt-2">
            <button
              onClick={toggle}
              className="flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase border border-gray-200 px-2 py-1 text-gray-500"
            >
              <span className={lang === 'pt' ? 'text-black font-medium' : 'text-gray-300'}>PT</span>
              <span className="text-gray-200 mx-0.5">|</span>
              <span className={lang === 'en' ? 'text-black font-medium' : 'text-gray-300'}>EN</span>
            </button>
            <button
              className="flex flex-col gap-1.5 p-1"
              onClick={() => setOpen(v => !v)}
              aria-label="Menu"
            >
              <span className={`block w-6 h-px bg-black transition-transform duration-200 ${open ? 'translate-y-2.5 rotate-45' : ''}`} />
              <span className={`block w-6 h-px bg-black transition-opacity duration-200 ${open ? 'opacity-0' : ''}`} />
              <span className={`block w-6 h-px bg-black transition-transform duration-200 ${open ? '-translate-y-2.5 -rotate-45' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center md:hidden">
          <Link to="/" onClick={() => setOpen(false)} className="mb-10">
            <img src="/logo.png" alt="Andy Models" className="h-20 w-auto object-contain" />
          </Link>
          <nav className="flex flex-col items-center gap-7">
            {NAV.map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={`text-[13px] tracking-[0.2em] uppercase transition-colors ${
                  isActive(to) ? 'text-[#C8622A] font-medium' : 'text-gray-500'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
          <button
            className="absolute top-6 right-6 text-[11px] tracking-widest uppercase text-gray-400"
            onClick={() => setOpen(false)}
          >
            Fechar
          </button>
        </div>
      )}
    </>
  );
}

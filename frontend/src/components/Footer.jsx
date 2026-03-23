import { useLocation } from 'react-router-dom';

const SOCIALS = [
  {
    href: 'https://www.instagram.com/andymodels/',
    label: 'Instagram',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
        <circle cx="12" cy="12" r="4"/>
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
  },
  {
    href: 'https://x.com/andymodels',
    label: 'X',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    href: 'https://www.facebook.com/andymodels',
    label: 'Facebook',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    href: 'https://www.behance.net/andymodels',
    label: 'Behance',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M6.938 4.503c.702 0 1.34.06 1.92.188.577.13 1.07.33 1.485.61.41.28.733.65.96 1.12.225.47.34 1.05.34 1.73 0 .74-.17 1.36-.507 1.86-.338.5-.837.9-1.502 1.22.906.26 1.576.72 2.022 1.37.448.66.672 1.45.672 2.36 0 .75-.13 1.39-.41 1.93-.28.55-.67 1-1.16 1.35-.49.36-1.06.62-1.7.78-.64.17-1.3.25-1.98.25H0V4.51h6.938v-.007zm-.34 5.54c.54 0 .984-.13 1.327-.38.342-.26.512-.67.512-1.23 0-.31-.055-.57-.17-.78-.11-.21-.27-.38-.46-.51-.19-.13-.42-.22-.67-.27-.26-.05-.53-.07-.82-.07H3.5v3.24h3.098zm.16 5.81c.31 0 .6-.03.87-.09.27-.06.51-.16.71-.31.2-.15.36-.34.48-.59.12-.24.18-.55.18-.91 0-.73-.2-1.25-.61-1.57-.41-.32-.95-.48-1.62-.48H3.5v3.95h3.258zm8.35-5.43c.44-.45 1.08-.68 1.92-.68.56 0 1.04.14 1.45.41.41.27.72.64.93 1.1.21.46.33.98.36 1.56H14.5c0-.76.21-1.31.62-1.63l-.014.24zm5.38 5.67c-.38.37-.94.55-1.68.55-.47 0-.87-.08-1.2-.25-.33-.17-.6-.38-.81-.64-.21-.26-.36-.55-.45-.86-.09-.32-.14-.63-.14-.93h-3.56c0 .68.13 1.3.38 1.87.25.57.62 1.06 1.1 1.47.48.41 1.06.72 1.74.94.68.22 1.44.33 2.29.33.8 0 1.53-.11 2.2-.33.67-.22 1.23-.54 1.7-.96.47-.42.83-.93 1.08-1.53.25-.6.38-1.27.38-2.01v-.35H18.86v.13c0 .78-.2 1.35-.58 1.71l.018-.02zM15.5 4.5h5v1.5h-5V4.5z"/>
      </svg>
    ),
  },
  {
    href: 'https://vimeo.com/andymodels',
    label: 'Vimeo',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 12.4C4.603 9.813 3.834 8.515 3.01 8.515c-.179 0-.806.378-1.881 1.132L0 8.306c1.185-1.044 2.351-2.087 3.498-3.13C5.08 3.748 6.266 3.113 7.055 3.038c1.847-.173 2.982.922 3.409 3.253.344 1.8.596 2.923.754 3.363.418 1.87.88 2.8 1.384 2.8.39 0 .979-.61 1.774-1.843.792-1.232 1.215-2.17 1.258-2.81.112-1.063-.305-1.595-1.258-1.595-.448 0-.909.103-1.384.311 2.267-9.477 9.232-14.091 10.985-3.1z"/>
      </svg>
    ),
  },
  {
    href: 'https://br.pinterest.com/andymodels/',
    label: 'Pinterest',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
      </svg>
    ),
  },
  {
    href: 'mailto:msn@andymodels.com',
    label: 'Email',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="2" y="4" width="20" height="16" rx="2"/>
        <polyline points="2,4 12,13 22,4"/>
      </svg>
    ),
  },
];

export default function Footer() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="border-t border-gray-100 mt-16">

      {/* Social icons strip */}
      <div className="py-5 flex items-center justify-center gap-6">
        {SOCIALS.map(({ href, label, icon }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith('mailto') ? undefined : '_blank'}
            rel="noopener noreferrer"
            aria-label={label}
            className="text-gray-300 hover:text-[#C8622A] transition-colors duration-200"
          >
            {icon}
          </a>
        ))}
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-50 py-5">
        <div className="max-w-screen-2xl mx-auto px-6 flex items-center justify-between">
          <img src="/logo.png" alt="Andy Models" className="h-4 w-auto object-contain opacity-30" />
          <span className="text-[9px] tracking-[0.1em] text-gray-200">
            © {new Date().getFullYear()} Andy Models
          </span>
        </div>
      </div>

    </footer>
  );
}

import { useEffect, useRef, useState } from 'react';

function EmbedPost({ url }) {
  const ref = useRef(null);

  useEffect(() => {
    if (window.instgrm) {
      window.instgrm.Embeds.process();
    }
  }, []);

  return (
    <div ref={ref} className="instagram-embed-wrapper overflow-hidden bg-white flex items-center justify-center" style={{ minHeight: 220 }}>
      <blockquote
        className="instagram-media"
        data-instgrm-captioned
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: '#fff',
          border: 0,
          borderRadius: 3,
          boxShadow: 'none',
          margin: 0,
          padding: 0,
          maxWidth: '100%',
          width: '100%',
        }}
      />
    </div>
  );
}

export default function InstagramFeed() {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/instagram')
      .then(r => r.json())
      .then(data => { setPosts(Array.isArray(data) ? data : []); })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  // Load Instagram embed script once
  useEffect(() => {
    if (document.getElementById('instagram-embed-script')) {
      if (window.instgrm) window.instgrm.Embeds.process();
      return;
    }
    const s = document.createElement('script');
    s.id = 'instagram-embed-script';
    s.src = 'https://www.instagram.com/embed.js';
    s.async = true;
    s.defer = true;
    document.body.appendChild(s);
  }, [posts]);

  if (!loading && posts.length === 0) return null;

  return (
    <section className="border-t border-gray-100 pt-12 mb-16">
      <div className="flex items-baseline justify-between mb-6">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-black">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          <h2 className="text-[11px] tracking-[0.4em] uppercase font-light">Instagram</h2>
        </div>
        <a
          href="https://www.instagram.com/andymodels"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] tracking-[0.14em] uppercase text-gray-400 hover:text-black transition-colors"
        >
          @andymodels
        </a>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-gray-100 animate-pulse rounded" style={{ minHeight: 220 }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {posts.map(post => (
            <EmbedPost key={post.id} url={post.url} />
          ))}
        </div>
      )}
    </section>
  );
}

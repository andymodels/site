import { useEffect, useState } from 'react';

function SkeletonCard() {
  return <div className="bg-gray-100 animate-pulse" style={{ aspectRatio: '3/4' }} />;
}

export default function InstagramFeed() {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/instagram')
      .then(r => r.json())
      .then(d => setPosts(Array.isArray(d) ? d : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && posts.length === 0) return null;

  return (
    <section className="border-t border-gray-100 pt-6 mb-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-0.5">
        <div className="flex items-center gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          <span className="text-[10px] tracking-[0.4em] uppercase font-light">Instagram</span>
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

      {/* Grid — idêntica à home */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-px bg-gray-100">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white">
                <SkeletonCard />
              </div>
            ))
          : posts.map(post => (
              <a
                key={post.id}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white overflow-hidden"
              >
                <div
                  className="relative overflow-hidden bg-gray-100"
                  style={{ aspectRatio: '3/4' }}
                >
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover object-top
                        transition-all duration-700 ease-out
                        grayscale group-hover:grayscale-0 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <circle cx="12" cy="12" r="4"/>
                        <circle cx="17.5" cy="6.5" r="1" fill="#ccc" stroke="none"/>
                      </svg>
                    </div>
                  )}
                </div>
              </a>
            ))
        }
      </div>
    </section>
  );
}

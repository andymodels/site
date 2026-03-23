import { useEffect, useState } from 'react';
import { getInstagramFeed } from '../api';

function PostCard({ post }) {
  const img = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
  const caption = post.caption ? post.caption.slice(0, 90) + (post.caption.length > 90 ? '…' : '') : '';

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group block relative overflow-hidden bg-gray-100"
      style={{ aspectRatio: '1/1' }}
    >
      {img && (
        <img
          src={img}
          alt={caption || 'Instagram post'}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-all duration-500 grayscale group-hover:grayscale-0 group-hover:scale-[1.04]"
        />
      )}
      {post.media_type === 'VIDEO' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-8 h-8 bg-white bg-opacity-80 rounded-full flex items-center justify-center">
            <span className="text-black text-xs ml-0.5">▶</span>
          </div>
        </div>
      )}
      {post.media_type === 'CAROUSEL_ALBUM' && (
        <div className="absolute top-2 right-2 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" opacity="0.9">
            <rect x="2" y="6" width="14" height="14" rx="1" />
            <rect x="8" y="2" width="14" height="14" rx="1" fill="none" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
      )}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all" />
    </a>
  );
}

export default function InstagramFeed() {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    getInstagramFeed()
      .then(setPosts)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (error || (!loading && posts.length === 0)) return null;

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
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-px">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-gray-100 animate-pulse" style={{ aspectRatio: '1/1' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-px">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}

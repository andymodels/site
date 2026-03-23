export function parseVideoUrl(url) {
  if (!url) return null;

  // YouTube: watch, youtu.be, shorts
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m) {
    const id = m[1];
    return {
      platform: 'youtube',
      id,
      embed: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      thumb: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  // Vimeo
  m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) {
    return {
      platform: 'vimeo',
      id: m[1],
      embed: `https://player.vimeo.com/video/${m[1]}?autoplay=1`,
      thumb: null,
    };
  }

  return null;
}

export function isVideoUrl(url) {
  return Boolean(parseVideoUrl(url));
}

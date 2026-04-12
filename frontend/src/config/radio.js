export const RADIO_FEED_URL =
  (import.meta.env.VITE_RADIO_API_URL || '').trim() || '/api/radio';

function normalizeTrack(t) {
  if (!t || typeof t !== 'object') return null;
  const url = String(t.url || '').trim();
  if (!url) return null;
  const id = t.id != null ? String(t.id) : url;
  const thumb = String(t.cover_url || t.thumb || '').trim();
  return {
    id,
    playlist_id: t.playlist_id != null ? t.playlist_id : null,
    title: t.title || '—',
    url,
    artist: (t.artist && String(t.artist).trim()) || 'Andy Models Radio',
    thumb: thumb || 'https://picsum.photos/seed/live/80/80',
  };
}

/**
 * Aceita o formato antigo (array de faixas), tracks-only do CRM, ou radio v2 (playlists / tracks_flat).
 * Devolve sempre uma lista plana para o player: { id, title, url, artist, thumb, playlist_id? }.
 */
export function parseRadioFeedJson(data) {
  if (data == null) return [];

  if (Array.isArray(data)) {
    return data.map(normalizeTrack).filter(Boolean);
  }

  const root = data?.data != null && typeof data.data === 'object' ? data.data : data;

  if (Array.isArray(root.tracks)) {
    return root.tracks.map(normalizeTrack).filter(Boolean);
  }
  if (Array.isArray(root.tracks_flat)) {
    return root.tracks_flat.map(normalizeTrack).filter(Boolean);
  }
  if (Array.isArray(root.playlists)) {
    const out = [];
    for (const pl of root.playlists) {
      if (!Array.isArray(pl?.tracks)) continue;
      for (const tr of pl.tracks) {
        const n = normalizeTrack(tr);
        if (n) out.push(n);
      }
    }
    return out;
  }

  return [];
}

function hubTrackRow(t, keyPrefix, i) {
  const n = normalizeTrack(t);
  if (!n) return null;
  return {
    id: `${keyPrefix}-${n.id}-${i}`,
    title: n.title,
    artist: n.artist,
    thumb: n.thumb,
    url: n.url,
  };
}

/**
 * Playlists para a página /radio: CRM v2 (várias playlists) ou uma única lista (legado / tracks-only / tracks_flat).
 */
export function parseRadioHubPlaylists(data, { titleSingle, descSingle }) {
  if (data == null) return [];

  const root = data?.data != null && typeof data.data === 'object' ? data.data : data;

  if (Array.isArray(root.playlists) && root.playlists.length > 0) {
    return root.playlists
      .map((pl, pi) => {
        const key = pl.slug != null ? String(pl.slug) : pl.id != null ? String(pl.id) : `pl-${pi}`;
        const tracks = (Array.isArray(pl.tracks) ? pl.tracks : [])
          .map((t, i) => hubTrackRow(t, key, i))
          .filter(Boolean);
        const cover = String(pl.cover_url || '').trim();
        return {
          id: key,
          title: String(pl.name || pl.title || `Playlist ${pi + 1}`),
          description: String(pl.description || '').trim(),
          cover: cover || '/logo.png',
          tracks,
        };
      })
      .filter((p) => p.tracks.length > 0);
  }

  const flat = parseRadioFeedJson(data);
  if (!flat.length) return [];

  return [
    {
      id: 'radio',
      title: titleSingle,
      description: descSingle,
      cover: '/logo.png',
      tracks: flat.map((r, i) => ({
        id: `radio-${r.playlist_id != null ? `${r.playlist_id}-` : ''}${r.id}-${i}`,
        title: r.title,
        artist: r.artist,
        thumb: r.thumb,
        url: r.url,
      })),
    },
  ];
}

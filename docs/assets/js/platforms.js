// Shared metadata used by the public page (page.js) and the admin panel.
// `key` is the field name inside album.links / site.socials.
// `odesli` is the platform key returned by the song.link (Odesli) API.
// `icon` is the key inside ICONS (assets/js/icons.js).

export const PLATFORMS = [
  { key: 'spotify',      label: 'Spotify',       odesli: 'spotify',      icon: 'spotify' },
  { key: 'appleMusic',   label: 'Apple Music',   odesli: 'appleMusic',   icon: 'appleMusic' },
  { key: 'youtubeMusic', label: 'YouTube Music', odesli: 'youtubeMusic', icon: 'youtubeMusic' },
  { key: 'youtube',      label: 'YouTube',       odesli: 'youtube',      icon: 'youtube' },
  { key: 'amazonMusic',  label: 'Amazon Music',  odesli: 'amazonMusic',  icon: 'amazonMusic' },
  { key: 'deezer',       label: 'Deezer',        odesli: 'deezer',       icon: 'deezer' },
  { key: 'tidal',        label: 'TIDAL',         odesli: 'tidal',        icon: 'tidal' },
  { key: 'soundcloud',   label: 'SoundCloud',    odesli: 'soundcloud',   icon: 'soundcloud' },
  { key: 'bandcamp',     label: 'Bandcamp',      odesli: 'bandcamp',     icon: 'bandcamp' },
];

export const SOCIALS = [
  { key: 'instagram', label: 'Instagram', icon: 'instagram' },
  { key: 'facebook',  label: 'Facebook',  icon: 'facebook' },
  { key: 'tiktok',    label: 'TikTok',    icon: 'tiktok' },
  { key: 'x',         label: 'X',         icon: 'x' },
  { key: 'youtube',   label: 'YouTube',   icon: 'youtube' },
  { key: 'whatsapp',  label: 'WhatsApp',  icon: 'whatsapp' },
  { key: 'email',     label: 'Email',     icon: 'mail' },     // value is an address; rendered as mailto:
  { key: 'maps',      label: 'Location',  icon: 'mapPin' },
  { key: 'website',   label: 'Website',   icon: 'globe' },
];

export const THEMES = [
  { key: 'ink',   label: 'Ink — black & white, line-art logo' },
  { key: 'paper', label: 'Paper — off-white, black ink' },
  { key: 'fire',  label: 'Fire — brand red & yellow, sticker style' },
  { key: 'sun',   label: 'Sun — brand yellow, black type' },
  { key: 'cover', label: 'Cover — blurred album art backdrop' },
];

export const DEFAULT_TEXTS = {
  listen: 'Listen on',
  play: 'Play',
  shop: 'Buy this record',
  catalog: 'Browse our catalog',
  follow: 'Follow us',
  notFound: "We couldn't find that record.",
};

// Album slugs: lowercase letters, digits and single hyphens, 1-60 chars.
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text) {
  return String(text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

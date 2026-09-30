import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Plate Pal - Cute Portion Companion',
    short_name: 'PlatePal',
    description: 'A cute AI portion-control and healthy-eating companion',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFDF9',
    theme_color: '#A7F3D0',
    icons: [
      {
        src: '/plate-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}

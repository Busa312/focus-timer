import type { CSSProperties } from 'react';
import type { FoxColor } from '../../types';

/** Fill tokens for each fox color. Colors swap these, nothing else. */
export const FOX_PALETTES: Record<
  FoxColor,
  { main: string; shade: string; light: string; ear: string; sock: string; ink: string }
> = {
  red: {
    main: '#f08a4b',
    shade: '#d9703a',
    light: '#fff4e6',
    ear: '#ffc9b0',
    sock: '#6b4636',
    ink: '#3b2a24',
  },
  arctic: {
    main: '#f3efea',
    shade: '#d9d2ca',
    light: '#ffffff',
    ear: '#f6d6d6',
    sock: '#bdb3a9',
    ink: '#3b2a24',
  },
  silver: {
    main: '#a7adbb',
    shade: '#8a909f',
    light: '#eef0f4',
    ear: '#d5d0e3',
    sock: '#4a4f5c',
    ink: '#2a2530',
  },
  midnight: {
    main: '#5d5694',
    shade: '#463f7a',
    light: '#d6d1f5',
    ear: '#9a92d4',
    sock: '#211e36',
    ink: '#0f0c1f',
  },
};

export function paletteStyle(color: FoxColor): CSSProperties {
  const p = FOX_PALETTES[color];
  return {
    '--fox-main': p.main,
    '--fox-shade': p.shade,
    '--fox-light': p.light,
    '--fox-ear': p.ear,
    '--fox-sock': p.sock,
    '--fox-ink': p.ink,
  } as CSSProperties;
}

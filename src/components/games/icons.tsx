import type { ItemKind } from '../../logic/catchGame';
import type { MemoryFace } from '../../logic/memoryGame';

/** Falling items in Catch the treats (also used on memory cards). */
export function TreatIcon({ kind, className = '' }: { kind: ItemKind; className?: string }) {
  if (kind === 'pinecone') {
    return (
      <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
        <path d="M20 6 C29 10 32 20 28 30 C25 36 15 36 12 30 C8 20 11 10 20 6 Z" fill="#8a5a3c" />
        <g fill="none" stroke="#5e3a26" strokeWidth="2" strokeLinecap="round">
          <path d="M13 16 Q20 20 27 16 M12 22 Q20 27 28 22 M13 28 Q20 32 27 28" />
          <path d="M20 9 L20 33" opacity="0.5" />
        </g>
      </svg>
    );
  }
  const golden = kind === 'golden';
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {golden && <circle cx="20" cy="21" r="17" fill="#ffe08a" opacity="0.45" />}
      <path
        d="M20 9 C30 9 34 18 31 26 C28 34 12 34 9 26 C6 18 10 9 20 9 Z"
        fill={golden ? '#f6c143' : '#ff6b81'}
        stroke={golden ? '#d99a1e' : '#e2465f'}
        strokeWidth="1.5"
      />
      <path d="M14 8 Q20 3 26 8 Q20 11 14 8 Z" fill="#5fbf7f" />
      <g fill={golden ? '#fff6d6' : '#ffe08a'}>
        <circle cx="15" cy="17" r="1.4" />
        <circle cx="23" cy="15" r="1.4" />
        <circle cx="26" cy="22" r="1.4" />
        <circle cx="18" cy="24" r="1.4" />
        <circle cx="13" cy="23" r="1.4" />
      </g>
    </svg>
  );
}

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Card faces for Memory match: the wardrobe accessories (same colors) and treats. */
export function MemoryFaceIcon({ face, className = '' }: { face: MemoryFace; className?: string }) {
  switch (face) {
    case 'berry':
      return <TreatIcon kind="berry" className={className} />;
    case 'golden':
      return <TreatIcon kind="golden" className={className} />;
    case 'glasses':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <g fill="rgba(140,200,255,0.25)" stroke="#3b2a24" strokeWidth="2.6" strokeLinecap="round">
            <circle cx="12.5" cy="21" r="7" />
            <circle cx="27.5" cy="21" r="7" />
            <path d="M19.5 20 Q20 17.5 20.5 20 M5.5 19 L2.5 16.5 M34.5 19 L37.5 16.5" fill="none" />
          </g>
        </svg>
      );
    case 'headphones':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <path
            d="M8 24 Q7 7 20 7 Q33 7 32 24"
            fill="none"
            stroke="#5b6bd6"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <rect x="4" y="20" width="8" height="13" rx="4" fill="#7b8af0" />
          <rect x="28" y="20" width="8" height="13" rx="4" fill="#7b8af0" />
          <rect x="6.5" y="23" width="3" height="7" rx="1.5" fill="#c9d0ff" />
          <rect x="30.5" y="23" width="3" height="7" rx="1.5" fill="#c9d0ff" />
        </svg>
      );
    case 'beanie':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <path d="M7 28 Q7 9 20 9 Q33 9 33 28 Z" fill="#5fb3c9" />
          <path
            d="M14 11.5 L14 27 M20 9.5 L20 27 M26 11.5 L26 27"
            stroke="#4a98ad"
            strokeWidth="2"
          />
          <rect x="5" y="25" width="30" height="7" rx="3.5" fill="#4a98ad" />
          <circle cx="20" cy="7" r="4.5" fill="#ffffff" stroke="#d9e8ee" strokeWidth="1" />
        </svg>
      );
    case 'flowerCrown': {
      const flowers: [number, number, string][] = [
        [8, 24, '#ff9fb8'],
        [20, 17, '#ffd66b'],
        [32, 24, '#c9a8f0'],
      ];
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <path
            d="M4 28 Q20 12 36 28"
            fill="none"
            stroke="#6dbb7b"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <ellipse cx="14" cy="22" rx="3.5" ry="1.8" fill="#6dbb7b" transform="rotate(-30 14 22)" />
          <ellipse cx="26" cy="22" rx="3.5" ry="1.8" fill="#6dbb7b" transform="rotate(30 26 22)" />
          {flowers.map(([x, y, color]) => (
            <g key={x}>
              {Array.from({ length: 5 }, (_, i) => {
                const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                return (
                  <circle
                    key={i}
                    cx={x + Math.cos(a) * 3.6}
                    cy={y + Math.sin(a) * 3.6}
                    r={3.1}
                    fill={color}
                  />
                );
              })}
              <circle cx={x} cy={y} r={2.1} fill="#fff3b0" />
            </g>
          ))}
        </svg>
      );
    }
    case 'bowTie':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <path
            d="M20 20 L6 11 L6 29 Z M20 20 L34 11 L34 29 Z"
            fill="#e0516b"
            stroke="#e0516b"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="20" r="4.5" fill="#c23a55" />
        </svg>
      );
    case 'starCape':
      return (
        <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
          <path d="M13 6 Q20 9 27 6 L35 34 Q20 38 5 34 Z" fill="#7466d6" />
          <path
            d="M13 6 L5 34 M27 6 L35 34"
            stroke="#5a4dc0"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d={star(20, 22, 7)} fill="#ffd66b" />
          <path d={star(11, 29, 2.5)} fill="#ffd66b" />
          <path d={star(29, 14, 2.2)} fill="#ffd66b" />
        </svg>
      );
  }
}

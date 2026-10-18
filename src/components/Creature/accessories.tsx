import type { Accessory } from '../../types';
import { NECK_Y, stageTransforms, type StageGeometry } from './geometry';

export type AccessorySlot = 'head' | 'neck' | 'back';

const INK = 'var(--fox-ink)';

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

function Flower({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        return (
          <circle
            key={i}
            cx={x + Math.cos(a) * 3.6}
            cy={y + Math.sin(a) * 3.6}
            r={3.2}
            fill={color}
          />
        );
      })}
      <circle cx={x} cy={y} r={2.2} fill="#fff3b0" />
    </g>
  );
}

/** Point on the crown's curve (quadratic from (66,74) via (100,52) to (134,74)). */
function crownPoint(t: number): [number, number] {
  const u = 1 - t;
  return [u * u * 66 + 2 * u * t * 100 + t * t * 134, u * u * 74 + 2 * u * t * 52 + t * t * 74];
}

function HeadItem({ accessory, g }: { accessory: Accessory; g: StageGeometry }) {
  switch (accessory) {
    case 'glasses': {
      const r = 8 + 3 * g.eye;
      return (
        <g data-acc="glasses" stroke={INK} strokeWidth={2.6} strokeLinecap="round">
          <circle cx={86} cy={94} r={r} fill="rgba(255,255,255,0.22)" />
          <circle cx={114} cy={94} r={r} fill="rgba(255,255,255,0.22)" />
          <path d={`M${86 + r} 93 Q100 88 ${114 - r} 93`} fill="none" />
          <path d={`M${86 - r} 92 L62 87 M${114 + r} 92 L138 87`} fill="none" />
        </g>
      );
    }
    case 'headphones':
      return (
        <g data-acc="headphones">
          <path
            d="M57 100 Q54 42 100 42 Q146 42 143 100"
            fill="none"
            stroke="#5b6bd6"
            strokeWidth={6}
            strokeLinecap="round"
          />
          <rect x={48} y={86} width={15} height={27} rx={7} fill="#7b8af0" />
          <rect x={137} y={86} width={15} height={27} rx={7} fill="#7b8af0" />
          <rect x={52} y={91} width={6} height={17} rx={3} fill="#c9d0ff" />
          <rect x={142} y={91} width={6} height={17} rx={3} fill="#c9d0ff" />
        </g>
      );
    case 'beanie':
      return (
        <g data-acc="beanie">
          <path d="M70 70 Q70 36 100 36 Q130 36 130 70 Z" fill="#5fb3c9" />
          <path
            d="M84 40 L84 68 M100 36 L100 68 M116 40 L116 68"
            stroke="#4a98ad"
            strokeWidth={3}
          />
          <rect x={66} y={62} width={68} height={12} rx={6} fill="#4a98ad" />
          <circle cx={100} cy={33} r={7} fill="#fff" />
        </g>
      );
    case 'flowerCrown': {
      const colors = ['#ff9fb8', '#ffd66b', '#c9a8f0', '#ffd66b', '#ff9fb8'];
      return (
        <g data-acc="flowerCrown">
          <path
            d="M66 74 Q100 52 134 74"
            fill="none"
            stroke="#6dbb7b"
            strokeWidth={3}
            strokeLinecap="round"
          />
          {[0.18, 0.5, 0.82].map((t) => {
            const [x, y] = crownPoint(t);
            return (
              <ellipse
                key={t}
                cx={x + 4}
                cy={y + 1}
                rx={4}
                ry={2}
                fill="#6dbb7b"
                transform={`rotate(-25 ${x + 4} ${y + 1})`}
              />
            );
          })}
          {[0.04, 0.27, 0.5, 0.73, 0.96].map((t, i) => {
            const [x, y] = crownPoint(t);
            return <Flower key={t} x={x} y={y} color={colors[i]} />;
          })}
        </g>
      );
    }
    default:
      return null;
  }
}

function NeckItem({ accessory, g }: { accessory: Accessory; g: StageGeometry }) {
  const { bodyLift } = stageTransforms(g);
  // Just under the chin, which moves with head size and leg length.
  const chin = NECK_Y + bodyLift + 5 * g.head;
  if (accessory === 'bowTie') {
    const y = chin + 4;
    return (
      <g data-acc="bowTie" strokeLinejoin="round">
        <path
          d={`M100 ${y} L87 ${y - 7.5} L87 ${y + 7.5} Z M100 ${y} L113 ${y - 7.5} L113 ${y + 7.5} Z`}
          fill="#e0516b"
          stroke="#e0516b"
          strokeWidth={3}
        />
        <circle cx={100} cy={y} r={3.8} fill="#c23a55" />
      </g>
    );
  }
  if (accessory === 'starCape') {
    return (
      <g data-acc="starCape-clasp">
        <path
          d={`M80 ${chin - 3} Q100 ${chin + 6} 120 ${chin - 3}`}
          fill="none"
          stroke="#5a4dc0"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path d={star(100, chin + 2.5, 5)} fill="#ffd66b" stroke="#e8b93c" strokeWidth={1} />
      </g>
    );
  }
  return null;
}

function BackItem({ accessory, g }: { accessory: Accessory; g: StageGeometry }) {
  if (accessory !== 'starCape') return null;
  const n = NECK_Y + stageTransforms(g).bodyLift;
  return (
    <g data-acc="starCape">
      <path d={`M76 ${n} Q100 ${n + 8} 124 ${n} L148 186 Q100 197 52 186 Z`} fill="#7466d6" />
      <path d={`M76 ${n} L52 186`} stroke="#5a4dc0" strokeWidth={3} strokeLinecap="round" />
      <path d={`M124 ${n} L148 186`} stroke="#5a4dc0" strokeWidth={3} strokeLinecap="round" />
      {[
        [61, 176, 4.5],
        [140, 172, 5],
        [68, 154, 3.5],
        [133, 150, 3.5],
      ].map(([x, y, r]) => (
        <path key={`${x}`} d={star(x, y, r)} fill="#ffd66b" />
      ))}
    </g>
  );
}

/**
 * Accessory layers, drawn in the fox's own coordinate spaces (head space for
 * hats and glasses, body space for neck and back items) so each one follows
 * every stage's proportions and every color automatically.
 */
export function AccessoryLayer({
  accessory,
  slot,
  g,
}: {
  accessory: Accessory;
  slot: AccessorySlot;
  g: StageGeometry;
}) {
  if (accessory === 'none') return null;
  if (slot === 'head') return <HeadItem accessory={accessory} g={g} />;
  if (slot === 'neck') return <NeckItem accessory={accessory} g={g} />;
  return <BackItem accessory={accessory} g={g} />;
}

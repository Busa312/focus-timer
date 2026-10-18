import { useId, type ReactNode } from 'react';
import type { Accessory, FoxColor } from '../../types';
import { AccessoryLayer } from './accessories';
import type { Expression, Eyes, Mouth } from './expression';
import {
  GROUND_Y,
  STAGE_GEOMETRY,
  stageTransforms,
  type GrownStage,
  type StageGeometry,
} from './geometry';
import { paletteStyle } from './palette';

const INK = 'var(--fox-ink)';
const BLUSH = '#ff8fa3';

function Eye({
  cx,
  cy,
  r,
  kind,
  side,
}: {
  cx: number;
  cy: number;
  r: number;
  kind: Eyes;
  side: -1 | 1;
}) {
  const hl = (dx: number, dy: number, rr: number) => (
    <circle cx={cx + dx * r} cy={cy + dy * r} r={rr * r} fill="#fff" />
  );
  const stroke = {
    stroke: INK,
    strokeWidth: Math.max(2.2, r * 0.45),
    strokeLinecap: 'round' as const,
    fill: 'none',
  };
  switch (kind) {
    case 'sparkle':
      return (
        <g>
          <circle cx={cx} cy={cy} r={r * 1.18} fill={INK} />
          {hl(-0.32, -0.38, 0.42)}
          {hl(0.4, 0.34, 0.2)}
          <path
            d={`M${cx + r * 1.5} ${cy - r * 1.5} l${r * 0.25} ${r * 0.55} l${r * 0.55} ${r * 0.25} l${-r * 0.55} ${r * 0.25} l${-r * 0.25} ${r * 0.55} l${-r * 0.25} ${-r * 0.55} l${-r * 0.55} ${-r * 0.25} l${r * 0.55} ${-r * 0.25} z`}
            fill="#ffd66b"
            className="fox-twinkle"
          />
        </g>
      );
    case 'round':
      return (
        <g>
          <circle cx={cx} cy={cy} r={r} fill={INK} />
          {hl(-0.3, -0.36, 0.34)}
        </g>
      );
    case 'wide':
      return (
        <g>
          <circle cx={cx} cy={cy} r={r * 1.22} fill="#fff" stroke={INK} strokeWidth={1.4} />
          <circle cx={cx} cy={cy + r * 0.1} r={r * 0.62} fill={INK} />
          {hl(-0.18, -0.12, 0.2)}
        </g>
      );
    case 'lidded':
    case 'reading':
    case 'down': {
      const dy = kind === 'lidded' ? 0 : r * 0.3;
      const rr = kind === 'lidded' ? r : r * 0.86;
      return (
        <g>
          <path
            d={`M${cx - rr} ${cy + dy} A${rr} ${rr} 0 0 0 ${cx + rr} ${cy + dy} Z`}
            fill={INK}
          />
          <path
            d={`M${cx - rr - 1.2} ${cy + dy} L${cx + rr + 1.2} ${cy + dy}`}
            {...stroke}
            strokeWidth={2.2}
          />
        </g>
      );
    }
    case 'droopy': {
      // Lids slope down toward the outer corners.
      const outer = cx + side * r * 1.5;
      const inner = cx - side * r * 1.5;
      return (
        <g>
          <circle cx={cx} cy={cy + r * 0.1} r={r} fill={INK} />
          {hl(-0.25, 0.1, 0.26)}
          <path
            d={`M${outer} ${cy + r * 0.05} L${inner} ${cy - r * 0.75} L${inner} ${cy - r * 2} L${outer} ${cy - r * 2} Z`}
            fill="var(--fox-main)"
          />
          <path
            d={`M${outer} ${cy + r * 0.05} L${inner} ${cy - r * 0.75}`}
            {...stroke}
            strokeWidth={2}
          />
        </g>
      );
    }
    case 'joy':
      return (
        <path
          d={`M${cx - r} ${cy + r * 0.35} Q${cx} ${cy - r * 1.15} ${cx + r} ${cy + r * 0.35}`}
          {...stroke}
        />
      );
  }
}

function MouthShape({ kind }: { kind: Mouth }) {
  const s = {
    stroke: INK,
    strokeWidth: 2.4,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };
  switch (kind) {
    case 'w':
      return <path d="M93 116 Q96.5 120.5 100 116 Q103.5 120.5 107 116" {...s} />;
    case 'open':
      return (
        <g>
          <path
            d="M92 115 Q100 129 108 115 Z"
            fill={INK}
            stroke={INK}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
          <path d="M96 121.5 Q100 126.5 104 121.5 Q100 119.5 96 121.5 Z" fill="#ff8fa3" />
        </g>
      );
    case 'flat':
      return <path d="M94 118.5 L106 118.5" {...s} />;
    case 'frown':
      return <path d="M93 122 Q100 115.5 107 122" {...s} />;
    case 'wavy':
      return <path d="M91 119 Q94 116 97 119 Q100 122 103 119 Q106 116 109 119" {...s} />;
    case 'small':
      return <path d="M96.5 117 Q100 120 103.5 117" {...s} />;
  }
}

function Brows({ kind, eyeY }: { kind: Expression['brows']; eyeY: number }) {
  if (kind === 'none') return null;
  const lift = kind === 'worried' ? 3 : 0;
  const s = { stroke: INK, strokeWidth: 2.4, strokeLinecap: 'round' as const, fill: 'none' };
  return (
    <g>
      <path d={`M79 ${eyeY - 9 - lift} Q86 ${eyeY - 11 - lift} 92 ${eyeY - 15 - lift}`} {...s} />
      <path d={`M121 ${eyeY - 9 - lift} Q114 ${eyeY - 11 - lift} 108 ${eyeY - 15 - lift}`} {...s} />
    </g>
  );
}

function Face({
  expr,
  eyeScale,
  eyeY = 94,
}: {
  expr: Expression;
  eyeScale: number;
  eyeY?: number;
}) {
  const r = 6.4 * eyeScale;
  return (
    <g data-part="face">
      {expr.blush && (
        <g fill={BLUSH} opacity={0.45}>
          <ellipse cx={75} cy={106} rx={6.5} ry={3.6} />
          <ellipse cx={125} cy={106} rx={6.5} ry={3.6} />
        </g>
      )}
      <g className={expr.blink ? 'fox-blink' : undefined}>
        <Eye cx={86} cy={eyeY} r={r} kind={expr.eyes} side={-1} />
        <Eye cx={114} cy={eyeY} r={r} kind={expr.eyes} side={1} />
      </g>
      <Brows kind={expr.brows} eyeY={eyeY - (r - 6.4)} />
      <ellipse cx={100} cy={110.5} rx={5.2} ry={3.7} fill={INK} />
      <MouthShape kind={expr.mouth} />
      {expr.extras.includes('sweat') && (
        <path d="M136 72 Q142 82 136 87 Q130 82 136 72 Z" fill="#8ecdf5" className="fox-sweat" />
      )}
    </g>
  );
}

function Tail({ g, clipId, wag }: { g: StageGeometry; clipId: string; wag: number }) {
  const d = 'M118 176 C158 184 180 150 162 118 C154 104 136 106 141 121 C147 140 141 160 116 164 Z';
  const size = g.tail === 'nub' ? 0.55 : g.tail === 'big' ? 1.16 : 1;
  const lift = g.legs === 'long' ? -10 : 0;
  return (
    <g
      className={wag ? 'fox-wag' : undefined}
      style={wag ? { animationDuration: `${wag}s` } : undefined}
      data-part="tail"
    >
      <g transform={`translate(0 ${lift}) translate(118 172) scale(${size}) translate(-118 -172)`}>
        <clipPath id={clipId}>
          <path d={d} />
        </clipPath>
        <path d={d} fill="var(--fox-main)" />
        <path
          d="M150 150 C158 140 162 128 160 118"
          stroke="var(--fox-shade)"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
          opacity={0.5}
        />
        {g.tailTip && (
          <circle
            cx={158}
            cy={112}
            r={17}
            fill="var(--fox-light)"
            clipPath={`url(#${clipId})`}
            data-part="tail-tip"
          />
        )}
        <path
          d={d}
          fill="none"
          stroke="var(--fox-shade)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

function Body({ g }: { g: StageGeometry }) {
  if (g.legs === 'long') {
    return (
      <g data-part="body">
        <rect x={83} y={158} width={12} height={33} rx={6} fill="var(--fox-sock)" />
        <rect x={105} y={158} width={12} height={33} rx={6} fill="var(--fox-sock)" />
        <ellipse
          cx={100}
          cy={146}
          rx={31}
          ry={31}
          fill="var(--fox-main)"
          stroke="var(--fox-shade)"
          strokeWidth={2.5}
        />
        <ellipse cx={100} cy={152} rx={18} ry={20} fill="var(--fox-light)" />
        <ellipse cx={89} cy={190} rx={8} ry={4.5} fill="var(--fox-sock)" />
        <ellipse cx={111} cy={190} rx={8} ry={4.5} fill="var(--fox-sock)" />
      </g>
    );
  }
  return (
    <g data-part="body">
      <ellipse
        cx={100}
        cy={158}
        rx={33}
        ry={33}
        fill="var(--fox-main)"
        stroke="var(--fox-shade)"
        strokeWidth={2.5}
      />
      <ellipse cx={100} cy={166} rx={19} ry={21} fill="var(--fox-light)" />
      <ellipse cx={87} cy={188.5} rx={9} ry={5.5} fill="var(--fox-sock)" />
      <ellipse cx={113} cy={188.5} rx={9} ry={5.5} fill="var(--fox-sock)" />
    </g>
  );
}

function Book({ lift }: { lift: number }) {
  return (
    <g transform={`translate(0 ${lift})`} data-part="book" className="fox-book">
      <path d="M74 150 L100 155 L126 150 L126 176 L100 181 L74 176 Z" fill="#7bb6e8" />
      <path d="M77 150 L100 154 L100 177 L77 173 Z" fill="#fff" stroke="#d8cbbf" strokeWidth={1} />
      <path
        d="M123 150 L100 154 L100 177 L123 173 Z"
        fill="#fff"
        stroke="#d8cbbf"
        strokeWidth={1}
      />
      <path
        d="M81 157 L95 159.5 M81 162 L95 164.5 M105 159.5 L119 157 M105 164.5 L119 162"
        stroke="#cdbfb2"
        strokeWidth={1.2}
        strokeLinecap="round"
      />
      <circle cx={76} cy={170} r={6} fill="var(--fox-sock)" />
      <circle cx={124} cy={170} r={6} fill="var(--fox-sock)" />
    </g>
  );
}

function Scarf({ lift }: { lift: number }) {
  return (
    <g transform={`translate(0 ${lift})`} data-part="scarf">
      <path d="M110 126 L119 156 Q113 159.5 106 156 L101 129 Z" fill="#3f9c93" />
      <path d="M71 120 Q100 136 129 120 L130 129 Q100 146 70 129 Z" fill="#4fb3a9" />
      <path
        d="M86 128 L88 136 M100 131 L100 140 M114 128 L112 136"
        stroke="#e9f7f5"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
}

function Ears({ g, down }: { g: StageGeometry; down: boolean }) {
  const ear = (side: -1 | 1) => {
    const m = (x: number) => 100 + side * (100 - x);
    const pivotX = m(80);
    return (
      <g transform={down ? `rotate(${side * 28} ${pivotX} 72)` : undefined} className="fox-ear">
        <path
          d={`M${m(64)} 82 L${m(70)} 32 L${m(100)} 62 Z`}
          fill="var(--fox-main)"
          stroke="var(--fox-main)"
          strokeWidth={8}
          strokeLinejoin="round"
        />
        <path
          d={`M${m(71)} 72 L${m(74)} 45 L${m(91)} 62 Z`}
          fill="var(--fox-ear)"
          stroke="var(--fox-ear)"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path
          d={`M${m(68.5)} 39 L${m(70)} 31 L${m(77)} 38.5 Z`}
          fill="var(--fox-sock)"
          stroke="var(--fox-sock)"
          strokeWidth={5}
          strokeLinejoin="round"
        />
      </g>
    );
  };
  return (
    <g transform={`translate(100 70) scale(${g.ears}) translate(-100 -70)`} data-part="ears">
      {ear(-1)}
      {ear(1)}
    </g>
  );
}

function Head({
  g,
  expr,
  accessory,
}: {
  g: StageGeometry;
  expr: Expression;
  accessory: Accessory;
}) {
  return (
    <g className="fox-head">
      <Ears g={g} down={expr.earsDown} />
      <path
        d="M61 97 Q61 60 100 60 Q139 60 139 97 Q139 117 100 133 Q61 117 61 97 Z"
        fill="var(--fox-main)"
      />
      <path
        d="M61 97 Q80 108 100 111 Q120 108 139 97 Q139 117 100 133 Q61 117 61 97 Z"
        fill="var(--fox-light)"
      />
      <path
        d="M61 97 Q61 60 100 60 Q139 60 139 97 Q139 117 100 133 Q61 117 61 97 Z"
        fill="none"
        stroke="var(--fox-shade)"
        strokeWidth={2.5}
        strokeLinejoin="round"
        data-part="head-outline"
      />
      <path
        d="M93 64 Q100 74 107 64"
        fill="none"
        stroke="var(--fox-shade)"
        strokeWidth={2.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      <Face expr={expr} eyeScale={g.eye} />
      <AccessoryLayer accessory={accessory} slot="head" g={g} />
    </g>
  );
}

/** Floating extras drawn in view coordinates, outside the stage scale. */
function Extras({ expr, headTop }: { expr: Expression; headTop: number }) {
  const out: ReactNode[] = [];
  if (expr.extras.includes('hearts')) {
    out.push(
      <g key="hearts" fill="#ff7a93" data-part="hearts">
        {[
          [62, headTop + 8, 0],
          [140, headTop + 2, 1.6],
          [104, headTop - 10, 3.2],
        ].map(([x, y, delay]) => (
          <path
            key={delay}
            className="fox-heart"
            style={{ animationDelay: `${delay}s` }}
            d={`M${x} ${y + 3} c-3 -5 -10 -2 -7 3 l7 7 l7 -7 c3 -5 -4 -8 -7 -3 z`}
          />
        ))}
      </g>,
    );
  }
  if (expr.extras.includes('rain')) {
    const y = headTop - 22;
    out.push(
      <g key="rain" className="fox-rain" data-part="rain">
        <path
          d={`M78 ${y} a9 9 0 0 1 10 -10 a12 12 0 0 1 22 0 a9 9 0 0 1 12 10 z`}
          fill="#b9c4d6"
        />
        <path
          d={`M86 ${y + 5} l-2 6 M100 ${y + 5} l-2 6 M114 ${y + 5} l-2 6`}
          stroke="#8ecdf5"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="fox-drops"
        />
      </g>,
    );
  }
  if (expr.extras.includes('ball')) {
    out.push(
      <g key="ball" className="fox-ball" data-part="ball">
        <circle cx={168} cy={178} r={11} fill="#ffd66b" />
        <path
          d="M157 178 Q168 170 179 178 M157 178 Q168 186 179 178"
          stroke="#ff8fa3"
          strokeWidth={2.5}
          fill="none"
        />
      </g>,
    );
  }
  if (expr.extras.includes('confetti')) {
    const colors = ['#ff8fa3', '#ffd66b', '#7bb6e8', '#8fdcb5', '#c7a8f0'];
    out.push(
      <g key="confetti" data-part="confetti">
        {Array.from({ length: 12 }, (_, i) => (
          <rect
            key={i}
            x={18 + ((i * 41) % 164)}
            y={8 + ((i * 23) % 40)}
            width={6}
            height={3.5}
            rx={1}
            fill={colors[i % colors.length]}
            className="fox-confetti"
            style={{ animationDelay: `${(i % 6) * 0.22}s` }}
          />
        ))}
      </g>,
    );
  }
  return <>{out}</>;
}

interface FoxProps {
  stage: GrownStage;
  expr: Expression;
  color: FoxColor;
  accessory: Accessory;
}

export function FoxSvg({ stage, expr, color, accessory }: FoxProps) {
  const g = STAGE_GEOMETRY[stage];
  const t = stageTransforms(g);
  const clipId = `tail${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  return (
    <svg
      viewBox="0 0 200 200"
      className="fox h-full w-full overflow-visible"
      style={paletteStyle(color)}
      aria-hidden="true"
    >
      <ellipse
        cx={100}
        cy={GROUND_Y + 1}
        rx={44 * g.scale}
        ry={5}
        fill="rgba(59,42,36,0.13)"
        className="fox-shadow"
      />
      <g className={`fox-motion fox-m-${expr.motion}`}>
        <g transform={t.stage}>
          <AccessoryLayer accessory={accessory} slot="back" g={g} />
          <Tail g={g} clipId={clipId} wag={expr.wag} />
          <Body g={g} />
          {g.scarf && <Scarf lift={t.bodyLift} />}
          <g transform={t.head}>
            <Head g={g} expr={expr} accessory={accessory} />
          </g>
          <AccessoryLayer accessory={accessory} slot="neck" g={g} />
          {expr.extras.includes('book') && <Book lift={t.bodyLift} />}
        </g>
      </g>
      <Extras expr={expr} headTop={t.headTop} />
    </svg>
  );
}

interface EggProps {
  expr: Expression;
  color: FoxColor;
  evolving?: boolean;
}

export function EggSvg({ expr, color, evolving = false }: EggProps) {
  const eggExpr: Expression = {
    ...expr,
    extras: expr.extras.filter((e) => e !== 'book' && e !== 'ball'),
  };
  const motion = evolving
    ? 'hatch'
    : expr.motion === 'bob' || expr.motion === 'slowbob' || expr.motion === 'nod'
      ? 'wobble'
      : expr.motion;
  return (
    <svg
      viewBox="0 0 200 200"
      className="fox h-full w-full overflow-visible"
      style={paletteStyle(color)}
      aria-hidden="true"
    >
      <ellipse cx={100} cy={GROUND_Y + 1} rx={34} ry={5} fill="rgba(59,42,36,0.13)" />
      <g className={`fox-motion fox-m-${motion}`}>
        <path
          d="M100 86 C127 86 143 124 143 150 C143 175 125 192 100 192 C75 192 57 175 57 150 C57 124 73 86 100 86 Z"
          fill="#fff4e6"
          stroke="#ead6c2"
          strokeWidth={2}
        />
        <g fill="var(--fox-main)" opacity={0.75}>
          <ellipse cx={82} cy={112} rx={6} ry={4.5} />
          <ellipse cx={118} cy={106} rx={4.5} ry={3.5} />
          <ellipse cx={128} cy={136} rx={5} ry={6} />
          <ellipse cx={72} cy={142} rx={4} ry={5} />
          <ellipse cx={104} cy={94} rx={3} ry={2.5} />
          <ellipse cx={86} cy={178} rx={5} ry={3.5} />
          <ellipse cx={122} cy={172} rx={3.5} ry={3} />
        </g>
        <g transform="translate(0 46) translate(100 104) scale(0.62) translate(-100 -104)">
          <Face expr={eggExpr} eyeScale={1.1} />
        </g>
        {evolving && (
          <path
            d="M70 128 L82 120 L90 132 L100 118 L110 134 L120 122 L130 130"
            fill="none"
            stroke="#c9ad93"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            data-part="cracks"
          />
        )}
      </g>
      <Extras expr={eggExpr} headTop={92} />
    </svg>
  );
}

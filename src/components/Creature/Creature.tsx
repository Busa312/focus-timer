import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STAGE_LABEL } from '../../lib/labels';
import type { Accessory, CreatureState, FoxColor, Mood, Stage } from '../../types';
import './creature.css';
import { expressionFor } from './expression';
import { EggSvg, FoxSvg } from './FoxSvg';
import { lineKeyFor } from './lines';
import { LOOPING_KEYS, lottieKeyFor, lottieLoader, type LottieKey } from './lottie';
import { LottieFox } from './LottieFox';
import { SpeechBubble } from './SpeechBubble';

interface Props {
  stage: Stage;
  mood: Mood;
  state: CreatureState;
  color?: FoxColor;
  accessory?: Accessory;
  name?: string;
  /** Egg cracking / glowing during the evolution moment. */
  evolving?: boolean;
  /** Show the occasional speech bubble. */
  speech?: boolean;
  /** A one-off line that replaces the bubble right away. */
  say?: string | null;
  /** 'svg' forces the drawn fox (wardrobe, share card). */
  renderer?: 'auto' | 'svg';
  /** No animation at all, e.g. for the share card snapshot. */
  still?: boolean;
  className?: string;
}

/**
 * The one component that decides what the fox looks like. Uses a Lottie file
 * for the current state when one exists, otherwise the SVG fox with CSS
 * keyframe animations. Same API either way.
 */
export function Creature({
  stage,
  mood,
  state,
  color = 'red',
  accessory = 'none',
  name,
  evolving = false,
  speech = false,
  say = null,
  renderer = 'auto',
  still = false,
  className = '',
}: Props) {
  const reduced = useReducedMotion();
  const expr = expressionFor(mood, state);

  // Lottie files are drawn in the default look; colors and accessories use the SVG fox.
  let key: LottieKey | null = null;
  if (renderer === 'auto' && color === 'red' && accessory === 'none') {
    key = stage === 'egg' ? (evolving ? 'hatch' : null) : lottieKeyFor(mood, state);
  }
  const loader = key ? lottieLoader(key) : null;

  const svg =
    stage === 'egg' ? (
      <EggSvg expr={expr} color={color} evolving={evolving} />
    ) : (
      <FoxSvg stage={stage} expr={expr} color={color} accessory={accessory} />
    );

  const feeling = state === 'idle' ? mood : state;
  return (
    <div
      className={`relative ${reduced ? 'fox-reduced' : ''} ${still ? 'fox-still' : ''} ${className}`}
      data-stage={stage}
      data-mood={mood}
      data-state={state}
      data-renderer={loader ? 'lottie' : 'svg'}
      data-reduced={reduced || undefined}
      role="img"
      aria-label={`${name ? `${name}, ` : ''}${STAGE_LABEL[stage].toLowerCase()} fox, ${feeling}`}
    >
      {loader && key ? (
        <LottieFox
          key={key}
          load={loader}
          loop={LOOPING_KEYS.has(key)}
          reduced={reduced}
          fallback={svg}
        />
      ) : (
        svg
      )}
      {(speech || say) && <SpeechBubble lineKey={lineKeyFor(mood, state)} override={say} />}
    </div>
  );
}

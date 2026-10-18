import { act, fireEvent, render, screen } from '@testing-library/react';
import type { CreatureState, Mood, Stage } from '../../types';
import { EvolutionMoment } from '../EvolutionMoment';
import { Creature } from './Creature';
import { expressionFor } from './expression';
import { LINES } from './lines';

const STAGES: Stage[] = ['egg', 'baby', 'kid', 'teen', 'adult'];
const MOODS: Mood[] = ['ecstatic', 'happy', 'meh', 'sad'];
const STATES: CreatureState[] = [
  'idle',
  'focused',
  'playing',
  'celebrating',
  'disappointed',
  'worried',
];

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

afterEach(() => {
  // @ts-expect-error jsdom has no matchMedia by default
  delete window.matchMedia;
});

describe('Creature', () => {
  it.each(
    STAGES.flatMap((stage) => MOODS.flatMap((mood) => STATES.map((state) => [stage, mood, state]))),
  )('renders %s / %s / %s', (stage, mood, state) => {
    const { container } = render(
      <Creature stage={stage as Stage} mood={mood as Mood} state={state as CreatureState} />,
    );
    const root = screen.getByRole('img');
    expect(root).toHaveAttribute('data-stage', stage);
    expect(root).toHaveAttribute('data-state', state);
    expect(root).toHaveAttribute('data-renderer', 'svg');
    expect(container.querySelector('svg.fox')).not.toBeNull();
    const face = container.querySelector('[data-part="face"]');
    expect(face).not.toBeNull();
  });

  it('draws growth features per stage', () => {
    const parts = (stage: Stage) => {
      const { container, unmount } = render(<Creature stage={stage} mood="happy" state="idle" />);
      const has = (p: string) => container.querySelector(`[data-part="${p}"]`) !== null;
      const out = { tail: has('tail'), tip: has('tail-tip'), scarf: has('scarf') };
      unmount();
      return out;
    };
    expect(parts('egg')).toEqual({ tail: false, tip: false, scarf: false });
    expect(parts('baby')).toEqual({ tail: true, tip: false, scarf: false });
    expect(parts('kid')).toEqual({ tail: true, tip: false, scarf: false });
    expect(parts('teen')).toEqual({ tail: true, tip: true, scarf: false });
    expect(parts('adult')).toEqual({ tail: true, tip: true, scarf: true });
  });

  it('shows state props: book while focused, rain cloud when sad, cracks when hatching', () => {
    const { container, rerender } = render(<Creature stage="kid" mood="happy" state="focused" />);
    expect(container.querySelector('[data-part="book"]')).not.toBeNull();
    rerender(<Creature stage="kid" mood="sad" state="idle" />);
    expect(container.querySelector('[data-part="rain"]')).not.toBeNull();
    rerender(<Creature stage="egg" mood="happy" state="worried" evolving />);
    expect(container.querySelector('[data-part="cracks"]')).not.toBeNull();
  });

  it('gives every mood and state its own face', () => {
    const faces = new Set(
      [
        ...MOODS.map((m) => expressionFor(m, 'idle')),
        ...STATES.filter((s) => s !== 'idle').map((s) => expressionFor('happy', s)),
      ].map((e) => `${e.eyes}/${e.mouth}/${e.motion}`),
    );
    expect(faces.size).toBe(MOODS.length + STATES.length - 1);
  });

  it('short-lived states override the mood face', () => {
    expect(expressionFor('sad', 'celebrating')).toEqual(expressionFor('ecstatic', 'celebrating'));
  });

  it('respects prefers-reduced-motion', () => {
    mockReducedMotion(true);
    render(<Creature stage="adult" mood="ecstatic" state="idle" />);
    const root = screen.getByRole('img');
    expect(root).toHaveClass('fox-reduced');
    expect(root).toHaveAttribute('data-reduced', 'true');
  });

  it('animates normally without the preference', () => {
    mockReducedMotion(false);
    render(<Creature stage="adult" mood="ecstatic" state="idle" />);
    expect(screen.getByRole('img')).not.toHaveClass('fox-reduced');
  });

  it('applies color tokens', () => {
    const { container } = render(
      <Creature stage="kid" mood="happy" state="idle" color="midnight" />,
    );
    const svg = container.querySelector('svg.fox') as SVGElement;
    expect(svg.style.getPropertyValue('--fox-main')).toBe('#5d5694');
  });
});

describe('SpeechBubble', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows a line from the state pool now and then', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // next line after the minimum 22 s
    render(<Creature stage="kid" mood="happy" state="focused" speech />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(LINES.focused).toContain(screen.getByRole('status').textContent);
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(screen.queryByRole('status')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(18_500);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows a one-off line right away', () => {
    render(<Creature stage="kid" mood="happy" state="focused" say="Phew, you're back!" />);
    expect(screen.getByRole('status')).toHaveTextContent("Phew, you're back!");
  });
});

describe('EvolutionMoment', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('hatches the egg, then waits for Continue', () => {
    const onDone = vi.fn();
    render(<EvolutionMoment name="Pip" fromStage="egg" toStage="baby" onDone={onDone} />);
    expect(screen.getByText('Something is happening...')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('data-stage', 'egg');
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByText('Pip hatched!')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('data-stage', 'baby');
    expect(screen.getByText('Continue')).toHaveFocus();
    fireEvent.click(screen.getByText('Continue'));
    expect(onDone).toHaveBeenCalled();
  });

  it('announces a stage-up', () => {
    render(<EvolutionMoment name="Pip" fromStage="teen" toStage="adult" onDone={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByText('Pip is now a Adult!')).toBeInTheDocument();
  });
});

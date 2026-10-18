import { render, screen, waitFor } from '@testing-library/react';
import { useImperativeHandle } from 'react';
import { Creature } from './Creature';

const handle = { play: vi.fn(), stop: vi.fn() };
const lottieProps: Record<string, unknown>[] = [];

// Pretend a focused.json file exists; everything else falls back to SVG.
vi.mock('./lottie', async (orig) => {
  const actual = await orig<typeof import('./lottie')>();
  const loader = () => Promise.resolve({ fake: 'animation' });
  return {
    ...actual,
    lottieLoader: (key: string) => (key === 'focused' ? loader : null),
  };
});

vi.mock('lottie-react', () => ({
  Lottie: (props: Record<string, unknown> & { lottieRef: React.Ref<typeof handle> }) => {
    lottieProps.push(props);
    useImperativeHandle(props.lottieRef, () => handle);
    return <div data-testid="lottie" />;
  },
}));

function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduce,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe('Lottie behind the Creature API', () => {
  beforeEach(() => {
    lottieProps.length = 0;
    handle.play.mockReset();
    handle.stop.mockReset();
  });
  afterEach(() => {
    // @ts-expect-error cleanup
    delete window.matchMedia;
  });

  it('uses the Lottie file when one exists for the state, looping idle states', async () => {
    render(<Creature stage="kid" mood="happy" state="focused" />);
    expect(screen.getByRole('img')).toHaveAttribute('data-renderer', 'lottie');
    await screen.findByTestId('lottie');
    expect(lottieProps.at(-1)).toMatchObject({
      src: { fake: 'animation' },
      loop: true,
      autoplay: true,
    });
  });

  it('falls back to the SVG fox for states without a file', () => {
    const { container } = render(<Creature stage="kid" mood="happy" state="playing" />);
    expect(screen.getByRole('img')).toHaveAttribute('data-renderer', 'svg');
    expect(container.querySelector('svg.fox')).not.toBeNull();
  });

  it('keeps the SVG fox for colors and accessories', () => {
    render(<Creature stage="kid" mood="happy" state="focused" color="arctic" />);
    expect(screen.getByRole('img')).toHaveAttribute('data-renderer', 'svg');
  });

  it('holds the first frame with reduced motion', async () => {
    mockReducedMotion(true);
    render(<Creature stage="kid" mood="happy" state="focused" />);
    await screen.findByTestId('lottie');
    expect(lottieProps.at(-1)).toMatchObject({ autoplay: false });
    await waitFor(() => expect(handle.stop).toHaveBeenCalled());
    expect(handle.play).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShareSheet } from '../components/ShareSheet';
import { initialState } from '../logic/engine';
import { useAppStore } from '../store/useAppStore';
import { SHARE_FILENAME, shareOrDownload } from './share';

const toBlob = vi.fn();
vi.mock('html-to-image', () => ({ toBlob: (...args: unknown[]) => toBlob(...args) }));

/** Touch device (coarse pointer) or desktop. */
function mockPointer(coarse: boolean) {
  window.matchMedia = vi.fn((q: string) => ({
    matches: coarse && q.includes('pointer'),
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
}

const png = () => new Blob(['png'], { type: 'image/png' });

function mockShare(supported: boolean, share = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: supported ? vi.fn(() => true) : undefined,
  });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: supported ? share : undefined,
  });
  return share;
}

afterEach(() => {
  // @ts-expect-error jsdom has no matchMedia by default
  delete window.matchMedia;
});

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:card');
  URL.revokeObjectURL = vi.fn();
  toBlob.mockReset().mockResolvedValue(png());
});

describe('shareOrDownload', () => {
  it('opens the share sheet with the PNG on phones', async () => {
    const share = mockShare(true);
    await expect(shareOrDownload(png(), 'hi')).resolves.toBe('shared');
    const arg = share.mock.calls[0][0] as ShareData;
    expect(arg.files![0].name).toBe(SHARE_FILENAME);
    expect(arg.files![0].type).toBe('image/png');
  });

  it('treats closing the share sheet as cancelled, not an error', async () => {
    mockShare(true, vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')));
    await expect(shareOrDownload(png(), 'hi')).resolves.toBe('cancelled');
  });

  it('downloads a PNG where files cannot be shared (desktop)', async () => {
    mockShare(false);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await expect(shareOrDownload(png(), 'hi')).resolves.toBe('downloaded');
    const a = click.mock.contexts[0] as HTMLAnchorElement;
    expect(a.download).toBe(SHARE_FILENAME);
    expect(a.href).toBe('blob:card');
    click.mockRestore();
  });
});

describe('ShareSheet', () => {
  beforeEach(() => {
    useAppStore.setState({ ...initialState(), event: null });
    useAppStore.getState().onboard('Pip');
  });

  it('renders the 1080 x 1350 card, previews it, then shares (phone)', async () => {
    const share = mockShare(true);
    mockPointer(true);
    render(<ShareSheet onClose={() => {}} />);
    const card = screen.getByTestId('share-card');
    expect(card.style.width).toBe('1080px');
    expect(card.style.height).toBe('1350px');
    expect(card).toHaveTextContent("Pip's focus week");
    await screen.findByRole('img', { name: /Weekly summary/ });
    expect(toBlob).toHaveBeenCalledWith(
      card,
      expect.objectContaining({ width: 1080, height: 1350 }),
    );
    fireEvent.click(screen.getByText('Share'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(await screen.findByText('Shared!')).toBeInTheDocument();
  });

  it('downloads first on desktop, with Share… as an option where supported', async () => {
    const share = mockShare(true);
    mockPointer(false);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ShareSheet onClose={() => {}} />);
    fireEvent.click(await screen.findByText('Download PNG'));
    expect(await screen.findByText('Saved as a PNG.')).toBeInTheDocument();
    expect(share).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Share…'));
    await waitFor(() => expect(share).toHaveBeenCalled());
    click.mockRestore();
  });

  it('offers only a PNG download where sharing files is unsupported', async () => {
    mockShare(false);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ShareSheet onClose={() => {}} />);
    fireEvent.click(await screen.findByText('Download PNG'));
    expect(await screen.findByText('Saved as a PNG.')).toBeInTheDocument();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it('says so if the image cannot be drawn', async () => {
    toBlob.mockRejectedValue(new Error('canvas'));
    mockShare(true);
    render(<ShareSheet onClose={() => {}} />);
    expect(await screen.findByText('Could not create the image.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
  });
});

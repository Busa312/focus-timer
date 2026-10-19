import { act, fireEvent, render, screen } from '@testing-library/react';
import { Sheet } from './Sheet';

function setup() {
  const onClose = vi.fn();
  render(
    <Sheet title="Timer preset" onClose={onClose}>
      <p>content</p>
    </Sheet>,
  );
  return { onClose, drag: screen.getByTestId('sheet-drag') };
}

/** Pointer drag on the handle area; `ms` is how long the gesture took. */
function swipe(el: HTMLElement, dy: number, ms: number) {
  const now = vi.spyOn(performance, 'now');
  now.mockReturnValue(1000);
  fireEvent.pointerDown(el, { clientY: 100, pointerId: 1 });
  fireEvent.pointerMove(el, { clientY: 100 + dy / 2, pointerId: 1 });
  fireEvent.pointerMove(el, { clientY: 100 + dy, pointerId: 1 });
  now.mockReturnValue(1000 + ms);
  fireEvent.pointerUp(el, { clientY: 100 + dy, pointerId: 1 });
  now.mockRestore();
}

const wrapperTransform = () =>
  (screen.getByRole('dialog').parentElement as HTMLElement).style.transform;

describe('Sheet', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('follows the finger while dragging down', () => {
    const { drag } = setup();
    fireEvent.pointerDown(drag, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(drag, { clientY: 160, pointerId: 1 });
    expect(wrapperTransform()).toBe('translateY(60px)');
    // Dragging up never moves it above its resting place.
    fireEvent.pointerMove(drag, { clientY: 40, pointerId: 1 });
    expect(wrapperTransform()).toBe('translateY(0px)');
  });

  it('only grabs the pointer once a tap turns into a drag', () => {
    const { drag } = setup();
    const capture = vi.fn();
    drag.setPointerCapture = capture;
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Close' }), {
      clientY: 100,
      pointerId: 1,
    });
    fireEvent.pointerMove(drag, { clientY: 102, pointerId: 1 });
    expect(capture).not.toHaveBeenCalled(); // still a tap: the handle's click must work
    fireEvent.pointerMove(drag, { clientY: 130, pointerId: 1 });
    expect(capture).toHaveBeenCalledWith(1);
  });

  it('closes when swiped down far enough', () => {
    const { drag, onClose } = setup();
    swipe(drag, 150, 600);
    expect(wrapperTransform()).toBe('translateY(100%)');
    expect(onClose).not.toHaveBeenCalled(); // slides out first
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a quick flick even if short', () => {
    const { drag, onClose } = setup();
    swipe(drag, 40, 50);
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalled();
  });

  it('snaps back after a small, slow drag', () => {
    const { drag, onClose } = setup();
    swipe(drag, 40, 800);
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).not.toHaveBeenCalled();
    expect(wrapperTransform()).toBe('translateY(0px)');
  });

  it('a drag is not also a tap on the handle', () => {
    const { drag, onClose } = setup();
    swipe(drag, 40, 800);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes by tapping the handle, the backdrop, or Escape', () => {
    const { onClose } = setup();
    act(() => vi.advanceTimersByTime(10));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('sheet-backdrop'));
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: 'Escape' });
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('tapping inside the sheet does not close it', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByText('content'));
    act(() => vi.advanceTimersByTime(250));
    expect(onClose).not.toHaveBeenCalled();
  });
});

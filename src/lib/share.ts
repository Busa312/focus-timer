import { toBlob } from 'html-to-image';

export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1350;
export const SHARE_FILENAME = 'focus-fox-week.png';

/** Render the share card node to a 1080 x 1350 PNG. */
export async function renderCardPng(node: HTMLElement): Promise<Blob> {
  const blob = await toBlob(node, {
    width: SHARE_WIDTH,
    height: SHARE_HEIGHT,
    pixelRatio: 1,
    cacheBust: true,
    // System fonts only; nothing to fetch, so this also works offline.
    skipFonts: true,
  });
  if (!blob) throw new Error('Could not render the share card');
  return blob;
}

export function canShareFile(file: File): boolean {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

/** Phones and tablets: share sheet first. Desktop: download first. */
export function prefersShareSheet(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

export function downloadPng(blob: Blob): 'downloaded' {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = SHARE_FILENAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/**
 * Open the share sheet with the PNG where files can be shared, otherwise
 * download it. Must be called from a tap, with the image already rendered, so
 * the browser still counts it as a user gesture.
 */
export async function shareOrDownload(
  blob: Blob,
  text: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], SHARE_FILENAME, { type: 'image/png' });
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: 'My focus week', text });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
      // Share failed for another reason (e.g. permission): fall back to a download.
    }
  }
  return downloadPng(blob);
}

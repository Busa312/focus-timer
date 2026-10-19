import { useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { toDateKey } from '../logic/dates';
import { formatDuration } from '../logic/stats';
import { weekSummary } from '../logic/weeklyStats';
import {
  canShareFile,
  downloadPng,
  prefersShareSheet,
  renderCardPng,
  SHARE_FILENAME,
  shareOrDownload,
} from '../lib/share';
import { useTheme } from '../lib/theme';
import { useAppStore } from '../store/useAppStore';
import { ShareCard } from './ShareCard';
import { Sheet } from './Sheet';
import { Button } from './ui';

/**
 * Preview + share. The PNG is rendered as soon as the sheet opens so the Share
 * tap can open the share sheet right away (iOS needs that within the gesture).
 */
export function ShareSheet({ onClose }: { onClose: () => void }) {
  const { creature, wardrobe, history, labels, streak } = useAppStore(
    useShallow((s) => ({
      creature: s.creature!,
      wardrobe: s.wardrobe,
      history: s.history,
      labels: s.labels,
      streak: s.streak,
    })),
  );
  const [today] = useState(() => toDateKey(Date.now()));
  // The image matches the theme the app is showing.
  const theme = useTheme();
  const summary = weekSummary(history, labels, streak, today);
  const cardRef = useRef<HTMLDivElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    const node = cardRef.current;
    if (!node) return;
    renderCardPng(node)
      .then((b) => {
        if (!alive) return;
        url = URL.createObjectURL(b);
        setBlob(b);
        setPreview(url);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [theme]);

  const shareable = blob
    ? canShareFile(new File([blob], SHARE_FILENAME, { type: 'image/png' }))
    : false;
  const text = `${creature.name} and I focused for ${formatDuration(summary.focusMinutes)} this week.`;
  const shareFirst = shareable && prefersShareSheet();
  const report = (r: 'shared' | 'downloaded' | 'cancelled') =>
    setStatus(r === 'downloaded' ? 'Saved as a PNG.' : r === 'shared' ? 'Shared!' : null);
  const share = async () => blob && report(await shareOrDownload(blob, text));
  const download = () => blob && report(downloadPng(blob));

  return (
    <Sheet title="Share this week" onClose={onClose}>
      {/* Full-size card, rendered off screen for the snapshot. */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', left: -20000, top: 0, pointerEvents: 'none' }}
      >
        <ShareCard
          ref={cardRef}
          creature={creature}
          wardrobe={wardrobe}
          summary={summary}
          today={today}
          theme={theme}
        />
      </div>

      <div className="mx-auto aspect-[4/5] w-full max-w-64 overflow-hidden rounded-2xl bg-white shadow-md dark:bg-night">
        {preview ? (
          <img src={preview} alt={`Weekly summary: ${text}`} className="h-full w-full" />
        ) : (
          <div
            className="flex h-full items-center justify-center text-sm opacity-70"
            aria-busy={!failed}
          >
            {failed ? 'Could not create the image.' : 'Drawing your card...'}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Button disabled={!blob} onClick={shareFirst ? share : download}>
          {shareFirst ? 'Share' : 'Download PNG'}
        </Button>
        {shareable && !shareFirst && (
          <Button variant="secondary" disabled={!blob} onClick={share}>
            Share…
          </Button>
        )}
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        {status && (
          <p role="status" className="text-center text-sm font-bold">
            {status}
          </p>
        )}
      </div>
    </Sheet>
  );
}

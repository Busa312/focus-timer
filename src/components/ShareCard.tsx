import { forwardRef } from 'react';
import { stageForXp } from '../logic/creature';
import { addDays } from '../logic/dates';
import { formatDuration } from '../logic/stats';
import type { WeekSummary } from '../logic/weeklyStats';
import { SHARE_HEIGHT, SHARE_WIDTH } from '../lib/share';
import type { Theme } from '../lib/theme';
import type { Creature as CreatureT, Wardrobe } from '../types';
import { Creature } from './Creature/Creature';

const shortDate = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** Card colors for each app theme, so the shared image matches what the user sees. */
const CARD_THEMES: Record<
  Theme,
  { background: string; text: string; tile: string; shadow: string }
> = {
  light: {
    background: 'linear-gradient(180deg, #fde6c8 0%, #fdf6ee 55%, #fdf6ee 100%)',
    text: '#3b2a24',
    tile: '#ffffff',
    shadow: '0 6px 0 rgba(59,42,36,0.08)',
  },
  dark: {
    background: 'linear-gradient(180deg, #3a2c45 0%, #1f1a24 55%, #1f1a24 100%)',
    text: '#f3e9e2',
    tile: '#2c2533',
    shadow: '0 6px 0 rgba(0,0,0,0.35)',
  },
};

interface Props {
  creature: CreatureT;
  wardrobe: Wardrobe;
  summary: WeekSummary;
  today: string;
  theme?: Theme;
}

/**
 * The weekly summary as a 1080 x 1350 card. Rendered off screen at full size
 * and turned into a PNG; always uses the SVG fox (colors + accessory) held still.
 */
export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { creature, wardrobe, summary, today, theme = 'light' },
  ref,
) {
  const colors = CARD_THEMES[theme];
  const stage = stageForXp(creature.xp);
  const stats: [string, string][] = [
    ['Focus time', formatDuration(summary.focusMinutes)],
    ['Sessions', String(summary.sessions)],
    ['Day streak', String(summary.streak)],
  ];
  return (
    <div
      ref={ref}
      data-testid="share-card"
      style={{
        width: SHARE_WIDTH,
        height: SHARE_HEIGHT,
        fontFamily: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif",
        background: colors.background,
        color: colors.text,
      }}
      data-theme={theme}
      className="relative flex flex-col items-center overflow-hidden"
    >
      <div style={{ marginTop: 84, fontSize: 40, fontWeight: 700, opacity: 0.7 }}>
        {shortDate(addDays(today, -6))} – {shortDate(today)}
      </div>
      <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.1, marginTop: 8 }}>
        {creature.name}&apos;s focus week
      </div>

      <div style={{ width: 600, height: 600, marginTop: 20 }}>
        <Creature
          stage={stage}
          mood="ecstatic"
          state="idle"
          color={wardrobe.color}
          accessory={wardrobe.equipped}
          renderer="svg"
          still
          className="h-full w-full"
        />
      </div>

      <div style={{ display: 'flex', gap: 28, marginTop: 24 }}>
        {stats.map(([label, value]) => (
          <div
            key={label}
            style={{
              width: 296,
              padding: '28px 0',
              borderRadius: 40,
              background: colors.tile,
              textAlign: 'center',
              boxShadow: colors.shadow,
            }}
          >
            <div
              style={{
                fontSize: value.length > 6 ? 58 : 76,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, opacity: 0.6 }}>{label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 36,
          fontSize: 40,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {summary.topLabel ? (
          <>
            <span style={{ opacity: 0.6 }}>Top label</span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: summary.topLabel.color,
              }}
            />
            <span>{summary.topLabel.name}</span>
            <span style={{ opacity: 0.6 }}>· {formatDuration(summary.topLabel.minutes)}</span>
          </>
        ) : (
          <span style={{ opacity: 0.6 }}>One focus session at a time</span>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 56,
          fontSize: 34,
          fontWeight: 800,
          color: '#f08a4b',
        }}
      >
        Focus Fox
      </div>
    </div>
  );
});

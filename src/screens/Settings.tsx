import { useState } from 'react';
import { Stepper, Toggle } from '../components/controls';
import { PresetOptions } from '../components/PresetPicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button, Card, ConfirmDialog, SectionTitle } from '../components/ui';
import { FAST_MODE_SETTINGS, SETTINGS_LIMITS } from '../config';
import { wakeLockSupported } from '../hooks/useWakeLock';
import { promptInstall, useInstallOption } from '../lib/install';
import { ShareIcon } from '../components/ShareIcon';
import { useAppStore } from '../store/useAppStore';
import type { Settings as SettingsT, ThemePref } from '../types';

const notificationsSupported = () => typeof Notification !== 'undefined';

const THEMES: [ThemePref, string][] = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];

export function Settings({
  onBack,
  onOpenLabels,
}: {
  onBack: () => void;
  onOpenLabels: () => void;
}) {
  const saved = useAppStore((s) => s.settings);
  const hasActive = useAppStore((s) => s.active !== null);
  const [draft, setDraft] = useState<SettingsT>(saved);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [notifyPermission, setNotifyPermission] = useState(() =>
    notificationsSupported() ? Notification.permission : 'denied',
  );

  const install = useInstallOption();
  const set = <K extends keyof SettingsT>(key: K, value: SettingsT[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const save = () => {
    useAppStore.getState().updateSettings(draft);
    setNotice(hasActive ? 'Saved. New lengths apply from the next session.' : 'Saved.');
  };

  return (
    <div className="flex flex-1 flex-col gap-4 pb-4">
      <ScreenHeader title="Settings" onBack={onBack} />

      <Card>
        <SectionTitle>Timer</SectionTitle>
        <div className="mt-2">
          <PresetOptions
            value={draft.presetId}
            settings={draft}
            onChange={(id) => set('presetId', id)}
          />
        </div>
        <div className="mt-3 divide-y divide-ink/[0.06] border-t border-ink/[0.06] dark:divide-white/[0.06] dark:border-white/[0.06]">
          {draft.presetId === 'custom' && (
            <>
              <Stepper
                label="Focus"
                unit="minutes"
                value={draft.focusMin}
                {...SETTINGS_LIMITS.focusMin}
                step={5}
                onChange={(v) => set('focusMin', v)}
              />
              <Stepper
                label="Short break"
                unit="minutes"
                value={draft.shortBreakMin}
                {...SETTINGS_LIMITS.shortBreakMin}
                onChange={(v) => set('shortBreakMin', v)}
              />
              <Stepper
                label="Long break"
                unit="minutes"
                value={draft.longBreakMin}
                {...SETTINGS_LIMITS.longBreakMin}
                onChange={(v) => set('longBreakMin', v)}
              />
            </>
          )}
          <Stepper
            label="Long break after"
            unit="focus sessions"
            value={draft.sessionsPerLongBreak}
            {...SETTINGS_LIMITS.sessionsPerLongBreak}
            onChange={(v) => set('sessionsPerLongBreak', v)}
          />
          <Stepper
            label="Grace period"
            unit="seconds away allowed"
            value={draft.graceSeconds}
            {...SETTINGS_LIMITS.graceSeconds}
            step={5}
            onChange={(v) => set('graceSeconds', v)}
          />
          <Toggle
            label="Auto-start breaks"
            hint="Breaks begin right after a session"
            checked={draft.autoStartBreaks}
            onChange={(v) => set('autoStartBreaks', v)}
          />
        </div>
      </Card>

      <Card>
        <SectionTitle>Sound &amp; screen</SectionTitle>
        <div className="divide-y divide-ink/[0.06] dark:divide-white/[0.06]">
          <Toggle
            label="Sound"
            hint="Soft chime when a session ends"
            checked={draft.soundOn}
            onChange={(v) => set('soundOn', v)}
          />
          <Toggle
            label="Keep screen on"
            hint={wakeLockSupported() ? 'During focus sessions' : 'Not supported in this browser'}
            checked={draft.keepScreenOn}
            onChange={(v) => set('keepScreenOn', v)}
          />
          {notificationsSupported() && notifyPermission !== 'granted' && (
            <div className="flex min-h-15 items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="leading-tight font-bold">Leave reminders</p>
                <p className="text-xs opacity-60">
                  {notifyPermission === 'denied'
                    ? 'Blocked in browser settings'
                    : 'A nudge if you leave mid-focus'}
                </p>
              </div>
              <Button
                variant="secondary"
                className="shrink-0 px-4 text-sm"
                disabled={notifyPermission === 'denied'}
                onClick={async () => setNotifyPermission(await Notification.requestPermission())}
              >
                Allow
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="flex gap-3">
        <Button className="flex-1" disabled={!dirty} onClick={save}>
          Save
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onBack}>
          Back
        </Button>
      </div>
      {notice && !dirty && (
        <p
          role="status"
          className="-mt-1 text-center text-sm font-bold text-emerald-600 dark:text-emerald-400"
        >
          {notice}
        </p>
      )}

      <Card>
        <SectionTitle>Appearance</SectionTitle>
        <div role="radiogroup" aria-label="Theme" className="mt-2 grid grid-cols-3 gap-2">
          {THEMES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={draft.theme === value}
              onClick={() => {
                // Applies right away, no Save needed.
                useAppStore.getState().updateSettings({ theme: value });
                set('theme', value);
              }}
              className={`min-h-11 rounded-2xl border-2 text-sm font-bold focus-visible:outline-3 focus-visible:outline-sky-500 ${
                draft.theme === value
                  ? 'border-fox bg-peach/40 dark:bg-fox/20'
                  : 'border-transparent bg-cream dark:bg-night'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Labels</SectionTitle>
        <button
          type="button"
          onClick={onOpenLabels}
          className="flex min-h-15 w-full items-center justify-between gap-3 rounded-xl py-2 text-left focus-visible:outline-3 focus-visible:outline-sky-500"
        >
          <span className="min-w-0">
            <span className="block leading-tight font-bold">Manage labels</span>
            <span className="text-xs opacity-60">Create, rename, recolor and archive</span>
          </span>
          <span aria-hidden="true" className="text-2xl leading-none opacity-40">
            ›
          </span>
        </button>
      </Card>

      {install && (
        <Card>
          <SectionTitle>Install</SectionTitle>
          {install === 'prompt' ? (
            <div className="flex min-h-15 items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="leading-tight font-bold">Install app</p>
                <p className="text-xs opacity-60">Full screen, works offline</p>
              </div>
              <Button className="shrink-0 px-5 text-sm" onClick={() => void promptInstall()}>
                Install
              </Button>
            </div>
          ) : (
            <p className="py-2 text-sm opacity-80">
              Tap <ShareIcon /> Share in Safari, then <strong>Add to Home Screen</strong>.
            </p>
          )}
        </Card>
      )}

      {import.meta.env.DEV && (
        <Card>
          <SectionTitle>Dev</SectionTitle>
          <Button
            variant="secondary"
            className="mt-2 w-full"
            onClick={() => setDraft((d) => ({ ...d, ...FAST_MODE_SETTINGS }))}
          >
            Fast mode: 1 min / 10 s
          </Button>
        </Card>
      )}

      <Card>
        <SectionTitle>Data</SectionTitle>
        <Button
          variant="ghost"
          className="mt-1 w-full text-rose-600! dark:text-rose-400!"
          onClick={() => setConfirmReset(true)}
        >
          Reset all data
        </Button>
      </Card>

      {confirmReset && (
        <ConfirmDialog
          title="Reset everything?"
          body="Your fox, its XP, your history and settings will be deleted. This can't be undone."
          confirmLabel="Delete everything"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            useAppStore.getState().resetAll();
            onBack();
          }}
        />
      )}
    </div>
  );
}

import { useState } from 'react';
import { Stepper, Toggle } from '../components/controls';
import { PresetOptions } from '../components/PresetPicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { Button, Card, ConfirmDialog } from '../components/ui';
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
    <div className="flex flex-1 flex-col gap-3 pb-3">
      <ScreenHeader title="Settings" onBack={onBack} />

      <Card>
        <h2 className="mb-2 text-sm font-bold tracking-wide uppercase opacity-60">Timer</h2>
        <PresetOptions
          value={draft.presetId}
          settings={draft}
          onChange={(id) => set('presetId', id)}
        />
        {draft.presetId === 'custom' && (
          <div className="mt-2">
            <Stepper
              label="Focus"
              unit="min"
              value={draft.focusMin}
              {...SETTINGS_LIMITS.focusMin}
              step={5}
              onChange={(v) => set('focusMin', v)}
            />
            <Stepper
              label="Short break"
              unit="min"
              value={draft.shortBreakMin}
              {...SETTINGS_LIMITS.shortBreakMin}
              onChange={(v) => set('shortBreakMin', v)}
            />
            <Stepper
              label="Long break"
              unit="min"
              value={draft.longBreakMin}
              {...SETTINGS_LIMITS.longBreakMin}
              onChange={(v) => set('longBreakMin', v)}
            />
          </div>
        )}
        <Stepper
          label="Long break after"
          unit="x"
          value={draft.sessionsPerLongBreak}
          {...SETTINGS_LIMITS.sessionsPerLongBreak}
          onChange={(v) => set('sessionsPerLongBreak', v)}
        />
        <Stepper
          label="Grace period"
          unit="s"
          value={draft.graceSeconds}
          {...SETTINGS_LIMITS.graceSeconds}
          step={5}
          onChange={(v) => set('graceSeconds', v)}
        />
        <Toggle
          label="Auto-start breaks"
          checked={draft.autoStartBreaks}
          onChange={(v) => set('autoStartBreaks', v)}
        />
      </Card>

      <Card>
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
          <div className="flex min-h-12 items-center justify-between gap-3">
            <div>
              <p className="font-bold">Leave reminders</p>
              <p className="text-xs opacity-65">
                {notifyPermission === 'denied'
                  ? 'Blocked in browser settings'
                  : 'A nudge if you leave mid-focus (where supported)'}
              </p>
            </div>
            <Button
              variant="secondary"
              className="px-4 text-sm"
              disabled={notifyPermission === 'denied'}
              onClick={async () => setNotifyPermission(await Notification.requestPermission())}
            >
              Allow
            </Button>
          </div>
        )}
      </Card>

      {install && (
        <Card>
          {install === 'prompt' ? (
            <div className="flex min-h-12 items-center justify-between gap-3">
              <div>
                <p className="font-bold">Install app</p>
                <p className="text-xs opacity-65">Full screen, works offline</p>
              </div>
              <Button className="px-5 text-sm" onClick={() => void promptInstall()}>
                Install
              </Button>
            </div>
          ) : (
            <div>
              <p className="font-bold">Install on iPhone or iPad</p>
              <p className="text-sm opacity-75">
                Tap <ShareIcon /> Share in Safari, then <strong>Add to Home Screen</strong>.
              </p>
            </div>
          )}
        </Card>
      )}

      <Card>
        <button
          type="button"
          onClick={onOpenLabels}
          className="flex min-h-12 w-full items-center justify-between rounded-xl text-left focus-visible:outline-3 focus-visible:outline-sky-500"
        >
          <span>
            <span className="block font-bold">Labels</span>
            <span className="text-xs opacity-65">Create, rename, recolor and archive</span>
          </span>
          <span aria-hidden="true" className="text-xl opacity-50">
            ›
          </span>
        </button>
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
          className="text-center text-sm font-bold text-emerald-600 dark:text-emerald-400"
        >
          {notice}
        </p>
      )}

      <Card>
        <h2 className="mb-2 text-sm font-bold tracking-wide uppercase opacity-60">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
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

      {import.meta.env.DEV && (
        <Card>
          <h2 className="mb-2 text-sm font-bold tracking-wide uppercase opacity-60">Dev</h2>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setDraft((d) => ({ ...d, ...FAST_MODE_SETTINGS }))}
          >
            Fast mode (1 min focus, 10 s breaks)
          </Button>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 text-sm font-bold tracking-wide uppercase opacity-60">Data</h2>
        <Button
          variant="ghost"
          className="w-full text-rose-600! dark:text-rose-400!"
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

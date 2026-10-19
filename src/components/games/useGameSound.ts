import { useCallback } from 'react';
import { playGameSound, type GameSound } from '../../lib/sound';
import { useAppStore } from '../../store/useAppStore';

/** Game sounds, silent when the app's Sound setting is off. */
export function useGameSound(): (sound: GameSound) => void {
  const soundOn = useAppStore((s) => s.settings.soundOn);
  return useCallback((sound: GameSound) => soundOn && playGameSound(sound), [soundOn]);
}

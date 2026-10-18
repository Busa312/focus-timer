import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { STAGE_LABEL } from '../lib/labels';
import type { FoxColor, Stage } from '../types';
import { Creature } from './Creature/Creature';
import { Button } from './ui';

interface Props {
  name: string;
  fromStage: Stage;
  toStage: Stage;
  color?: FoxColor;
  onDone: () => void;
}

const CHARGE_MS = 1_800;
const FLASH_MS = 450;

/** Full-screen stage-up moment: old form glows and shakes, a flash, the new form appears. */
export function EvolutionMoment({ name, fromStage, toStage, color = 'red', onDone }: Props) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState<'charge' | 'reveal'>('charge');
  const [flash, setFlash] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const hatched = fromStage === 'egg';

  useEffect(() => {
    const a = window.setTimeout(() => setFlash(true), CHARGE_MS - FLASH_MS);
    const b = window.setTimeout(() => setStep('reveal'), CHARGE_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  useEffect(() => {
    if (step === 'reveal') continueRef.current?.focus();
  }, [step]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={hatched ? `${name} hatched` : `${name} grew`}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#fde6c8] to-[#f9c9b0] p-6 text-center text-ink dark:from-[#3a2c45] dark:to-[#1f1a24] dark:text-[#f3e9e2] ${reduced ? 'fox-reduced' : ''}`}
    >
      <svg
        viewBox="-100 -100 200 200"
        className="evo-rays pointer-events-none absolute h-[160vmax] w-[160vmax] opacity-40"
        aria-hidden="true"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M0 0 L-8 -100 L8 -100 Z" fill="#fff" transform={`rotate(${i * 30})`} />
        ))}
      </svg>

      <p className="relative text-lg font-bold opacity-80">
        {step === 'charge'
          ? hatched
            ? 'Something is happening...'
            : `${name} is growing...`
          : ' '}
      </p>

      <div className="relative my-4 h-64 w-64">
        {step === 'charge' ? (
          <Creature
            stage={fromStage}
            mood="happy"
            state="worried"
            color={color}
            evolving
            renderer={fromStage === 'egg' ? 'auto' : 'svg'}
            className="h-full w-full drop-shadow-[0_0_24px_rgba(255,255,255,0.9)]"
          />
        ) : (
          <Creature
            stage={toStage}
            mood="ecstatic"
            state="celebrating"
            color={color}
            className="fox-swap h-full w-full"
          />
        )}
      </div>

      {step === 'reveal' && (
        <div className="animate-pop relative">
          <h2 className="text-3xl font-extrabold">
            {hatched ? `${name} hatched!` : `${name} is now a ${STAGE_LABEL[toStage]}!`}
          </h2>
          <p className="mt-2 opacity-75">
            {hatched ? 'Say hi to your new fox kit.' : 'All that focus is paying off.'}
          </p>
          <Button ref={continueRef} className="mt-6 min-w-48" onClick={onDone}>
            Continue
          </Button>
        </div>
      )}

      {flash && (
        <div
          className="evo-flash pointer-events-none absolute inset-0 bg-white"
          onAnimationEnd={() => setFlash(false)}
        />
      )}
    </div>
  );
}

import type { Stage } from '../../types';

export type GrownStage = Exclude<Stage, 'egg'>;

export interface StageGeometry {
  /** Overall size, scaled about the ground point. */
  scale: number;
  /** Head size relative to body, scaled about the neck. */
  head: number;
  ears: number;
  tail: 'nub' | 'fluffy' | 'big';
  tailTip: boolean;
  legs: 'paws' | 'long';
  scarf: boolean;
  eye: number;
}

export const STAGE_GEOMETRY: Record<GrownStage, StageGeometry> = {
  baby: {
    scale: 0.64,
    head: 1.34,
    ears: 1.14,
    tail: 'nub',
    tailTip: false,
    legs: 'paws',
    scarf: false,
    eye: 1.3,
  },
  kid: {
    scale: 0.79,
    head: 1.15,
    ears: 1.04,
    tail: 'fluffy',
    tailTip: false,
    legs: 'paws',
    scarf: false,
    eye: 1.12,
  },
  teen: {
    scale: 0.9,
    head: 1.02,
    ears: 1.0,
    tail: 'fluffy',
    tailTip: true,
    legs: 'long',
    scarf: false,
    eye: 1.02,
  },
  adult: {
    scale: 1,
    head: 0.95,
    ears: 1.0,
    tail: 'big',
    tailTip: true,
    legs: 'long',
    scarf: true,
    eye: 0.96,
  },
};

export const GROUND_Y = 192;
export const NECK_Y = 128;

/** Transforms shared by the fox and its accessory layers. */
export function stageTransforms(g: StageGeometry) {
  const lift = g.legs === 'long' ? -12 : 0;
  return {
    stage: `translate(100 ${GROUND_Y}) scale(${g.scale}) translate(-100 ${-GROUND_Y})`,
    head: `translate(0 ${lift}) translate(100 ${NECK_Y}) scale(${g.head}) translate(-100 ${-NECK_Y})`,
    bodyLift: lift,
    /** Top of the head (y=60 in head space) in view coordinates, for floating extras. */
    headTop: GROUND_Y + (NECK_Y + (60 - NECK_Y) * g.head + lift - GROUND_Y) * g.scale,
  };
}

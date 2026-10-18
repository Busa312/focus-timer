import { Creature } from '../components/Creature/Creature';
import type { Accessory, CreatureState, FoxColor, Mood, Stage } from '../types';

const STAGES: Stage[] = ['egg', 'baby', 'kid', 'teen', 'adult'];
const MOODS: Mood[] = ['ecstatic', 'happy', 'meh', 'sad'];
const STATES: CreatureState[] = ['focused', 'playing', 'celebrating', 'disappointed', 'worried'];

/** Dev-only: every stage x mood/state (and colors / accessories via ?color=&acc=). */
export function Gallery() {
  const params = new URLSearchParams(location.search);
  const color = (params.get('color') ?? 'red') as FoxColor;
  const accessory = (params.get('acc') ?? 'none') as Accessory;
  if (params.has('wardrobe')) {
    const accs: Accessory[] = [
      'none',
      'glasses',
      'headphones',
      'beanie',
      'flowerCrown',
      'bowTie',
      'starCape',
    ];
    return (
      <div className="p-2">
        <table>
          <tbody>
            {STAGES.slice(1).map((stage) => (
              <tr key={stage}>
                <th className="text-xs">{stage}</th>
                {accs.map((acc) => (
                  <td key={acc}>
                    <Creature
                      stage={stage}
                      mood="happy"
                      state="idle"
                      color={color}
                      accessory={acc}
                      renderer="svg"
                      className="h-36 w-36"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const columns: { label: string; mood: Mood; state: CreatureState }[] = [
    ...MOODS.map((mood) => ({ label: mood, mood, state: 'idle' as const })),
    ...STATES.map((state) => ({ label: state, mood: 'happy' as const, state })),
  ];
  return (
    <div className="p-2">
      <table>
        <thead>
          <tr>
            <th />
            {columns.map((c) => (
              <th key={c.label} className="text-xs">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {STAGES.map((stage) => (
            <tr key={stage}>
              <th className="text-xs">{stage}</th>
              {columns.map((c) => (
                <td key={c.label}>
                  <Creature
                    stage={stage}
                    mood={c.mood}
                    state={c.state}
                    color={color}
                    accessory={accessory}
                    renderer="svg"
                    className={params.has('big') ? 'h-64 w-64' : 'h-28 w-28'}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

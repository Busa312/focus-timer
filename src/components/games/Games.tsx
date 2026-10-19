import type { GameId } from '../../types';
import { CatchGame } from './CatchGame';
import { GameScreen, type GameProps } from './GameScreen';
import { MemoryGame } from './MemoryGame';

const GAME_COMPONENTS: Record<GameId, (props: GameProps) => React.ReactNode> = {
  catch: CatchGame,
  memory: MemoryGame,
};

export function GameOverlay({
  game,
  now,
  onClose,
}: {
  game: GameId;
  now: number;
  onClose: () => void;
}) {
  const Game = GAME_COMPONENTS[game];
  return (
    <GameScreen game={game} now={now} onClose={onClose}>
      {(props) => <Game {...props} />}
    </GameScreen>
  );
}

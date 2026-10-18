import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type Ref,
} from 'react';
import type { LottieHandle } from 'lottie-react';
import type { LottieLoader } from './lottie';

interface PlayerProps {
  src: object;
  loop: boolean;
  autoplay: boolean;
  className?: string;
  lottieRef: Ref<LottieHandle>;
}

const Lottie = lazy(() =>
  import('lottie-react').then((m) => ({ default: m.Lottie as ComponentType<PlayerProps> })),
);

interface Props {
  load: LottieLoader;
  loop: boolean;
  /** Reduced motion: hold the first frame. */
  reduced: boolean;
  /** Shown while loading or if the file fails to load. */
  fallback: ReactNode;
}

export function LottieFox({ load, loop, reduced, fallback }: Props) {
  const [data, setData] = useState<object | null>(null);
  const ref = useRef<LottieHandle>(null);

  useEffect(() => {
    let alive = true;
    load()
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [load]);

  useEffect(() => {
    if (reduced) ref.current?.stop();
    else ref.current?.play();
  }, [reduced, data]);

  if (!data) return <>{fallback}</>;
  return (
    <Suspense fallback={fallback}>
      <Lottie
        lottieRef={ref}
        src={data}
        loop={loop}
        autoplay={!reduced}
        className="h-full w-full"
      />
    </Suspense>
  );
}

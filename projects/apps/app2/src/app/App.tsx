import { useEffect, useState } from 'react';
import { store } from '../main';
import { incrementClicks$, decrementClicks$, resetClicks$ } from './streams';

function useStore<T>(selector: (s: any) => T): T | undefined {
  const [state, setState] = useState<T | undefined>(undefined);

  useEffect(() => {
    // Subscribe to changes
    const subscription = store
      .select(selector, 0 as any)
      .subscribe((newValue: T) => {
        setState(newValue);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [selector]);

  return state;
}

export default function App() {
  const count = useStore((s) => s.counter.count);
  const [step, setStep] = useState(1);

  return (
    <div
      style={{
        fontFamily: 'ui-sans-serif, system-ui',
        display: 'grid',
        placeItems: 'center',
        minHeight: '100dvh',
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          padding: 24,
          borderRadius: 16,
          boxShadow: '0 10px 30px rgba(0,0,0,.08)',
        }}
      >
        <h1 style={{ marginTop: 0 }}>React × Streamix × ActionStack</h1>
        <p style={{ opacity: 0.8, marginTop: -8 }}>
          Counter demo with Streamix intent streams and ActionStack state.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            marginTop: 16,
          }}
        >
          <button
            onClick={() => {
              for (let i = 0; i < step; i++) incrementClicks$.next(1);
            }}
          >
            +{step}
          </button>
          <button
            onClick={() => {
              for (let i = 0; i < step; i++) decrementClicks$.next(1);
            }}
          >
            -{step}
          </button>
          <button onClick={() => resetClicks$.next()}>Reset</button>
          <label style={{ marginLeft: 'auto' }}>
            Step:
            <input
              type="number"
              value={step}
              min={1}
              onChange={(e) => setStep(parseInt(e.target.value || '1'))}
              style={{ width: 64, marginLeft: 8 }}
            />
          </label>
        </div>

        <div style={{ marginTop: 24, fontSize: 48, fontWeight: 700 }}>
          {count ?? 'Loading...'}
        </div>

        <details style={{ marginTop: 16 }}>
          <summary>Notes</summary>
          <ul>
            <li>
              Buttons emit intents via Streamix subjects; streams debounce/batch
              and dispatch to ActionStack.
            </li>
            <li>
              React subscribes to store via custom hook that handles async
              state.
            </li>
          </ul>
        </details>
      </div>
    </div>
  );
}

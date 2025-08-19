import { createModule, action, selector } from '@actioncrew/actionstack';

export type CounterState = { count: number };

export let counter = createModule({
  slice: 'counter',
  initialState: { count: 0 },
  actions: {
    increment: action('increment', (s: CounterState, by: number = 1) => ({
      count: s.count + by,
    })),
    decrement: action('decrement', (s: CounterState, by: number = 1) => ({
      count: s.count - by,
    })),
    reset: action('reset', () => ({ count: 0 })),
  },
  selectors: {
    count: selector((s: CounterState) => s.count),
  },
});

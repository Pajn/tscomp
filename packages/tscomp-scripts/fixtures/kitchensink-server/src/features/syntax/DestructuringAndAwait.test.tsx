import {load} from './DestructuringAndAwait';

describe('destructuring and await', () => {
  it('executes without crashing', async () => {
    const { users } = await load();

    expect(users).toEqual([
      { id: 1, name: '1' },
      { id: 2, name: '2' },
      { id: 3, name: '3' },
      { id: 4, name: '4' }
    ]);
  });
});

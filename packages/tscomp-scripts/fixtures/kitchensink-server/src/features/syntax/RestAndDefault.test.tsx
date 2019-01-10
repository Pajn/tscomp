import {load} from './RestAndDefault';

describe('object spread', () => {
  it('executes without crashing', () => {
    const users = load();

    expect(users).toEqual([
      {id: 1, name: '1'},
      {id: 2, name: '2'},
      {id: 3, name: '3'},
      {id: 42, name: '42'},
    ])
  });
});

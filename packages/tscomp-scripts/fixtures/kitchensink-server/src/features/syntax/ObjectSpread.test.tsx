import {load} from './ObjectSpread';

describe('object spread', () => {
  it('executes without crashing', () => {
    const users = load({ age: 42 });

    expect(users).toEqual([
      {id: 1, name: '1', age: 42},
      {id: 2, name: '2', age: 42},
      {id: 3, name: '3', age: 42},
      {id: 4, name: '4', age: 42},
    ])
  });
});

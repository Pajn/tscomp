import {load} from './Generators';

describe('generators', () => {
  it('executes without crashing', () => {
    const users: Array<{id: number, name: number}> = [];
    for (let user of load(4)) {
      users.push(user);
    }

    expect(users).toEqual([
      {id: 1, name: 1},
      {id: 2, name: 2},
      {id: 3, name: 3},
      {id: 4, name: 4},
    ])
  });
});

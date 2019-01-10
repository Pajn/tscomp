import { test, version } from 'test-integrity';
import linkedModules from './LinkedModules';

describe('linked modules', () => {
  it('has integrity', () => {
    expect(test());
    expect(version() === '2.0.0');
  });

  it('executes without crashing', () => {
    linkedModules()
  });
});

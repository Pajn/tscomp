import { test, version } from 'test-integrity';

export default () => {
  const v = version();
  if (!test() || v !== '2.0.0') {
    throw new Error('Functionality test did not pass.');
  }
  return v;
};

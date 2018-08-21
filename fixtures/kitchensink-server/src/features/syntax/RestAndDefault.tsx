export function load({ id, ...rest } = { id: 0, user: { id: 42, name: '42' } }) {
  return [
    { id: id + 1, name: '1' },
    { id: id + 2, name: '2' },
    { id: id + 3, name: '3' },
    rest.user,
  ];
}

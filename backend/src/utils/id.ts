export function makeId(prefix = 'job'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

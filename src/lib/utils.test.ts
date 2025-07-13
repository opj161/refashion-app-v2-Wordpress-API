import { cn } from './utils';

describe('cn', () => {
  it('should merge class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional class names', () => {
    expect(cn('foo', { bar: true, baz: false })).toBe('foo bar');
  });

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1 bg-red hover:bg-dark-red', 'p-4 bg-blue')).toBe('hover:bg-dark-red p-4 bg-blue');
  });
});

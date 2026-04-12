import { describe, it, expect } from 'vitest';
import { getEmptyStateTitle } from '@/lib/utils';

describe('getEmptyStateTitle', () => {
  describe('with "all" filter', () => {
    it('returns "No incoming requests" for incoming tab', () => {
      expect(getEmptyStateTitle('incoming', 'all')).toBe('No incoming requests');
    });

    it('returns "No outgoing requests" for outgoing tab', () => {
      expect(getEmptyStateTitle('outgoing', 'all')).toBe('No outgoing requests');
    });
  });

  describe('with specific status filter', () => {
    it.each([
      ['pending', 'No pending requests'],
      ['paid', 'No paid requests'],
      ['declined', 'No declined requests'],
      ['canceled', 'No canceled requests'],
      ['expired', 'No expired requests'],
    ])('returns "%s" label regardless of tab direction', (status, expected) => {
      expect(getEmptyStateTitle('incoming', status)).toBe(expected);
      expect(getEmptyStateTitle('outgoing', status)).toBe(expected);
    });
  });

  describe('with unknown status', () => {
    it('falls back to direction-based title for incoming', () => {
      expect(getEmptyStateTitle('incoming', 'unknown')).toBe('No incoming requests');
    });

    it('falls back to direction-based title for outgoing', () => {
      expect(getEmptyStateTitle('outgoing', 'unknown')).toBe('No outgoing requests');
    });
  });
});

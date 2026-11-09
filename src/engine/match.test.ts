import { describe, expect, it } from 'vitest';
import { compareVotes, decodeVotes, encodeVotes, matchDeck, type MatchVotes } from './match';

const vote = (mode: 'tonight' | 'week', seed: number, pick: (i: number) => boolean, name = ''): MatchVotes => ({
  mode,
  seed,
  likes: matchDeck(mode, seed).map((_, i) => pick(i)),
  name,
});

describe('match game', () => {
  it('builds the same deck from the same seed', () => {
    const a = matchDeck('week', 12345).map((c) => (c.kind === 'dish' ? c.recipe.id : c.cuisine));
    const b = matchDeck('week', 12345).map((c) => (c.kind === 'dish' ? c.recipe.id : c.cuisine));
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
    expect(matchDeck('week', 999).map((c) => (c.kind === 'dish' ? c.recipe.id : c.cuisine))).not.toEqual(a);
  });

  it('spreads dishes over several cuisines', () => {
    const cuisines = new Set(matchDeck('tonight', 42).flatMap((c) => (c.kind === 'dish' ? [c.recipe.cuisine] : [])));
    expect(cuisines.size).toBeGreaterThanOrEqual(8);
  });

  it('round-trips a code, even inside a longer message', () => {
    const v = vote('week', 777, (i) => i % 3 === 0, 'Ana Maria');
    const code = encodeVotes(v);
    const back = decodeVotes(`Let's pick dinner! Open WeekPlate → Match and paste: ${code} ❤️`);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.votes.likes).toEqual(v.likes);
      expect(back.votes.seed).toBe(777);
      expect(back.votes.mode).toBe('week');
      expect(back.votes.name).toBe('Ana Maria');
    }
  });

  it('rejects garbage and codes from another recipe book', () => {
    expect(decodeVotes('hello').ok).toBe(false);
    const code = encodeVotes(vote('tonight', 5, () => true)).replace(/^WP1\.t\.[0-9a-z]+/, 'WP1.t.zz');
    expect(decodeVotes(code)).toEqual({ ok: false, reason: 'version' });
  });

  it('matches only what both liked', () => {
    const deck = matchDeck('week', 2024);
    const a = vote('week', 2024, (i) => i < 12);
    const b = vote('week', 2024, (i) => i >= 4 && i < 16);
    const r = compareVotes(a, b);
    const both = deck.filter((_, i) => i >= 4 && i < 12);
    expect(r.cuisines.length + r.dishes.length).toBe(both.length);
    expect(r.maybe.length).toBe(deck.filter((c, i) => c.kind === 'dish' && (i < 4 || (i >= 12 && i < 16))).length);
  });
});

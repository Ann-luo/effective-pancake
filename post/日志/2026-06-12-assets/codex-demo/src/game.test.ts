import { describe, it, expect } from 'vitest';
import { checkGuess, createGame } from './game';

describe('checkGuess', () => {
  it('returns "higher" when guess is below target', () => {
    expect(checkGuess(5, 10)).toEqual({ result: 'higher' });
  });

  it('returns "lower" when guess is above target', () => {
    expect(checkGuess(15, 10)).toEqual({ result: 'lower' });
  });

  it('returns "correct" when guess matches target', () => {
    expect(checkGuess(10, 10)).toEqual({ result: 'correct' });
  });
});

describe('createGame', () => {
  it('returns a target between 1 and 100', () => {
    const game = createGame();
    expect(game.target).toBeGreaterThanOrEqual(1);
    expect(game.target).toBeLessThanOrEqual(100);
  });

  it('starts with zero attempts', () => {
    const game = createGame();
    expect(game.attempts).toBe(0);
  });
});

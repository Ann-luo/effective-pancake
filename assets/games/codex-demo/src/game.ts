export interface GameState {
  target: number;
  attempts: number;
}

export interface GuessResult {
  result: 'higher' | 'lower' | 'correct';
}

export function checkGuess(guess: number, target: number): GuessResult {
  if (guess < target) return { result: 'higher' };
  if (guess > target) return { result: 'lower' };
  return { result: 'correct' };
}

export function createGame(): GameState {
  return {
    target: Math.floor(Math.random() * 100) + 1,
    attempts: 0,
  };
}

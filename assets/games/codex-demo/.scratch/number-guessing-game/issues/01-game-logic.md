Status: ready-for-agent

# 01 — Add game logic function with unit tests

## What to build

Create a pure `checkGuess(guess: number, target: number)` function. Given a player's guess and the server's target number, it returns `{ result: 'higher' | 'lower' | 'correct', attempts: number }`. The function is stateless — the caller manages the attempt counter.

Also add a `createGame()` factory that returns a new game state `{ target: number, attempts: number }`.

## Acceptance criteria

- [ ] `checkGuess(5, 10)` returns `{ result: 'higher' }`
- [ ] `checkGuess(15, 10)` returns `{ result: 'lower' }`
- [ ] `checkGuess(10, 10)` returns `{ result: 'correct' }`
- [ ] All three branches are covered by unit tests (Vitest)
- [ ] `createGame()` returns a target between 1 and 100, with `attempts: 0`

## Blocked by

None — can start immediately.

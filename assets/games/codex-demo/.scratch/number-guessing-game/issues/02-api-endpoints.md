Status: ready-for-agent

# 02 — Add POST /api/guess and POST /api/new-game endpoints

## What to build

Add two REST endpoints to the Express server:
- `POST /api/guess` — accepts `{ guess: number }`, calls `checkGuess`, returns `{ result, attempts }` (plus `target` on correct).
- `POST /api/new-game` — resets the in-memory game state, returns `{ message: 'New game started', attempts: 0 }`.

Game state (target number, attempt count) lives in memory. No session management.

## Acceptance criteria

- [ ] POSTing a guess lower than target returns `{ result: 'higher', attempts: N }`
- [ ] POSTing a guess higher than target returns `{ result: 'lower', attempts: N }`
- [ ] POSTing the correct guess returns `{ result: 'correct', attempts: N, target: T }`
- [ ] Attempt counter increments with each guess
- [ ] POST /api/new-game resets the target and counter
- [ ] Invalid input (non-number, out of 1-100 range) returns a 400 error with a message

## Blocked by

- 01-game-logic

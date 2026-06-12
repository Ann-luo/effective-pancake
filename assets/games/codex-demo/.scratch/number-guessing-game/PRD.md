Status: ready-for-agent

# Number Guessing Game PRD

## Problem Statement

The todo app currently has no interactive frontend — it only returns JSON. The user wants to see a tangible, playable game served from the same app to understand how skills drive real feature development.

## Solution

Add a "Guess the Number" game where the server picks a random number (1-100) and the player guesses via a browser interface. Each guess tells the player "higher", "lower", or "correct", with a running count of attempts.

## User Stories

1. As a player, I want to open the app in my browser and see a game interface, so that I can play immediately without installing anything.
2. As a player, I want to type a number and submit my guess, so that I can try to find the correct number.
3. As a player, I want to see "higher" or "lower" feedback after each guess, so that I can narrow down the answer.
4. As a player, I want to see how many attempts I've made, so that I can track my performance.
5. As a player, I want to see a "correct" message when I win, so that I know the game is over.
6. As a player, I want a "new game" button to reset the target number, so that I can play again without restarting the server.
7. As a player, I want the game to reject invalid input (non-numbers, out of range), so that I get clear guidance instead of broken behavior.

## Implementation Decisions

- Game logic is a pure function `checkGuess(guess, target)` returning `{ result: 'higher' | 'lower' | 'correct', attempts?: number }` — no dependencies, fully unit-testable.
- Server state (target number, attempt counter) lives in memory, scoped to a single game session (no database, no session management).
- The frontend is a single static HTML page served by Express at `GET /`, with inline CSS and vanilla JavaScript.
- The API endpoint is `POST /api/guess` accepting `{ guess: number }` and returning `{ result, attempts, target? }`.
- A new game is triggered by `POST /api/new-game`.

## Testing Decisions

- Test only external behavior: game logic (pure function), API responses (HTTP), and UI interactions (browser).
- Prior art: none yet in this repo. Use Vitest for unit tests; manual browser verification for the UI for now.
- Test the `checkGuess` function directly with Vitest — no server needed.
- Test the API endpoints with supertest or by hitting the running server.

## Out of Scope

- Multiple concurrent players / sessions
- Leaderboard or persistent scores
- Difficulty levels
- Mobile-responsive design
- Database persistence

## Further Notes

This is a demo feature to showcase the `to-prd` → `to-issues` → implementation workflow with mattpocock/skills.
The game is intentionally minimal so the process stays visible.

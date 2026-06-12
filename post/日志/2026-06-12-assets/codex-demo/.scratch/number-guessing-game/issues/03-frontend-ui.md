Status: ready-for-agent

# 03 — Build the game UI page

## What to build

Add a static HTML page served at `GET /` with an interactive number guessing game UI. The page includes:
- A number input field and a "Guess" button
- Feedback area showing "Higher!", "Lower!", or correct with attempt count
- A "New Game" button
- Basic styling that feels polished

No frontend framework — vanilla HTML, CSS, and JavaScript calling our API endpoints.

## Acceptance criteria

- [ ] Opening http://localhost:3000 shows the game interface
- [ ] Typing a number and clicking Guess sends a request and shows feedback
- [ ] "Higher!" / "Lower!" messages appear for wrong guesses
- [ ] Correct guess shows a celebratory message with attempt count
- [ ] "New Game" button resets and starts fresh
- [ ] Invalid input shows an error message without breaking the page

## Blocked by

- 02-api-endpoints

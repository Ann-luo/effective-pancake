// Todo app and Number Guessing Game
import express, { Request, Response } from "express";
import path from "path";
import { checkGuess, createGame, GameState } from "./game";

const app = express();
app.use(express.json());

// --- Number Guessing Game ---

let game: GameState = createGame();

app.post("/api/guess", (req: Request, res: Response) => {
  const { guess } = req.body;

  if (typeof guess !== "number" || guess < 1 || guess > 100) {
    res.status(400).json({ error: "Guess must be a number between 1 and 100" });
    return;
  }

  game.attempts++;
  const { result } = checkGuess(guess, game.target);

  const response = {
    result,
    attempts: game.attempts,
    ...(result === "correct" ? { target: game.target } : {}),
  };

  res.json(response);
});

app.post("/api/new-game", (_req: Request, res: Response) => {
  game = createGame();
  res.json({ message: "New game started", attempts: 0 });
});

// --- Static game page ---

app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

// --- Todo API (existing) ---

interface Todo {
  id: number;
  title: string;
  done: boolean;
}

const todos: Todo[] = [];

app.get("/todos", (_req, res) => {
  res.json(todos);
});

app.post("/todos", (req, res) => {
  const { title } = req.body;
  const todo: Todo = { id: todos.length + 1, title, done: false };
  todos.push(todo);
  res.status(201).json(todo);
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Todo app running on http://localhost:${PORT}`);
});

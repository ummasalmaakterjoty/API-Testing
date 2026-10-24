const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// ---------- In-memory data ----------
let users = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@example.com",
    password: bcrypt.hashSync("Admin123!", 8),
    role: "admin",
  },
];
let tasks = [];
let nextUserId = 2;
let nextTaskId = 1;

const STATUSES = ["todo", "in-progress", "done"];
const PRIORITIES = ["low", "medium", "high"];

// ---------- Helpers ----------
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Access token is missing" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = users.find((u) => u.id === payload.id);
    if (!req.user) return res.status(401).json({ message: "User no longer exists" });
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

function validateTask(body, partial = false) {
  const errors = [];
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim() === "") {
      errors.push("title is required and must be a non-empty string");
    }
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    errors.push(`status must be one of: ${STATUSES.join(", ")}`);
  }
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) {
    errors.push(`priority must be one of: ${PRIORITIES.join(", ")}`);
  }
  return errors;
}

// Loads a task and checks ownership. Returns the task or sends an error.
function getAccessibleTask(req, res) {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return null;
  }
  if (req.user.role !== "admin" && task.userId !== req.user.id) {
    res.status(403).json({ message: "You do not have permission to access this task" });
    return null;
  }
  return task;
}

// ---------- Auth routes ----------
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "password must be at least 6 characters" });
  }
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ message: "Email already registered" });
  }
  const user = {
    id: nextUserId++,
    name,
    email,
    password: bcrypt.hashSync(password, 8),
    role: "user",
  };
  users.push(user);
  res.status(201).json({ message: "User registered", user: publicUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
  res.status(200).json({ token, user: publicUser(user) });
});

// ---------- Task routes (protected) ----------
app.get("/api/tasks", auth, (req, res) => {
  let result = req.user.role === "admin" ? tasks : tasks.filter((t) => t.userId === req.user.id);
  const { status, priority } = req.query;
  if (status) result = result.filter((t) => t.status === status);
  if (priority) result = result.filter((t) => t.priority === priority);
  res.status(200).json({ count: result.length, tasks: result });
});

app.get("/api/tasks/:id", auth, (req, res) => {
  const task = getAccessibleTask(req, res);
  if (task) res.status(200).json(task);
});

app.post("/api/tasks", auth, (req, res) => {
  const errors = validateTask(req.body);
  if (errors.length) return res.status(400).json({ message: "Validation failed", errors });
  const task = {
    id: nextTaskId++,
    title: req.body.title.trim(),
    description: req.body.description || "",
    status: req.body.status || "todo",
    priority: req.body.priority || "medium",
    userId: req.user.id,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  res.status(201).json(task);
});

app.put("/api/tasks/:id", auth, (req, res) => {
  const task = getAccessibleTask(req, res);
  if (!task) return;
  const errors = validateTask(req.body);
  if (errors.length) return res.status(400).json({ message: "Validation failed", errors });
  task.title = req.body.title.trim();
  task.description = req.body.description || "";
  task.status = req.body.status || "todo";
  task.priority = req.body.priority || "medium";
  res.status(200).json(task);
});

app.patch("/api/tasks/:id", auth, (req, res) => {
  const task = getAccessibleTask(req, res);
  if (!task) return;
  const errors = validateTask(req.body, true);
  if (errors.length) return res.status(400).json({ message: "Validation failed", errors });
  ["title", "description", "status", "priority"].forEach((f) => {
    if (req.body[f] !== undefined) task[f] = req.body[f];
  });
  res.status(200).json(task);
});

app.delete("/api/tasks/:id", auth, (req, res) => {
  const task = getAccessibleTask(req, res);
  if (!task) return;
  tasks = tasks.filter((t) => t.id !== task.id);
  res.status(204).send();
});

// ---------- Admin route ----------
app.get("/api/users", auth, adminOnly, (req, res) => {
  res.status(200).json({ count: users.length, users: users.map(publicUser) });
});

// ---------- Errors ----------
app.use("/api", (req, res) => res.status(404).json({ message: "Route not found" }));

// Malformed JSON and other errors
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Malformed JSON in request body" });
  }
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => console.log(`Task API running at http://localhost:${PORT}/api`));

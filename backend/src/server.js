import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import practiceRoutes from "./routes/practice.js";
import activeSessionRoutes from "./routes/activeSessions.js";
import reflectionRoutes from "./routes/reflections.js";

dotenv.config();
const app = express();

// DEV CORS: allow all origins + preflight (fixes your browser's OPTIONS failure)
app.use(
  cors({
    origin: true, // reflect request origin
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
// Ensure preflights are answered
app.options("*", cors());

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, req.method === 'POST' || req.method === 'PUT' ? req.body : '');
  next();
});

// simple health route
app.get("/api/health", (_, res) => res.json({ ok: true }));

// your API routes
app.use("/api/auth", authRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/active-sessions", activeSessionRoutes);
app.use("/api/reflections", reflectionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// start server (keep your existing PORT/env)
const PORT = process.env.PORT || 4000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
});

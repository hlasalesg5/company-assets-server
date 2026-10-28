import { Router } from "express";
import { signToken, requireAuth, AuthenticatedRequest, AuthUser } from "../middleware/auth";

const router = Router();

// Allowed users strictly configured per requirements
const ALLOWED_ACCOUNTS: Array<{ email: string; password: string; name: string; role: "Admin" | "HR" }> = [
  {
    email: "admin@hlauae.com",
    password: "admin@123",
    name: "Administrator",
    role: "Admin",
  },
  {
    email: "hr@hlauae.net",
    password: "Holistic12345",
    name: "HR Management",
    role: "HR",
  },
];

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const matchedUser = ALLOWED_ACCOUNTS.find(
    (u) => u.email.toLowerCase() === normalizedEmail && u.password === password
  );

  if (!matchedUser) {
    return res.status(401).json({ error: "Invalid email or password. Access restricted to authorized personnel." });
  }

  const authUser: AuthUser = {
    email: matchedUser.email,
    name: matchedUser.name,
    role: matchedUser.role,
  };

  const token = signToken(authUser);

  res.json({
    message: "Login successful",
    token,
    user: authUser,
  });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({
    user: req.user,
  });
});

export default router;

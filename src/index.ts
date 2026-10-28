import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { createClient } from "@supabase/supabase-js";

import employeeRoutes from "./routes/employees";
import deviceRoutes from "./routes/devices";
import assignmentRoutes from "./routes/assignments";
import authRoutes from "./routes/auth";
import branchAssetsRoutes from "./routes/branchAssets";
import corporateEmailRoutes from "./routes/corporateEmails";
import { requireAuth } from "./middleware/auth";

dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// Public Auth routes
app.use("/api/auth", authRoutes);

// Protected routes (require valid authentication)
app.use("/api/employees", requireAuth, employeeRoutes);
app.use("/api/devices", requireAuth, deviceRoutes);
app.use("/api/assignments", requireAuth, assignmentRoutes);
app.use("/api/branch-assets", requireAuth, branchAssetsRoutes);
app.use("/api/corporate-emails", requireAuth, corporateEmailRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

app.get("/api/test-db", async (req, res) => {
  const { data, error } = await supabase.from("employees").select("*");
  if (error) return res.status(500).json({ error: error.message });
  res.json({ connected: true, count: data.length });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
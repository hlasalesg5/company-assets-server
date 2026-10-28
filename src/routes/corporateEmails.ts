import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();
const dataDir = path.join(__dirname, "../../data");
const filePath = path.join(dataDir, "corporate_emails.json");

export interface CorporateEmail {
  id: string;
  email: string;
  plan: string;
  status: "available" | "assigned";
  employee_id: string | null;
  employee_name: string | null;
  department: string | null;
  assigned_at: string | null;
  notes?: string;
  created_at: string;
}

const defaultEmails: CorporateEmail[] = [
  {
    id: "em-001",
    email: "audit.team@hlauae.com",
    plan: "Microsoft 365 Business Standard",
    status: "available",
    employee_id: null,
    employee_name: null,
    department: null,
    assigned_at: null,
    notes: "Assigned for auditing & compliance staff",
    created_at: new Date().toISOString()
  },
  {
    id: "em-002",
    email: "tax.advisory@hlauae.com",
    plan: "Microsoft 365 Business Standard",
    status: "available",
    employee_id: null,
    employee_name: null,
    department: null,
    assigned_at: null,
    notes: "Corporate VAT & Corporate Tax desk",
    created_at: new Date().toISOString()
  },
  {
    id: "em-003",
    email: "accounts.dxb@hlauae.com",
    plan: "Microsoft 365 Business Basic",
    status: "available",
    employee_id: null,
    employee_name: null,
    department: null,
    assigned_at: null,
    notes: "Dubai Accounting & Bookkeeping desk",
    created_at: new Date().toISOString()
  },
  {
    id: "em-004",
    email: "hr.operations@hlauae.com",
    plan: "Microsoft 365 Business Basic",
    status: "available",
    employee_id: null,
    employee_name: null,
    department: null,
    assigned_at: null,
    notes: "HR & Recruitment communications",
    created_at: new Date().toISOString()
  },
  {
    id: "em-005",
    email: "consulting1@hlauae.com",
    plan: "Microsoft 365 Business Standard",
    status: "available",
    employee_id: null,
    employee_name: null,
    department: null,
    assigned_at: null,
    notes: "Business Consulting desk license",
    created_at: new Date().toISOString()
  },
  {
    id: "em-006",
    email: "consulting2@hlauae.com",
    plan: "Microsoft 365 Business Standard",
    status: "available",
    employee_id: null,
    employee_name: null,
    department: null,
    assigned_at: null,
    notes: "Business Consulting desk license",
    created_at: new Date().toISOString()
  },
  {
    id: "em-007",
    email: "auh.operations@hlauae.com",
    plan: "Microsoft 365 Business Basic",
    status: "available",
    employee_id: null,
    employee_name: null,
    department: null,
    assigned_at: null,
    notes: "Abu Dhabi operations desk",
    created_at: new Date().toISOString()
  },
  {
    id: "em-008",
    email: "billing@hlauae.com",
    plan: "Microsoft 365 Business Basic",
    status: "available",
    employee_id: null,
    employee_name: null,
    department: null,
    assigned_at: null,
    notes: "Client invoicing and payment desk",
    created_at: new Date().toISOString()
  }
];

function ensureFile(): CorporateEmail[] {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultEmails, null, 2), "utf-8");
    return defaultEmails;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return defaultEmails;
  }
}

function saveFile(data: CorporateEmail[]) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// GET all corporate email accounts
router.get("/", (req, res) => {
  const emails = ensureFile();
  res.json(emails);
});

// POST add a new corporate email account to the fixed pool
router.post("/", (req, res) => {
  const { email, plan, notes } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid corporate email address is required." });
  }
  const emails = ensureFile();
  const normalized = email.trim().toLowerCase();
  if (emails.some(e => e.email.toLowerCase() === normalized)) {
    return res.status(409).json({ error: "This email account already exists in the corporate pool." });
  }
  const newEmail: CorporateEmail = {
    id: "em-" + crypto.randomUUID().slice(0, 8),
    email: normalized,
    plan: plan?.trim() || "Microsoft 365 Business Standard",
    status: "available",
    employee_id: null,
    employee_name: null,
    department: null,
    assigned_at: null,
    notes: notes?.trim() || "",
    created_at: new Date().toISOString()
  };
  emails.push(newEmail);
  saveFile(emails);
  res.status(201).json(newEmail);
});

// PATCH assign an email account directly to an employee (NO ACKNOWLEDGEMENT REQUIRED)
router.patch("/:id/assign", (req, res) => {
  const { id } = req.params;
  const { employee_id, employee_name, department, notes } = req.body;

  if (!employee_id || !employee_name) {
    return res.status(400).json({ error: "Employee selection is required." });
  }

  const emails = ensureFile();
  const idx = emails.findIndex(e => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Corporate email not found" });
  }

  emails[idx] = {
    ...emails[idx],
    status: "assigned",
    employee_id,
    employee_name,
    department: department || null,
    assigned_at: new Date().toISOString(),
    notes: notes !== undefined ? notes : emails[idx].notes
  };

  saveFile(emails);
  res.json(emails[idx]);
});

// PATCH unassign / release an email account back to the available pool
router.patch("/:id/unassign", (req, res) => {
  const { id } = req.params;
  const emails = ensureFile();
  const idx = emails.findIndex(e => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: "Corporate email not found" });
  }

  emails[idx] = {
    ...emails[idx],
    status: "available",
    employee_id: null,
    employee_name: null,
    department: null,
    assigned_at: null
  };

  saveFile(emails);
  res.json(emails[idx]);
});

// DELETE an email account from the pool
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const emails = ensureFile();
  const filtered = emails.filter(e => e.id !== id);
  if (filtered.length === emails.length) {
    return res.status(404).json({ error: "Corporate email not found" });
  }
  saveFile(filtered);
  res.json({ message: "Corporate email removed successfully" });
});

export default router;

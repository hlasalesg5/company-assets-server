import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();
const dataDir = path.join(__dirname, "../../data");
const filePath = path.join(dataDir, "branch_assets.json");

export interface BranchAsset {
  id: string;
  type: "cctv" | "nvr" | "network" | "biometric" | "display" | "other";
  name: string;
  branch: string;
  location: string;
  brand: string;
  model: string;
  serial_number: string;
  ip_address?: string;
  installation_date?: string;
  status: "operational" | "maintenance" | "offline";
  notes?: string;
  created_at: string;
}

const defaultAssets: BranchAsset[] = [
  {
    id: "ba-001",
    type: "cctv",
    name: "Reception 4K Dome Camera",
    branch: "Dubai Head Office",
    location: "Main Reception & Entrance",
    brand: "Hikvision",
    model: "DS-2CD2143G2-I 4K IP Dome",
    serial_number: "HK-DXB-CCTV-01",
    ip_address: "192.168.10.101",
    installation_date: "2025-01-15",
    status: "operational",
    notes: "Wide-angle covering visitor entrance and lobby",
    created_at: new Date().toISOString()
  },
  {
    id: "ba-002",
    type: "cctv",
    name: "Accounting Hall Camera",
    branch: "Dubai Head Office",
    location: "Accounts & Audit Floor",
    brand: "Hikvision",
    model: "DS-2CD2043G2-I 4MP Bullet",
    serial_number: "HK-DXB-CCTV-02",
    ip_address: "192.168.10.102",
    installation_date: "2025-01-15",
    status: "operational",
    notes: "Covers file cabinets and workstations",
    created_at: new Date().toISOString()
  },
  {
    id: "ba-003",
    type: "nvr",
    name: "Central 16-Channel 4K NVR",
    branch: "Dubai Head Office",
    location: "Server Room Rack 01",
    brand: "Hikvision",
    model: "DS-7616NI-I2/16P 16CH NVR",
    serial_number: "NVR-DXB-9842",
    ip_address: "192.168.10.100",
    installation_date: "2024-11-20",
    status: "operational",
    notes: "16TB Storage (30-day continuous archive)",
    created_at: new Date().toISOString()
  },
  {
    id: "ba-004",
    type: "cctv",
    name: "Client Consultation Room Camera",
    branch: "Abu Dhabi Branch",
    location: "Main Meeting Area",
    brand: "Dahua",
    model: "IPC-HDBW2431E-S-S2 4MP Dome",
    serial_number: "DH-AUH-CCTV-01",
    ip_address: "192.168.20.101",
    installation_date: "2025-03-10",
    status: "operational",
    notes: "Fixed branch surveillance",
    created_at: new Date().toISOString()
  }
];

function ensureFile(): BranchAsset[] {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultAssets, null, 2), "utf-8");
    return defaultAssets;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return defaultAssets;
  }
}

function saveFile(data: BranchAsset[]) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// GET all non-assignable branch assets
router.get("/", (req, res) => {
  const assets = ensureFile();
  res.json(assets);
});

// POST a new branch asset
router.post("/", (req, res) => {
  const { type, name, branch, location, brand, model, serial_number, ip_address, installation_date, notes } = req.body;
  if (!branch || !brand || !model) {
    return res.status(400).json({ error: "Branch, brand, and model are required." });
  }
  const assets = ensureFile();
  const newAsset: BranchAsset = {
    id: "ba-" + crypto.randomUUID().slice(0, 8),
    type: type || "cctv",
    name: name?.trim() || `${brand} ${model}`,
    branch: branch.trim(),
    location: location?.trim() || "Main Office Area",
    brand: brand.trim(),
    model: model.trim(),
    serial_number: serial_number?.trim() || `SN-${Date.now().toString().slice(-6)}`,
    ip_address: ip_address?.trim() || "",
    installation_date: installation_date || new Date().toISOString().split("T")[0],
    status: "operational",
    notes: notes?.trim() || "",
    created_at: new Date().toISOString()
  };
  assets.unshift(newAsset);
  saveFile(assets);
  res.status(201).json(newAsset);
});

// DELETE a branch asset
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const assets = ensureFile();
  const filtered = assets.filter(a => a.id !== id);
  if (filtered.length === assets.length) {
    return res.status(404).json({ error: "Asset not found" });
  }
  saveFile(filtered);
  res.json({ message: "Asset deleted successfully" });
});

export default router;

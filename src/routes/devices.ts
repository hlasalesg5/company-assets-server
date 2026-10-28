import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const router = Router();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

// Helper to normalize device type if stored with bracket prefix
export function normalizeDevice(dev: any) {
    if (!dev) return dev;
    if (dev.type === "other") {
        if (dev.model?.startsWith("[PRINTER] ")) {
            return { ...dev, type: "printer", model: dev.model.replace("[PRINTER] ", "") };
        }
        if (dev.model?.startsWith("[SIM] ")) {
            return { ...dev, type: "sim", model: dev.model.replace("[SIM] ", "") };
        }
    }
    return dev;
}

// GET all devices
router.get("/", async (req, res) => {
    const { data, error } = await supabase.from("devices").select("*");
    if (error) return res.status(500).json({ error: error.message });
    const normalized = (data || []).map(normalizeDevice);
    res.json(normalized);
});

// POST a new device (with support for printer, sim, laptop, phone, tablet, monitor, other)
router.post("/", async (req, res) => {
    let { type, brand, model, serial_number } = req.body;

    if (type === "sim" && !serial_number) {
        serial_number = req.body.phone_number || model || ("SIM-" + Date.now());
    }

    if (!type || !serial_number) {
        return res.status(400).json({ error: "Device category and serial number are required." });
    }

    // First attempt direct insertion with the native category type
    let { data, error } = await supabase
        .from("devices")
        .insert([{ type, brand, model, serial_number, status: "in-stock" }])
        .select();

    // If database check constraint 'devices_type_check' rejects 'printer' or 'sim':
    if (error && (error.message?.includes("devices_type_check") || error.code === "23514")) {
        const fallbackModel = `[${String(type).toUpperCase()}] ${model || ""}`.trim();
        const fallbackRes = await supabase
            .from("devices")
            .insert([{ type: "other", brand, model: fallbackModel, serial_number, status: "in-stock" }])
            .select();

        if (fallbackRes.error) return res.status(500).json({ error: fallbackRes.error.message });
        data = fallbackRes.data;
    } else if (error) {
        return res.status(500).json({ error: error.message });
    }
    if (!data || !data[0]) {
        return res.status(500).json({ error: "Failed to retrieve created device record." });
    }

    const created = normalizeDevice(data[0]);
    res.status(201).json(created);
});

// DELETE a device
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    // Check device status
    const { data: device, error: findErr } = await supabase
        .from("devices")
        .select("status")
        .eq("id", id)
        .single();

    if (findErr || !device) return res.status(404).json({ error: "Device not found" });
    if (device.status === "assigned") {
        return res.status(400).json({
            error: "Cannot delete a device that is currently assigned. Please return it first."
        });
    }

    // Delete any past returned assignments for this device to prevent foreign key errors
    await supabase.from("assignments").delete().eq("device_id", id);

    const { error } = await supabase.from("devices").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Device deleted successfully" });
});

export default router;
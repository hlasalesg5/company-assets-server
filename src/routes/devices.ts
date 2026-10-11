import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const router = Router();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

// GET all devices
router.get("/", async (req, res) => {
    const { data, error } = await supabase.from("devices").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST a new device
router.post("/", async (req, res) => {
    const { type, brand, model, serial_number } = req.body;
    const { data, error } = await supabase
        .from("devices")
        .insert([{ type, brand, model, serial_number, status: "in-stock" }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
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
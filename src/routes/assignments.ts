import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const router = Router();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

// GET all active assignments (with employee + device details)
router.get("/", async (req, res) => {
    const { data, error } = await supabase
        .from("assignments")
        .select(`
            id,
            assigned_at,
            returned_at,
            notes,
            employees ( id, employee_id, name, department ),
            devices ( id, type, brand, model, serial_number )
        `)
        .order("assigned_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST assign a device to an employee
router.post("/", async (req, res) => {
    const { employee_id, device_id, notes } = req.body;

    if (!employee_id || !device_id) {
        return res.status(400).json({ error: "employee_id and device_id are required" });
    }

    // Check device is available
    const { data: device, error: devErr } = await supabase
        .from("devices")
        .select("status")
        .eq("id", device_id)
        .single();

    if (devErr || !device) return res.status(404).json({ error: "Device not found" });
    if (device.status === "assigned") {
        return res.status(409).json({ error: "Device is already assigned to someone" });
    }

    // Create assignment
    const { data: assignment, error: assignErr } = await supabase
        .from("assignments")
        .insert([{ employee_id, device_id, notes }])
        .select()
        .single();

    if (assignErr) return res.status(500).json({ error: assignErr.message });

    // Update device status to assigned
    await supabase.from("devices").update({ status: "assigned" }).eq("id", device_id);

    res.status(201).json(assignment);
});

// PATCH return a device (mark assignment as returned)
router.patch("/:id/return", async (req, res) => {
    const { id } = req.params;

    // Get the assignment to find the device
    const { data: assignment, error: findErr } = await supabase
        .from("assignments")
        .select("device_id, returned_at")
        .eq("id", id)
        .single();

    if (findErr || !assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.returned_at) return res.status(400).json({ error: "Device already returned" });

    // Mark as returned
    const { data, error } = await supabase
        .from("assignments")
        .update({ returned_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    // Set device back to in-stock
    await supabase.from("devices").update({ status: "in-stock" }).eq("id", assignment.device_id);

    res.json(data);
});

export default router;

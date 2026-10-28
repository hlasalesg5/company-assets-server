import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();
const router = Router();
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

// GET all employees
router.get("/", async (req, res) => {
    const { data, error } = await supabase.from("employees").select("*");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST a new employee
router.post("/", async (req, res) => {
    const { name, email, department } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Name is required" });
    }

    const { data, error } = await supabase
        .from("employees")
        .insert([{ name, email, department }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

// DELETE an employee
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    // Check if employee has active device assignments
    const { data: activeAssignments, error: checkErr } = await supabase
        .from("assignments")
        .select("id")
        .eq("employee_id", id)
        .is("returned_at", null);

    if (checkErr) return res.status(500).json({ error: checkErr.message });
    if (activeAssignments && activeAssignments.length > 0) {
        return res.status(400).json({
            error: "Cannot delete employee who currently holds active devices. Please return their devices first."
        });
    }

    // Delete any past returned assignments to prevent foreign key errors
    await supabase.from("assignments").delete().eq("employee_id", id);

    const { error } = await supabase.from("employees").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });

    res.json({ message: "Employee deleted successfully" });
});

export default router;
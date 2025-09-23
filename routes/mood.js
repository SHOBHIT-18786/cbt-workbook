const express = require("express");
const { pool } = require("../utils/db");
const { isAuthenticated } = require("./auth");
const { symptomOptions } = require("../utils/appData");
const router = express.Router();

// Helper to get all days in a month with their moods
async function getMoodEntriesForMonth(userId, year, month) {
    // Month is 0-indexed in JS Date but 1-indexed in SQL
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of the month

    const result = await pool.query(
        `SELECT 
            entry_id, 
            mood_date, 
            mood_rating, 
            energy_level, 
            context,
            situation
        FROM mood.entries 
        WHERE user_id = $1 
        AND mood_date BETWEEN $2 AND $3
        ORDER BY mood_date`,
        [userId, startDate.toISOString(), endDate.toISOString()]
    );

    return result.rows;
}

// Helper to get dates with data for current month
async function getDatesWithMoodData(userId, year, month) {
    const entries = await getMoodEntriesForMonth(userId, year, month);

    // Create a map of date -> mood data
    const moodMap = entries.reduce((acc, entry) => {
        const dateKey = new Date(entry.mood_date).getDate();
        acc[dateKey] = {
            entry_id: entry.entry_id,
            mood_rating: entry.mood_rating,
            energy_level: entry.energy_level,
            has_data: true
        };
        return acc;
    }, {});

    return moodMap;
}

// Get a specific mood entry by date
async function getMoodEntryByDate(userId, dateStr) {
    const result = await pool.query(
        `SELECT * FROM mood.entries 
         WHERE user_id = $1 AND mood_date = $2
         ORDER BY created_at DESC LIMIT 1`,
        [userId, dateStr]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
}

// Main route to redirect to today's date
router.get("/mood-tracker", isAuthenticated, (req, res) => {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    res.redirect(`/mood-tracker/${formattedDate}`);
    return;
});

// Route to view mood for a specific date
router.get("/mood-tracker/:date", isAuthenticated, async (req, res) => {
    try {
        const dateStr = req.params.date;
        const date = new Date(dateStr);

        // Validate date format
        if (isNaN(date.getTime())) {
            req.flash("error", "Invalid date format. Please use YYYY-MM-DD.");
            res.redirect("/mood-tracker");
            return;
        }

        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed

        // Get mood entry for the selected date
        const moodEntry = await getMoodEntryByDate(req.session.userId, dateStr);

        // Get data for calendar display
        const datesWithMoodData = await getDatesWithMoodData(req.session.userId, year, month);


        res.render("mood-tracker", {
            title: "Mood Tracker | CBT Workbook",
            selectedDate: dateStr,
            currentYear: year,
            currentMonth: month,
            moodEntry: moodEntry,
            datesWithMoodData: JSON.stringify(datesWithMoodData),
            isNewEntry: !moodEntry,
            symptomOptions: symptomOptions,
            formAction: `/mood-tracker/${dateStr}`
        });
        return;
    } catch (error) {
        console.error("Error fetching mood data:", error);
        req.flash("error", "Failed to load mood tracking data.");
        res.redirect("/dashboard");
        return;
    }
});

// Create a new mood entry
router.post("/mood-tracker/:date", isAuthenticated, async (req, res) => {
    const dateStr = req.params.date;
    try {
        const {
            mood_rating,
            energy_level,
            context,
            situation,
            physical_symptoms = [],
            thoughts
        } = req.body;

        // Validate required fields
        if (!mood_rating || !energy_level) {
            req.flash("error", "Mood rating and energy level are required.");
            return res.redirect(`/mood-tracker/${dateStr}`);
        }

        // Create new entry
        const result = await pool.query(
            `INSERT INTO mood.entries 
             (user_id, mood_date, mood_rating, energy_level, context, situation, physical_symptoms, thoughts) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                req.session.userId,
                dateStr,
                mood_rating,
                energy_level,
                context || null,
                situation || null,
                physical_symptoms,
                thoughts || null
            ]
        );

        req.flash("success", "Mood entry saved successfully.");
        return res.redirect(`/mood-tracker/${dateStr}`);
    } catch (error) {
        console.error("Error creating mood entry:", error);
        req.flash("error", "Failed to save mood data. Please try again.");
        return res.redirect(`/mood-tracker/${dateStr}`);
    }
});

// Delete a mood entry
router.delete("/mood-tracker/:date", isAuthenticated, async (req, res) => {
    const dateStr = req.params.date;
    try {
        // Delete entry
        await pool.query(
            `DELETE FROM mood.entries 
             WHERE mood_date = $1 AND user_id = $2`,
            [dateStr, req.session.userId]
        );

        req.flash("success", "Mood entry deleted successfully.");
        res.json({ redirect: `/mood-tracker/${dateStr}` });
        return;
    } catch (error) {
        console.error("Error deleting mood entry:", error);
        req.flash("error", "Failed to delete mood data. Please try again.");
        res.status(500).json({ redirect: `/mood-tracker/${dateStr}` });
        return;
    }
});

module.exports = router;


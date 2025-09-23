const express = require("express");
const { pool } = require("../utils/db");
const { isAuthenticated } = require("./auth");
const { cognitiveDistortions } = require("../utils/appData");
const router = express.Router();

// Helper to get all thought records for a month
async function getThoughtRecordsForMonth(userId, year, month) {
    // Month is 0-indexed in JS Date but 1-indexed in SQL
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of the month

    const result = await pool.query(
        `SELECT 
            record_id, 
            situation,
            emotions,
            emotion_intensity,
            automatic_thoughts,
            cognitive_distortions,
            rational_response,
            outcome_emotions,
            outcome_intensity,
            belief_original,
            belief_after,
            created_at
        FROM thought.records 
        WHERE user_id = $1 
        AND created_at BETWEEN $2 AND $3
        ORDER BY created_at DESC`,
        [userId, startDate.toISOString(), endDate.toISOString()]
    );

    return result.rows;
}

// Helper to get dates with thought records for current month
async function getDatesWithThoughtData(userId, year, month) {
    const records = await getThoughtRecordsForMonth(userId, year, month);

    // Create a map of date -> thought data
    const thoughtMap = records.reduce((acc, record) => {
        const date = new Date(record.created_at);
        const dateKey = date.getDate();

        if (!acc[dateKey]) {
            acc[dateKey] = {
                record_id: record.record_id,
                has_data: true,
                count: 1
            };
        } else {
            acc[dateKey].count += 1;
        }

        return acc;
    }, {});

    return thoughtMap;
}

// Get a specific thought record by ID
async function getThoughtRecordById(userId, recordId) {
    const result = await pool.query(
        `SELECT * FROM thought.records 
         WHERE user_id = $1 AND record_id = $2`,
        [userId, recordId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
}

// Get thought records for a specific date
async function getThoughtRecordsByDate(userId, dateStr) {
    // Convert date string to date object
    const date = new Date(dateStr);
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const result = await pool.query(
        `SELECT * FROM thought.records 
         WHERE user_id = $1 
         AND created_at >= $2 
         AND created_at < $3
         ORDER BY created_at DESC`,
        [userId, date.toISOString(), nextDay.toISOString()]
    );


    return result.rows;
}

// Main route to redirect to today's date
router.get("/thought-record", isAuthenticated, (req, res) => {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    res.redirect(`/thought-record/${formattedDate}`);
    return;
});

// Route to view thoughts for a specific date
router.get("/thought-record/:date", isAuthenticated, async (req, res) => {
    try {
        const dateStr = req.params.date;
        const date = new Date(dateStr);

        // Validate date format
        if (isNaN(date.getTime())) {
            req.flash("error", "Invalid date format. Please use YYYY-MM-DD.");
            res.redirect("/thought-record");
            return;
        }

        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed

        // Get thought records for the selected date
        const thoughtRecords = await getThoughtRecordsByDate(req.session.userId, dateStr);

        // Get data for calendar display
        const datesWithThoughtData = await getDatesWithThoughtData(req.session.userId, year, month);


        res.render("thought-record", {
            title: "Thought Record | CBT Workbook",
            selectedDate: dateStr,
            currentYear: year,
            currentMonth: month,
            thoughtRecords: thoughtRecords,
            datesWithThoughtData: JSON.stringify(datesWithThoughtData),
            cognitiveDistortions: cognitiveDistortions,
            formAction: `/thought-record/${dateStr}`
        });
        return;
    } catch (error) {
        console.error("Error fetching thought record data:", error);
        req.flash("error", "Failed to load thought record data.");
        res.redirect("/dashboard");
        return;
    }
});

// Route to view a specific thought record
router.get("/thought-record/view/:id", isAuthenticated, async (req, res) => {
    try {
        const recordId = req.params.id;

        // Get the thought record
        const thoughtRecord = await getThoughtRecordById(req.session.userId, recordId);

        if (!thoughtRecord) {
            req.flash("error", "Thought record not found.");
            res.redirect("/thought-record");
            return;
        }

        res.render("thought-record-detail", {
            title: "Thought Record Details | CBT Workbook",
            thoughtRecord: thoughtRecord,
            cognitiveDistortions: cognitiveDistortions,
            formAction: `/thought-record/edit/${recordId}`
        });
        return;
    } catch (error) {
        console.error("Error fetching thought record:", error);
        req.flash("error", "Failed to load thought record.");
        res.redirect("/thought-record");
        return;
    }
});

// Create a new thought record
router.post("/thought-record/:date", isAuthenticated, async (req, res) => {
    try {
        const {
            situation,
            emotions,
            emotion_intensity,
            automatic_thoughts,
            cognitive_distortions = [],
            rational_response,
            outcome_emotions,
            outcome_intensity,
            belief_original,
            belief_after
        } = req.body;

        // Validate required fields
        if (!situation || !automatic_thoughts) {
            req.flash("error", "Situation and automatic thoughts are required.");
            return res.redirect(`/thought-record/${req.params.date}`);
        }

        // Prepare emotions and intensities as arrays
        const emotionsArray = Array.isArray(emotions) ? emotions : emotions.split(',').map(e => e.trim());
        const emotionIntensityArray = Array.isArray(emotion_intensity)
            ? emotion_intensity.map(i => parseInt(i, 10))
            : [parseInt(emotion_intensity, 10)];

        // Prepare outcome emotions and intensities as arrays
        const outcomeEmotionsArray = outcome_emotions
            ? (Array.isArray(outcome_emotions) ? outcome_emotions : outcome_emotions.split(',').map(e => e.trim()))
            : [];

        const outcomeIntensityArray = outcome_intensity
            ? (Array.isArray(outcome_intensity)
                ? outcome_intensity.map(i => parseInt(i, 10))
                : [parseInt(outcome_intensity, 10)])
            : [];

        // Parse the date from the URL param and set time to midnight UTC
        const dateStr = req.params.date;
        let createdAt = new Date(dateStr);
        if (isNaN(createdAt.getTime())) {
            req.flash("error", "Invalid date format. Please use YYYY-MM-DD.");
            return res.redirect("/thought-record");
        }
        // Set to midnight UTC
        createdAt.setUTCHours(0, 0, 0, 0);

        // Create new entry with explicit created_at
        const result = await pool.query(
            `INSERT INTO thought.records 
             (user_id, situation, emotions, emotion_intensity, automatic_thoughts, 
              cognitive_distortions, rational_response, outcome_emotions, outcome_intensity,
              belief_original, belief_after, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING *`,
            [
                req.session.userId,
                situation,
                emotionsArray,
                emotionIntensityArray,
                automatic_thoughts,
                cognitive_distortions,
                rational_response || null,
                outcomeEmotionsArray,
                outcomeIntensityArray,
                belief_original ? parseInt(belief_original, 10) : null,
                belief_after ? parseInt(belief_after, 10) : null,
                createdAt.toISOString()
            ]
        );

        req.flash("success", "Thought record saved successfully.");
        return res.redirect(`/thought-record/${req.params.date}`);
    } catch (error) {
        console.error("Error creating thought record:", error);
        req.flash("error", "Failed to save thought record. Please try again.");
        return res.redirect(`/thought-record/${req.params.date}`);
    }
});

// Update an existing thought record
router.post("/thought-record/edit/:id", isAuthenticated, async (req, res) => {
    try {
        const recordId = req.params.id;

        const {
            situation,
            emotions,
            emotion_intensity,
            automatic_thoughts,
            cognitive_distortions = [],
            rational_response,
            outcome_emotions,
            outcome_intensity,
            belief_original,
            belief_after
        } = req.body;

        // Validate required fields
        if (!situation || !automatic_thoughts) {
            req.flash("error", "Situation and automatic thoughts are required.");
            return res.redirect(`/thought-record/view/${recordId}`);
        }

        // Prepare emotions and intensities as arrays
        const emotionsArray = Array.isArray(emotions) ? emotions : emotions.split(',').map(e => e.trim());
        const emotionIntensityArray = Array.isArray(emotion_intensity)
            ? emotion_intensity.map(i => parseInt(i, 10))
            : [parseInt(emotion_intensity, 10)];

        // Prepare outcome emotions and intensities as arrays
        const outcomeEmotionsArray = outcome_emotions
            ? (Array.isArray(outcome_emotions) ? outcome_emotions : outcome_emotions.split(',').map(e => e.trim()))
            : [];

        const outcomeIntensityArray = outcome_intensity
            ? (Array.isArray(outcome_intensity)
                ? outcome_intensity.map(i => parseInt(i, 10))
                : [parseInt(outcome_intensity, 10)])
            : [];

        // Get created_at date to redirect back to same date view
        const record = await getThoughtRecordById(req.session.userId, recordId);
        const recordDate = new Date(record.created_at).toISOString().split('T')[0];

        // Update entry
        await pool.query(
            `UPDATE thought.records 
             SET situation = $1, 
                 emotions = $2, 
                 emotion_intensity = $3, 
                 automatic_thoughts = $4, 
                 cognitive_distortions = $5, 
                 rational_response = $6, 
                 outcome_emotions = $7, 
                 outcome_intensity = $8,
                 belief_original = $9, 
                 belief_after = $10,
                 updated_at = CURRENT_TIMESTAMP
             WHERE record_id = $11 AND user_id = $12`,
            [
                situation,
                emotionsArray,
                emotionIntensityArray,
                automatic_thoughts,
                cognitive_distortions,
                rational_response || null,
                outcomeEmotionsArray,
                outcomeIntensityArray,
                belief_original ? parseInt(belief_original, 10) : null,
                belief_after ? parseInt(belief_after, 10) : null,
                recordId,
                req.session.userId
            ]
        );

        req.flash("success", "Thought record updated successfully.");
        return res.redirect(`/thought-record/${recordDate}`);
    } catch (error) {
        console.error("Error updating thought record:", error);
        req.flash("error", "Failed to update thought record. Please try again.");
        return res.redirect(`/thought-record/view/${req.params.id}`);
    }
});

// Delete a thought record
router.delete("/thought-record/:id", isAuthenticated, async (req, res) => {
    try {
        const recordId = req.params.id;

        // Get the record to find its date before deletion
        const record = await getThoughtRecordById(req.session.userId, recordId);

        if (!record) {
            res.status(404).json({ error: "Thought record not found." });
            return;
        }

        const recordDate = new Date(record.created_at).toISOString().split('T')[0];

        // Delete entry
        await pool.query(
            `DELETE FROM thought.records 
             WHERE record_id = $1 AND user_id = $2`,
            [recordId, req.session.userId]
        );

        req.flash("success", "Thought record deleted successfully.");
        res.json({ redirect: `/thought-record/${recordDate} `});
        return;
    } catch (error) {
        console.error("Error deleting thought record:", error);
        req.flash("error", "Failed to delete thought record. Please try again.");
        res.status(500).json({ error: "Failed to delete thought record." });
        return;
    }
});


module.exports = router;
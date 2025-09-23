const express = require("express");
const { pool } = require("../utils/db");
const { bdiQuizData } = require("../utils/appData");

const router = express.Router();

// Import authentication middleware from auth.js
const { isAuthenticated } = require("./auth");

// Show BDI test page
router.get("/bdi", isAuthenticated, (req, res) => {
    res.render("bdi", {
        title: "BDI Test | CBT Workbook",
        bdiData: JSON.stringify(bdiQuizData)
    });
});

// Process BDI test submission
router.post("/bdi", isAuthenticated, async (req, res) => {
    try {
        const { selectedOptions, sessionId } = req.body;

        // Convert form data array to numeric values
        const numericOptions = Array.isArray(selectedOptions)
            ? selectedOptions.map(val => parseInt(val, 10))
            : Object.values(selectedOptions).map(val => parseInt(val, 10));

        const result = await pool.query(
            `INSERT INTO quiz.bdi_responses (user_id, selected_options, session_id) 
             VALUES ($1, $2, $3)
             RETURNING response_id, total_score, interpretation`,
            [req.session.userId, numericOptions, sessionId]
        );

        // Calculate total score
        const totalScore = result.rows[0].total_score;
        const interpretation = result.rows[0].interpretation;

        // Render the results page directly instead of returning JSON
        res.render("bdi", {
            title: "BDI Test Results | CBT Workbook",
            bdiData: JSON.stringify({
                ...bdiQuizData,
                showResults: true,
                totalScore: totalScore,
                interpretation: interpretation
            })
        });
    } catch (error) {
        console.error('Error saving BDI response:', error);
        req.flash('error', 'Failed to save your responses. Please try again.');
        res.redirect('/bdi');
    }
});

// Show BDI history page
router.get("/bdi/history", isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT response_id, total_score, interpretation, created_at 
             FROM quiz.bdi_responses 
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.session.userId]
        );

        res.render("bdi-history", {
            title: "BDI History | CBT Workbook",
            bdiHistory: result.rows
        });
    } catch (error) {
        console.error('Error fetching BDI history:', error);
        req.flash('error', 'Failed to load your BDI history.');
        res.redirect('/dashboard');
    }
});

// Show detailed results for a specific BDI test
router.get("/bdi/results/:id", isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        // Get the response data and ensure it belongs to the current user
        const result = await pool.query(
            `SELECT response_id, selected_options, total_score, interpretation, created_at 
             FROM quiz.bdi_responses 
             WHERE response_id = $1 AND user_id = $2`,
            [id, req.session.userId]
        );

        if (result.rows.length === 0) {
            req.flash('error', 'BDI result not found or you do not have permission to view it.');
            return res.redirect('/bdi/history');
        }

        const response = result.rows[0];

        // Prepare the results data with the question text and selected answers
        const detailedResults = bdiQuizData.questions.map((question, index) => {
            const selectedValue = response.selected_options[index];
            const selectedOption = question.options.find(opt => opt.value === selectedValue);

            return {
                question: question.text,
                selectedValue: selectedValue,
                selectedText: selectedOption ? selectedOption.text : 'No answer',
            };
        });

        res.render("bdi-results", {
            title: "BDI Test Results | CBT Workbook",
            response: response,
            detailedResults: detailedResults,
            bdiData: bdiQuizData
        });
    } catch (error) {
        console.error('Error fetching BDI results:', error);
        req.flash('error', 'Failed to load the BDI test result details.');
        res.redirect('/bdi/history');
    }
});

// HTMX partial for BDI widget on dashboard
router.get("/partials/dashboard/bdi-widget", isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT response_id, total_score, interpretation, created_at
             FROM quiz.bdi_responses
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [req.session.userId]
        );
        const latestBdi = result.rows[0] || null;
        res.render("partials/dashboard/bdi-widget", { latestBdi: latestBdi });
        return;
    } catch (error) {
        console.error('Error fetching latest BDI for dashboard widget:', error);
        res.status(500).send('');
        return;
    }
});

module.exports = router;
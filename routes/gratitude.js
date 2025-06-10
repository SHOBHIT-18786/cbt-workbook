const express = require("express");
const { pool } = require("../utils/db");
const { isAuthenticated } = require("./auth");
const { upload, getFileUrl } = require("../utils/fileUpload");
const router = express.Router();

// Helper to get all gratitude entries for a user with pagination
async function getUserGratitudeEntries(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    // More efficient query using LEFT JOIN instead of subqueries
    const result = await pool.query(
        `SELECT 
            e.entry_id, 
            e.entry_date,
            e.content, 
            e.category, 
            e.is_private, 
            e.media_url, 
            e.created_at,
            b.board_id,
            b.likes_count
        FROM gratitude.entries e
        LEFT JOIN gratitude.board_entries b ON e.entry_id = b.entry_id AND e.is_private = false
        WHERE e.user_id = $1
        ORDER BY e.created_at DESC
        LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
        SELECT COUNT(*) as total FROM gratitude.entries WHERE user_id = $1,
        [userId]
    );

    return {
        entries: result.rows,
        totalEntries: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
        currentPage: page,
    };
}

// Helper to get community board entries with pagination
async function getCommunityBoardEntries(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    // Optimized query with index hints
    const result = await pool.query(
        `SELECT 
            b.board_id,
            b.likes_count,
            b.created_at as board_created_at,
            e.entry_id,
            e.content,
            e.category,
            e.media_url,
            e.entry_date,
            e.created_at,
            u.username,
            EXISTS (
                SELECT 1 FROM gratitude.reactions r 
                WHERE r.board_id = b.board_id AND r.user_id = $1
            ) as user_has_liked
        FROM gratitude.board_entries b
        /* Using index scan on b.created_at for efficient sorting */
        JOIN gratitude.entries e ON b.entry_id = e.entry_id
        JOIN users u ON e.user_id = u.id
        WHERE b.approval_status = 'approved'
        ORDER BY b.created_at DESC
        LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );

    // Get total count for pagination with materialized query
    const countResult = await pool.query(
        SELECT COUNT(*) as total FROM gratitude.board_entries WHERE approval_status = 'approved'
    );

    return {
        entries: result.rows,
        totalEntries: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit),
        currentPage: page,
    };
}

// Helper to get a single gratitude entry by ID
async function getGratitudeEntryById(userId, entryId) {
    // Optimized query using LEFT JOIN instead of subquery
    const result = await pool.query(
        `SELECT 
            e.entry_id, 
            e.user_id,
            e.entry_date,
            e.content, 
            e.category, 
            e.is_private, 
            e.media_url, 
            e.created_at,
            b.board_id
        FROM gratitude.entries e
        LEFT JOIN gratitude.board_entries b ON e.entry_id = b.entry_id AND e.is_private = false
        WHERE e.entry_id = $1 AND e.user_id = $2`,
        [entryId, userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
}

// Helper to get a public gratitude entry from the board
async function getPublicGratitudeEntry(entryId) {
    const result = await pool.query(
        `SELECT 
            e.entry_id, 
            e.user_id,
            e.entry_date,
            e.content, 
            e.category, 
            e.media_url, 
            e.created_at,
            b.board_id,
            b.likes_count,
            u.username
        FROM gratitude.entries e
        JOIN gratitude.board_entries b ON e.entry_id = b.entry_id
        JOIN users u ON e.user_id = u.id
        WHERE e.entry_id = $1 AND e.is_private = false`,
        [entryId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
}

// Helper to get a user's recent entries for the dashboard widget
async function getRecentGratitudeEntries(userId, limit = 1) {
    const result = await pool.query(
        `SELECT 
            entry_id, 
            entry_date,
            content, 
            category, 
            is_private, 
            created_at
        FROM gratitude.entries 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
        [userId, limit]
    );

    return result.rows;
}

// Helper to get recent community entries for the dashboard widget
async function getRecentCommunityEntries(limit = 3) {
    const result = await pool.query(
        `SELECT 
            b.board_id,
            b.likes_count,
            e.entry_id,
            e.content,
            e.category,
            u.username
        FROM gratitude.board_entries b
        JOIN gratitude.entries e ON b.entry_id = e.entry_id
        JOIN users u ON e.user_id = u.id
        WHERE b.approval_status = 'approved'
        ORDER BY b.created_at DESC
        LIMIT $1`,
        [limit]
    );

    return result.rows;
}

// Main routes

// Gratitude journal main page
router.get("/gratitude", isAuthenticated, async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const result = await getUserGratitudeEntries(req.session.userId, page);

        res.render("gratitude", {
            entries: result.entries,
            pagination: {
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                totalEntries: result.totalEntries
            }
        });
    } catch (error) {
        console.error("Error fetching gratitude entries:", error);
        req.flash("error", "Failed to load gratitude entries.");
        res.redirect("/dashboard");
    }
});

// New gratitude entry form
router.get("/gratitude/new", isAuthenticated, (req, res) => {
    res.render("gratitude-form", {
        title: "New Gratitude Entry | CBT Workbook",
        entry: {
            is_private: true
        },
        formAction: "/gratitude/new"
    });
});

// Create new gratitude entry
router.post("/gratitude/new", isAuthenticated, upload.single('media_file'), async (req, res) => {
    try {
        const { content, category, is_private } = req.body;

        // Validate required fields
        if (!content || !category) {
            req.flash("error", "Content and category are required.");

            // For HTMX requests, we need to respond with just the widget HTML
            if (req.headers['hx-request'] === 'true') {
                // Get data needed for the widget
                const latestEntries = await getRecentGratitudeEntries(req.session.userId);
                const latestEntry = latestEntries.length > 0 ? latestEntries[0] : null;

                const countResult = await pool.query(
                    SELECT COUNT(*) as total FROM gratitude.entries WHERE user_id = $1,
                    [req.session.userId]
                );
                const totalEntries = parseInt(countResult.rows[0].total, 10);

                const communityEntries = await getRecentCommunityEntries(3);

                return res.render("partials/dashboard/gratitude-widget", {
                    latestEntry,
                    totalEntries,
                    communityEntries,
                    time: new Date()
                });
            }

            return res.redirect("/gratitude/new");
        }

        // Convert is_private to boolean
        const isPrivate = is_private === "true" || is_private === true;

        // Get media URL from uploaded file or from URL input
        let mediaUrl = null;
        if (req.file) {
            // If a file was uploaded, use its path
            mediaUrl = getFileUrl(req, req.file.filename);
        }

        // Create new entry
        const result = await pool.query(
            `INSERT INTO gratitude.entries 
             (user_id, content, category, is_private, media_url) 
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.session.userId, content, category, isPrivate, mediaUrl]
        );

        const newEntry = result.rows[0];

        // If entry is public, add to community board
        if (!isPrivate) {
            await pool.query(
                `INSERT INTO gratitude.board_entries
                 (entry_id)
                 VALUES ($1)`,
                [newEntry.entry_id]
            );
        }

        req.flash("success", "Gratitude entry saved successfully.");

        // Handle HTMX requests differently than regular form submissions
        if (req.headers['hx-request'] === 'true') {
            // Get data needed for the widget
            const latestEntries = await getRecentGratitudeEntries(req.session.userId);
            const latestEntry = latestEntries.length > 0 ? latestEntries[0] : null;

            const countResult = await pool.query(
                SELECT COUNT(*) as total FROM gratitude.entries WHERE user_id = $1,
                [req.session.userId]
            );
            const totalEntries = parseInt(countResult.rows[0].total, 10);

            const communityEntries = await getRecentCommunityEntries(3);

            // Return just the widget HTML
            return res.render("partials/dashboard/gratitude-widget", {
                latestEntry,
                totalEntries,
                communityEntries,
                time: new Date()
            });
        } else {
            // For regular form submissions
            return res.redirect("/gratitude");
        }
    } catch (error) {
        console.error("Error creating gratitude entry:", error);
        req.flash("error", "Failed to save gratitude entry. Please try again.");

        // Handle HTMX requests differently than regular form submissions
        if (req.headers['hx-request'] === 'true') {
            // Get data needed for the widget
            const latestEntries = await getRecentGratitudeEntries(req.session.userId);
            const latestEntry = latestEntries.length > 0 ? latestEntries[0] : null;

            const countResult = await pool.query(
                SELECT COUNT(*) as total FROM gratitude.entries WHERE user_id = $1,
                [req.session.userId]
            );
            const totalEntries = parseInt(countResult.rows[0].total, 10);

            const communityEntries = await getRecentCommunityEntries(3);

            // Return just the widget HTML
            return res.render("partials/dashboard/gratitude-widget", {
                latestEntry,
                totalEntries,
                communityEntries,
                time: new Date(),
                error: "Failed to save gratitude entry. Please try again."
            });
        } else {
            // For regular form submissions
            return res.redirect("/gratitude/new");
        }
    }
});

// View a specific gratitude entry
router.get("/gratitude/view/:id", isAuthenticated, async (req, res) => {
    try {
        const entryId = req.params.id;
        const entry = await getGratitudeEntryById(req.session.userId, entryId);

        if (!entry) {
            req.flash("error", "Gratitude entry not found.");
            return res.redirect("/gratitude");
        }

        res.render("gratitude-detail", {
            entry: entry
        });
    } catch (error) {
        console.error("Error fetching gratitude entry:", error);
        req.flash("error", "Failed to load gratitude entry.");
        res.redirect("/gratitude");
    }
});

// Edit gratitude entry form
router.get("/gratitude/edit/:id", isAuthenticated, async (req, res) => {
    try {
        const entryId = req.params.id;
        const entry = await getGratitudeEntryById(req.session.userId, entryId);

        if (!entry) {
            req.flash("error", "Gratitude entry not found.");
            return res.redirect("/gratitude");
        }

        res.render("gratitude-form", {
            title: "Edit Gratitude Entry | CBT Workbook",
            entry: entry,
            formAction: /gratitude/edit/${entryId}
        });
    } catch (error) {
        console.error("Error fetching gratitude entry for editing:", error);
        req.flash("error", "Failed to load gratitude entry for editing.");
        res.redirect("/gratitude");
    }
});

// Update gratitude entry
router.post("/gratitude/edit/:id", isAuthenticated, upload.single('media_file'), async (req, res) => {
    try {
        const entryId = req.params.id;
        const { content, category, is_private, keep_existing_media } = req.body;

        // Validate required fields
        if (!content || !category) {
            req.flash("error", "Content and category are required.");
            return res.redirect(/gratitude/edit/${entryId});
        }

        // Get current entry state
        const currentEntry = await getGratitudeEntryById(req.session.userId, entryId);

        if (!currentEntry) {
            req.flash("error", "Gratitude entry not found.");
            return res.redirect("/gratitude");
        }

        // Convert is_private to boolean
        const isPrivate = is_private === "true" || is_private === true;

        // Determine media URL
        let mediaUrl = null;
        if (req.file) {
            // If a new file was uploaded
            mediaUrl = getFileUrl(req, req.file.filename);
        } else if (keep_existing_media === "true" && currentEntry.media_url) {
            // Keep existing media
            mediaUrl = currentEntry.media_url;
        }

        // Start a transaction to handle potential board entry changes
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Update the entry
            await client.query(
                `UPDATE gratitude.entries 
                 SET content = $1, 
                     category = $2, 
                     is_private = $3, 
                     media_url = $4
                 WHERE entry_id = $5 AND user_id = $6`,
                [content, category, isPrivate, mediaUrl, entryId, req.session.userId]
            );

            // Handle privacy changes
            if (!currentEntry.is_private && isPrivate) {
                // Changed from public to private, remove from board
                await client.query(
                    DELETE FROM gratitude.board_entries WHERE entry_id = $1,
                    [entryId]
                );
            } else if (currentEntry.is_private && !isPrivate) {
                // Changed from private to public, add to board
                await client.query(
                    `INSERT INTO gratitude.board_entries (entry_id) 
                     VALUES ($1) 
                     ON CONFLICT DO NOTHING`,
                    [entryId]
                );
            }

            await client.query('COMMIT');
            req.flash("success", "Gratitude entry updated successfully.");
            return res.redirect("/gratitude");
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error updating gratitude entry:", error);
        req.flash("error", "Failed to update gratitude entry. Please try again.");
        return res.redirect(/gratitude/edit/${req.params.id});
    }
});

// Delete gratitude entry
router.delete("/gratitude/:id", isAuthenticated, async (req, res) => {
    try {
        const entryId = req.params.id;

        // Delete entry (cascade will handle board entry deletion too)
        await pool.query(
            `DELETE FROM gratitude.entries 
             WHERE entry_id = $1 AND user_id = $2`,
            [entryId, req.session.userId]
        );

        req.flash("success", "Gratitude entry deleted successfully.");

        // For HTMX, send a redirect response
        res.json({ redirect: "/gratitude" });
    } catch (error) {
        console.error("Error deleting gratitude entry:", error);
        req.flash("error", "Failed to delete gratitude entry.");
        res.status(500).json({ error: "Failed to delete entry" });
    }
});

// Gratitude community board
router.get("/gratitude/board", async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page.toString()) : 1;
        const result = await getCommunityBoardEntries(req.session.userId, page);

        res.render("gratitude-board", {
            entries: result.entries,
            pagination: {
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                totalEntries: result.totalEntries
            }
        });
    } catch (error) {
        console.error("Error fetching gratitude board entries:", error);
        req.flash("error", "Failed to load gratitude board.");
        res.redirect("/dashboard");
    }
});

// View a public gratitude entry from the board
router.get("/gratitude/board/view/:id", isAuthenticated, async (req, res) => {
    try {
        const entryId = req.params.id;
        const entry = await getPublicGratitudeEntry(entryId);

        if (!entry) {
            req.flash("error", "Gratitude entry not found or is private.");
            return res.redirect("/gratitude/board");
        }

        // Determine if the current user is the owner of this entry
        const isOwner = entry.user_id === req.session.userId;

        res.render("gratitude-detail", {
            entry: entry,
            isPublicView: true,
            isOwner: isOwner
        });
    } catch (error) {
        console.error("Error fetching public gratitude entry:", error);
        req.flash("error", "Failed to load gratitude entry.");
        res.redirect("/gratitude/board");
    }
});

// Handle reaction to gratitude entry (like/unlike)
router.post("/gratitude/board/:boardId/react", isAuthenticated, async (req, res) => {
    try {
        const boardId = req.params.boardId;
        const userId = req.session.userId;

        // Check if user already reacted
        const checkResult = await pool.query(
            `SELECT reaction_id FROM gratitude.reactions 
             WHERE board_id = $1 AND user_id = $2`,
            [boardId, userId]
        );

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            if (checkResult.rows.length > 0) {
                // User already liked, so remove the reaction
                await client.query(
                    `DELETE FROM gratitude.reactions 
                     WHERE board_id = $1 AND user_id = $2`,
                    [boardId, userId]
                );

                // Decrement like count
                await client.query(
                    `UPDATE gratitude.board_entries
                     SET likes_count = likes_count - 1
                     WHERE board_id = $1`,
                    [boardId]
                );
            } else {
                // User hasn't liked, so add the reaction
                await client.query(
                    `INSERT INTO gratitude.reactions
                     (board_id, user_id, reaction_type)
                     VALUES ($1, $2, 'like')`,
                    [boardId, userId]
                );

                // Increment like count
                await client.query(
                    `UPDATE gratitude.board_entries
                     SET likes_count = likes_count + 1
                     WHERE board_id = $1`,
                    [boardId]
                );
            }

            await client.query('COMMIT');

            // Get updated like count for response
            const updateResult = await pool.query(
                `SELECT likes_count, 
                  EXISTS (
                    SELECT 1 FROM gratitude.reactions 
                    WHERE board_id = $1 AND user_id = $2
                  ) as user_has_liked
                 FROM gratitude.board_entries
                 WHERE board_id = $1`,
                [boardId, userId]
            );

            const likeData = updateResult.rows[0];

            // Return JSON for HTMX request
            res.json({
                likes_count: likeData.likes_count,
                user_has_liked: likeData.user_has_liked
            });
            return;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Error handling gratitude reaction:", error);
        res.status(500).json({ error: "Failed to process reaction" });
        return;
    }
});

// HTMX partial for Gratitude widget on dashboard
router.get("/partials/dashboard/gratitude-widget", isAuthenticated, async (req, res) => {
    try {
        // Get user's latest entry
        const latestEntries = await getRecentGratitudeEntries(req.session.userId);
        const latestEntry = latestEntries.length > 0 ? latestEntries[0] : null;

        // Get total count of entries
        const countResult = await pool.query(
            `SELECT COUNT(*) as total 
             FROM gratitude.entries 
             WHERE user_id = $1`,
            [req.session.userId]
        );
        const totalEntries = parseInt(countResult.rows[0].total, 10);

        // Get recent community entries
        const communityEntries = await getRecentCommunityEntries(3);

        res.render("partials/dashboard/gratitude-widget", {
            latestEntry,
            totalEntries,
            communityEntries,
            time: new Date()
        });
    } catch (error) {
        console.error("Error fetching gratitude data for dashboard widget:", error);
        res.status(500).send("<div>Failed to load gratitude widget</div>");
    }
});

// Quick entry form partial for dashboard widget
router.get("/partials/dashboard/gratitude-form", isAuthenticated, (req, res) => {
    res.render("partials/dashboard/gratitude-form", {});
});

module.exports = router;
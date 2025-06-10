const express = require("express");
const path = require("node:path");
const { Liquid } = require("liquidjs");
const helmet = require("helmet").default;
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const crypto = require("crypto");
const fs = require("fs");
const { pool } = require("./utils/db");
const { uploadDir } = require("./utils/fileUpload");

const { requestLogger } = require("./utils/requestLogger.js");
const flashMiddleware = require("./utils/flash");
const { authRoutes, isAuthenticated } = require("./routes/auth");
const bdiRoutes = require("./routes/bdi");
const moodRoutes = require("./routes/mood");
const thoughtRoutes = require("./routes/thoughts");
const gratitudeRoutes = require("./routes/gratitude");

const app = (module.exports = express());

// Health check endpoint for Docker
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

const liquidEngine = new Liquid({
    root: path.join(__dirname, "views"), // directory for templates
    extname: ".liquid",
    cache: process.env.NODE_ENV === "production" ? true : false,
    partials: path.join(__dirname, "views/partials"),
    outputEscape: "escape",
});

liquidEngine.registerTag("currentUnixEpoch", {
    parse: function (tagToken, remainTokens) {
        this.name = tagToken.args;
    },
    render: async function (scope, hash) {
        return Math.floor(Date.now() / 1000);
    },
});

app.engine("liquid", liquidEngine.express()); // register Liquid as engine
app.set("view engine", "liquid"); // file extension for views
app.set("views", path.join(__dirname, "views")); // directory for views

app.use(requestLogger); // Request logger middleware

// Add nonce generation middleware before helmet
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString("base64");
    next();
});

// Configure helmet with CSP that includes nonces
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    /**
                     * @param {import('express').Request} req
                     * @param {import('express').Response} res
                     */
                    (req, res) => 'nonce-${res.locals.nonce}',
                    "'unsafe-eval'"
                ],
                imgSrc: [
                    "'self'",
                    "data:",
                    // Allow images from our uploads folder or external CDN
                    process.env.EXTERNAL_UPLOAD_URL || "blob:"
                ],
                // For media content (videos, audio)
                mediaSrc: [
                    "'self'",
                    // Allow media from our uploads folder or external CDN
                    process.env.EXTERNAL_UPLOAD_URL || "blob:"
                ]
            },
        },
    })
);

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Configure session middleware
app.use(
    session({
        store: new pgSession({
            pool: pool, // Use existing PostgreSQL connection pool
            tableName: "session", // Table to store sessions
            createTableIfMissing: true, // Create session table if it doesn't exist
            pruneSessionInterval: 60 * 15, // Cleanup every 15 minutes
        }),
        secret: process.env.SESSION_SECRET || "default_secret", // Replace with a strong secret in production
        resave: false,
        saveUninitialized: true, // Changed to true to ensure a session ID is always created
        rolling: true, // Resets expiration countdown on every response
        cookie: {
            secure: process.env.NODE_ENV === "production" && process.env.DISABLE_SECURE_COOKIE !== "true",
            httpOnly: true,
            maxAge: process.env.SESSION_MAX_AGE
                ? parseInt(process.env.SESSION_MAX_AGE)
                : 1000 * 60 * 60 * 24 * 7, // Extended to 7 days default
            sameSite: 'lax'
        },
        name: 'cbt_workbook_session',
    })
);

// Debug middleware to log session info (remove in production)
app.use((req, res, next) => {
    console.log(`[SESSION] ID: ${req.sessionID}` | `User: ${req.session.userId || 'none'}`);
    next();
});

// Serve static files
app.use("/public", express.static(path.join(__dirname, "public")));

// attach favicon to root /favicon.ico || also available at /public/imgs/favicon.ico off course.
app.use("/favicon.ico", express.static(path.join(__dirname, "public/imgs/favicon.ico")));

// attach robotx.txt to root /robots.txt
app.use("/robots.txt", express.static(path.join(__dirname, "public/robots.txt")));

// Serve uploaded files
app.use("/uploads", express.static(uploadDir));

// Add flash message middleware after session middleware
app.use(flashMiddleware);

// Make user data available to all templates
app.use((req, res, next) => {
    res.locals.user = req.session.userId
        ? {
            id: req.session.userId,
            username: req.session.username,
            email: req.session.email,
        }
        : null;
    next();
});


// Authentication routes
app.use(authRoutes);

// BDI routes
app.use(bdiRoutes);

// Mood Tracker routes
app.use(moodRoutes);

// Thought Record routes
app.use(thoughtRoutes);

// Gratitude routes
app.use(gratitudeRoutes);

// Route handlers
app.get("/", (req, res) => {
    res.render("index", {
        title: "Welcome to the CBT Workbook App",
        isAuthenticated: !!req.session.userId,
    });
});

// About page handler
app.get("/about", (req, res) => {
    res.render("about");
});

// Session debug route (Remove in production)
app.get("/debug-session", (req, res) => {
    res.json({
        session: req.session,
        sessionID: req.sessionID,
        user: req.session.userId ? {
            id: req.session.userId,
            username: req.session.username,
        } : null,
        cookie: req.session.cookie,
        env: {
            nodeEnv: process.env.NODE_ENV,
            pgHost: process.env.PGHOST || 'Not set',
            pgDatabase: process.env.PGDATABASE || 'Not set',
            pgPort: process.env.PGPORT || 'Not set',
            sessionSecretLength: process.env.SESSION_SECRET ? process.env.SESSION_SECRET.length : 0
        }
    });
});

// isAuthenticated usage means a protected route 
app.get("/dashboard", isAuthenticated, (req, res) => {
    res.render("dashboard", {
        title: "Dashboard | CBT Workbook",
    });
});



// 404 Error handling middleware
app.use((req, res, next) => {
    res.status(404).render("404");
});

// Error handling middleware for 500 errors
app.use(
    /**
     * * @param {Error} err
     * * @param {import('express').Request} req
     * * @param {import('express').Response} res
     * * @param {Function} next
     */
    (err, req, res, next) => {
        console.error(err.stack);
        res.status(500).render("500");
    }
);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const listenAddress = process.env.LISTEN_ADDRESS || "127.0.0.1";

app.listen(port, listenAddress, () =>
    console.log(`Server running on http://${listenAddress}:${port}`)
);
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { pool } = require('../utils/db');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    req.flash('error', 'Please log in to access this page');
    res.redirect('/login');
  }
};

// Middleware to check if user is NOT logged in
const isNotAuthenticated = (req, res, next) => {
  if (req.session && req.session.userId) {
    res.redirect('/');
  } else {
    next();
  }
};

// Routes for rendering login and registration pages
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('login');
  return;
});

router.get('/register', isNotAuthenticated, (req, res) => {
  res.render('register');
});

// Handle user registration
router.post('/register', isNotAuthenticated, async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if user already exists using parameterized query
    const checkUserQuery = 'SELECT * FROM users WHERE email = $1 OR username = $2';
    const checkUserValues = [email, username];
    const existingUserResult = await pool.query(checkUserQuery, checkUserValues);

    if (existingUserResult.rows.length > 0) {
      req.flash('error', 'User already exists');
      return res.redirect('/register');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user with parameterized query
    const insertQuery = `
      INSERT INTO users(username, email, password, auth_type) 
      VALUES($1, $2, $3, $4)
      RETURNING id, username, email
    `;
    const insertValues = [username, email, hashedPassword, 'local'];
    const result = await pool.query(insertQuery, insertValues);

    if (result.rows.length > 0) {
      // Set session data
      req.session.userId = result.rows[0].id;
      req.session.username = result.rows[0].username;
      req.session.email = result.rows[0].email;

      req.flash('success', `Welcome, ${username}! Your account has been created.`);
      return res.redirect('/');

    } else {
      req.flash('error', 'Registration failed');
      return res.redirect('/register');
    }
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'Registration failed');
    return res.redirect('/register');
  }
});

// Handle user login
router.post('/login', isNotAuthenticated, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email or username with parameterized query
    const findUserQuery = 'SELECT * FROM users WHERE email = $1 OR username = $1';
    const findUserValues = [email];
    const userResult = await pool.query(findUserQuery, findUserValues);

    if (userResult.rows.length === 0) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }

    const user = userResult.rows[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      // Set session data
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.email = user.email;

      req.flash('success', `Welcome back, ${user.username}!`);
      return res.redirect('/');
    } else {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'An error occurred');
    return res.redirect('/login');
  }
});

// Handle user logout
router.get('/logout', (req, res) => {
  const username = req.session.username;
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      req.flash('error', 'Logout failed');
      return res.redirect('/');
    }
    // We can't use req.flash here since the session is destroyed
    // Instead, we're setting a special parameter that our flash middleware will catch on the next request
    res.redirect('/login?flashSuccess=You+have+been+successfully+logged+out');
  });
});

module.exports = {
  authRoutes: router,
  isAuthenticated,
  isNotAuthenticated
};
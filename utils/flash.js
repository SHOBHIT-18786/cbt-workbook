/**
 * Simple middleware for flash messages in Express (inspired by flask)
 * This provides a cleaner alternative to query parameters for passing messages between redirects
 * and ensures sessions are saved before redirects happen (also needed for non-flash related purposes).
 */

const { randomUUID } = require('crypto');

// Flash message middleware - stores messages in session and makes them available to templates
const flashMiddleware = (req, res, next) => {
  // Initialize flash object in session if it doesn't exist
  if (!req.session.flashes) {
    req.session.flashes = [];
  }

  // Store original redirect function to override it
  const originalRedirect = res.redirect;

  // Override redirect to ensure session is saved before redirecting
  res.redirect = function (url) {
    // If there's an active session with pending changes, save it first
    if (req.session && req.session.save) {
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session before redirect:', err);
        }
        // Call the original redirect after session is saved
        originalRedirect.call(this, url);
      });
    } else {
      // If no session or save method, just redirect normally
      originalRedirect.call(this, url);
    }
    // Return to make it chainable, though the redirect has been initiated
    return this;
  };

  // Method to set flash messages
  req.flash = (/** @type {string} / type, /* @type {string} */ message) => {
    if (req.session.flashes == undefined) {
      req.session.flashes = [];
    }
    req.session.flashes.push({ id: randomUUID(), message: message, type: type });
  };

  // Add flash-like query parameters into the flash bag
  const paramFlash = [];
  if (req.query.flashSuccess) paramFlash.push({ id: randomUUID(), message: req.query.flashSuccess, type: 'success' });
  if (req.query.flashError) paramFlash.push({ id: randomUUID(), message: req.query.flashError, type: 'error' });
  if (req.query.flashInfo) paramFlash.push({ id: randomUUID(), message: req.query.flashInfo, type: 'info' });
  if (req.query.flashWarning) paramFlash.push({ id: randomUUID(), message: req.query.flashWarning, type: 'warning' });

  // Expose merged flash data to templates
  res.locals.flashes = [
    ...req.session.flashes,
    ...paramFlash
  ];

  // Log flash messages for debugging
  if (res.locals.flashes.length > 0) {
    console.log('Flash messages for current request:', res.locals.flashes);
  }

  // Store the current flashes to clear after response is sent
  const currentFlashes = [...req.session.flashes];

  // Clear session flash AFTER response is sent
  res.on('finish', () => {
    if (req.session && req.session.flashes) {
      // Remove only the flashes that were available for this request
      req.session.flashes = req.session.flashes.filter(flash =>
        !currentFlashes.some(currentFlash => currentFlash.id === flash.id)
      );

      // Save the session after clearing
      if (req.session.save) {
        req.session.save(err => {
          if (err) {
            console.error('Error saving session after clearing flashes:', err);
          }
        });
      }
    }
  });

  next();
};

module.exports = flashMiddleware;
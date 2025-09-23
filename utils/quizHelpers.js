/**
 * BDI Quiz Utilities for CBT Workbook Application
 * Provides helper functions for working with the Beck Depression Inventory (BDI) quiz
 */

const { bdiQuizData } = require('./appData');

/**
 * Load BDI questions
 * @returns {{ questions: Array<Object>, interpretations: Array<{ label: string, range: [number, number] }> }} The BDI quiz data object
 */
function loadBDIQuestions() {
  return bdiQuizData;
}

/**
 * Calculate BDI score from array of answers
 * @param {number[]} answers - Array of answer values (0-3) for each question
 * @returns {{ score: number, interpretation: string }} Score and interpretation
 */
function calculateBDIScore(answers) {
  // Validate answers
  if (!Array.isArray(answers) || answers.length !== 21) {
    throw new Error('Invalid answers array for BDI score calculation');
  }

  // Calculate total score
  const totalScore = answers.reduce((sum, value) => sum + value, 0);

  // Get interpretation
  const interpretation = bdiQuizData.interpretations.find(
    /** @param {{ range: [number, number], label: string }} interp */
    interp => totalScore >= interp.range[0] && totalScore <= interp.range[1]
  );

  return {
    score: totalScore,
    interpretation: interpretation ? interpretation.label : 'Score out of range'
  };
}

/**
 * Save a user's BDI quiz results to the database
 * @param {import('pg').Pool} pool - PostgreSQL connection pool
 * @param {number} userId - User ID
 * @param {string} sessionId - Quiz session UUID
 * @param {number[]} selectedOptions - Array of numeric values (0-3) selected for each question
 * @returns {Promise<{score: number, interpretation: string}>}
 */
async function saveBDIResults(pool, userId, sessionId, selectedOptions) {
  if (typeof pool.connect !== 'function') {
    throw new Error('Invalid pool object: missing connect method');
  }

  try {
    // Insert the BDI response using the new structure
    const result = await pool.query(
      `INSERT INTO quiz.bdi_responses (user_id, selected_options, session_id) 
       VALUES ($1, $2, $3)
       RETURNING response_id, total_score, interpretation`,
      [userId, selectedOptions, sessionId]
    );

    const { total_score, interpretation } = result.rows[0];

    return {
      score: total_score,
      interpretation
    };
  } catch (error) {
    console.error('Error saving BDI results:', error);
    throw error;
  }
}

module.exports = {
  loadBDIQuestions,
  calculateBDIScore,
  saveBDIResults
};
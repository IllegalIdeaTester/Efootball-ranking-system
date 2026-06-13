/**
 * Authoritative Elo calculations for eFootball 26 Rankings on the Node server.
 * Implements the FIFA Men's Coca-Cola World Rankings (Elo-based SUM system).
 */

/**
 * Calculates the expected result (We) of a match for Team A against Team B.
 * 
 * Formula: We = 1 / (10^(-dr / 600) + 1)
 * Where dr is the rating difference: ratingA - ratingB.
 * 
 * @param {number} ratingA - Rating points of Team A
 * @param {number} ratingB - Rating points of Team B
 * @returns {number} Expected result for Team A (between 0 and 1)
 */
export function calculateWe(ratingA, ratingB) {
  const dr = ratingA - ratingB;
  return 1 / (Math.pow(10, -dr / 600) + 1);
}

/**
 * Calculates the points exchange for a match between Player A and Player B.
 * 
 * Formula: P = P_before + I * (W - We)
 * 
 * Knockout protection: If isKnockout is true, any negative points change is capped at 0.
 * 
 * @param {number} ratingA - Rating points of Player A before the match
 * @param {number} ratingB - Rating points of Player B before the match
 * @param {number} scoreA - Score of Player A
 * @param {number} scoreB - Score of Player B
 * @param {number} importance - Match importance coefficient (I)
 * @param {boolean} isKnockout - Whether it is a knockout match (no point loss)
 * @param {boolean} isPSO - Whether the match was decided by Penalty Shootout
 * @param {string} psoWinner - The winner of the penalty shootout ('A' or 'B'), only used if isPSO is true
 * @returns {object} Object containing points changes and expected results
 */
export function calculatePointsExchange(ratingA, ratingB, scoreA, scoreB, importance, isKnockout = false, isPSO = false, psoWinner = null) {
  // Determine W (actual outcome)
  let wA = 0;
  let wB = 0;

  if (isPSO) {
    if (psoWinner === 'A') {
      wA = 0.75;
      wB = 0.50;
    } else if (psoWinner === 'B') {
      wA = 0.50;
      wB = 0.75;
    } else {
      wA = 0.50;
      wB = 0.50;
    }
  } else {
    if (scoreA > scoreB) {
      wA = 1.0;
      wB = 0.0;
    } else if (scoreA < scoreB) {
      wA = 0.0;
      wB = 1.0;
    } else {
      wA = 0.50;
      wB = 0.50;
    }
  }

  // Calculate expected results
  const weA = calculateWe(ratingA, ratingB);
  const weB = 1 - weA;

  // Calculate rating changes
  let deltaA = importance * (wA - weA);
  let deltaB = importance * (wB - weB);

  // Apply knockout stage protection: no points deduction (negative changes set to 0)
  if (isKnockout) {
    if (deltaA < 0) deltaA = 0;
    if (deltaB < 0) deltaB = 0;
  }

  // Round changes to 2 decimal places to match FIFA style
  return {
    deltaA: Math.round(deltaA * 100) / 100,
    deltaB: Math.round(deltaB * 100) / 100,
    weA: Math.round(weA * 1000) / 1000,
    weB: Math.round(weB * 1000) / 1000,
    wA,
    wB
  };
}

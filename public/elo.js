/**
 * Client-side Elo calculations for eFootball 26 Rankings.
 * Implements the FIFA Men's Coca-Cola World Rankings (Elo-based SUM system) locally for UI predictors.
 */

function calculateWe(ratingA, ratingB) {
  const dr = ratingA - ratingB;
  return 1 / (Math.pow(10, -dr / 600) + 1);
}

function calculatePointsExchange(ratingA, ratingB, scoreA, scoreB, importance, isKnockout = false, isPSO = false, psoWinner = null) {
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

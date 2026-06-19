const K = 32;

function expected(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function calculate(winnerElo, loserElo) {
  const ew = expected(winnerElo, loserElo);
  const el = expected(loserElo, winnerElo);

  return {
    winner: Math.round(winnerElo + K * (1 - ew)),
    loser: Math.round(loserElo + K * (0 - el))
  };
}

module.exports = { calculate };

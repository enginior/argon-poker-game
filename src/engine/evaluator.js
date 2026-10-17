import { RANK_NAMES, RANK_LONG_NAMES } from './card.js';

export const HAND_TIERS = {
  HIGH_CARD: 0,
  ONE_PAIR: 1,
  TWO_PAIR: 2,
  THREE_OF_A_KIND: 3,
  STRAIGHT: 4,
  FLUSH: 5,
  FULL_HOUSE: 6,
  FOUR_OF_A_KIND: 7,
  STRAIGHT_FLUSH: 8,
  ROYAL_FLUSH: 9
};

export const HAND_TIER_NAMES = {
  [HAND_TIERS.HIGH_CARD]: 'High Card',
  [HAND_TIERS.ONE_PAIR]: 'One Pair',
  [HAND_TIERS.TWO_PAIR]: 'Two Pair',
  [HAND_TIERS.THREE_OF_A_KIND]: 'Three of a Kind',
  [HAND_TIERS.STRAIGHT]: 'Straight',
  [HAND_TIERS.FLUSH]: 'Flush',
  [HAND_TIERS.FULL_HOUSE]: 'Full House',
  [HAND_TIERS.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HAND_TIERS.STRAIGHT_FLUSH]: 'Straight Flush',
  [HAND_TIERS.ROYAL_FLUSH]: 'Royal Flush'
};

/**
 * Generate all 5-card combinations from n cards (n >= 5)
 */
function getCombinations(cards, k = 5) {
  const result = [];
  function backtrack(start, combo) {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < cards.length; i++) {
      combo.push(cards[i]);
      backtrack(i + 1, combo);
      combo.pop();
    }
  }
  backtrack(0, []);
  return result;
}

/**
 * Evaluates exactly 5 cards.
 * Returns an evaluation object: { tier, values: number[], name, bestFive }
 */
function evaluateFiveCards(cards) {
  // Sort descending by rank
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);

  // Group by rank
  const rankCounts = {};
  for (const c of sorted) {
    rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
  }

  // Group by suit
  const suitCounts = {};
  for (const c of sorted) {
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  }

  const isFlush = Object.values(suitCounts).some(count => count === 5);

  // Check straight
  // Extract unique ranks sorted descending
  const uniqueRanks = [...new Set(sorted.map(c => c.rank))];
  let isStraight = false;
  let straightHigh = 0;

  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    } else if (
      uniqueRanks[0] === 14 &&
      uniqueRanks[1] === 5 &&
      uniqueRanks[2] === 4 &&
      uniqueRanks[3] === 3 &&
      uniqueRanks[4] === 2
    ) {
      // Ace-low wheel (A, 2, 3, 4, 5)
      isStraight = true;
      straightHigh = 5;
    }
  }

  // Count frequencies sorted by count desc, then rank desc
  // Array of { rank: number, count: number }
  const countsArr = Object.entries(rankCounts)
    .map(([r, count]) => ({ rank: Number(r), count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.rank - a.rank;
    });

  // Check Royal Flush & Straight Flush
  if (isFlush && isStraight) {
    if (straightHigh === 14) {
      return {
        tier: HAND_TIERS.ROYAL_FLUSH,
        values: [HAND_TIERS.ROYAL_FLUSH],
        name: 'Royal Flush',
        bestFive: sorted
      };
    }
    return {
      tier: HAND_TIERS.STRAIGHT_FLUSH,
      values: [HAND_TIERS.STRAIGHT_FLUSH, straightHigh],
      name: `Straight Flush (${RANK_LONG_NAMES[straightHigh]} High)`,
      bestFive: sorted
    };
  }

  // Four of a kind
  if (countsArr[0].count === 4) {
    const quadRank = countsArr[0].rank;
    const kicker = countsArr[1].rank;
    return {
      tier: HAND_TIERS.FOUR_OF_A_KIND,
      values: [HAND_TIERS.FOUR_OF_A_KIND, quadRank, kicker],
      name: `Four of a Kind (${RANK_LONG_NAMES[quadRank]}s)`,
      bestFive: sorted
    };
  }

  // Full house
  if (countsArr[0].count === 3 && countsArr[1].count === 2) {
    const tripRank = countsArr[0].rank;
    const pairRank = countsArr[1].rank;
    return {
      tier: HAND_TIERS.FULL_HOUSE,
      values: [HAND_TIERS.FULL_HOUSE, tripRank, pairRank],
      name: `Full House (${RANK_LONG_NAMES[tripRank]}s full of ${RANK_LONG_NAMES[pairRank]}s)`,
      bestFive: sorted
    };
  }

  // Flush
  if (isFlush) {
    return {
      tier: HAND_TIERS.FLUSH,
      values: [HAND_TIERS.FLUSH, ...sorted.map(c => c.rank)],
      name: `Flush (${RANK_LONG_NAMES[sorted[0].rank]} High)`,
      bestFive: sorted
    };
  }

  // Straight
  if (isStraight) {
    return {
      tier: HAND_TIERS.STRAIGHT,
      values: [HAND_TIERS.STRAIGHT, straightHigh],
      name: `Straight (${RANK_LONG_NAMES[straightHigh]} High)`,
      bestFive: sorted
    };
  }

  // Three of a kind
  if (countsArr[0].count === 3) {
    const tripRank = countsArr[0].rank;
    const kickers = countsArr.slice(1).map(c => c.rank);
    return {
      tier: HAND_TIERS.THREE_OF_A_KIND,
      values: [HAND_TIERS.THREE_OF_A_KIND, tripRank, ...kickers],
      name: `Three of a Kind (${RANK_LONG_NAMES[tripRank]}s)`,
      bestFive: sorted
    };
  }

  // Two pair
  if (countsArr[0].count === 2 && countsArr[1].count === 2) {
    const highPair = Math.max(countsArr[0].rank, countsArr[1].rank);
    const lowPair = Math.min(countsArr[0].rank, countsArr[1].rank);
    const kicker = countsArr[2].rank;
    return {
      tier: HAND_TIERS.TWO_PAIR,
      values: [HAND_TIERS.TWO_PAIR, highPair, lowPair, kicker],
      name: `Two Pair (${RANK_LONG_NAMES[highPair]}s and ${RANK_LONG_NAMES[lowPair]}s)`,
      bestFive: sorted
    };
  }

  // One pair
  if (countsArr[0].count === 2) {
    const pairRank = countsArr[0].rank;
    const kickers = countsArr.slice(1).map(c => c.rank);
    return {
      tier: HAND_TIERS.ONE_PAIR,
      values: [HAND_TIERS.ONE_PAIR, pairRank, ...kickers],
      name: `Pair of ${RANK_LONG_NAMES[pairRank]}s`,
      bestFive: sorted
    };
  }

  // High card
  return {
    tier: HAND_TIERS.HIGH_CARD,
    values: [HAND_TIERS.HIGH_CARD, ...sorted.map(c => c.rank)],
    name: `High Card (${RANK_LONG_NAMES[sorted[0].rank]})`,
    bestFive: sorted
  };
}

/**
 * Compare two evaluation objects.
 * Returns > 0 if A wins, < 0 if B wins, 0 if tie.
 */
export function compareEvaluations(evalA, evalB) {
  const len = Math.max(evalA.values.length, evalB.values.length);
  for (let i = 0; i < len; i++) {
    const valA = evalA.values[i] || 0;
    const valB = evalB.values[i] || 0;
    if (valA !== valB) {
      return valA - valB;
    }
  }
  return 0;
}

/**
 * Evaluates best 5-card hand from a pool of 5 to 7 cards.
 */
export function evaluateHand(cards) {
  if (cards.length < 5) {
    // If only hole cards (2 cards) or flop not completed, provide interim description
    if (cards.length === 2) {
      if (cards[0].rank === cards[1].rank) {
        return {
          tier: HAND_TIERS.ONE_PAIR,
          values: [HAND_TIERS.ONE_PAIR, cards[0].rank, cards[1].rank],
          name: `Pocket ${RANK_LONG_NAMES[cards[0].rank]}s`,
          bestFive: cards
        };
      }
      const high = Math.max(cards[0].rank, cards[1].rank);
      const low = Math.min(cards[0].rank, cards[1].rank);
      const suited = cards[0].suit === cards[1].suit ? 'Suited' : 'Offsuit';
      return {
        tier: HAND_TIERS.HIGH_CARD,
        values: [HAND_TIERS.HIGH_CARD, high, low],
        name: `${RANK_NAMES[high]}-${RANK_NAMES[low]} ${suited}`,
        bestFive: cards
      };
    }
    const high = cards.length > 0 ? Math.max(...cards.map(c => c.rank)) : 0;
    return {
      tier: HAND_TIERS.HIGH_CARD,
      values: [HAND_TIERS.HIGH_CARD, high],
      name: 'Analyzing...',
      bestFive: cards
    };
  }

  const combinations = getCombinations(cards, 5);
  let best = null;

  for (const combo of combinations) {
    const current = evaluateFiveCards(combo);
    if (!best || compareEvaluations(current, best) > 0) {
      best = current;
    }
  }

  return best;
}

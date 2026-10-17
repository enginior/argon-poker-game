import { evaluateHand, HAND_TIERS } from './evaluator.js';

export const AI_PERSONALITIES = {
  VIKTOR: {
    id: 'viktor',
    name: 'Viktor',
    title: 'The Shark',
    avatar: '🦈',
    description: 'Aggressive player who applies constant pressure and bluffs.',
    aggression: 0.85,
    tightness: 0.35,
    bluffFrequency: 0.28
  },
  SARAH: {
    id: 'sarah',
    name: 'Sarah',
    title: 'The Rock',
    avatar: '💎',
    description: 'Tight-conservative player who only bets on top tier hands.',
    aggression: 0.40,
    tightness: 0.75,
    bluffFrequency: 0.05
  },
  LEO: {
    id: 'leo',
    name: 'Leo',
    title: 'The Maverick',
    avatar: '🦁',
    description: 'Balanced player who calculates pot odds and takes calculated risks.',
    aggression: 0.60,
    tightness: 0.50,
    bluffFrequency: 0.15
  }
};

/**
 * Score pre-flop hole cards (Chen Formula simplified)
 */
function ratePreflopCards(card1, card2) {
  let score = 0;
  const highRank = Math.max(card1.rank, card2.rank);
  const lowRank = Math.min(card1.rank, card2.rank);
  const isPair = card1.rank === card2.rank;
  const isSuited = card1.suit === card2.suit;

  if (isPair) {
    score = Math.max(5, highRank * 1.5);
    if (highRank >= 10) score += 6; // Pocket 10s, JJ, QQ, KK, AA
  } else {
    // Base score on high card
    if (highRank === 14) score += 10;
    else if (highRank === 13) score += 8;
    else if (highRank === 12) score += 7;
    else if (highRank === 11) score += 6;
    else score += highRank / 2;

    // Suited bonus
    if (isSuited) score += 2;

    // Connectedness
    const gap = highRank - lowRank - 1;
    if (gap === 0) score += 1;
    else if (gap === 1) score -= 1;
    else if (gap >= 3) score -= 3;
  }

  return score;
}

/**
 * AI Decision Maker
 */
export function getAIDecision(player, gameState) {
  const personality = AI_PERSONALITIES[player.personalityKey] || AI_PERSONALITIES.LEO;
  const { currentBet, minRaise, pot, communityCards, bigBlind } = gameState;

  const toCall = currentBet - player.currentBet;
  const canCheck = toCall === 0;
  const playerChips = player.chips;
  const totalPot = pot;
  const potOdds = toCall > 0 ? toCall / (totalPot + toCall) : 0;

  // 1. Pre-flop logic
  if (communityCards.length === 0) {
    const preflopScore = ratePreflopCards(player.holeCards[0], player.holeCards[1]);
    const threshold = 14 * personality.tightness;
    const isWorthy = preflopScore >= threshold;

    // If check is free
    if (canCheck) {
      if (preflopScore > 13 && Math.random() < personality.aggression) {
        // Raise
        const raiseSize = Math.min(playerChips, Math.max(minRaise, bigBlind * 3));
        return { action: 'raise', amount: raiseSize, reason: 'Strong preflop holding' };
      }
      return { action: 'check', amount: 0, reason: 'Free check' };
    }

    // Facing a bet preflop
    if (isWorthy || (toCall <= bigBlind && preflopScore > 6)) {
      if (preflopScore >= 16 && Math.random() < personality.aggression) {
        // 3-bet / raise
        const raiseSize = Math.min(playerChips, currentBet + Math.max(minRaise, currentBet));
        if (raiseSize > currentBet) {
          return { action: 'raise', amount: raiseSize, reason: 'Premium pocket cards' };
        }
      }
      if (toCall >= playerChips) {
        return { action: 'allin', amount: playerChips, reason: 'Pot committed' };
      }
      return { action: 'call', amount: toCall, reason: 'Call preflop bet' };
    }

    // Bluff raise opportunity for aggressive players
    if (Math.random() < personality.bluffFrequency && toCall <= bigBlind * 2) {
      const raiseSize = Math.min(playerChips, currentBet + minRaise);
      if (raiseSize > currentBet) {
        return { action: 'raise', amount: raiseSize, reason: 'Preflop positional steal' };
      }
    }

    return { action: 'fold', amount: 0, reason: 'Weak starting hand' };
  }

  // 2. Post-flop (Flop, Turn, River) logic
  const allCards = [...player.holeCards, ...communityCards];
  const handEval = evaluateHand(allCards);
  const tier = handEval.tier;

  // Chance of bluffing
  const isBluffing = Math.random() < personality.bluffFrequency;

  // Monster hand: Full House, Quads, Straight Flush, Royal Flush
  if (tier >= HAND_TIERS.FULL_HOUSE) {
    if (Math.random() < 0.8) {
      const betSize = Math.min(playerChips, Math.max(minRaise, currentBet + Math.floor(totalPot * 0.75)));
      if (betSize > currentBet) {
        return { action: 'raise', amount: betSize, reason: 'Monster hand value bet' };
      }
    }
    if (canCheck) return { action: 'check', amount: 0, reason: 'Slow playing monster' };
    return { action: 'call', amount: Math.min(toCall, playerChips), reason: 'Call with monster' };
  }

  // Strong hand: Three of a Kind, Straight, Flush
  if (tier >= HAND_TIERS.THREE_OF_A_KIND) {
    if (toCall <= 0) {
      if (Math.random() < personality.aggression) {
        const betSize = Math.min(playerChips, Math.max(minRaise, Math.floor(totalPot * 0.6)));
        return { action: 'raise', amount: betSize, reason: 'Strong made hand bet' };
      }
      return { action: 'check', amount: 0, reason: 'Check with made hand' };
    }

    // Facing a bet
    if (Math.random() < personality.aggression * 0.6 && toCall < playerChips * 0.5) {
      const raiseSize = Math.min(playerChips, currentBet + Math.max(minRaise, Math.floor(totalPot * 0.5)));
      if (raiseSize > currentBet) {
        return { action: 'raise', amount: raiseSize, reason: 'Raise for value' };
      }
    }
    return { action: 'call', amount: Math.min(toCall, playerChips), reason: 'Solid made hand' };
  }

  // Medium hand: Two Pair or Top Pair
  if (tier >= HAND_TIERS.TWO_PAIR || (tier === HAND_TIERS.ONE_PAIR && handEval.values[1] >= 10)) {
    if (canCheck) {
      if (Math.random() < personality.aggression * 0.5) {
        const betSize = Math.min(playerChips, Math.max(minRaise, Math.floor(totalPot * 0.4)));
        return { action: 'raise', amount: betSize, reason: 'Protection bet' };
      }
      return { action: 'check', amount: 0, reason: 'Pot control check' };
    }

    if (potOdds < 0.4 || toCall <= bigBlind * 3) {
      return { action: 'call', amount: Math.min(toCall, playerChips), reason: 'Call with pair' };
    }
    return { action: 'fold', amount: 0, reason: 'Bet too heavy for medium pair' };
  }

  // Weak hand: Low pair or High Card
  if (canCheck) {
    if (isBluffing && Math.random() < personality.aggression) {
      const betSize = Math.min(playerChips, Math.max(minRaise, Math.floor(totalPot * 0.5)));
      return { action: 'raise', amount: betSize, reason: 'Bluff stab at pot' };
    }
    return { action: 'check', amount: 0, reason: 'Free check with weak hand' };
  }

  // Cheap call / small pot odds
  if (toCall <= bigBlind && potOdds < 0.2) {
    return { action: 'call', amount: toCall, reason: 'Small price to see card' };
  }

  if (isBluffing && Math.random() < 0.3 && toCall < playerChips * 0.3) {
    const raiseSize = Math.min(playerChips, currentBet + minRaise * 2);
    if (raiseSize > currentBet) {
      return { action: 'raise', amount: raiseSize, reason: 'Aggressive bluff raise' };
    }
  }

  return { action: 'fold', amount: 0, reason: 'Fold weak hand' };
}

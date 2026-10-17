/**
 * Pot Manager - Handles Main Pot, Side Pots, and Uncalled Bet Returns
 */

export class PotManager {
  constructor() {
    this.reset();
  }

  reset() {
    // Current round bets by player: Map<playerId, number>
    this.roundBets = new Map();
    // Cumulative contributions over entire hand by player: Map<playerId, number>
    this.totalContributions = new Map();
    // Accumulated pots from completed rounds: number
    this.settledPot = 0;
  }

  /**
   * Record a player's bet in the current street
   */
  addBet(playerId, amount) {
    const curRound = this.roundBets.get(playerId) || 0;
    this.roundBets.set(playerId, curRound + amount);

    const curTotal = this.totalContributions.get(playerId) || 0;
    this.totalContributions.set(playerId, curTotal + amount);
  }

  /**
   * Settle round bets into accumulated pot at street end
   */
  endBettingRound() {
    let roundTotal = 0;
    for (const bet of this.roundBets.values()) {
      roundTotal += bet;
    }
    this.settledPot += roundTotal;
    this.roundBets.clear();
  }

  /**
   * Total chips currently on table (settled + active round bets)
   */
  getTotalPot() {
    let active = 0;
    for (const bet of this.roundBets.values()) {
      active += bet;
    }
    return this.settledPot + active;
  }

  /**
   * Calculate pots (main pot + side pots) for showdown.
   * players: array of Player objects ({ id, folded, isAllIn, ... })
   * returns: Array of { amount: number, eligiblePlayerIds: string[] }
   */
  calculatePots(players) {
    // Create working map of contributions
    const contribs = new Map(this.totalContributions);
    const pots = [];

    // Filter players who contributed > 0
    while (true) {
      // Find all players with remaining positive contribution
      const positivePlayers = [];
      for (const p of players) {
        const c = contribs.get(p.id) || 0;
        if (c > 0) {
          positivePlayers.push({ player: p, amount: c });
        }
      }

      if (positivePlayers.length === 0) break;

      // Check if only 1 player has positive contribution left (uncalled bet refund)
      if (positivePlayers.length === 1) {
        const single = positivePlayers[0];
        // Refund uncalled amount
        single.player.chips += single.amount;
        contribs.set(single.player.id, 0);
        break;
      }

      // Find lowest contribution among positive players
      // Prioritize all-in players to cap side pots
      let minAmount = Infinity;
      for (const item of positivePlayers) {
        if (item.player.isAllIn && item.amount < minAmount) {
          minAmount = item.amount;
        }
      }

      // If no all-in player is among them, take the lowest of all remaining
      if (minAmount === Infinity) {
        for (const item of positivePlayers) {
          if (item.amount < minAmount) {
            minAmount = item.amount;
          }
        }
      }

      // Build a pot chunk of minAmount from everyone who has >= minAmount
      let potChunk = 0;
      const eligible = [];

      for (const item of positivePlayers) {
        const take = Math.min(item.amount, minAmount);
        potChunk += take;
        contribs.set(item.player.id, item.amount - take);

        // Eligible if they didn't fold
        if (!item.player.folded) {
          eligible.push(item.player.id);
        }
      }

      if (potChunk > 0) {
        // Fallback: if all contributors to this chunk folded, any remaining non-folded player is eligible
        const finalEligible = eligible.length > 0 
          ? eligible 
          : players.filter(p => !p.folded).map(p => p.id);

        if (finalEligible.length > 0) {
          pots.push({
            amount: potChunk,
            eligiblePlayerIds: finalEligible
          });
        }
      }
    }

    return pots;
  }
}

import { Deck } from './deck.js';
import { PotManager } from './pot.js';
import { evaluateHand, compareEvaluations } from './evaluator.js';
import { getAIDecision, AI_PERSONALITIES } from './ai.js';

export const GAME_STAGES = {
  IDLE: 'IDLE',
  PREFLOP: 'PREFLOP',
  FLOP: 'FLOP',
  TURN: 'TURN',
  RIVER: 'RIVER',
  SHOWDOWN: 'SHOWDOWN',
  HAND_OVER: 'HAND_OVER'
};

export class PokerGame {
  constructor(options = {}) {
    this.smallBlind = options.smallBlind || 10;
    this.bigBlind = options.bigBlind || 20;
    this.initialChips = options.initialChips || 1000;

    this.players = [
      {
        id: 'player-0',
        name: 'You',
        isHuman: true,
        chips: this.initialChips,
        holeCards: [],
        currentBet: 0,
        folded: false,
        isAllIn: false,
        seat: 0,
        avatar: '🤠'
      },
      {
        id: 'player-1',
        name: AI_PERSONALITIES.VIKTOR.name,
        title: AI_PERSONALITIES.VIKTOR.title,
        personalityKey: 'VIKTOR',
        isHuman: false,
        chips: this.initialChips,
        holeCards: [],
        currentBet: 0,
        folded: false,
        isAllIn: false,
        seat: 1,
        avatar: AI_PERSONALITIES.VIKTOR.avatar
      },
      {
        id: 'player-2',
        name: AI_PERSONALITIES.SARAH.name,
        title: AI_PERSONALITIES.SARAH.title,
        personalityKey: 'SARAH',
        isHuman: false,
        chips: this.initialChips,
        holeCards: [],
        currentBet: 0,
        folded: false,
        isAllIn: false,
        seat: 2,
        avatar: AI_PERSONALITIES.SARAH.avatar
      },
      {
        id: 'player-3',
        name: AI_PERSONALITIES.LEO.name,
        title: AI_PERSONALITIES.LEO.title,
        personalityKey: 'LEO',
        isHuman: false,
        chips: this.initialChips,
        holeCards: [],
        currentBet: 0,
        folded: false,
        isAllIn: false,
        seat: 3,
        avatar: AI_PERSONALITIES.LEO.avatar
      }
    ];

    this.dealerIndex = 0;
    this.stage = GAME_STAGES.IDLE;
    this.deck = new Deck();
    this.communityCards = [];
    this.potManager = new PotManager();
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.activePlayerIndex = -1;
    this.actionCompletedSeats = new Set();
    this.eventListeners = {};
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    if (this.eventListeners[event]) {
      for (const cb of this.eventListeners[event]) {
        cb(data);
      }
    }
  }

  get activeInHandPlayers() {
    return this.players.filter(p => !p.folded && p.chips + p.currentBet > 0);
  }

  get nonFoldedPlayers() {
    return this.players.filter(p => !p.folded);
  }

  getNextActiveSeat(fromSeat) {
    for (let i = 1; i <= this.players.length; i++) {
      const idx = (fromSeat + i) % this.players.length;
      const p = this.players[idx];
      if (!p.folded && !p.isAllIn && p.chips > 0) {
        return idx;
      }
    }
    return -1;
  }

  /**
   * Reset busted players to starting bankroll if needed
   */
  rebuyBustedPlayers() {
    for (const p of this.players) {
      if (p.chips <= 0) {
        p.chips = this.initialChips;
        this.emit('log', { message: `${p.name} rebought for $${this.initialChips}`, type: 'system' });
      }
    }
  }

  /**
   * Start a new Texas Hold'em hand
   */
  startNewHand() {
    this.clearPendingTimer();
    this.rebuyBustedPlayers();

    // Rotate dealer button
    this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
    this.stage = GAME_STAGES.PREFLOP;
    this.deck.reset();
    this.deck.shuffle();
    this.communityCards = [];
    this.potManager.reset();
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.actionCompletedSeats.clear();

    // Reset player states
    for (const p of this.players) {
      p.holeCards = [];
      p.currentBet = 0;
      p.folded = false;
      p.isAllIn = false;
    }

    this.emit('handStart', {
      dealerIndex: this.dealerIndex,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind
    });

    // Post Blinds
    const sbIndex = (this.dealerIndex + 1) % this.players.length;
    const bbIndex = (this.dealerIndex + 2) % this.players.length;

    this.postBlind(this.players[sbIndex], this.smallBlind, 'Small Blind');
    this.postBlind(this.players[bbIndex], this.bigBlind, 'Big Blind');
    this.currentBet = this.bigBlind;

    // Deal 2 hole cards to each player clockwise starting from SB
    let dealOrder = 0;
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < this.players.length; i++) {
        const seat = (this.dealerIndex + 1 + i) % this.players.length;
        const player = this.players[seat];
        const card = this.deck.draw();
        player.holeCards.push(card);
        this.emit('cardDealt', {
          player,
          card,
          cardIndex: round,
          dealOrder: dealOrder++,
          isHuman: player.isHuman
        });
      }
    }

    // First to act pre-flop is Under the Gun (UTG = BB + 1)
    const utgIndex = (this.dealerIndex + 3) % this.players.length;
    this.activePlayerIndex = utgIndex;

    this.emit('log', { message: `New hand started. Dealer is ${this.players[this.dealerIndex].name}.`, type: 'info' });
    this.pendingTimer = setTimeout(() => {
      this.promptCurrentPlayer();
    }, 680);
  }

  postBlind(player, amount, blindName) {
    const actualAmount = Math.min(player.chips, amount);
    player.chips -= actualAmount;
    player.currentBet = actualAmount;
    if (player.chips === 0) player.isAllIn = true;

    this.potManager.addBet(player.id, actualAmount);
    this.emit('blindPosted', {
      player,
      amount: actualAmount,
      blindName,
      pot: this.potManager.getTotalPot()
    });
    this.emit('log', { message: `${player.name} posts ${blindName} $${actualAmount}`, type: 'action' });
  }

  clearPendingTimer() {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }

  promptCurrentPlayer() {
    this.clearPendingTimer();

    // If only one player remains (everyone else folded)
    if (this.nonFoldedPlayers.length === 1) {
      this.handleEarlyWin();
      return;
    }

    // If active player index is -1 or round is done
    if (this.isBettingRoundComplete()) {
      this.advanceStreet();
      return;
    }

    if (this.activePlayerIndex === -1 || !this.players[this.activePlayerIndex]) {
      if (this.stage === GAME_STAGES.RIVER) {
        this.handleShowdown();
      } else {
        this.advanceStreet();
      }
      return;
    }

    const player = this.players[this.activePlayerIndex];
    if (player.folded || player.isAllIn || player.chips <= 0) {
      this.moveToNextPlayer();
      return;
    }

    const toCall = Math.max(0, this.currentBet - player.currentBet);
    const canCheck = toCall === 0;
    const minRaiseVal = Math.min(player.chips, Math.max(this.minRaise, this.currentBet * 2));

    this.emit('turnStarted', {
      player,
      toCall,
      canCheck,
      minRaise: minRaiseVal,
      maxRaise: player.chips,
      currentPot: this.potManager.getTotalPot()
    });

    if (player.isHuman) {
      // Waiting for user action
    } else {
      // AI Turn
      this.emit('aiThinking', { player });
      const delay = Math.floor(Math.random() * 500) + 650;
      this.pendingTimer = setTimeout(() => {
        if (this.stage === GAME_STAGES.IDLE || this.stage === GAME_STAGES.HAND_OVER) return;
        const decision = getAIDecision(player, {
          currentBet: this.currentBet,
          minRaise: this.minRaise,
          pot: this.potManager.getTotalPot(),
          communityCards: this.communityCards,
          bigBlind: this.bigBlind
        });
        this.executePlayerAction(player, decision.action, decision.amount, decision.reason);
      }, delay);
    }
  }

  executePlayerAction(player, action, amount = 0, reason = '') {
    if (player.seat !== this.activePlayerIndex) return false;
    this.clearPendingTimer();

    const toCall = Math.max(0, this.currentBet - player.currentBet);

    switch (action) {
      case 'fold': {
        player.folded = true;
        this.emit('playerAction', { player, action: 'fold', amount: 0 });
        this.emit('log', { message: `${player.name} folds`, type: 'action' });
        break;
      }
      case 'check': {
        this.actionCompletedSeats.add(player.seat);
        this.emit('playerAction', { player, action: 'check', amount: 0 });
        this.emit('log', { message: `${player.name} checks`, type: 'action' });
        break;
      }
      case 'call': {
        const callAmount = Math.min(player.chips, toCall);
        player.chips -= callAmount;
        player.currentBet += callAmount;
        if (player.chips === 0) player.isAllIn = true;

        this.potManager.addBet(player.id, callAmount);
        this.actionCompletedSeats.add(player.seat);
        this.emit('playerAction', { player, action: 'call', amount: callAmount });
        this.emit('log', { message: `${player.name} calls $${callAmount}`, type: 'action' });
        break;
      }
      case 'raise': {
        // Total new bet amount
        const totalTarget = Math.min(player.chips + player.currentBet, amount);
        const addAmount = Math.max(0, totalTarget - player.currentBet);
        const raiseIncrement = totalTarget - this.currentBet;

        player.chips -= addAmount;
        player.currentBet = totalTarget;
        if (player.chips === 0) player.isAllIn = true;

        this.potManager.addBet(player.id, addAmount);
        this.currentBet = totalTarget;
        this.minRaise = Math.max(this.bigBlind, Math.max(this.minRaise, raiseIncrement));

        // Reset action completions because bet was raised
        this.actionCompletedSeats.clear();
        this.actionCompletedSeats.add(player.seat);

        this.emit('playerAction', { player, action: 'raise', amount: totalTarget });
        this.emit('log', { message: `${player.name} raises to $${totalTarget}`, type: 'action' });
        break;
      }
      case 'allin': {
        const allInAmount = player.chips;
        const newTotalBet = player.currentBet + allInAmount;
        player.chips = 0;
        player.isAllIn = true;

        this.potManager.addBet(player.id, allInAmount);
        if (newTotalBet > this.currentBet) {
          const raiseIncrement = newTotalBet - this.currentBet;
          this.currentBet = newTotalBet;
          this.minRaise = Math.max(this.bigBlind, Math.max(this.minRaise, raiseIncrement));
          this.actionCompletedSeats.clear();
        }
        player.currentBet = newTotalBet;
        this.actionCompletedSeats.add(player.seat);

        this.emit('playerAction', { player, action: 'allin', amount: allInAmount });
        this.emit('log', { message: `${player.name} goes ALL IN for $${allInAmount}!`, type: 'action' });
        break;
      }
      default: {
        return false;
      }
    }

    // Check early win or proceed
    if (this.nonFoldedPlayers.length === 1) {
      this.handleEarlyWin();
    } else {
      this.moveToNextPlayer();
    }
    return true;
  }

  isBettingRoundComplete() {
    const activeContenders = this.players.filter(p => !p.folded && !p.isAllIn && p.chips > 0);

    // If 0 or 1 active contender left who can make bets, round is finished
    if (activeContenders.length <= 1) {
      // Check if uncalled bets remain among active contenders
      const nonFolded = this.nonFoldedPlayers;
      const highestBet = Math.max(...nonFolded.map(p => p.currentBet));
      const hasUnmatched = nonFolded.some(p => !p.isAllIn && p.currentBet < highestBet);
      if (!hasUnmatched) return true;
    }

    // Everyone who can act must have matched the highest bet and acted at least once
    for (const p of activeContenders) {
      if (p.currentBet !== this.currentBet || !this.actionCompletedSeats.has(p.seat)) {
        return false;
      }
    }

    return true;
  }

  moveToNextPlayer() {
    this.activePlayerIndex = this.getNextActiveSeat(this.activePlayerIndex);
    this.promptCurrentPlayer();
  }

  advanceStreet() {
    this.clearPendingTimer();

    // Capture round bets before resetting so UI can animate them to pot
    const betsToCollect = this.players.map(p => ({ seat: p.seat, amount: p.currentBet }));

    // Settle round bets into pot
    this.potManager.endBettingRound();
    this.currentBet = 0;
    this.minRaise = this.bigBlind;
    this.actionCompletedSeats.clear();
    for (const p of this.players) {
      p.currentBet = 0;
    }

    this.emit('streetEnd', { pot: this.potManager.getTotalPot(), playerBets: betsToCollect });

    // Check if remaining players are all-in (auto run-out cards to showdown)
    const canBetPlayers = this.players.filter(p => !p.folded && !p.isAllIn && p.chips > 0);
    const isAutoRunout = canBetPlayers.length <= 1 && this.nonFoldedPlayers.length > 1;

    let streetDealDelay = 520;
    switch (this.stage) {
      case GAME_STAGES.PREFLOP: {
        this.stage = GAME_STAGES.FLOP;
        // Deal 3 flop cards
        const flopCards = [this.deck.draw(), this.deck.draw(), this.deck.draw()];
        this.communityCards.push(...flopCards);
        this.emit('communityCards', { stage: 'flop', cards: flopCards, startIndex: 0 });
        this.emit('log', { message: `Flop: ${flopCards.map(c => c.toString()).join(' ')}`, type: 'info' });
        streetDealDelay = 720;
        break;
      }
      case GAME_STAGES.FLOP: {
        this.stage = GAME_STAGES.TURN;
        const turnCard = this.deck.draw();
        this.communityCards.push(turnCard);
        this.emit('communityCards', { stage: 'turn', cards: [turnCard], startIndex: 3 });
        this.emit('log', { message: `Turn: ${turnCard.toString()}`, type: 'info' });
        streetDealDelay = 500;
        break;
      }
      case GAME_STAGES.TURN: {
        this.stage = GAME_STAGES.RIVER;
        const riverCard = this.deck.draw();
        this.communityCards.push(riverCard);
        this.emit('communityCards', { stage: 'river', cards: [riverCard], startIndex: 4 });
        this.emit('log', { message: `River: ${riverCard.toString()}`, type: 'info' });
        streetDealDelay = 500;
        break;
      }
      case GAME_STAGES.RIVER: {
        this.handleShowdown();
        return;
      }
    }

    if (isAutoRunout) {
      // Auto-advance streets with slight delay for dramatic effect
      this.pendingTimer = setTimeout(() => {
        this.advanceStreet();
      }, 1150);
      return;
    }

    // Start betting round for new street, starting from first active seat after dealer
    this.activePlayerIndex = this.getNextActiveSeat(this.dealerIndex);
    this.pendingTimer = setTimeout(() => {
      this.promptCurrentPlayer();
    }, streetDealDelay);
  }

  handleEarlyWin() {
    this.clearPendingTimer();
    this.stage = GAME_STAGES.HAND_OVER;
    this.potManager.endBettingRound();
    const winner = this.nonFoldedPlayers[0];
    const totalPot = this.potManager.getTotalPot();

    winner.chips += totalPot;

    this.emit('earlyWin', {
      winner,
      amount: totalPot
    });
    this.emit('log', { message: `${winner.name} wins $${totalPot} (all others folded)`, type: 'win' });
    this.emit('handComplete', { winners: [{ player: winner, amount: totalPot }] });
  }

  handleShowdown() {
    this.clearPendingTimer();
    this.stage = GAME_STAGES.SHOWDOWN;
    this.potManager.endBettingRound();

    const contenders = this.nonFoldedPlayers;
    const evaluations = [];

    for (const p of contenders) {
      const evaluation = evaluateHand([...p.holeCards, ...this.communityCards]);
      evaluations.push({
        player: p,
        evaluation
      });
    }

    // Calculate pots
    const pots = this.potManager.calculatePots(this.players);
    const winSummary = [];
    const allWinningCards = new Set();

    for (const potItem of pots) {
      // Filter contenders eligible for this pot
      const eligible = evaluations.filter(e => potItem.eligiblePlayerIds.includes(e.player.id));
      if (eligible.length === 0) continue;

      // Sort by best evaluation descending
      eligible.sort((a, b) => compareEvaluations(b.evaluation, a.evaluation));

      // Find ties for top hand
      const bestEval = eligible[0].evaluation;
      const potWinners = eligible.filter(e => compareEvaluations(e.evaluation, bestEval) === 0);

      const splitAmount = Math.floor(potItem.amount / potWinners.length);
      for (const w of potWinners) {
        w.player.chips += splitAmount;
        winSummary.push({
          player: w.player,
          amount: splitAmount,
          handName: w.evaluation.name,
          bestFive: w.evaluation.bestFive
        });
        for (const card of w.evaluation.bestFive) {
          allWinningCards.add(card.id);
        }
      }
    }

    this.stage = GAME_STAGES.HAND_OVER;
    this.emit('showdown', {
      evaluations,
      winners: winSummary,
      winningCardIds: Array.from(allWinningCards)
    });

    for (const w of winSummary) {
      this.emit('log', { message: `${w.player.name} wins $${w.amount} with ${w.handName}!`, type: 'win' });
    }

    this.emit('handComplete', { winners: winSummary });
  }
}

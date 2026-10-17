import { PokerGame } from './engine/game.js';
import { TableView } from './ui/table-view.js';
import { TableAnimator } from './ui/animator.js';
import { ControlsView } from './ui/controls-view.js';
import { sounds } from './audio/sound.js';
import { evaluateHand } from './engine/evaluator.js';

window.addEventListener('DOMContentLoaded', () => {
  const pokerTableElem = document.getElementById('poker-table');
  const dealerShoeElem = document.getElementById('dealer-shoe');
  const btnSound = document.getElementById('btn-sound');
  const btnSpeed = document.getElementById('btn-speed');
  const btnClearLog = document.getElementById('btn-clear-log');

  const animator = new TableAnimator();
  const tableView = new TableView(pokerTableElem);
  const game = new PokerGame({
    smallBlind: 10,
    bigBlind: 20,
    initialChips: 1000
  });

  // Sound toggle
  btnSound.addEventListener('click', () => {
    const isMuted = sounds.toggleMute();
    btnSound.innerHTML = isMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON';
  });

  // Speed toggle
  let isFast = false;
  btnSpeed.addEventListener('click', () => {
    isFast = !isFast;
    animator.setSpeed(isFast ? 1.8 : 1.0);
    btnSpeed.innerHTML = isFast ? '⚡ Speed: Fast' : '⚡ Speed: Normal';
  });

  // Clear log
  btnClearLog.addEventListener('click', () => {
    const logBox = document.getElementById('log-messages');
    if (logBox) logBox.innerHTML = '';
  });

  // Controls View binding
  const controlsView = new ControlsView({
    onFold: () => {
      const human = game.players[0];
      const ok = game.executePlayerAction(human, 'fold');
      if (ok) controlsView.disableUserTurn();
    },
    onCheckCall: (action, amount) => {
      const human = game.players[0];
      const ok = game.executePlayerAction(human, action, amount);
      if (ok) controlsView.disableUserTurn();
    },
    onRaise: (targetAmount) => {
      const human = game.players[0];
      const ok = game.executePlayerAction(human, 'raise', targetAmount);
      if (ok) controlsView.disableUserTurn();
    },
    onDealHand: () => {
      startNewRound();
    }
  });

  // Keep track of community card index
  let communityCardIndex = 0;

  function updateAllSeatViews(activeSeat = -1) {
    for (const p of game.players) {
      tableView.updatePlayerSeat(p, p.seat === activeSeat);
    }
  }

  function updateUserHandAdvisor() {
    const human = game.players[0];
    if (human.holeCards.length === 0) {
      controlsView.setHandStrength('Waiting for deal...');
      return;
    }
    const cards = [...human.holeCards, ...game.communityCards];
    const evaluation = evaluateHand(cards);
    controlsView.setHandStrength(evaluation.name);
  }

  async function startNewRound() {
    controlsView.disableUserTurn();
    tableView.resetBoard();
    game.startNewHand();
  }

  // --- Game Event Listeners ---

  game.on('handStart', ({ dealerIndex }) => {
    tableView.updateDealerButton(dealerIndex);
    updateAllSeatViews();
    tableView.updatePot(0);
    controlsView.setHandStrength('Dealing cards...');
  });

  game.on('blindPosted', ({ player, amount, blindName, pot }) => {
    const seatElem = document.getElementById(`seat-${player.seat}`);
    const badgeElem = seatElem ? seatElem.querySelector('.seat-badge') : null;
    const trayElem = seatElem ? seatElem.querySelector('.seat-bet-tray') : null;

    tableView.updatePlayerSeat(player);
    tableView.updatePot(pot);
    if (badgeElem && trayElem && amount > 0) {
      animator.tossChips(badgeElem, trayElem, amount);
    }
    sounds.playChipClack();
  });

  game.on('cardDealt', async ({ player, card, cardIndex, dealOrder = 0, isHuman }) => {
    const cardSlot = document.getElementById(`seat-${player.seat}-card-${cardIndex}`);
    if (!cardSlot) return;

    // Deal sequentially clockwise around the table with 75ms stagger per card
    const staggerMs = dealOrder * 75;
    await animator.dealCard(dealerShoeElem, cardSlot, card, !isHuman, staggerMs);

    if (isHuman && cardIndex === 1) {
      updateUserHandAdvisor();
    }
  });

  game.on('turnStarted', ({ player, toCall, canCheck, minRaise, maxRaise, currentPot }) => {
    updateAllSeatViews(player.seat);
    tableView.setThinking(player.seat, false);

    if (player.isHuman) {
      controlsView.enableUserTurn({
        canCheck,
        toCall,
        minRaise,
        maxRaise,
        currentPot,
        bigBlind: game.bigBlind
      });
      updateUserHandAdvisor();
    } else {
      controlsView.disableUserTurn();
    }
  });

  game.on('aiThinking', ({ player }) => {
    tableView.setThinking(player.seat, true);
  });

  game.on('playerAction', async ({ player, action, amount }) => {
    tableView.setThinking(player.seat, false);

    // Audio & visual cue
    if (action === 'fold') {
      sounds.playFold();
      tableView.showActionTag(player.seat, 'fold', 'FOLD');
      animator.muckCards(player.seat, dealerShoeElem);
    } else if (action === 'check') {
      sounds.playKnuckleTap();
      tableView.showActionTag(player.seat, 'check', 'CHECK');
    } else if (action === 'call') {
      sounds.playChipClack();
      tableView.showActionTag(player.seat, 'call', `CALL $${amount}`);
    } else if (action === 'raise') {
      sounds.playChipClack();
      tableView.showActionTag(player.seat, 'raise', `RAISE $${amount}`);
    } else if (action === 'allin') {
      sounds.playChipClack();
      tableView.showActionTag(player.seat, 'allin', 'ALL-IN!');
    }

    updateAllSeatViews( game.activePlayerIndex );

    // Animate chip toss from player badge into bet tray
    if (amount > 0) {
      const seatElem = document.getElementById(`seat-${player.seat}`);
      const badgeElem = seatElem ? seatElem.querySelector('.seat-badge') : null;
      const trayElem = seatElem ? seatElem.querySelector('.seat-bet-tray') : null;
      if (badgeElem && trayElem) {
        animator.tossChips(badgeElem, trayElem, amount);
      }
    }

    tableView.updatePot(game.potManager.getTotalPot());
  });

  game.on('streetEnd', async ({ pot, playerBets }) => {
    tableView.clearActionTags();

    // Animate bet chips sliding from all trays to center pot before clearing trays
    if (playerBets) {
      const potElem = document.getElementById('pot-display') || document.getElementById('pot-amount');
      for (const item of playerBets) {
        if (item.amount > 0) {
          const seatElem = document.getElementById(`seat-${item.seat}`);
          const trayElem = seatElem ? seatElem.querySelector('.seat-bet-tray') : null;
          if (trayElem && potElem) {
            animator.tossChips(trayElem, potElem, item.amount);
          }
        }
      }
    }

    tableView.updatePot(pot);
    updateAllSeatViews();
  });

  game.on('communityCards', async ({ stage, cards, startIndex = 0 }) => {
    tableView.clearActionTags();

    const dealPromises = cards.map((card, idx) => {
      const slotIndex = startIndex + idx;
      const slot = document.getElementById(`comm-slot-${slotIndex}`);
      if (!slot) return Promise.resolve();
      const staggerMs = 110 + idx * 115;
      return animator.dealCard(dealerShoeElem, slot, card, false, staggerMs);
    });

    await Promise.all(dealPromises);
    updateUserHandAdvisor();
  });

  game.on('earlyWin', async ({ winner, amount }) => {
    sounds.playWinChime();
    tableView.showActionTag(winner.seat, 'call', `WIN $${amount}`);

    // Animate pot chips to winner's badge
    const potElem = document.getElementById('pot-display') || document.getElementById('pot-amount');
    const winnerSeat = document.getElementById(`seat-${winner.seat}`);
    const winnerBadge = winnerSeat ? winnerSeat.querySelector('.seat-badge') : winnerSeat;
    if (potElem && winnerBadge) {
      await animator.tossChips(potElem, winnerBadge, amount);
    }

    tableView.updatePot(0);
    updateAllSeatViews();
    controlsView.showDealButton();
  });

  game.on('showdown', async ({ evaluations, winners, winningCardIds }) => {
    // 1. Reveal all active AI hole cards with staggered 3D flip
    let revealIdx = 0;
    for (const e of evaluations) {
      if (!e.player.isHuman) {
        for (let c = 0; c < 2; c++) {
          const slot = document.getElementById(`seat-${e.player.seat}-card-${c}`);
          if (slot) {
            const delay = revealIdx * 80;
            setTimeout(() => animator.flipCard(slot), delay);
            revealIdx++;
          }
        }
      }
      tableView.showActionTag(e.player.seat, 'call', e.evaluation.name);
    }

    await new Promise(resolve => setTimeout(resolve, 750));

    // 2. Play win chime & highlight winning 5 cards
    sounds.playWinChime();
    tableView.highlightWinningCards(winningCardIds);

    // 3. Glide pot chips to winners
    const potElem = document.getElementById('pot-display') || document.getElementById('pot-amount');
    for (const w of winners) {
      const winnerSeat = document.getElementById(`seat-${w.player.seat}`);
      const winnerBadge = winnerSeat ? winnerSeat.querySelector('.seat-badge') : winnerSeat;
      if (potElem && winnerBadge) {
        animator.tossChips(potElem, winnerBadge, w.amount);
      }
    }

    tableView.updatePot(0);
    updateAllSeatViews();
    controlsView.showDealButton();
  });

  game.on('log', ({ message, type }) => {
    controlsView.addLogMessage(message, type);
  });

  // Initial setup
  updateAllSeatViews();
  tableView.updateDealerButton(0);
  controlsView.showDealButton();
  controlsView.addLogMessage('Welcome to Royal Hold\'em Casino! Click DEAL HAND to begin.', 'info');
});

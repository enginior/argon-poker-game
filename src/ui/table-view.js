/**
 * Poker Table View - Renders seats, chip stacks, cards, dealer button, and pot
 */

export class TableView {
  constructor(tableOuterElem) {
    this.tableElem = tableOuterElem;
    this.dealerShoeElem = document.getElementById('dealer-shoe');
    this.potDisplayElem = document.getElementById('pot-display');
    this.potAmountElem = document.getElementById('pot-amount');
    this.dealerButtonElem = document.getElementById('dealer-button');
    this.communityCardsElem = document.getElementById('community-cards');
    this.lastPotAmount = 0;
  }

  /**
   * Helper to build 3D chip stack HTML for a given dollar amount
   */
  renderChipStackHTML(amount) {
    if (amount <= 0) return '';
    let remaining = amount;
    const chips = [];

    const denoms = [1000, 500, 100, 25, 5];
    for (const d of denoms) {
      const count = Math.min(3, Math.floor(remaining / d));
      for (let i = 0; i < count; i++) {
        chips.push(d);
      }
      remaining %= d;
    }

    if (chips.length === 0 && amount > 0) chips.push(5);
    const visibleChips = chips.slice(0, 5);

    return `
      <div class="chip-stack">
        ${visibleChips.map((d, idx) => `
          <div class="casino-chip chip-${d}" style="margin-top: ${idx === 0 ? '0' : '-28px'}; z-index: ${idx + 1};">
            <div class="chip-inner">$${d >= 1000 ? `${d/1000}k` : d}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Update all player seat UI elements
   */
  updatePlayerSeat(player, isActiveTurn = false) {
    const seatElem = document.getElementById(`seat-${player.seat}`);
    if (!seatElem) return;

    // Bankroll chips count
    const chipsElem = seatElem.querySelector('.player-chips-count');
    if (chipsElem) {
      chipsElem.textContent = player.isAllIn ? 'ALL-IN' : `$${player.chips}`;
      if (player.isAllIn) {
        chipsElem.style.color = '#ef4444';
      } else {
        chipsElem.style.color = 'var(--gold-accent)';
      }
    }

    // Active turn halo
    if (isActiveTurn) {
      seatElem.classList.add('active-turn');
    } else {
      seatElem.classList.remove('active-turn');
    }

    // Fold state
    if (player.folded) {
      seatElem.classList.add('is-folded');
    } else {
      seatElem.classList.remove('is-folded');
    }

    // Current Bet display
    const betTray = seatElem.querySelector('.seat-bet-tray');
    if (betTray) {
      if (player.currentBet > 0) {
        betTray.innerHTML = `
          ${this.renderChipStackHTML(player.currentBet)}
          <span class="bet-badge">$${player.currentBet}</span>
        `;
        betTray.classList.add('has-bet');
      } else {
        betTray.innerHTML = '';
        betTray.classList.remove('has-bet');
      }
    }
  }

  /**
   * Show action tag on a seat (e.g. FOLD, CHECK, CALL $20, RAISE $60, ALL-IN)
   */
  showActionTag(seatIndex, actionType, text) {
    const seatElem = document.getElementById(`seat-${seatIndex}`);
    if (!seatElem) return;
    const tagElem = seatElem.querySelector('.seat-action-tag');
    if (!tagElem) return;

    tagElem.className = `seat-action-tag show tag-${actionType}`;
    tagElem.textContent = text || actionType.toUpperCase();

    // Hide thinking bubble if present
    this.setThinking(seatIndex, false);
  }

  clearActionTags() {
    const tags = document.querySelectorAll('.seat-action-tag');
    tags.forEach(t => {
      t.className = 'seat-action-tag';
      t.textContent = '';
    });
  }

  /**
   * Toggle AI thinking animation
   */
  setThinking(seatIndex, isThinking) {
    const seatElem = document.getElementById(`seat-${seatIndex}`);
    if (!seatElem) return;
    const bubble = seatElem.querySelector('.thinking-bubble');
    if (!bubble) return;

    if (isThinking) {
      bubble.classList.add('visible');
    } else {
      bubble.classList.remove('visible');
    }
  }

  /**
   * Update Pot amount display
   */
  updatePot(amount) {
    if (this.potAmountElem) {
      this.potAmountElem.textContent = `$${amount}`;
    }
    if (amount > this.lastPotAmount && this.potDisplayElem) {
      this.potDisplayElem.classList.remove('pot-bump');
      void this.potDisplayElem.offsetWidth;
      this.potDisplayElem.classList.add('pot-bump');
      setTimeout(() => {
        if (this.potDisplayElem) this.potDisplayElem.classList.remove('pot-bump');
      }, 280);
    }
    this.lastPotAmount = amount;
  }

  /**
   * Position dealer button next to the dealer player's seat
   */
  updateDealerButton(dealerSeatIndex) {
    if (!this.dealerButtonElem) return;
    const seatElem = document.getElementById(`seat-${dealerSeatIndex}`);
    if (!seatElem) return;

    const w = seatElem.offsetWidth || 260;
    const h = seatElem.offsetHeight || 110;

    let top = 0;
    let left = 0;

    switch (dealerSeatIndex) {
      case 0: // Human (bottom, centered via translateX(-50%))
        top = seatElem.offsetTop - 16;
        left = seatElem.offsetLeft - Math.round(w / 2) - 18;
        break;
      case 1: // Left AI (middle-left, centered via translateY(-50%))
        top = seatElem.offsetTop - Math.round(h / 2) - 14;
        left = seatElem.offsetLeft + 115;
        break;
      case 2: // Top AI (top, centered via translateX(-50%))
        top = seatElem.offsetTop + h - 18;
        left = seatElem.offsetLeft - Math.round(w / 2) - 18;
        break;
      case 3: // Right AI (middle-right, centered via translateY(-50%))
        top = seatElem.offsetTop - Math.round(h / 2) - 14;
        left = seatElem.offsetLeft + w - 150;
        break;
    }

    this.dealerButtonElem.style.top = `${top}px`;
    this.dealerButtonElem.style.left = `${left}px`;
  }

  /**
   * Clear all community cards and player hole cards from pre-allocated slots
   */
  resetBoard() {
    for (let i = 0; i < 5; i++) {
      const slot = document.getElementById(`comm-slot-${i}`);
      if (slot) slot.innerHTML = '';
    }
    this.updatePot(0);
    this.clearActionTags();

    // Clear player hole card slots without destroying the pre-sized slot wrappers
    for (let s = 0; s < 4; s++) {
      for (let c = 0; c < 2; c++) {
        const cardSlot = document.getElementById(`seat-${s}-card-${c}`);
        if (cardSlot) cardSlot.innerHTML = '';
      }
      this.setThinking(s, false);
    }
  }

  /**
   * Highlight winning 5 cards on the board and player hands
   */
  highlightWinningCards(cardIds) {
    const idSet = new Set(cardIds);
    const allCards = document.querySelectorAll('.playing-card');
    allCards.forEach(cardElem => {
      const cardId = cardElem.getAttribute('data-card-id');
      if (idSet.has(cardId)) {
        cardElem.classList.add('winning-card');
      }
    });
  }
}

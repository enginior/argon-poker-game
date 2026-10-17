/**
 * Controls View - Binds user actions (Fold, Check/Call, Raise, All-in), slider, and logs
 */

export class ControlsView {
  constructor(callbacks = {}) {
    this.callbacks = callbacks; // { onFold, onCheckCall, onRaise, onDealHand }

    this.btnFold = document.getElementById('btn-fold');
    this.btnCheckCall = document.getElementById('btn-check-call');
    this.btnRaise = document.getElementById('btn-raise');
    this.btnDealHand = document.getElementById('btn-deal-hand');

    this.raiseSlider = document.getElementById('raise-slider');
    this.raiseBadge = document.getElementById('raise-amount-badge');
    this.handStrengthValue = document.getElementById('hand-strength-value');
    this.logMessagesContainer = document.getElementById('log-messages');

    this.presetButtons = document.querySelectorAll('.preset-pill');

    this.minRaise = 20;
    this.maxRaise = 1000;
    this.currentRaiseValue = 20;
    this.canCheck = true;
    this.toCall = 0;
    this.totalPot = 0;
    this.bigBlind = 20;

    this.initEvents();
  }

  initEvents() {
    this.btnFold.addEventListener('click', () => {
      if (this.callbacks.onFold) this.callbacks.onFold();
    });

    this.btnCheckCall.addEventListener('click', () => {
      if (this.callbacks.onCheckCall) {
        this.callbacks.onCheckCall(this.canCheck ? 'check' : 'call', this.toCall);
      }
    });

    this.btnRaise.addEventListener('click', () => {
      if (this.callbacks.onRaise) {
        this.callbacks.onRaise(this.currentRaiseValue);
      }
    });

    this.btnDealHand.addEventListener('click', () => {
      if (this.callbacks.onDealHand) this.callbacks.onDealHand();
    });

    this.raiseSlider.addEventListener('input', (e) => {
      this.currentRaiseValue = parseInt(e.target.value, 10);
      this.updateRaiseBadge();
    });

    // Preset pills (Min, 2.5BB, Half Pot, Pot, Max)
    this.presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-preset');
        let val = this.minRaise;

        switch (type) {
          case 'min':
            val = this.minRaise;
            break;
          case '2.5bb':
            val = Math.max(this.minRaise, Math.round(this.bigBlind * 2.5));
            break;
          case 'half-pot':
            val = Math.max(this.minRaise, Math.round(this.totalPot * 0.5));
            break;
          case 'pot':
            val = Math.max(this.minRaise, this.totalPot);
            break;
          case 'max':
            val = this.maxRaise;
            break;
        }

        val = Math.min(this.maxRaise, Math.max(this.minRaise, val));
        this.raiseSlider.value = val;
        this.currentRaiseValue = val;
        this.updateRaiseBadge();
      });
    });
  }

  updateRaiseBadge() {
    this.raiseBadge.textContent = `$${this.currentRaiseValue}`;
    const isRaise = this.toCall > 0;
    const actionWord = isRaise ? 'RAISE TO' : 'BET';
    this.btnRaise.innerHTML = `
      <span>${actionWord}</span>
      <span class="sub-text">$${this.currentRaiseValue}</span>
    `;
  }

  /**
   * Set turn state for Human Player
   */
  enableUserTurn({ canCheck, toCall, minRaise, maxRaise, currentPot, bigBlind }) {
    this.canCheck = canCheck;
    this.toCall = toCall;
    this.minRaise = minRaise;
    this.maxRaise = maxRaise;
    this.totalPot = currentPot;
    this.bigBlind = bigBlind;

    // Enable Fold
    this.btnFold.disabled = false;

    // Check vs Call
    this.btnCheckCall.disabled = false;
    if (canCheck) {
      this.btnCheckCall.innerHTML = `
        <span>CHECK</span>
        <span class="sub-text">FREE</span>
      `;
    } else {
      const callCost = Math.min(toCall, maxRaise);
      const isAllInCall = callCost >= maxRaise && maxRaise > 0;
      this.btnCheckCall.innerHTML = `
        <span>${isAllInCall ? 'ALL-IN' : 'CALL'}</span>
        <span class="sub-text">$${callCost}</span>
      `;
    }

    // Raise / Bet
    if (maxRaise > minRaise) {
      this.btnRaise.disabled = false;
      this.raiseSlider.disabled = false;
      this.raiseSlider.min = minRaise;
      this.raiseSlider.max = maxRaise;
      this.raiseSlider.step = bigBlind >= 20 ? 10 : 5;
      this.currentRaiseValue = Math.min(maxRaise, minRaise);
      this.raiseSlider.value = this.currentRaiseValue;
      this.updateRaiseBadge();
      this.presetButtons.forEach(btn => btn.removeAttribute('disabled'));
    } else if (maxRaise > toCall && maxRaise > 0) {
      this.btnRaise.disabled = false;
      this.raiseSlider.disabled = true;
      this.currentRaiseValue = maxRaise;
      this.raiseBadge.textContent = `$${maxRaise}`;
      this.btnRaise.innerHTML = `
        <span>ALL-IN</span>
        <span class="sub-text">$${maxRaise}</span>
      `;
      this.presetButtons.forEach(btn => btn.setAttribute('disabled', 'true'));
    } else {
      this.btnRaise.disabled = true;
      this.raiseSlider.disabled = true;
      this.presetButtons.forEach(btn => btn.setAttribute('disabled', 'true'));
    }

    this.btnDealHand.style.display = 'none';
  }

  /**
   * Disable all action buttons when waiting for AI or animations
   */
  disableUserTurn() {
    this.btnFold.disabled = true;
    this.btnCheckCall.disabled = true;
    this.btnRaise.disabled = true;
    this.raiseSlider.disabled = true;
    this.presetButtons.forEach(btn => btn.setAttribute('disabled', 'true'));
  }

  /**
   * Show Deal button when hand concludes
   */
  showDealButton() {
    this.disableUserTurn();
    this.btnDealHand.style.display = 'block';
  }

  /**
   * Update live hand strength advice
   */
  setHandStrength(description) {
    if (this.handStrengthValue) {
      this.handStrengthValue.textContent = description || 'Waiting for deal...';
    }
  }

  /**
   * Append message to action log
   */
  addLogMessage(text, type = 'info') {
    if (!this.logMessagesContainer) return;

    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = text;
    this.logMessagesContainer.appendChild(entry);
    this.logMessagesContainer.scrollTop = this.logMessagesContainer.scrollHeight;
  }
}

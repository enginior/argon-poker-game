import { sounds } from '../audio/sound.js';

export class TableAnimator {
  constructor() {
    this.animationSpeed = 1.0; // multiplier
  }

  setSpeed(speed) {
    this.animationSpeed = speed;
  }

  /**
   * Smoothly animates a card flying from start element (dealer shoe) into target slot
   * using FLIP + Web Animations API, followed by a genuine 3D CSS flip if face-up.
   */
  async dealCard(startElem, targetElem, card, isFaceDown = false, delayMs = 0) {
    if (!startElem || !targetElem) return;

    if (delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs / this.animationSpeed));
    }

    // Insert card face-down into the pre-sized target slot
    targetElem.innerHTML = card.renderHTML({ faceDown: true });
    const cardElem = targetElem.querySelector('.playing-card');
    if (!cardElem) return;

    const startRect = startElem.getBoundingClientRect();
    const targetRect = targetElem.getBoundingClientRect();

    const startCenterX = startRect.left + startRect.width / 2;
    const startCenterY = startRect.top + startRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    const deltaX = startCenterX - targetCenterX;
    const deltaY = startCenterY - targetCenterY;

    sounds.playCardSlide();

    const duration = Math.round(380 / this.animationSpeed);

    if (typeof cardElem.animate === 'function') {
      const anim = cardElem.animate(
        [
          {
            transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.42) rotate(-25deg)`,
            opacity: 0.25
          },
          {
            transform: `translate3d(${deltaX * 0.18}px, ${deltaY * 0.18 - 12}px, 0) scale(0.95) rotate(-4deg)`,
            opacity: 1,
            offset: 0.72
          },
          {
            transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)',
            opacity: 1
          }
        ],
        {
          duration,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards'
        }
      );

      await anim.finished.catch(() => {});
      anim.cancel();
    } else {
      await new Promise(r => setTimeout(r, duration));
    }

    // Perform genuine 3D flip if card should be face-up
    if (!isFaceDown) {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      sounds.playCardFlip();
      cardElem.classList.remove('face-down');
      await new Promise(r => setTimeout(r, Math.round(240 / this.animationSpeed)));
    }
  }

  /**
   * Flip a card that is currently face-down to face-up
   */
  async flipCard(slotOrCardElem) {
    if (!slotOrCardElem) return;
    const innerCard = slotOrCardElem.classList?.contains('playing-card')
      ? slotOrCardElem
      : slotOrCardElem.querySelector('.playing-card');

    if (innerCard && innerCard.classList.contains('face-down')) {
      sounds.playCardFlip();
      innerCard.classList.remove('face-down');
      await new Promise(resolve => setTimeout(resolve, Math.round(360 / this.animationSpeed)));
    }
  }

  /**
   * Smoothly animate folded cards sliding toward the center muck
   */
  async muckCards(seatIndex, targetElem) {
    const seatCards = document.getElementById(`seat-cards-${seatIndex}`);
    if (!seatCards) return;
    const cards = seatCards.querySelectorAll('.playing-card');
    if (!cards.length) return;

    const targetRect = targetElem ? targetElem.getBoundingClientRect() : null;

    cards.forEach((cardElem, i) => {
      if (typeof cardElem.animate === 'function' && targetRect) {
        const rect = cardElem.getBoundingClientRect();
        const dx = (targetRect.left + targetRect.width / 2 - (rect.left + rect.width / 2)) * 0.35;
        const dy = (targetRect.top + targetRect.height / 2 - (rect.top + rect.height / 2)) * 0.35;
        cardElem.animate(
          [
            { transform: 'translate3d(0, 0, 0) scale(1)', opacity: 1 },
            { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.82) rotate(${i === 0 ? -12 : 12}deg)`, opacity: 0.35 }
          ],
          {
            duration: Math.round(300 / this.animationSpeed),
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'forwards'
          }
        );
      }
    });
  }

  /**
   * Animates ceramic chip tokens flying from startElem to targetElem with multi-chip cascade
   */
  async tossChips(startElem, targetElem, amount) {
    if (!startElem || !targetElem || amount <= 0) return;

    sounds.playChipClack();

    const startRect = startElem.getBoundingClientRect();
    const targetRect = targetElem.getBoundingClientRect();

    // Choose representative denomination
    let denom = 5;
    if (amount >= 1000) denom = 1000;
    else if (amount >= 500) denom = 500;
    else if (amount >= 100) denom = 100;
    else if (amount >= 25) denom = 25;

    const chipCount = amount >= 100 ? 3 : amount >= 25 ? 2 : 1;
    const duration = Math.round(310 / this.animationSpeed);
    const promises = [];

    for (let i = 0; i < chipCount; i++) {
      const p = (async () => {
        if (i > 0) {
          await new Promise(r => setTimeout(r, Math.round((i * 40) / this.animationSpeed)));
        }
        const clone = document.createElement('div');
        clone.className = `casino-chip chip-${denom} flying-chip-clone`;
        clone.innerHTML = `<div class="chip-inner">$${denom >= 1000 ? '1k' : denom}</div>`;
        document.body.appendChild(clone);

        const startX = startRect.left + startRect.width / 2 - 18;
        const startY = startRect.top + startRect.height / 2 - 18 - i * 4;
        const targetX = targetRect.left + targetRect.width / 2 - 18;
        const targetY = targetRect.top + targetRect.height / 2 - 18 - i * 4;

        clone.style.left = `${startX}px`;
        clone.style.top = `${startY}px`;

        const deltaX = targetX - startX;
        const deltaY = targetY - startY;

        if (typeof clone.animate === 'function') {
          const anim = clone.animate(
            [
              { transform: 'translate3d(0, 0, 0) scale(0.75)', opacity: 0.9 },
              { transform: `translate3d(${deltaX * 0.5}px, ${deltaY * 0.5 - 14}px, 0) scale(1.06)`, opacity: 1, offset: 0.5 },
              { transform: `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1)`, opacity: 1 }
            ],
            {
              duration,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
              fill: 'forwards'
            }
          );
          await anim.finished.catch(() => {});
        } else {
          await new Promise(r => setTimeout(r, duration));
        }
        clone.remove();
      })();
      promises.push(p);
    }

    await Promise.all(promises);
  }
}

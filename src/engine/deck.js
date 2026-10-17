import { Card, SUITS } from './card.js';

export class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }

  /**
   * Recreates all 52 cards in order
   */
  reset() {
    this.cards = [];
    const suits = [SUITS.HEARTS, SUITS.DIAMONDS, SUITS.CLUBS, SUITS.SPADES];
    for (const suit of suits) {
      for (let rank = 2; rank <= 14; rank++) {
        this.cards.push(new Card(rank, suit));
      }
    }
  }

  /**
   * Fisher-Yates shuffle
   */
  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    return this;
  }

  /**
   * Draw the top card
   */
  draw() {
    if (this.cards.length === 0) {
      throw new Error('Deck is empty!');
    }
    return this.cards.pop();
  }

  /**
   * Remaining cards count
   */
  get remaining() {
    return this.cards.length;
  }
}

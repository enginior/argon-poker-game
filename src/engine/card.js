/**
 * Card representation and luxury casino SVG generator
 */

export const SUITS = {
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs',
  SPADES: 'spades'
};

export const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

export const SUIT_COLORS = {
  hearts: '#e11d48',
  diamonds: '#e11d48',
  clubs: '#0f172a',
  spades: '#0f172a'
};

export const RANK_NAMES = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

export const RANK_LONG_NAMES = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven',
  8: 'Eight', 9: 'Nine', 10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace'
};

/**
 * Crisp inline SVG suit icon with explicit fill color so red/black suits are 100% consistent
 */
export function renderSuitSVG(suit, className = 'suit-svg') {
  const isRed = suit === SUITS.HEARTS || suit === SUITS.DIAMONDS;
  const fill = isRed ? '#e11d48' : '#0f172a';

  switch (suit) {
    case SUITS.HEARTS:
      return `<svg class="${className}" viewBox="0 0 24 24" fill="${fill}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>`;
    case SUITS.DIAMONDS:
      return `<svg class="${className}" viewBox="0 0 24 24" fill="${fill}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C14.5 7 17 9.5 22 12c-5 2.5-7.5 5-10 10-2.5-5-5-7.5-10-10C7 9.5 9.5 7 12 2z"/>
      </svg>`;
    case SUITS.CLUBS:
      return `<svg class="${className}" viewBox="0 0 24 24" fill="${fill}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3a4.2 4.2 0 0 0-4.2 4.2c0 1.43.72 2.69 1.81 3.45A4.3 4.3 0 0 0 3.5 14.5a4.3 4.3 0 0 0 4.3 4.3c1.25 0 2.38-.54 3.16-1.4L9.5 21h5l-1.46-3.6c.78.86 1.91 1.4 3.16 1.4a4.3 4.3 0 0 0 4.3-4.3 4.3 4.3 0 0 0-6.11-3.85A4.2 4.2 0 0 0 16.2 7.2 4.2 4.2 0 0 0 12 3z"/>
      </svg>`;
    case SUITS.SPADES:
    default:
      return `<svg class="${className}" viewBox="0 0 24 24" fill="${fill}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C7 7.5 3.5 11.2 3.5 14.8a4.5 4.5 0 0 0 4.5 4.5c1.3 0 2.47-.56 3.28-1.45L9.5 22h5l-1.78-4.15c.81.89 1.98 1.45 3.28 1.45a4.5 4.5 0 0 0 4.5-4.5C20.5 11.2 17 7.5 12 2z"/>
      </svg>`;
  }
}

/**
 * Royal crest SVG for Court Cards (J, Q, K)
 */
function renderCrownSVG(rank, isRed) {
  const accent = isRed ? '#e11d48' : '#0f172a';
  const gold = '#d97706';
  if (rank === 13) {
    // King's Imperial Crown
    return `<svg class="court-crown-svg" viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 19L6 7l6 5 4-8 4 8 6-5 3 12H3z" fill="${gold}" stroke="${accent}" stroke-width="1.5"/>
      <rect x="4" y="19" width="24" height="3" rx="1.5" fill="${accent}"/>
      <circle cx="16" cy="3" r="2" fill="${accent}"/>
      <circle cx="6" cy="6" r="1.5" fill="${accent}"/>
      <circle cx="26" cy="6" r="1.5" fill="${accent}"/>
    </svg>`;
  }
  if (rank === 12) {
    // Queen's Tiara / Diadem
    return `<svg class="court-crown-svg" viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 19C6 10 11 6 16 4c5 2 10 6 12 15H4z" fill="${gold}" stroke="${accent}" stroke-width="1.5"/>
      <path d="M16 7l3 5-3 4-3-4 3-5z" fill="${accent}"/>
      <rect x="4" y="19" width="24" height="3" rx="1.5" fill="${accent}"/>
    </svg>`;
  }
  // Jack's Royal Shield / Crest
  return `<svg class="court-crown-svg" viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7 4h18v9c0 5-9 9-9 9s-9-4-9-9V4z" fill="${gold}" stroke="${accent}" stroke-width="1.5"/>
    <path d="M16 6v13M10 10h12" stroke="${accent}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}

export class Card {
  constructor(rank, suit) {
    this.rank = rank; // 2 to 14
    this.suit = suit; // 'hearts', 'diamonds', 'clubs', 'spades'
    this.id = `${RANK_NAMES[rank]}_of_${suit}`;
  }

  get rankName() {
    return RANK_NAMES[this.rank];
  }

  get rankLongName() {
    return RANK_LONG_NAMES[this.rank];
  }

  get symbol() {
    return SUIT_SYMBOLS[this.suit];
  }

  get color() {
    return SUIT_COLORS[this.suit];
  }

  get isRed() {
    return this.suit === SUITS.HEARTS || this.suit === SUITS.DIAMONDS;
  }

  toString() {
    return `${this.rankName}${this.symbol}`;
  }

  /**
   * Generates full HTML element string for this card
   */
  renderHTML(options = { faceDown: false, extraClasses: '' }) {
    const { faceDown, extraClasses } = options;
    const isRedClass = this.isRed ? 'card-red' : 'card-black';
    const suitClass = `suit-${this.suit}`;
    const rankClass = `rank-${this.rankName.toLowerCase()}`;
    const faceDownClass = faceDown ? 'face-down' : '';
    const cornerSuitSVG = renderSuitSVG(this.suit, 'corner-suit-svg');

    return `
      <div class="playing-card ${isRedClass} ${suitClass} ${rankClass} ${faceDownClass} ${extraClasses || ''}" data-card-id="${this.id}">
        <div class="card-inner">
          <div class="card-front">
            <div class="card-inner-border"></div>
            <div class="card-corner top-left">
              <span class="card-rank">${this.rankName}</span>
              <span class="card-suit-icon">${cornerSuitSVG}</span>
            </div>
            <div class="card-center">
              ${this.renderCenterArt()}
            </div>
            <div class="card-corner bottom-right">
              <span class="card-rank">${this.rankName}</span>
              <span class="card-suit-icon">${cornerSuitSVG}</span>
            </div>
          </div>
          <div class="card-back">
            <div class="card-back-pattern">
              <div class="card-back-inner-frame">
                <div class="card-back-emblem">♠</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderCenterArt() {
    const centerSuitSVG = renderSuitSVG(this.suit, 'center-suit-svg');

    if (this.rank >= 11 && this.rank <= 13) {
      const title = this.rank === 11 ? 'JACK' : this.rank === 12 ? 'QUEEN' : 'KING';
      return `
        <div class="court-card-art">
          <div class="court-pip top">${renderSuitSVG(this.suit, 'court-mini-suit')}</div>
          ${renderCrownSVG(this.rank, this.isRed)}
          <div class="court-title">${title}</div>
          <div class="court-pip bottom">${renderSuitSVG(this.suit, 'court-mini-suit')}</div>
        </div>
      `;
    } else if (this.rank === 14) {
      return `
        <div class="ace-center-art">
          <div class="ace-medallion-ring">
            ${renderSuitSVG(this.suit, 'ace-suit-svg')}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="pip-center-art">
          <div class="pip-watermark-rank">${this.rankName}</div>
          ${centerSuitSVG}
        </div>
      `;
    }
  }
}

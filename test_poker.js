import { Card, SUITS } from './src/engine/card.js';
import { evaluateHand, compareEvaluations, HAND_TIERS } from './src/engine/evaluator.js';
import { PotManager } from './src/engine/pot.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('--- Testing Hand Evaluator ---');

// 1. Royal Flush
const royalFlushCards = [
  new Card(14, SUITS.SPADES),
  new Card(13, SUITS.SPADES),
  new Card(12, SUITS.SPADES),
  new Card(11, SUITS.SPADES),
  new Card(10, SUITS.SPADES),
  new Card(2, SUITS.HEARTS),
  new Card(3, SUITS.DIAMONDS)
];
const rfEval = evaluateHand(royalFlushCards);
assert(rfEval.tier === HAND_TIERS.ROYAL_FLUSH, 'Royal Flush identified correctly');

// 2. Straight Flush vs Four of a Kind
const fourOfAKindCards = [
  new Card(9, SUITS.HEARTS),
  new Card(9, SUITS.DIAMONDS),
  new Card(9, SUITS.CLUBS),
  new Card(9, SUITS.SPADES),
  new Card(14, SUITS.HEARTS),
  new Card(2, SUITS.HEARTS),
  new Card(3, SUITS.CLUBS)
];
const quadsEval = evaluateHand(fourOfAKindCards);
assert(quadsEval.tier === HAND_TIERS.FOUR_OF_A_KIND, 'Four of a kind identified');

const straightFlushCards = [
  new Card(9, SUITS.HEARTS),
  new Card(8, SUITS.HEARTS),
  new Card(7, SUITS.HEARTS),
  new Card(6, SUITS.HEARTS),
  new Card(5, SUITS.HEARTS),
  new Card(2, SUITS.CLUBS),
  new Card(14, SUITS.SPADES)
];
const sfEval = evaluateHand(straightFlushCards);
assert(sfEval.tier === HAND_TIERS.STRAIGHT_FLUSH, 'Straight flush identified');
assert(compareEvaluations(sfEval, quadsEval) > 0, 'Straight flush beats Quads');

// 3. Full House tiebreaker
const fhA = evaluateHand([
  new Card(10, SUITS.HEARTS), new Card(10, SUITS.CLUBS), new Card(10, SUITS.SPADES),
  new Card(4, SUITS.HEARTS), new Card(4, SUITS.DIAMONDS)
]);
const fhB = evaluateHand([
  new Card(8, SUITS.HEARTS), new Card(8, SUITS.CLUBS), new Card(8, SUITS.SPADES),
  new Card(14, SUITS.HEARTS), new Card(14, SUITS.DIAMONDS)
]);
assert(fhA.tier === HAND_TIERS.FULL_HOUSE, 'Hand A is full house');
assert(fhB.tier === HAND_TIERS.FULL_HOUSE, 'Hand B is full house');
assert(compareEvaluations(fhA, fhB) > 0, '10s full of 4s beats 8s full of Aces (higher trips win)');

// 4. Ace-low Wheel straight
const wheelCards = [
  new Card(14, SUITS.HEARTS),
  new Card(2, SUITS.DIAMONDS),
  new Card(3, SUITS.CLUBS),
  new Card(4, SUITS.SPADES),
  new Card(5, SUITS.HEARTS),
  new Card(10, SUITS.CLUBS),
  new Card(12, SUITS.DIAMONDS)
];
const wheelEval = evaluateHand(wheelCards);
assert(wheelEval.tier === HAND_TIERS.STRAIGHT, 'Ace-2-3-4-5 wheel straight identified');
assert(wheelEval.values[1] === 5, 'Wheel straight high card is 5');

// 5. Pot Manager & Side Pots
console.log('\n--- Testing Pot Manager & Side Pots ---');
const potMgr = new PotManager();
// Player A is all-in for 100
// Player B calls 200
// Player C calls 200
const players = [
  { id: 'A', chips: 0, isAllIn: true, folded: false },
  { id: 'B', chips: 800, isAllIn: false, folded: false },
  { id: 'C', chips: 800, isAllIn: false, folded: false }
];
potMgr.addBet('A', 100);
potMgr.addBet('B', 200);
potMgr.addBet('C', 200);

const pots = potMgr.calculatePots(players);
assert(pots.length === 2, 'Two pots formed (Main pot + Side pot)');
assert(pots[0].amount === 300, 'Main pot is $300 (100 from A, B, C)');
assert(pots[0].eligiblePlayerIds.length === 3, 'All 3 eligible for main pot');
assert(pots[1].amount === 200, 'Side pot is $200 (100 from B, C)');
assert(pots[1].eligiblePlayerIds.length === 2 && !pots[1].eligiblePlayerIds.includes('A'), 'A is not eligible for side pot');

// 6. Card Red/Black Suit & SVG Rendering
console.log('\n--- Testing Card Suit Colors & Custom SVG Rendering ---');
const aceOfHearts = new Card(14, SUITS.HEARTS);
const kingOfDiamonds = new Card(13, SUITS.DIAMONDS);
const queenOfSpades = new Card(12, SUITS.SPADES);
const tenOfClubs = new Card(10, SUITS.CLUBS);

assert(aceOfHearts.isRed === true && aceOfHearts.renderHTML().includes('card-red') && aceOfHearts.renderHTML().includes('#e11d48'), 'Hearts renders crimson red SVG (#e11d48)');
assert(kingOfDiamonds.isRed === true && kingOfDiamonds.renderHTML().includes('card-red') && kingOfDiamonds.renderHTML().includes('court-card-art'), 'King of Diamonds renders red court crest SVG');
assert(queenOfSpades.isRed === false && queenOfSpades.renderHTML().includes('card-black') && queenOfSpades.renderHTML().includes('#0f172a'), 'Spades renders obsidian black SVG (#0f172a)');
assert(tenOfClubs.isRed === false && tenOfClubs.renderHTML().includes('card-black') && tenOfClubs.renderHTML().includes('pip-center-art'), '10 of Clubs renders black pip card SVG');

console.log('\nAll core engine tests passed successfully! 🎉');

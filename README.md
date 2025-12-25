# Hall of Fame

A simple leaderboard smart contract for Stacks blockchain built with Clarity. Submit scores, compete for rankings, and immortalize champions on-chain.

## What It Does

Hall of Fame allows you to:
- Submit scores to the leaderboard
- View top 10 players
- Check your rank and score
- Track all-time high scores
- Update your best score
- Build competitive gaming on blockchain

Perfect for:
- Gaming leaderboards
- Competition tracking
- Achievement systems
- Learning sorting and rankings
- Understanding competitive logic
- Building score-based dApps

## Features

- **Top 10 Rankings**: See the best of the best
- **Score Submission**: Anyone can submit their score
- **Automatic Ranking**: Scores sorted automatically
- **Personal Bests**: Track your highest score
- **Permanent Records**: All scores on-chain forever
- **Real-Time Updates**: Leaderboard updates instantly
- **Tie Handling**: Fair ranking for equal scores

## Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) installed
- Basic understanding of Stacks blockchain
- A Stacks wallet for testnet deployment

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/hall-of-fame.git
cd hall-of-fame

# Check Clarinet installation
clarinet --version
```

## Project Structure

```
hall-of-fame/
├── contracts/
│   └── hall-of-fame.clar    # Main leaderboard contract
├── tests/
│   └── hall-of-fame_test.ts # Contract tests
├── Clarinet.toml            # Project configuration
└── README.md
```

## Usage

### Deploy Locally

```bash
# Start Clarinet console
clarinet console

# Submit a score
(contract-call? .hall-of-fame submit-score u1000)

# View top 10
(contract-call? .hall-of-fame get-top-ten)

# Check your rank
(contract-call? .hall-of-fame get-player-rank tx-sender)

# Get your best score
(contract-call? .hall-of-fame get-player-score tx-sender)
```

### Contract Functions

**submit-score (score)**
```clarity
(contract-call? .hall-of-fame submit-score u5000)
```
Submit your score to the leaderboard

**get-top-ten**
```clarity
(contract-call? .hall-of-fame get-top-ten)
```
Returns list of top 10 players with scores

**get-player-score (player)**
```clarity
(contract-call? .hall-of-fame get-player-score 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
```
Get a specific player's best score

**get-player-rank (player)**
```clarity
(contract-call? .hall-of-fame get-player-rank tx-sender)
```
Get your current rank on the leaderboard

**get-total-players**
```clarity
(contract-call? .hall-of-fame get-total-players)
```
Returns total number of players

**get-high-score**
```clarity
(contract-call? .hall-of-fame get-high-score)
```
Returns the current highest score

**is-in-top-ten (player)**
```clarity
(contract-call? .hall-of-fame is-in-top-ten tx-sender)
```
Check if you're in the top 10

## How It Works

### Submitting Scores
1. Player calls `submit-score` with their score
2. Contract checks if it's their best score
3. If better, updates their record
4. Leaderboard automatically re-ranks
5. Top 10 updated if applicable

### Ranking System
- Scores sorted from highest to lowest
- Rank 1 = highest score
- Ties handled by submission time (first gets better rank)
- Only best score per player counts
- Real-time ranking updates

### Top 10 Logic
- Always shows top 10 highest scores
- Automatically updates when beaten
- Shows player address and score
- Sorted in descending order

## Data Structure

### Player Entry Format
```clarity
{
  player: principal,
  score: uint,
  timestamp: uint,
  rank: uint
}
```

### Storage Pattern
```clarity
;; Map of player to their best score
(define-map player-scores principal uint)

;; Map of player to timestamp
(define-map player-timestamps principal uint)

;; List maintaining top 10
(define-data-var top-ten (list 10 {player: principal, score: uint}) (list))

;; Counter for total players
(define-data-var total-players uint u0)
```

## Testing

```bash
# Run all tests
npm run test

# Check contract syntax
clarinet check

# Run specific test
npm run test -- hall-of-fame
```

## Learning Goals

Building this contract teaches you:
- ✅ Sorting and ranking algorithms
- ✅ Working with ordered lists
- ✅ Comparing and updating records
- ✅ Handling competitive logic
- ✅ Timestamp tracking
- ✅ Top-N selection patterns

## Example Use Cases

**Gaming Leaderboard:**
```clarity
;; Players submit their game scores
(contract-call? .hall-of-fame submit-score u15000)  ;; Player 1
(contract-call? .hall-of-fame submit-score u22000)  ;; Player 2
(contract-call? .hall-of-fame submit-score u18500)  ;; Player 3

;; Check who's #1
(contract-call? .hall-of-fame get-top-ten)
```

**Competition Tracking:**
```clarity
;; Submit competition results
(contract-call? .hall-of-fame submit-score u9500)   ;; Score from event 1
(contract-call? .hall-of-fame submit-score u10200)  ;; Score from event 2
(contract-call? .hall-of-fame submit-score u8900)   ;; Score from event 3

;; View rankings
(contract-call? .hall-of-fame get-player-rank tx-sender)
```

**Achievement System:**
```clarity
;; Track achievement points
(contract-call? .hall-of-fame submit-score u5000)   ;; Completed 5 achievements
(contract-call? .hall-of-fame submit-score u12000)  ;; Completed 12 achievements

;; Am I in top 10?
(contract-call? .hall-of-fame is-in-top-ten tx-sender)
```

**Speed Run Records:**
```clarity
;; Submit completion times (lower is better - reverse logic)
;; Note: You'd need to modify contract for this use case
(contract-call? .hall-of-fame submit-score u120)  ;; 2 minutes
(contract-call? .hall-of-fame submit-score u95)   ;; 1:35 minutes
```

## Ranking Examples

### Example Leaderboard:
```
Rank 1: Alice   - 25,000 points
Rank 2: Bob     - 22,000 points
Rank 3: Charlie - 20,500 points
Rank 4: Diana   - 18,000 points
Rank 5: Eve     - 15,500 points
Rank 6: Frank   - 14,000 points
Rank 7: Grace   - 12,500 points
Rank 8: Henry   - 11,000 points
Rank 9: Iris    - 10,000 points
Rank 10: Jack   - 9,500 points
```

### Climbing the Ranks:
```clarity
;; Start with low score
(contract-call? .hall-of-fame submit-score u1000)
;; Rank: ~50

;; Improve your score
(contract-call? .hall-of-fame submit-score u5000)
;; Rank: ~20

;; Make it to top 10!
(contract-call? .hall-of-fame submit-score u15000)
;; Rank: 6!
```

## Common Patterns

### Check Before Submit
```clarity
;; Check current score
(contract-call? .hall-of-fame get-player-score tx-sender)

;; Submit if better
(contract-call? .hall-of-fame submit-score u10000)
```

### Track Progress
```clarity
;; Submit initial score
(contract-call? .hall-of-fame submit-score u1000)

;; Check rank
(contract-call? .hall-of-fame get-player-rank tx-sender)

;; Improve and resubmit
(contract-call? .hall-of-fame submit-score u5000)

;; Check new rank
(contract-call? .hall-of-fame get-player-rank tx-sender)
```

### Compete with Friends
```clarity
;; You submit
(contract-call? .hall-of-fame submit-score u8000)

;; Friend submits
(contract-call? .hall-of-fame submit-score u8500)

;; Check who's ahead
(contract-call? .hall-of-fame get-player-rank tx-sender)
(contract-call? .hall-of-fame get-player-rank 'ST1FRIEND_ADDRESS)
```

## Competitive Features

### Personal Bests
- Only your highest score counts
- Can't go down in score
- Multiple submissions allowed
- Best score tracked automatically

### Global Rankings
- See where you stand
- Compare with others
- Track improvements
- Celebrate milestones

### Top 10 Club
- Elite group visibility
- Constantly updating
- Competitive pressure
- Bragging rights

## Deployment

### Testnet
```bash
clarinet deployments generate --testnet --low-cost
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

### Mainnet
```bash
clarinet deployments generate --mainnet
clarinet deployments apply -p deployments/default.mainnet-plan.yaml
```

## Roadmap

- [ ] Write the core contract
- [ ] Add comprehensive tests
- [ ] Deploy to testnet
- [ ] Add score categories (daily/weekly/all-time)
- [ ] Implement seasons/resets
- [ ] Add player profiles with stats
- [ ] Support team leaderboards
- [ ] Add achievement badges
- [ ] Implement reward distribution

## Advanced Features (Future)

**Multiple Leaderboards:**
- Daily leaderboard
- Weekly leaderboard
- Monthly leaderboard
- All-time leaderboard

**Score Categories:**
- Different game modes
- Difficulty levels
- Achievement types
- Custom categories

**Rewards:**
- Top 10 get NFT badges
- Seasonal rewards
- Milestone prizes
- Rank-based benefits

**Social Features:**
- Player profiles
- Score history
- Challenge friends
- Share achievements

**Analytics:**
- Score distribution
- Rank progression
- Average scores
- Climb rate

## Security Features

- ✅ One best score per player
- ✅ Can't lower your score
- ✅ Timestamps prevent manipulation
- ✅ Automatic ranking (no admin bias)
- ✅ Transparent on-chain records
- ✅ No score deletion

## Best Practices

**Submitting Scores:**
- Submit only valid scores
- Don't spam submissions
- Verify score before submitting
- Celebrate improvements

**Competitive Play:**
- Play fair
- Respect other players
- Push your limits
- Have fun competing

**Gas Optimization:**
- Submit significant improvements only
- Batch submissions if possible
- Check rank periodically, not constantly

## Scoring Tips

💡 **Strategy:**
- Focus on consistent improvement
- Study top players
- Practice before submitting
- Set personal goals

🎯 **Milestones:**
- Break into top 100
- Reach top 50
- Enter top 25
- Make it to top 10
- Claim #1 spot!

## Important Notes

⚠️ **Know Before Playing:**
- Scores are permanent on-chain
- Can only improve, never lower
- Rankings update in real-time
- Top 10 is highly competitive

💡 **Competitive Tips:**
- Check leaderboard often
- Know what score you need to beat
- Track your rank progression
- Stay motivated!

## Limitations

**Current Constraints:**
- Top 10 only (can be expanded to top 100)
- One score per player
- No score categories yet
- Manual submission required

**Design Choices:**
- Simple ranking keeps gas low
- Top 10 creates focus
- Best score only prevents spam
- Public data encourages competition

## Community Ideas

**Tournaments:**
- Host weekly competitions
- Special event leaderboards
- Prize pools for winners
- Community championships

**Challenges:**
- Beat the developer's score
- Reach top 10 challenge
- Climb 10 ranks in a day
- Score milestone challenges

## Contributing

This is a learning project! Feel free to:
- Open issues for questions
- Submit PRs for improvements
- Fork and experiment
- Share your high scores

## License

MIT License - do whatever you want with it

## Resources

- [Clarity Language Reference](https://docs.stacks.co/clarity)
- [Clarinet Documentation](https://github.com/hirosystems/clarinet)
- [Stacks Blockchain](https://www.stacks.co/)
- [Sorting Algorithms Guide](https://book.clarity-lang.org/)

---

Built while learning Clarity 🏆

## Motivational Quotes

"Champions aren't made in gyms. Champions are made from something they have deep inside them - a desire, a dream, a vision." 

Climb the ranks. Make history. Join the Hall of Fame. 🌟

---

**Current High Score:** ??? 
**Your Best:** ???
**Rank:** ???

**Will you make it to the top?** 🚀

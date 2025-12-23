# How to Play Pixel Pony PVP on CeloScan

This guide shows you how to interact with the Pixel Pony PVP smart contract directly through CeloScan, without using the frontend.

## Contract Address
**PonyPVP Contract**: `0x739331647Fa2dBefe2c7A2E453A26Ee9f4a9965A`

**CeloScan Link**: https://celoscan.io/address/0x739331647Fa2dBefe2c7A2E453A26Ee9f4a9965A#code

## Prerequisites
- Connect your wallet to CeloScan (MetaMask, Valora, etc.)
- Have CELO for gas fees
- Have PONY tokens if betting with PONY: `0x000BE46901ea6f7ac2c1418D158f2f0A80992c07`
- Know how to approve tokens (if betting ERC20 tokens)

## Game Constants (Read Functions)

Before playing, understand these game parameters:

| Function | Value | Description |
|----------|-------|-------------|
| `HORSE_COUNT` | 16 | Total horses in the stable |
| `HORSES_PER_PLAYER` | 8 | Each player picks 8 horses |
| `HORSES_PER_PHASE` | 4 | Pick 4 horses per turn |
| `TOTAL_GAME_TIME` | 600 seconds | 10 minutes to complete horse selection |
| `PHASE_TIMEOUT` | 180 seconds | 3 minutes per picking turn |
| `entryFee` | Check current | Platform entry fee in CELO (payable with each action) |

## Match States

Matches progress through these states:
- **0 = WaitingForOpponent**: Match created, waiting for someone to join
- **1 = Joined**: Opponent joined, waiting for first picker to start
- **2 = Selecting**: Horse selection in progress
- **3 = ReadyToRace**: All horses selected, ready to execute race
- **4 = Completed**: Race finished (also used for canceled matches)
- **5 = Canceled**: Explicitly canceled match

---

## Step-by-Step: Playing a Match

### 1. Create a Match

**Function**: `createMatch`

**Parameters**:
- `_betToken` (address): Token contract address
  - For PONY: `0x000BE46901ea6f7ac2c1418D158f2f0A80992c07`
  - For CELO: `0x0000000000000000000000000000000000000000`
- `_betAmount` (uint256): Amount to bet in wei
  - Example: 1 PONY = `1000000000000000000` (18 decimals)
  - Example: 0.1 CELO = `100000000000000000`
- `_isNFT` (bool): Set to `false` for token bets, `true` for NFT bets
- `_nftTokenId` (uint256): Set to `0` if not betting NFTs

**Payable Amount**: Add the `entryFee` amount in CELO (check with `entryFee()` function first)

**Example**:
```
_betToken: 0x000BE46901ea6f7ac2c1418D158f2f0A80992c07
_betAmount: 1000000000000000000
_isNFT: false
_nftTokenId: 0
Value (CELO): [current entryFee value]
```

**Returns**: `matchId` (bytes32) - Save this! You'll need it for all future interactions.

**Note**: If betting ERC20 tokens (like PONY), you must first approve the PVP contract to spend your tokens:
1. Go to the token contract (e.g., PONY token)
2. Call `approve` function with spender = `0x739331647Fa2dBefe2c7A2E453A26Ee9f4a9965A` and amount = your bet amount

---

### 2. Join an Existing Match

**Function**: `joinMatch`

**Parameters**:
- `_matchId` (bytes32): The match ID you want to join (from `createMatch` or shared by creator)
- `_opponentNftTokenId` (uint256): Set to `0` if not betting NFTs

**Payable Amount**: Add the `entryFee` amount in CELO

**Example**:
```
_matchId: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
_opponentNftTokenId: 0
Value (CELO): [current entryFee value]
```

**Important**:
- You must match the bet amount and token of the original match
- Approve tokens first if it's an ERC20 bet
- The contract randomly assigns who picks first

---

### 3. Check Match Info

**Function**: `getMatch`

**Parameters**:
- `_matchId` (bytes32): Your match ID

**Returns**:
- `creator` (address): Who created the match
- `opponent` (address): Who joined (0x000...000 if no one yet)
- `betToken` (address): Token being bet
- `betAmount` (uint256): Amount being bet
- `isNFT` (bool): Whether it's an NFT bet
- `state` (uint8): Current match state (0-5)
- `creatorHorses` (uint8[]): Horses picked by creator
- `opponentHorses` (uint8[]): Horses picked by opponent
- `firstPicker` (address): Who picks first
- `winners` (uint256[3]): Race winners [1st, 2nd, 3rd] (0s if not raced yet)

---

### 4. Check Whose Turn It Is

**Function**: `getCurrentPicker`

**Parameters**:
- `_matchId` (bytes32): Your match ID

**Returns**: Address of the player whose turn it is to pick horses

---

### 5. Select Your Horses

**Function**: `selectHorses`

**Parameters**:
- `_matchId` (bytes32): Your match ID
- `_horseIds` (uint8[]): Array of 4 horse IDs (0-15)

**Example for first pick**:
```
_matchId: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
_horseIds: [0, 3, 7, 11]
```

**Horse Selection Rules**:
1. You must pick exactly 4 horses per turn
2. You pick twice (total 8 horses)
3. Players alternate: First picker → Second picker → First picker → Second picker (auto-selected)
4. Horse IDs range from 0 to 15
5. You cannot pick horses already selected by either player
6. The last 4 horses are automatically assigned to the second picker (no need to call selectHorses)

**Picking Order**:
- Turn 1: First picker selects 4 horses
- Turn 2: Second picker selects 4 horses
- Turn 3: First picker selects 4 more horses (their final 4)
- Turn 4: Second picker automatically gets the remaining 4 horses

---

### 6. Execute the Race

**Function**: `executeRace`

**Parameters**:
- `_matchId` (bytes32): Your match ID

**When to call**: After all 16 horses are selected (state = 3 = ReadyToRace)

**What happens**:
- Contract randomly determines race winners (1st, 2nd, 3rd place)
- Winners are stored in the match data
- Match state changes to 4 (Completed)

---

### 7. Check Your Winnings

**Function**: `getClaimableAmount`

**Parameters**:
- `_matchId` (bytes32): Your match ID
- `_player` (address): Your wallet address

**Returns**: Amount you can claim (uint256) in wei

**Prize Distribution**:
- 1st place: 60% of pot (6000 basis points)
- 2nd place: 30% of pot (3000 basis points)
- 3rd place: 10% of pot (1000 basis points)
- Platform takes 5% fee from entry fees (500 basis points)

---

### 8. Claim Your Winnings

**Function**: `claimWinnings`

**Parameters**:
- `_matchId` (bytes32): Your match ID

**When to call**: After the race is executed and you have winning horses

**What happens**:
- Contract transfers your winnings to your wallet
- You can only claim once per match
- If you have multiple winning horses, all winnings are combined

---

### 9. Cancel a Match (If Needed)

**Function**: `cancelMatch`

**Parameters**:
- `_matchId` (bytes32): Your match ID

**When you can cancel**:
- Match is in WaitingForOpponent state (no one joined within 10 minutes)
- OR during horse selection if opponent times out (doesn't pick within 3 minutes)

**What happens**:
- Match state changes to 5 (Canceled) or 4 (Completed) without winners
- Your bet and entry fee are refunded
- Match moves to completed section

---

## Reading Your Match History

**Function**: `getUserMatches`

**Parameters**:
- `_user` (address): Your wallet address

**Returns**: Array of all your match IDs (bytes32[])

Then use `getMatch` for each matchId to see details.

---

## Advanced: Reading Match Details

**Function**: `matches` (direct mapping read)

**Parameters**:
- `(bytes32)`: Match ID

**Returns** (different from `getMatch`):
- `matchId` (bytes32)
- `creator` (address)
- `opponent` (address)
- `betToken` (address)
- `betAmount` (uint256)
- `nftTokenId` (uint256)
- `opponentNftTokenId` (uint256)
- `isNFT` (bool)
- `totalPot` (uint256): Combined pot size
- `gameStartTime` (uint256): Unix timestamp when selection started
- `lastPickTime` (uint256): Unix timestamp of last horse pick
- `firstPicker` (address)
- `pickCount` (uint8): Total horses picked so far
- `state` (uint8)
- `createdAt` (uint256): Unix timestamp when match was created

**Use this when you need**: Timestamps for timeout checking

---

## Common Issues & Solutions

### "Insufficient allowance" error
- You need to approve the PVP contract to spend your tokens first
- Go to the token contract → `approve` → spender: PVP contract address, amount: your bet

### "Not your turn" error
- Check `getCurrentPicker` to see whose turn it is
- Wait for your opponent to pick their horses

### "Invalid horse selection" error
- Make sure you're picking exactly 4 horses
- Check that horses aren't already selected (use `getMatch` to see taken horses)
- Horse IDs must be 0-15

### "Match timed out" error
- Match creation expires after 10 minutes with no opponent
- Each picking turn expires after 3 minutes
- Call `cancelMatch` to get your funds back

### "Already claimed" error
- You can only claim winnings once per match
- Check if you already claimed

---

## Example: Complete Match Flow on CeloScan

**Player A (Creator)**:
1. Approve PONY tokens: Go to PONY contract → `approve(0x739331647Fa2dBefe2c7A2E453A26Ee9f4a9965A, 1000000000000000000)`
2. Create match: `createMatch(0x000BE46901ea6f7ac2c1418D158f2f0A80992c07, 1000000000000000000, false, 0)` + pay entry fee
3. Copy the returned `matchId`, share with opponent
4. Wait for opponent to join (check `getMatch` periodically)
5. Check if you're first picker: Compare your address with result from `getCurrentPicker`
6. If you're first: `selectHorses(matchId, [2, 5, 9, 14])`
7. Wait for opponent's first pick
8. Pick your remaining 4: `selectHorses(matchId, [1, 6, 10, 13])`
9. Wait for match to reach state 3 (ReadyToRace)
10. Execute race: `executeRace(matchId)`
11. Check winners: `getMatch(matchId)` → look at `winners` array
12. Check winnings: `getClaimableAmount(matchId, yourAddress)`
13. Claim: `claimWinnings(matchId)`

**Player B (Joiner)**:
1. Approve PONY tokens (same as Player A)
2. Join match: `joinMatch(matchId, 0)` + pay entry fee
3. Check if you're first picker: `getCurrentPicker(matchId)`
4. Wait your turn, then pick 4 horses
5. Wait for opponent's second pick
6. Your last 4 horses are auto-selected (no action needed)
7. Execute race (either player can do this)
8. Check and claim winnings

---

## Tips for Using CeloScan

1. **Save your match IDs**: Copy them to a note/spreadsheet
2. **Check entry fee first**: Always read `entryFee()` before creating/joining
3. **Use "Query" for read functions**: No gas cost, instant results
4. **Use "Write Contract" for actions**: Requires wallet signature and gas
5. **Wait for confirmations**: Transactions take ~5 seconds on Celo
6. **Check state before actions**: Use `getMatch` to verify match state
7. **Monitor timeouts**: Keep track of time limits (10 min to join, 3 min per pick)

---

## Contract Events (for tracking)

You can monitor these events on CeloScan's "Events" tab:

- `MatchCreated`: When a new match is created
- `MatchJoined`: When opponent joins
- `HorseSelected`: Each time a horse is picked
- `RaceExecuted`: When race completes
- `WinningsClaimed`: When someone claims prizes
- `MatchCanceled`: When a match is canceled
- `EntryFeeUpdated`: When platform changes entry fee

---

## Support

If you get stuck:
- Check the match state with `getMatch`
- Verify you have sufficient token approvals
- Ensure you have CELO for gas fees
- Check that it's actually your turn with `getCurrentPicker`
- Verify the match hasn't timed out

For technical issues with the contract itself, contact the Pixel Pony team.

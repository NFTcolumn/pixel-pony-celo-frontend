# PonyPvP Frontend Integration Reference

## Contract Details

**Network**: Celo Mainnet
**Contract Address**: `0x5377EA69528665c23a0213D49cC79332CF8B8d22`
**Entry Fee**: `0.001 CELO` per player
**Platform Fee**: `2.5%` of total pot

## Quick Start

```javascript
import { ethers } from 'ethers';

// Contract address
const PONY_PVP_ADDRESS = "0x5377EA69528665c23a0213D49cC79332CF8B8d22";

// Initialize contract
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const ponyPvP = new ethers.Contract(PONY_PVP_ADDRESS, PONY_PVP_ABI, signer);
```

---

## Constants

```javascript
// Game Configuration
const HORSE_COUNT = 16;              // Total horses in race
const HORSES_PER_PLAYER = 8;         // Each player owns 8 horses
const HORSES_PER_PHASE = 4;          // Select 4 horses per turn

// Payout Structure (Basis Points: 10000 = 100%)
const FIRST_PLACE_BP = 8000;         // 80% to 1st place
const SECOND_PLACE_BP = 1750;        // 17.5% to 2nd place
const THIRD_PLACE_BP = 250;          // 2.5% to 3rd place
const PLATFORM_FEE_BP = 250;         // 2.5% platform fee

// Entry Fee Configuration
const MAX_ENTRY_FEE = ethers.utils.parseEther("5");  // 5 native tokens max
const ENTRY_FEE_RESERVE_BP = 1000;   // 10% of entry fees reserved for gas

// Timing Configuration
const PHASE_TIMEOUT = 120;           // 2 minutes (120 seconds) per phase
const TOTAL_GAME_TIME = 600;         // 10 minutes (600 seconds) max from opponent join

// Match States
const MatchState = {
  Created: 0,        // Creator paid, waiting for opponent
  Active: 1,         // Both paid, selecting horses (timed)
  ReadyToRace: 2,    // All horses selected, ready to race
  Completed: 3,      // Race finished, winners paid
  Cancelled: 4       // Cancelled (only if opponent never joined)
};
```

---

## Core Functions

### 1. Create Match

```javascript
// Create a new PVP match
async function createMatch(tokenAddress, betAmount, isNFT = false, nftTokenId = 0) {
  // Get entry fee
  const entryFee = await ponyPvP.entryFee();

  // Approve tokens first (if ERC20)
  if (!isNFT) {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const approveTx = await token.approve(PONY_PVP_ADDRESS, betAmount);
    await approveTx.wait();
  }

  // Create match (pay entry fee in native token)
  const tx = await ponyPvP.createMatch(
    tokenAddress,
    betAmount,
    isNFT,
    nftTokenId,
    { value: entryFee }
  );

  const receipt = await tx.wait();

  // Extract matchId from event
  const event = receipt.events.find(e => e.event === 'MatchCreated');
  const matchId = event.args.matchId;

  return matchId;
}
```

**Parameters**:
- `_betToken` (address): ERC20 token address to bet
- `_betAmount` (uint256): Amount of tokens to bet (NO LIMIT!)
- `_isNFT` (bool): Whether betting NFT (set to false for ERC20)
- `_nftTokenId` (uint256): NFT token ID (set to 0 for ERC20)

**Payable**: Must send entry fee in native tokens (CELO)

**Returns**: `bytes32 matchId` (share this with your opponent!)

**Events**: `MatchCreated(matchId, creator, betToken, betAmount, isNFT, nftTokenId)`

---

### 2. Join Match

```javascript
// Join an existing match using matchId
async function joinMatch(matchId, tokenAddress, betAmount) {
  // Get entry fee
  const entryFee = await ponyPvP.entryFee();

  // Get match details to see bet amount
  const match = await ponyPvP.getMatch(matchId);

  // Approve tokens
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const approveTx = await token.approve(PONY_PVP_ADDRESS, match.betAmount);
  await approveTx.wait();

  // Join match (pay entry fee)
  const tx = await ponyPvP.joinMatch(matchId, { value: entryFee });
  const receipt = await tx.wait();

  // Get who picks first
  const event = receipt.events.find(e => e.event === 'MatchJoined');
  const firstPicker = event.args.firstPicker;

  return firstPicker;
}
```

**Parameters**:
- `_matchId` (bytes32): Match ID from creator

**Payable**: Must send entry fee in native tokens

**Events**: `MatchJoined(matchId, opponent, firstPicker)`

**Important**:
- Payment = confirmation! Once both players pay, tokens go to escrow
- No going back after payment
- Random firstPicker is selected automatically

---

### 3. Select Horses

```javascript
// Select horses in phases (4 horses per turn)
async function selectHorses(matchId, horseIds) {
  const tx = await ponyPvP.selectHorses(matchId, horseIds);
  await tx.wait();
}

// Example: Phase-based selection flow
async function handleHorseSelection(matchId, playerAddress) {
  const match = await ponyPvP.getMatch(matchId);
  const currentPicker = await ponyPvP.getCurrentPicker(matchId);

  if (currentPicker !== playerAddress) {
    console.log("Not your turn to pick!");
    return;
  }

  // Determine phase based on total picks
  const totalPicked = match.creatorHorses.length + match.opponentHorses.length;

  let phase;
  if (totalPicked < 4) phase = 1;
  else if (totalPicked < 8) phase = 2;
  else if (totalPicked < 12) phase = 3;
  else phase = 4;

  console.log(`Phase ${phase}: Select 4 horses`);

  // User selects 4 horses from available
  const selectedHorses = await getUserSelection(); // Your UI logic

  await selectHorses(matchId, selectedHorses);
}
```

**Parameters**:
- `_matchId` (bytes32): Match ID
- `_horseIds` (uint8[]): Array of 4 horse IDs (0-15)

**Selection Flow**:
1. **Phase 1**: First picker selects horses 0-15 (picks 4)
2. **Phase 2**: Second picker selects from remaining (picks 4)
3. **Phase 3**: First picker selects from remaining (picks 4)
4. **Phase 4**: Second picker selects from remaining (picks 4)

**Events**: `HorseSelected(matchId, player, horseId, pickNumber)` (fires 4 times)

---

### 4. Execute Race

```javascript
// Execute the race once all horses are selected
async function executeRace(matchId) {
  const tx = await ponyPvP.executeRace(matchId);
  const receipt = await tx.wait();

  // Get race results
  const event = receipt.events.find(e => e.event === 'RaceCompleted');
  const winners = event.args.winners;          // [1st, 2nd, 3rd] horse IDs
  const winningPlayers = event.args.winningPlayers; // [1st, 2nd, 3rd] player addresses

  return { winners, winningPlayers };
}
```

**Parameters**:
- `_matchId` (bytes32): Match ID

**Events**: `RaceCompleted(matchId, winners[3], winningPlayers[3])`

**Important**:
- Payouts are AUTOMATIC! Winners receive tokens immediately
- If one player wins multiple places, payouts accumulate
- Platform takes 2.5% fee
- Example: 20k pot → 15,600 to 1st, 3,400 to 2nd, 500 to 3rd, 500 platform fee

---

### 5. Cancel Match

```javascript
// Cancel match if opponent hasn't joined yet
async function cancelMatch(matchId) {
  const tx = await ponyPvP.cancelMatch(matchId);
  await tx.wait();
}
```

**Parameters**:
- `_matchId` (bytes32): Match ID

**Requirements**:
- Only creator can cancel
- Can only cancel if state is "Created" (opponent hasn't joined)
- Refunds creator's entry fee and bet tokens

**Events**: `MatchCancelled(matchId, canceller)`

---

## View Functions (Read-Only)

### Get Match Details

```javascript
async function getMatch(matchId) {
  const match = await ponyPvP.getMatch(matchId);
  return {
    creator: match.creator,
    opponent: match.opponent,
    betToken: match.betToken,
    betAmount: match.betAmount,
    isNFT: match.isNFT,
    state: match.state,              // 0=Created, 1=Active, 2=ReadyToRace, 3=Completed
    creatorHorses: match.creatorHorses,    // Array of horse IDs
    opponentHorses: match.opponentHorses,  // Array of horse IDs
    firstPicker: match.firstPicker,
    winners: match.winners           // [1st, 2nd, 3rd] after race
  };
}
```

### Get Current Picker

```javascript
async function getCurrentPicker(matchId) {
  const picker = await ponyPvP.getCurrentPicker(matchId);
  return picker; // Address of player who should pick now
}
```

### Get User's Matches

```javascript
async function getUserMatches(userAddress) {
  const matchIds = await ponyPvP.getUserMatches(userAddress);
  return matchIds; // Array of matchId bytes32
}
```

### Get Claimable Amount (For Manual Claims)

```javascript
async function getClaimableAmount(matchId, playerAddress) {
  const amount = await ponyPvP.getClaimableAmount(matchId, playerAddress);
  return amount; // uint256 (should be 0 with automatic payouts)
}
```

**Note**: With automatic payouts enabled, this will always return 0 after race completes!

### Get Entry Fee

```javascript
async function getEntryFee() {
  const fee = await ponyPvP.entryFee();
  return fee; // uint256 in wei
}
```

### Get Timing Constants

```javascript
async function getTimingConfig() {
  const phaseTimeout = await ponyPvP.PHASE_TIMEOUT();
  const totalGameTime = await ponyPvP.TOTAL_GAME_TIME();

  return {
    phaseTimeout: phaseTimeout.toNumber(),    // 120 seconds (2 minutes)
    totalGameTime: totalGameTime.toNumber()   // 600 seconds (10 minutes)
  };
}
```

### Get Entry Fee Reserve

```javascript
async function getEntryFeeReserve() {
  const reserveBP = await ponyPvP.ENTRY_FEE_RESERVE_BP();
  return reserveBP.toNumber(); // 1000 = 10%
}
```

---

## Events to Listen To

### MatchCreated

```javascript
ponyPvP.on("MatchCreated", (matchId, creator, betToken, betAmount, isNFT, nftTokenId) => {
  console.log(`New match created: ${matchId}`);
  console.log(`Creator: ${creator}`);
  console.log(`Bet: ${ethers.utils.formatUnits(betAmount, 18)} tokens`);

  // Update UI: Show "Waiting for opponent..."
});
```

### MatchJoined

```javascript
ponyPvP.on("MatchJoined", (matchId, opponent, firstPicker, gameStartTime) => {
  console.log(`Match ${matchId} started!`);
  console.log(`Opponent: ${opponent}`);
  console.log(`First picker: ${firstPicker}`);
  console.log(`Game start time: ${new Date(gameStartTime * 1000).toLocaleString()}`);

  // Calculate deadline: 10 minutes from game start
  const deadline = gameStartTime + 600; // 600 seconds = 10 minutes
  console.log(`Game must complete by: ${new Date(deadline * 1000).toLocaleString()}`);

  // Update UI: Start horse selection phase
  // Show who picks first
  // Start countdown timer
});
```

### HorseSelected

```javascript
ponyPvP.on("HorseSelected", (matchId, player, horseId, pickNumber) => {
  console.log(`${player} selected horse #${horseId} (pick ${pickNumber}/16)`);

  // Update UI: Show selected horse
  // Update available horses list
  // Check if it's your turn
});
```

### RaceCompleted

```javascript
ponyPvP.on("RaceCompleted", (matchId, winners, winningPlayers) => {
  console.log(`Race completed! Match: ${matchId}`);
  console.log(`1st Place: Horse #${winners[0]} - Winner: ${winningPlayers[0]}`);
  console.log(`2nd Place: Horse #${winners[1]} - Winner: ${winningPlayers[1]}`);
  console.log(`3rd Place: Horse #${winners[2]} - Winner: ${winningPlayers[2]}`);

  // Update UI: Show race results
  // Winners already received tokens automatically!
});
```

### MatchCancelled

```javascript
ponyPvP.on("MatchCancelled", (matchId, canceller) => {
  console.log(`Match ${matchId} cancelled by ${canceller}`);

  // Update UI: Remove match from active list
});
```

---

## Complete Frontend Flow

### 1. Creating a Match

```javascript
async function handleCreateMatch(tokenAddress, betAmount) {
  try {
    // Show loading
    setLoading(true);

    // Create match
    const matchId = await createMatch(tokenAddress, betAmount);

    // Show success + share link
    setMatchId(matchId);
    setShareLink(`https://yourapp.com/pvp/${matchId}`);

    // Listen for opponent
    ponyPvP.once("MatchJoined", (mid, opponent, firstPicker) => {
      if (mid === matchId) {
        setOpponent(opponent);
        setFirstPicker(firstPicker);
        setGameState("SELECTING");
      }
    });

  } catch (error) {
    console.error("Failed to create match:", error);
    alert("Failed to create match. Check token approval and balance.");
  } finally {
    setLoading(false);
  }
}
```

### 2. Joining a Match

```javascript
async function handleJoinMatch(matchId) {
  try {
    setLoading(true);

    // Get match details first
    const match = await ponyPvP.getMatch(matchId);

    // Show bet details to user for confirmation
    const confirmed = await confirmJoin(match.betAmount, match.betToken);
    if (!confirmed) return;

    // Join match
    const firstPicker = await joinMatch(matchId, match.betToken, match.betAmount);

    setFirstPicker(firstPicker);
    setGameState("SELECTING");

  } catch (error) {
    console.error("Failed to join match:", error);
    alert("Failed to join match. Check token approval and balance.");
  } finally {
    setLoading(false);
  }
}
```

### 3. Horse Selection UI

```javascript
async function handleHorseSelection(matchId) {
  // Listen for all horse selections
  ponyPvP.on("HorseSelected", async (mid, player, horseId, pickNumber) => {
    if (mid !== matchId) return;

    // Update selected horses display
    setSelectedHorses(prev => [...prev, { horseId, player, pickNumber }]);

    // Check if it's your turn
    const currentPicker = await ponyPvP.getCurrentPicker(matchId);
    setIsYourTurn(currentPicker === userAddress);

    // Check if selection is complete
    if (pickNumber === 16) {
      setGameState("READY_TO_RACE");
    }
  });
}

async function selectMyHorses(matchId, horseIds) {
  try {
    await selectHorses(matchId, horseIds);
    setIsYourTurn(false);

  } catch (error) {
    console.error("Horse selection failed:", error);
    alert("Selection failed. It might not be your turn.");
  }
}
```

### 4. Execute Race and Show Results

```javascript
async function handleExecuteRace(matchId) {
  try {
    setLoading(true);
    setGameState("RACING");

    const { winners, winningPlayers } = await executeRace(matchId);

    // Determine profit/loss
    const match = await ponyPvP.getMatch(matchId);
    const isWinner = winningPlayers.includes(userAddress);

    // Calculate earnings
    let earnings = 0;
    if (isWinner) {
      winningPlayers.forEach((player, index) => {
        if (player === userAddress) {
          const percentages = [0.80, 0.175, 0.025]; // 80%, 17.5%, 2.5%
          earnings += match.betAmount * 2 * percentages[index];
        }
      });
    }

    const profit = earnings - match.betAmount;

    // Show results
    setRaceResults({
      winners,
      winningPlayers,
      profit,
      isWinner
    });

    setGameState("COMPLETED");

  } catch (error) {
    console.error("Race execution failed:", error);
    alert("Race failed. All horses must be selected first.");
  } finally {
    setLoading(false);
  }
}
```

---

## Helper Functions

### Format Match State

```javascript
function formatMatchState(stateNum) {
  const states = {
    0: "Waiting for Opponent",
    1: "Selecting Horses",
    2: "Ready to Race",
    3: "Race Completed",
    4: "Cancelled"
  };
  return states[stateNum] || "Unknown";
}
```

### Get Available Horses

```javascript
async function getAvailableHorses(matchId) {
  const match = await ponyPvP.getMatch(matchId);
  const takenHorses = [
    ...match.creatorHorses.map(h => h.toNumber()),
    ...match.opponentHorses.map(h => h.toNumber())
  ];

  const allHorses = Array.from({ length: 16 }, (_, i) => i);
  return allHorses.filter(h => !takenHorses.includes(h));
}
```

### Calculate Potential Winnings

```javascript
function calculatePotentialWinnings(betAmount, place) {
  const totalPot = betAmount.mul(2); // Both players bet
  const afterFee = totalPot.mul(9750).div(10000); // After 2.5% platform fee

  const percentages = {
    1: 8000,  // 80%
    2: 1750,  // 17.5%
    3: 250    // 2.5%
  };

  return afterFee.mul(percentages[place]).div(10000);
}
```

### Share Match Link

```javascript
function generateShareLink(matchId) {
  const baseUrl = window.location.origin;
  return `${baseUrl}/pvp/join/${matchId}`;
}

function shareMatchViaTwitter(matchId, betAmount) {
  const shareLink = generateShareLink(matchId);
  const text = `Challenge accepted! 🏇 I'm betting ${ethers.utils.formatUnits(betAmount, 18)} tokens in Pony PVP. Join me: ${shareLink}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(twitterUrl, '_blank');
}
```

---

## Important Notes

### ⚠️ No Bet Limits
- Players can bet ANY amount of tokens
- Contract acts as trusted escrow
- No maximum bet restrictions

### ⏰ Timed Selection
- 2 minutes per phase to select horses
- 10 minutes max total game time from opponent join
- Auto-select kicks in if timeout (future feature)

### 💰 Automatic Payouts
- Winners receive tokens IMMEDIATELY when race completes
- 10% of entry fees stay in contract for gas
- No manual claiming needed

### 🎲 Fair Randomness
- First picker selected randomly on-chain
- Horse race speeds use on-chain randomness
- Block.prevrandao for unpredictability

### 📊 Payout Structure
- 80% to 1st place
- 17.5% to 2nd place
- 2.5% to 3rd place
- If one player wins multiple places, payouts accumulate

### 🎮 Game States
- **Created**: Match created, waiting for opponent
- **Active**: Both players paid, selecting horses (10 min max)
- **ReadyToRace**: All 16 horses selected, ready to execute
- **Completed**: Race finished, winners paid automatically
- **Cancelled**: Match cancelled before opponent joined

---

## Full ABI

See `PonyPvP_ABI.json` for the complete contract ABI.

---

## Testing on Celo

**Contract**: `0x5377EA69528665c23a0213D49cC79332CF8B8d22`
**Network**: Celo Mainnet (Chain ID: 42220)
**RPC**: `https://forno.celo.org`

```javascript
// Add Celo network to MetaMask
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0xa4ec',
    chainName: 'Celo Mainnet',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    rpcUrls: ['https://forno.celo.org'],
    blockExplorerUrls: ['https://celoscan.io']
  }]
});
```

---

## Support

For issues or questions:
- Check transaction on Celoscan: `https://celoscan.io/address/0x5377EA69528665c23a0213D49cC79332CF8B8d22`
- Review test results in: `CELO_PVP_CUSTOM_TOKEN_TEST_*.json`

---

**Built with ❤️ for the Pony Racing community**

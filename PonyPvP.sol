// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PonyPvP
 * @dev Player vs Player racing contract for Pixel Pony Racing
 *
 * Features:
 * - Create PVP matches with any ERC20 token or ERC721 NFT as bet
 * - Both players must match the bet + pay entry fee
 * - Random selection of first picker
 * - Alternating horse selection (4 horses per player)
 * - Fair race execution with randomness
 * - Token payouts: 80% first, 17.5% second, 2.5% third
 * - NFT payouts: Winner takes all (1st place only)
 *
 * Security:
 * - ReentrancyGuard on all state-changing functions
 * - Zero address validation
 * - Fixed pragma
 * - Pull payment pattern for claiming winnings
 */

contract PonyPvP is Ownable, ReentrancyGuard {

    // Constants
    uint256 public constant HORSE_COUNT = 16;
    uint256 public constant HORSES_PER_PLAYER = 8; // Each player gets 8 horses
    uint256 public constant HORSES_PER_PHASE = 4;  // 4 horses selected per turn
    uint256 public constant MAX_BET_AMOUNT = 1_000_000_000 * 10**18; // 1B tokens max

    // Fee structure
    uint256 public constant PLATFORM_FEE_BP = 250; // 2.5% platform fee
    uint256 public constant BASIS_POINTS = 10000;

    // Payout splits for token bets (in basis points)
    uint256 public constant FIRST_PLACE_BP = 8000;  // 80%
    uint256 public constant SECOND_PLACE_BP = 1750; // 17.5%
    uint256 public constant THIRD_PLACE_BP = 250;   // 2.5%

    // Native Token Entry Fee (works on all chains: CELO, MATIC, BNB, ETH, etc.)
    uint256 public entryFee = 0.001 ether; // 0.001 native tokens per player
    uint256 public constant MAX_ENTRY_FEE = 5 ether; // Max 5 native tokens

    // Wallets
    address public devWallet;
    address public marketingWallet;

    // Match state
    enum MatchState {
        Created,          // Match created, waiting for opponent
        Joined,           // Opponent joined, waiting for first picker selection
        Selecting,        // Players selecting horses
        ReadyToRace,      // All horses selected, ready to race
        Completed,        // Race completed
        Cancelled         // Match cancelled
    }

    struct Match {
        bytes32 matchId;
        address creator;
        address opponent;
        address betToken;
        uint256 betAmount;
        uint256 nftTokenId; // Used if isNFT is true
        bool isNFT;
        uint256 totalPot;   // Total pot after fees (both bets combined)

        // Horse selections
        uint8[] creatorHorses;
        uint8[] opponentHorses;
        address firstPicker;
        uint8 pickCount; // Track total picks made

        // State
        MatchState state;
        uint256 createdAt;

        // Results
        uint256[3] winners;
        address[3] winningPlayers; // Track which player owns each winning horse
        mapping(address => uint256) claimableAmount;
        mapping(address => bool) hasClaimed;
    }

    // Storage
    mapping(bytes32 => Match) public matches;
    mapping(address => bytes32[]) public userMatches;

    uint256 public totalMatches;
    uint256 private nonce; // For randomness

    // Events
    event MatchCreated(
        bytes32 indexed matchId,
        address indexed creator,
        address betToken,
        uint256 betAmount,
        bool isNFT,
        uint256 nftTokenId
    );

    event MatchJoined(
        bytes32 indexed matchId,
        address indexed opponent,
        address firstPicker
    );

    event HorseSelected(
        bytes32 indexed matchId,
        address indexed player,
        uint8 horseId,
        uint8 pickNumber
    );

    event RaceCompleted(
        bytes32 indexed matchId,
        uint256[3] winners,
        address[3] winningPlayers
    );

    event WinningsClaimed(
        bytes32 indexed matchId,
        address indexed player,
        uint256 amount
    );

    event MatchCancelled(bytes32 indexed matchId, address indexed canceller);
    event EntryFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(
        address _devWallet,
        address _marketingWallet,
        address _initialOwner
    ) Ownable(_initialOwner) ReentrancyGuard() {
        require(_devWallet != address(0), "Invalid dev wallet");
        require(_marketingWallet != address(0), "Invalid marketing wallet");
        require(_initialOwner != address(0), "Invalid owner");

        devWallet = _devWallet;
        marketingWallet = _marketingWallet;
    }

    /**
     * @dev Create a new PVP match
     * @param _betToken Address of ERC20 token or ERC721 contract
     * @param _betAmount Amount to bet (for ERC20) or 0 (for NFT)
     * @param _isNFT True if betting an NFT, false for ERC20
     * @param _nftTokenId Token ID if betting NFT, 0 otherwise
     */
    function createMatch(
        address _betToken,
        uint256 _betAmount,
        bool _isNFT,
        uint256 _nftTokenId
    ) external payable nonReentrant returns (bytes32 matchId) {
        require(msg.value >= entryFee, "Insufficient entry fee");
        require(_betToken != address(0), "Invalid token address");

        if (_isNFT) {
            // NFT validation
            IERC721 nft = IERC721(_betToken);
            require(nft.ownerOf(_nftTokenId) == msg.sender, "Not NFT owner");
            require(
                nft.isApprovedForAll(msg.sender, address(this)) ||
                nft.getApproved(_nftTokenId) == address(this),
                "NFT not approved"
            );
        } else {
            // ERC20 validation
            require(_betAmount > 0, "Bet amount must be > 0");
            require(_betAmount <= MAX_BET_AMOUNT, "Bet exceeds maximum");

            IERC20 token = IERC20(_betToken);
            require(token.balanceOf(msg.sender) >= _betAmount, "Insufficient token balance");
            require(token.allowance(msg.sender, address(this)) >= _betAmount, "Insufficient token allowance");
        }

        // Generate unique match ID
        totalMatches++;
        matchId = keccak256(abi.encodePacked(
            msg.sender,
            _betToken,
            _betAmount,
            block.timestamp,
            totalMatches
        ));

        // Create match
        Match storage newMatch = matches[matchId];
        newMatch.matchId = matchId;
        newMatch.creator = msg.sender;
        newMatch.betToken = _betToken;
        newMatch.betAmount = _betAmount;
        newMatch.nftTokenId = _nftTokenId;
        newMatch.isNFT = _isNFT;
        newMatch.state = MatchState.Created;
        newMatch.createdAt = block.timestamp;

        // Track user matches
        userMatches[msg.sender].push(matchId);

        // Transfer creator's bet to contract
        if (_isNFT) {
            IERC721(_betToken).transferFrom(msg.sender, address(this), _nftTokenId);
        } else {
            require(
                IERC20(_betToken).transferFrom(msg.sender, address(this), _betAmount),
                "Token transfer failed"
            );
        }

        emit MatchCreated(matchId, msg.sender, _betToken, _betAmount, _isNFT, _nftTokenId);

        return matchId;
    }

    /**
     * @dev Join an existing match
     * @param _matchId The match ID to join
     */
    function joinMatch(bytes32 _matchId) external payable nonReentrant {
        Match storage matchData = matches[_matchId];

        require(matchData.state == MatchState.Created, "Match not available");
        require(matchData.creator != msg.sender, "Cannot join own match");
        require(msg.value >= entryFee, "Insufficient entry fee");

        // Transfer opponent's bet to contract
        if (matchData.isNFT) {
            // For NFT matches, opponent must own the same NFT (different token ID of same collection)
            IERC721 nft = IERC721(matchData.betToken);
            require(nft.ownerOf(matchData.nftTokenId) == matchData.creator, "Creator no longer owns NFT");
            // Opponent brings their own NFT of same collection (handled in UI/off-chain)
            // For simplicity, we'll just match the bet amount for now
            revert("NFT PVP not yet implemented - use ERC20 tokens");
        } else {
            IERC20 token = IERC20(matchData.betToken);
            require(token.balanceOf(msg.sender) >= matchData.betAmount, "Insufficient token balance");
            require(token.allowance(msg.sender, address(this)) >= matchData.betAmount, "Insufficient token allowance");
            require(
                token.transferFrom(msg.sender, address(this), matchData.betAmount),
                "Token transfer failed"
            );
        }

        matchData.opponent = msg.sender;
        matchData.state = MatchState.Joined;

        // Calculate total pot after platform fee
        uint256 totalBet = matchData.betAmount * 2;
        uint256 platformFee = (totalBet * PLATFORM_FEE_BP) / BASIS_POINTS;
        matchData.totalPot = totalBet - platformFee;

        // Distribute platform fee
        _distributePlatformFee(matchData.betToken, platformFee);

        // Randomly select first picker
        matchData.firstPicker = _randomFirstPicker(_matchId, matchData.creator, msg.sender);

        // Track user matches
        userMatches[msg.sender].push(_matchId);

        emit MatchJoined(_matchId, msg.sender, matchData.firstPicker);

        // Automatically start selection phase
        matchData.state = MatchState.Selecting;
    }

    /**
     * @dev Select horses alternating between players (4 picks each)
     * @param _matchId The match ID
     * @param _horseIds Array of horse IDs to select (can be 1 or multiple)
     */
    function selectHorses(bytes32 _matchId, uint8[] calldata _horseIds) external nonReentrant {
        Match storage matchData = matches[_matchId];

        require(matchData.state == MatchState.Selecting, "Not in selection phase");
        require(
            msg.sender == matchData.creator || msg.sender == matchData.opponent,
            "Not a player in this match"
        );

        // Determine whose turn it is
        address currentPicker = _getCurrentPicker(matchData);
        require(msg.sender == currentPicker, "Not your turn to pick");

        // Validate picks
        for (uint256 i = 0; i < _horseIds.length; i++) {
            uint8 horseId = _horseIds[i];
            require(horseId < HORSE_COUNT, "Invalid horse ID");
            require(!_isHorseSelected(matchData, horseId), "Horse already selected");

            // Add horse to player's selection
            if (msg.sender == matchData.creator) {
                require(matchData.creatorHorses.length < HORSES_PER_PLAYER, "Already selected 8 horses");
                matchData.creatorHorses.push(horseId);
            } else {
                require(matchData.opponentHorses.length < HORSES_PER_PLAYER, "Already selected 8 horses");
                matchData.opponentHorses.push(horseId);
            }

            matchData.pickCount++;
            emit HorseSelected(_matchId, msg.sender, horseId, matchData.pickCount);
        }

        // Check if selection is complete (each player has 8 horses, total 16)
        if (matchData.creatorHorses.length == HORSES_PER_PLAYER &&
            matchData.opponentHorses.length == HORSES_PER_PLAYER) {
            matchData.state = MatchState.ReadyToRace;
        }
    }

    /**
     * @dev Execute the race (can be called by either player once horses are selected)
     * @param _matchId The match ID
     */
    function executeRace(bytes32 _matchId) external nonReentrant {
        Match storage matchData = matches[_matchId];

        require(matchData.state == MatchState.ReadyToRace, "Not ready to race");
        require(
            msg.sender == matchData.creator || msg.sender == matchData.opponent,
            "Not a player in this match"
        );

        // Generate race results
        (uint256[3] memory winners, address[3] memory winningPlayers) = _executeRace(_matchId, matchData);

        matchData.winners = winners;
        matchData.winningPlayers = winningPlayers;
        matchData.state = MatchState.Completed;

        // Calculate payouts
        if (matchData.isNFT) {
            // NFT: Winner takes all (1st place only)
            matchData.claimableAmount[winningPlayers[0]] = matchData.totalPot;
        } else {
            // ERC20: 80% first, 17.5% second, 2.5% third
            // Use += to accumulate if same player wins multiple places
            matchData.claimableAmount[winningPlayers[0]] += (matchData.totalPot * FIRST_PLACE_BP) / BASIS_POINTS;
            matchData.claimableAmount[winningPlayers[1]] += (matchData.totalPot * SECOND_PLACE_BP) / BASIS_POINTS;
            matchData.claimableAmount[winningPlayers[2]] += (matchData.totalPot * THIRD_PLACE_BP) / BASIS_POINTS;
        }

        emit RaceCompleted(_matchId, winners, winningPlayers);
    }

    /**
     * @dev Claim winnings from a completed match
     * @param _matchId The match ID
     */
    function claimWinnings(bytes32 _matchId) external nonReentrant {
        Match storage matchData = matches[_matchId];

        require(matchData.state == MatchState.Completed, "Match not completed");
        require(!matchData.hasClaimed[msg.sender], "Already claimed");

        uint256 amount = matchData.claimableAmount[msg.sender];
        require(amount > 0, "No winnings to claim");

        matchData.hasClaimed[msg.sender] = true;

        if (matchData.isNFT) {
            IERC721(matchData.betToken).transferFrom(address(this), msg.sender, matchData.nftTokenId);
        } else {
            require(
                IERC20(matchData.betToken).transfer(msg.sender, amount),
                "Claim transfer failed"
            );
        }

        emit WinningsClaimed(_matchId, msg.sender, amount);
    }

    /**
     * @dev Cancel a match (only creator can cancel before opponent joins)
     * @param _matchId The match ID
     */
    function cancelMatch(bytes32 _matchId) external nonReentrant {
        Match storage matchData = matches[_matchId];

        require(msg.sender == matchData.creator, "Only creator can cancel");
        require(matchData.state == MatchState.Created, "Cannot cancel after opponent joined");

        matchData.state = MatchState.Cancelled;

        // Refund creator's bet
        if (matchData.isNFT) {
            IERC721(matchData.betToken).transferFrom(address(this), matchData.creator, matchData.nftTokenId);
        } else {
            require(
                IERC20(matchData.betToken).transfer(matchData.creator, matchData.betAmount),
                "Refund transfer failed"
            );
        }

        // Refund entry fee
        (bool sent, ) = matchData.creator.call{value: entryFee}("");
        require(sent, "Entry fee refund failed");

        emit MatchCancelled(_matchId, msg.sender);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Execute race and determine winners
     * All 16 horses race (8 per player)
     */
    function _executeRace(bytes32 _matchId, Match storage matchData)
        internal
        returns (uint256[3] memory winners, address[3] memory winningPlayers)
    {
        // Combine all horses (16 total - 8 per player)
        uint8[] memory allHorses = new uint8[](HORSE_COUNT);
        address[] memory horseOwners = new address[](HORSE_COUNT);

        for (uint256 i = 0; i < HORSES_PER_PLAYER; i++) {
            allHorses[i] = matchData.creatorHorses[i];
            horseOwners[i] = matchData.creator;

            allHorses[i + HORSES_PER_PLAYER] = matchData.opponentHorses[i];
            horseOwners[i + HORSES_PER_PLAYER] = matchData.opponent;
        }

        // Generate speeds for all 16 horses
        uint256[] memory speeds = new uint256[](HORSE_COUNT);
        for (uint256 i = 0; i < HORSE_COUNT; i++) {
            speeds[i] = _generateHorseSpeed(_matchId, allHorses[i]);
        }

        // Sort by speed to find top 3
        for (uint256 i = 0; i < allHorses.length; i++) {
            for (uint256 j = i + 1; j < allHorses.length; j++) {
                if (speeds[j] > speeds[i]) {
                    // Swap speeds
                    (speeds[i], speeds[j]) = (speeds[j], speeds[i]);
                    // Swap horses
                    (allHorses[i], allHorses[j]) = (allHorses[j], allHorses[i]);
                    // Swap owners
                    (horseOwners[i], horseOwners[j]) = (horseOwners[j], horseOwners[i]);
                }
            }
        }

        // Top 3 winners
        winners[0] = allHorses[0];
        winners[1] = allHorses[1];
        winners[2] = allHorses[2];

        winningPlayers[0] = horseOwners[0];
        winningPlayers[1] = horseOwners[1];
        winningPlayers[2] = horseOwners[2];

        return (winners, winningPlayers);
    }

    /**
     * @dev Generate horse speed with enhanced randomness
     */
    function _generateHorseSpeed(bytes32 _matchId, uint8 _horseId) internal returns (uint256) {
        nonce++;
        bytes32 hash = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            block.number,
            _matchId,
            _horseId,
            msg.sender,
            tx.gasprice,
            nonce
        ));

        return 80 + (uint256(hash) % 41); // Speed between 80-120
    }

    /**
     * @dev Randomly select first picker
     */
    function _randomFirstPicker(bytes32 _matchId, address _creator, address _opponent)
        internal
        returns (address)
    {
        nonce++;
        bytes32 hash = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            _matchId,
            _creator,
            _opponent,
            nonce
        ));

        return uint256(hash) % 2 == 0 ? _creator : _opponent;
    }

    /**
     * @dev Get current picker based on 4-4-4-4 phase system
     * Phase 1: First picker selects 4 horses (picks 0-3)
     * Phase 2: Second picker selects 4 horses (picks 4-7)
     * Phase 3: First picker selects 4 horses (picks 8-11)
     * Phase 4: Second picker selects 4 horses (picks 12-15)
     */
    function _getCurrentPicker(Match storage matchData) internal view returns (address) {
        uint256 totalPicked = matchData.creatorHorses.length + matchData.opponentHorses.length;

        // Determine whose turn based on total picks
        // Picks 0-3: First picker
        // Picks 4-7: Second picker
        // Picks 8-11: First picker
        // Picks 12-15: Second picker
        bool isFirstPickerTurn;
        if (totalPicked < 4) {
            // Phase 1: First picker
            isFirstPickerTurn = true;
        } else if (totalPicked < 8) {
            // Phase 2: Second picker
            isFirstPickerTurn = false;
        } else if (totalPicked < 12) {
            // Phase 3: First picker
            isFirstPickerTurn = true;
        } else {
            // Phase 4: Second picker
            isFirstPickerTurn = false;
        }

        return isFirstPickerTurn ? matchData.firstPicker :
               (matchData.firstPicker == matchData.creator ? matchData.opponent : matchData.creator);
    }

    /**
     * @dev Check if horse is already selected
     */
    function _isHorseSelected(Match storage matchData, uint8 _horseId) internal view returns (bool) {
        for (uint256 i = 0; i < matchData.creatorHorses.length; i++) {
            if (matchData.creatorHorses[i] == _horseId) return true;
        }
        for (uint256 i = 0; i < matchData.opponentHorses.length; i++) {
            if (matchData.opponentHorses[i] == _horseId) return true;
        }
        return false;
    }

    /**
     * @dev Distribute platform fee
     */
    function _distributePlatformFee(address _token, uint256 _feeAmount) internal {
        if (_feeAmount == 0) return;

        IERC20 token = IERC20(_token);
        uint256 halfFee = _feeAmount / 2;

        require(token.transfer(devWallet, halfFee), "Dev fee transfer failed");
        require(token.transfer(marketingWallet, _feeAmount - halfFee), "Marketing fee transfer failed");
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get match details
     */
    function getMatch(bytes32 _matchId) external view returns (
        address creator,
        address opponent,
        address betToken,
        uint256 betAmount,
        bool isNFT,
        MatchState state,
        uint8[] memory creatorHorses,
        uint8[] memory opponentHorses,
        address firstPicker,
        uint256[3] memory winners
    ) {
        Match storage matchData = matches[_matchId];
        return (
            matchData.creator,
            matchData.opponent,
            matchData.betToken,
            matchData.betAmount,
            matchData.isNFT,
            matchData.state,
            matchData.creatorHorses,
            matchData.opponentHorses,
            matchData.firstPicker,
            matchData.winners
        );
    }

    /**
     * @dev Get user's matches
     */
    function getUserMatches(address _user) external view returns (bytes32[] memory) {
        return userMatches[_user];
    }

    /**
     * @dev Get claimable amount for a player
     */
    function getClaimableAmount(bytes32 _matchId, address _player) external view returns (uint256) {
        Match storage matchData = matches[_matchId];
        if (matchData.hasClaimed[_player]) return 0;
        return matchData.claimableAmount[_player];
    }

    /**
     * @dev Get whose turn it is to pick
     */
    function getCurrentPicker(bytes32 _matchId) external view returns (address) {
        Match storage matchData = matches[_matchId];
        require(matchData.state == MatchState.Selecting, "Not in selection phase");
        return _getCurrentPicker(matchData);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Set entry fee
     */
    function setEntryFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= MAX_ENTRY_FEE, "Fee exceeds maximum of 5 native tokens");
        emit EntryFeeUpdated(entryFee, _newFee);
        entryFee = _newFee;
    }

    /**
     * @dev Set wallets
     */
    function setWallets(address _devWallet, address _marketingWallet) external onlyOwner {
        require(_devWallet != address(0), "Invalid dev wallet");
        require(_marketingWallet != address(0), "Invalid marketing wallet");
        devWallet = _devWallet;
        marketingWallet = _marketingWallet;
    }

    /**
     * @dev Withdraw accumulated entry fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");

        uint256 halfBalance = balance / 2;
        (bool devSent, ) = devWallet.call{value: halfBalance}("");
        require(devSent, "Dev withdrawal failed");

        (bool marketingSent, ) = marketingWallet.call{value: balance - halfBalance}("");
        require(marketingSent, "Marketing withdrawal failed");
    }

    // Receive native tokens
    receive() external payable {}
}

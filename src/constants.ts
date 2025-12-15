// Contract addresses on Celo Mainnet
export const PIXEL_PONY_ADDRESS = "0x3e9b5F357326a399aff2988eC501E28C9DD9f3b9"; // Game contract
export const PONY_TOKEN_ADDRESS = "0x000BE46901ea6f7ac2c1418D158f2f0A80992c07"; // Token contract
export const VAULT_ADDRESS = "0x0A777DaB9527c1f85612E4EBd41bfB8677d4e10a"; // Vault contract (unchanged)
export const REFERRAL_ADDRESS = "0xFF5987F04850c092C2Af855894fBF1679610Df23"; // Referral contract
export const BASE_CHAIN_ID = 42220; // Celo Mainnet

// Contract ABIs
export const PIXEL_PONY_ABI = [
  "function placeBetAndRace(uint256 _horseId, uint256 _amount) external payable returns (uint256)",
  "function getGameStats() view returns (uint256 totalRacesCount, uint256 totalTicketsCount, uint256 jackpotAmount, uint256[4] memory jackpotNumbers)",
  "function baseFeeAmount() view returns (uint256)",
  "event RaceExecuted(uint256 indexed raceId, address indexed player, uint256 horseId, uint256[3] winners, uint256 payout, bool won)"
] as const;

export const PONY_TOKEN_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
] as const;

// Bet amounts (in wei with 18 decimals)
export const BET_AMOUNTS = [
  { display: "10B", value: "10000000000000000000000000000" },
  { display: "25B", value: "25000000000000000000000000000" },
  { display: "50B", value: "50000000000000000000000000000" }
] as const;

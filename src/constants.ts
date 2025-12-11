// Contract addresses on Celo Mainnet
export const PIXEL_PONY_ADDRESS = "0x6ab297799335E7b0f60d9e05439Df156cf694Ba7"; // Game contract
export const PONY_TOKEN_ADDRESS = "0xde2f957BF8B9459e9E998b98789Af02920404ad8"; // Token contract
export const VAULT_ADDRESS = "0x0A777DaB9527c1f85612E4EBd41bfB8677d4e10a"; // Vault contract
export const REFERRAL_ADDRESS = "0x2B4652Bd6149E407E3F57190E25cdBa1FC9d37d8"; // Referral contract
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

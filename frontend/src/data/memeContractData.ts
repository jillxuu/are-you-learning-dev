import { FunctionExplanation, KeywordDefinition } from '../components/CodeLearningView';

export const functionExplanations: FunctionExplanation[] = [
  {
    startLine: 1,
    endLine: 7,
    explanation: "The module declaration defines a new Move module named `meme_coin` under the `meme_factory` address. It imports necessary dependencies from the standard library and Aptos framework."
  },
  {
    startLine: 40,
    endLine: 52,
    explanation: "### CreateMemeEvent\nEmitted when a new meme coin is created. This event captures:\n- `creator_addr`: The address that created the meme coin\n- `meme_owner_obj`: Reference to the owner configuration\n- `meme_obj`: Reference to the fungible asset metadata\n- `max_supply`: Optional maximum supply limit\n- `name` and `symbol`: Basic token identifiers\n- `decimals`: Number of decimal places for the token\n- `icon_uri` and `project_uri`: Links to token assets and documentation\n- `mint_fee_per_smallest_unit`: Fee charged per token minted\n- `pre_mint_amount`: Amount minted to creator at creation\n- `mint_limit_per_addr`: Optional per-address minting limit"
  },
  {
    startLine: 54,
    endLine: 61,
    explanation: "### MintMemeEvent\nEmitted when tokens are minted. Tracks:\n- `meme_obj`: The meme coin being minted\n- `amount`: Number of tokens minted\n- `recipient_addr`: Address receiving the tokens\n- `total_mint_fee`: Total fees paid for this mint"
  },
  {
    startLine: 63,
    endLine: 69,
    explanation: "### UpdateDegenMetricsEvent\nEmitted when degen metrics are updated. Records:\n- `meme_obj`: The meme coin being updated\n- `moon_score`: New potential for price increase (0-100)\n- `rug_risk`: New risk assessment score (0-100)\n\nThis event helps track market sentiment and risk levels."
  },
  {
    startLine: 71,
    endLine: 74,
    explanation: "### MemeOwnerConfig\nStores ownership information for a meme coin:\n- `meme_obj`: Reference to the fungible asset metadata\n\nThis struct creates a unique identifier for each meme coin and tracks its ownership."
  },
  {
    startLine: 76,
    endLine: 81,
    explanation: "### MemeController\nHolds critical capabilities for managing the meme coin:\n- `mint_ref`: Allows creating new tokens\n- `burn_ref`: Allows destroying tokens\n- `transfer_ref`: Allows special transfer operations\n\nThese references provide granular control over the token's supply and movement."
  },
  {
    startLine: 83,
    endLine: 87,
    explanation: "### MintLimit\nEnforces per-address minting restrictions:\n- `limit`: Maximum tokens an address can mint\n- `mint_tracker`: Table tracking how many tokens each address has minted\n\nPrevents any single address from minting too many tokens, promoting fair distribution."
  },
  {
    startLine: 89,
    endLine: 97,
    explanation: "### MemeConfig\nStores meme coin configuration and metrics:\n- `mint_fee_per_smallest_unit`: Fee per token minted\n- `mint_limit`: Optional minting restrictions\n- `meme_owner_obj`: Reference to owner config\n- `moon_score`: Growth potential metric (0-100)\n- `rug_risk`: Risk assessment metric (0-100)\n- `holder_rewards_enabled`: Whether holders earn rewards\n\nThis struct combines both technical parameters and social/community features."
  },
  {
    startLine: 99,
    endLine: 102,
    explanation: "### Registry\nGlobal registry of all meme coins:\n- `meme_objects`: Vector storing references to all created meme coins\n\nEnables discovery and tracking of all meme coins created through this contract."
  },
  {
    startLine: 104,
    endLine: 109,
    explanation: "### Config\nGlobal contract configuration:\n- `admin_addr`: Current admin address\n- `pending_admin_addr`: Optional address of pending admin\n- `mint_fee_collector_addr`: Address receiving mint fees\n\nManages administrative control and fee collection."
  },
  {
    startLine: 111,
    endLine: 121,
    explanation: "### init_module\nInitializes the module when first deployed:\n1. Creates empty registry to track meme coins\n2. Sets up initial configuration with deployer as admin\n3. Sets deployer as initial fee collector\n\nThis function runs only once when the module is published."
  },
  {
    startLine: 125,
    endLine: 131,
    explanation: "### set_pending_admin\nStarts admin transfer process:\n1. Verifies caller is current admin\n2. Sets new address as pending admin\n\nFirst step in two-step admin transfer process for security."
  },
  {
    startLine: 133,
    endLine: 139,
    explanation: "### accept_admin\nCompletes admin transfer process:\n1. Verifies caller is pending admin\n2. Updates admin to new address\n3. Clears pending admin\n\nSecond step in two-step admin transfer process."
  },
  {
    startLine: 141,
    endLine: 147,
    explanation: "### update_mint_fee_collector\nChanges fee collection address:\n1. Verifies caller is admin\n2. Updates address receiving mint fees\n\nAllows admin to redirect fee collection as needed."
  },
  {
    startLine: 149,
    endLine: 237,
    explanation: "### create_meme\nCreates a new meme coin with specified parameters:\n1. Creates owner object and metadata object\n2. Initializes fungible asset with primary store\n3. Sets up controller with mint/burn/transfer capabilities\n4. Configures minting limits and fees\n5. Stores in registry and emits creation event\n6. Optionally pre-mints tokens to creator\n\nThis is the main entry point for creating new meme coins."
  },
  {
    startLine: 239,
    endLine: 247,
    explanation: "### mint_meme\nMints new tokens:\n1. Checks minting limits for caller\n2. Calculates and charges mint fee\n3. Mints tokens to caller's address\n4. Emits mint event\n\nHandles the entire minting process including limits and fees."
  },
  {
    startLine: 249,
    endLine: 266,
    explanation: "### set_moon_score\nUpdates growth potential score:\n1. Verifies caller is admin\n2. Validates score is 0-100\n3. Updates moon score\n4. Emits update event\n\nHelps track community sentiment about price potential."
  },
  {
    startLine: 268,
    endLine: 285,
    explanation: "### set_rug_risk\nUpdates risk assessment:\n1. Verifies caller is admin\n2. Validates risk is 0-100\n3. Updates rug risk score\n4. Emits update event\n\nHelps protect community by tracking risk levels."
  },
  {
    startLine: 287,
    endLine: 297,
    explanation: "### enable_holder_rewards\nActivates holder rewards:\n1. Verifies caller is admin\n2. Enables reward distribution\n\nAllows token holders to earn rewards for holding."
  }
];

export const moveKeywords: KeywordDefinition[] = [
  {
    keyword: "module",
    description: "Defines a new Move module, which is a collection of related functions and types.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/modules"
  },
  {
    keyword: "use",
    description: "Imports types and functions from other modules to be used in the current module.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/modules#use-keyword"
  },
  {
    keyword: "struct",
    description: "Defines a new composite data type that can hold multiple fields.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/structs"
  },
  {
    keyword: "has key",
    description: "Indicates that a struct can be used as a key in global storage.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/structs#abilities"
  },
  {
    keyword: "has store",
    description: "Indicates that a struct can be stored inside other structs.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/structs#abilities"
  },
  {
    keyword: "has drop",
    description: "Indicates that a struct can be dropped/discarded without explicit destruction.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/structs#abilities"
  },
  {
    keyword: "public entry",
    description: "Defines a function that can be called directly from outside the module (e.g., from a transaction).",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/functions#entry-functions"
  },
  {
    keyword: "acquires",
    description: "Indicates which global resources a function needs to access.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/functions#acquiring-resources"
  },
  {
    keyword: "#[event]",
    description: "Marks a struct as an event that can be emitted and tracked on-chain.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/events"
  },
  {
    keyword: "#[view]",
    description: "Marks a function as a view function that only reads state and cannot modify it.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/functions#view-functions"
  },
  {
    keyword: "assert!",
    description: "Checks a condition and aborts the transaction if it's false.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/abort-and-assert"
  },
  {
    keyword: "vector",
    description: "A dynamic array type that can grow or shrink.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/vectors"
  },
  {
    keyword: "Option",
    description: "A type that represents an optional value that may or may not exist.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/option-and-result"
  },
  {
    keyword: "move_to",
    description: "Stores a resource in global storage under an account address.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/global-storage-operators"
  },
  {
    keyword: "borrow_global",
    description: "Borrows a reference to a resource from global storage.",
    docsUrl: "https://aptos.dev/en/build/smart-contracts/move-on-aptos/global-storage-operators"
  }
]; 
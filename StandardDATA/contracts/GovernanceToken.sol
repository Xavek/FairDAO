// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the ERC20Votes contract from the OpenZeppelin library
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

// Define the GovernanceToken contract, which is a subclass of ERC20Votes
contract GovernanceToken is ERC20Votes {
// Define a public variable to store the maximum supply of the token
uint256 public s_maxSupply = 1000000000000000000000000;

// Constructor function is called when the contract is deployed
constructor() ERC20("GovernanceToken", "GT") ERC20Permit("GovernanceToken") {
// Call the _mint function from the base contract to mint the maximum supply of the token to the contract creator
_mint(msg.sender, s_maxSupply);
}
}

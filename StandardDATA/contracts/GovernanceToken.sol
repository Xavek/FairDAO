// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the ERC20Votes contract from the OpenZeppelin library
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

// Define the GovernanceToken contract, which is a subclass of ERC20Votes
contract GovernanceToken is ERC20Votes {

// Define a public constant variable to store the maximum supply of the token
//using constant for maximumSupply makes it more readable
// and it will save you from mutating this variable.
// Furthermore, using `maxSupply` is more semantic than using `s_maxSupply`.

uint256 public constant maxSupply = 10000000000000000000000;

  // Constructor function is called when the contract is deployed
  constructor() ERC20("GovernanceToken", "GT") ERC20Permit("GovernanceToken") {
    // Call the _mint function from the base contract to mint the maximum supply of the token to the contract creator
    // This will mint the maxSupply amount of tokens to msg.sender
    _mint(msg.sender, maxSupply);
  }
}

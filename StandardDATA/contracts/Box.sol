// contracts/Box.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

// A contract that stores a single value and allows it to be modified by the owner
contract Box is Ownable {
  // The stored value
  uint256 private value;

  // Emitted when the stored value changes
  event ValueChanged(uint256 newValue);

  // Stores a new value in the contract
  function store(uint256 newValue) public onlyOwner {
    // Update the value and emit an event
    value = newValue;
    emit ValueChanged(newValue);
  }

  // Reads the last stored value
  function retrieve() public view returns (uint256) {
    return value;
  }
}

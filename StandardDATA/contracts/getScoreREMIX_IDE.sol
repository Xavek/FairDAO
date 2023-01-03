// SPDX-License-Identifier: MIT

/*Instructions for hackthon

Getting uniquenessScore from ipfs json file hosted on web3storage

Requirements: Install the packages, testnet ETH and LINK
1) Deploy to Rinkeby Testnet
2) Send LINK to the contract
3) Call the function requestValue() with parameters
*/
pragma solidity ^0.8.7;

//importing chainlink 
//import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
//import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";

import "https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/ChainlinkClient.sol";
import "https://github.com/smartcontractkit/chainlink/blob/develop/contracts/src/v0.8/ConfirmedOwner.sol";


contract GetUint256 is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;

    uint256 private constant ORACLE_PAYMENT =
        ((1 * LINK_DIVISIBILITY) / 100) * 5;
    //@devs:value is score 
    uint256 public value;

    event RequestValue(bytes32 indexed requestId, uint256 indexed value);

    string constant jobId = "7599d3c8f31e4ce78ad2b790cbcfc673"; 

    //Node with external adapter provided by https://translucent.link/
    //Polygon Mainnet Contract: 0x188b71C9d27cDeE01B9b0dfF5C1aff62E8D6F434
    constructor() ConfirmedOwner(msg.sender) {
        // RINKEBY
        setChainlinkToken(0x01BE23585060835E02B77ef475b0Cc51aA1e0709);
        setChainlinkOracle(0x188b71C9d27cDeE01B9b0dfF5C1aff62E8D6F434);
    }
    //@devs:parameters to be set in Governor
    function requestValue(
        string memory _url, //https://bafybeibhgwglemzhwhhxce3je3wyo4jksl7uu5hmttmwuvnyele6umkdhq.ipfs.dweb.link/testaddress.json
        int256 _multiply, // 1
        string memory _path // address of sender in string
    ) public onlyOwner returns (bytes32 requestId) {
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(jobId),
            address(this),
            this.fulfillValue.selector
        );
        req.add("get", _url);
        req.add("path", _path);
        req.addInt("multiply", _multiply);
        return sendChainlinkRequest(req, ORACLE_PAYMENT);
    }

    function fulfillValue(bytes32 _requestId, uint256 _value)
        public
        recordChainlinkFulfillment(_requestId)
    {
        emit RequestValue(_requestId, _value);
        value = _value;
    }

    function stringToBytes32(string memory source)
        private
        pure
        returns (bytes32 result)
    {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            // solhint-disable-line no-inline-assembly
            result := mload(add(source, 32))
        }
    }
}
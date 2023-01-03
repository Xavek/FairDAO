// SPDX-License-Identifier: MIT
//README: add to to the same directory as Governor.sol node_modules/@openzeppelin/contracts/governance/
pragma solidity ^0.8.0;

//importing chainlink 
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";


contract getScore is ChainlinkClient, ConfirmedOwner {
    using Chainlink for Chainlink.Request;


    
    uint256 private constant ORACLE_PAYMENT =
        ((1 * LINK_DIVISIBILITY) / 100) * 5;
    uint256 public score;
    
    //parameters for requestScore()
    string _url;
    int256 constant _multiply = 1;
    string _voteraddress;

    string constant jobId = "7599d3c8f31e4ce78ad2b790cbcfc673";

    
    //Need help with the data type string here, supposed to be address

    event RequestScore(bytes32 indexed requestId, uint256 indexed score);

     // RINKEBY Oracle 
    constructor() ConfirmedOwner(msg.sender) {
        setChainlinkToken(0x01BE23585060835E02B77ef475b0Cc51aA1e0709);
        setChainlinkOracle(0x188b71C9d27cDeE01B9b0dfF5C1aff62E8D6F434);
    }


    //Get's score from json file in ipfs
    //@dev: _url is the CID to ipfs
    function requestScore() public onlyOwner returns (bytes32 requestId) {
        Chainlink.Request memory req = buildChainlinkRequest(
            stringToBytes32(jobId),
            address(this),
            this.setUniquenessScores.selector
        );
        req.add("get", _url);
        req.add("path", _voteraddress);
        req.addInt("multiply", _multiply);
        return sendChainlinkRequest(req, ORACLE_PAYMENT);
    }

    
    //update mapping and emit score
    function setUniquenessScores(bytes32 _requestId, uint256 _score)
        public
        recordChainlinkFulfillment(_requestId)
    {
        require(_score <= 100);
        require(_score >= 0);
        emit RequestScore(_requestId, _score);
        score = _score;
        
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
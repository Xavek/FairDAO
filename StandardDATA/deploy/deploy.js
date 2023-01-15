// ethers is added through hardhat.config.js
// IN SHORT: (see https://www.youtube.com/watch?v=AhJtmUqhAqg)
// 1. GovernanceToken : who owns how many votes
// 2. timelock : is the owner, says who can propose (GovernorContract) for changes in Box, 
//    and when can these changes (on Box) actually be executed
// 3. GovernorContract: voting logic (e.g. count votes based of GovernanceToken allocation, check if vote passed)
// 4. Box : is the contract whose owner is the timelock (you need to vote to change state values)

//  DEPLOYMENT STEPS:
//  1. Deploy governance token (ERC20Votes):
//  INPUTS: none
//     a. no owner, fixed supply
//     b. This extension (ERC20Votes) keeps a history (checkpoints) of each account's vote power. Vote power can be delegated either
//        by calling the {delegate} function directly, or by providing a signature to be used with {delegateBySig}. Voting
//        power can be queried through the public accessors {getVotes} and {getPastVotes}.
//     c. By default, token balance does not account for voting power. This makes transfers cheaper. The downside is that it
//        requires users to delegate to themselves in order to activate checkpoints and have their voting power tracked.
//  2. Deploy timelock contract (is the owner of everything)
//  - INPUTS: just set a MIN_DELAY, and provide empty lists of proposers, and executors (will populate later)
//  - the proposer will become the governor contract
//  - the executor can be anyone
//     a. Contract module which acts as a timelocked controller. When set as the
//   owner of an `Ownable` smart contract, it enforces a timelock on all
//   `onlyOwner` maintenance operations. This gives time for users of the
//   controlled contract to exit before a potentially dangerous maintenance
//   operation is applied.
//   b. By default, this contract is self administered, meaning administration tasks
//   have to go through the timelock process. The proposer (resp executor) role
//   is in charge of proposing (resp executing) operations. A common use case is
//   to position this {TimelockController} as the owner of a smart contract, with
//   a multisig or a DAO as the sole proposer.
// 3. Deploy GovernorContract - for a quick setup go to openzeppelin contract wizard
// INPUTS: governanceTokenContract.address, timeLockContract.address, VOTING_DELAY, 
//         VOTING_PERIOD, QUORUM_PERCENTAGE
//   a. This contract has all the voting logic 
//       e.g. - A counting module must implement {quorum}, {_quorumReached}, {_voteSucceeded} and {_countVote}
//            - A voting module must implement {_getVotes}
//            - Additionanly, the {votingPeriod} must also be implemented
// 4. SETUP timeLockContract
//  a. set governorContract for proposerRole
//  b. set 0x00 for executorRole
//  c. revoke adminRole of deployer's address for timeLockContract
// 5. Deploy Box (which is Ownable), and set timelock as owner
/*

*/
// parameters
let MIN_DELAY = 3600// in seconds
let VOTING_PERIOD = 7;// how long will voting lasy (in blocks)
let VOTING_DELAY = 3;// how much will we wait from when proposal submitted to start voting (in blocks)
let QUORUM_PERCENTAGE = 4;// voters that need to vote in order for vote to stand (in %)
let ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

async function run() {

    const accounts = await ethers.getSigners();
    let owner = accounts[0];
    let account1 = accounts[1];
    console.log(`we are on block ${await hre.ethers.provider.getBlockNumber()}`);

    // ********************* DEPLOYMENT *****************************
        
    // 1. deploy the GovernanceToken - which has no owner, and fixed supply
    let contractFactory = await ethers.getContractFactory("GovernanceToken");
    let governanceTokenContract = await contractFactory.deploy();
    await governanceTokenContract.deployed();
    console.log(`governance token deployed on address ${governanceTokenContract.address}
with supply ${await governanceTokenContract.totalSupply()} 
and name ${await governanceTokenContract.name()}
and balanceOf[owner] = ${await governanceTokenContract.connect(owner).balanceOf(owner.address)}
and balanceOf[account1] = ${await governanceTokenContract.connect(owner).balanceOf(account1.address)}`);
console.log(`===================================`);
console.log(`we are on block ${await hre.ethers.provider.getBlockNumber()}`);
    //  By default, token balance does not account for voting power. This makes transfers cheaper. The downside is that it
    //  requires users to delegate to themselves in order to activate checkpoints and have their voting power tracked.

    // console.log(`${await governanceToken.connect(owner).checkpoints(owner.address, 0)}`);// error because the array has no elements yet
    console.log(`before delegation governanceToken.getVotes(owner) = ${await governanceTokenContract.connect(owner).getVotes(owner.address)}`);
    console.log(`before numCheckpoints(owner)=${await governanceTokenContract.connect(account1).numCheckpoints(owner.address)}`);//
    await governanceTokenContract.connect(owner).delegate(owner.address);
    console.log(`after delegation governanceToken.getVotes(owner) = ${await governanceTokenContract.connect(owner).getVotes(owner.address)}`);
    console.log(`after numCheckpoints(owner)=${await governanceTokenContract.connect(owner).numCheckpoints(owner.address)}`);
    console.log(`${await governanceTokenContract.connect(owner).checkpoints(owner.address, 0)}`);// checkpoint is a struct {fromBlock, votes}
    console.log(`===================================`);

    // 2. deploy timeLock - the owner.address has admin_role, which he needs to revoke (to claim decentralization) before  
    //    a) he grants proposer role to governor contract
    //    b) executor role to everyone (set it to 0x00)
    //  the timeLock contract:
    //    - everything flows through it
    //    - is the owner of Box
    contractFactory = await ethers.getContractFactory("TimeLock");
    let timeLockContract = await contractFactory.deploy(MIN_DELAY, [], []);
    await timeLockContract.deployed();
    console.log(`timeLockContract deployed on address ${timeLockContract.address}
    timelockContract.minDelay()=${await timeLockContract.getMinDelay()}`);
    console.log(`===================================`);

    // 3. deploy governor contract
    // 1) the governor contraact has all the voting logic used by the governanceToken
    contractFactory = await ethers.getContractFactory("GovernorContract");
    let options = {gasLimit:30000000};
    let governorContract = await contractFactory.deploy(governanceTokenContract.address, timeLockContract.address, QUORUM_PERCENTAGE, 
        VOTING_PERIOD, VOTING_DELAY, options);
    await governorContract.deployed();
    console.log(`governorContract deployed on ${governorContract.address}`);
    console.log(`===================================`);

    /** up to now, the timelock contract has no proposers, and no executors. We want the proposer to be the governor contract,
     * and the executor can be anyone. Steps:
     * 1) governance contract everybody votes
     * 2) if passed, governance asks timeLock to propose
     * 3) timeLock says 'yeah' but we need to wait minDelay
     * 4) once minDelay happens, anyone can execute
    */

    // 4. setup governance contract - 45:05
    // remember, that only the timeLock can actually do anything
    // a. right now our 'owner' account is the timeLock admin. However we do not want anyone to be the 
    // the timelock admin (address 0x0). Also, the proposer currently is the 'owner', but we want the governor contract
    // to be the owner. 
    // the below are hashes of strings needed for grantRole (see TimelockController)
    const proposerRole = await timeLockContract.PROPOSER_ROLE()
    const executorRole = await timeLockContract.EXECUTOR_ROLE()
    const adminRole = await timeLockContract.TIMELOCK_ADMIN_ROLE()
    console.log(adminRole);
    console.log(owner.address);

    console.log(`DEFAULT_ADMIN_ROLE=${await timeLockContract.connect(owner).DEFAULT_ADMIN_ROLE()}`)

    // see abstract contract AccessControl (openzeppelin)
    const proposerTx = await timeLockContract.connect(owner).grantRole(proposerRole, governorContract.address)
    await proposerTx.wait(1)
    const executorTx = await timeLockContract.connect(owner).grantRole(executorRole, ADDRESS_ZERO)
    await executorTx.wait(1)
    const revokeTx = await timeLockContract.connect(owner).revokeRole(adminRole, owner.address)
    await revokeTx.wait(1)
    // after revokeTx goes through, nobody can do anything with timeLock without governance 
    console.log(`timelock setup done!`);
    console.log(`DEFAULT_ADMIN_ROLE=${await timeLockContract.connect(owner).DEFAULT_ADMIN_ROLE()}`)
    console.log(`===================================`);

    // 5. deploy the Box contract, which is actually the contract we want to govern
    contractFactory = await ethers.getContractFactory("Box");
    let boxContract = await contractFactory.deploy();
    let transferBoxOwnership = await boxContract.transferOwnership(timeLockContract.address);
    console.log(`timelock is box owner=${await boxContract.owner() === await timeLockContract.address}`);



    // *************************** VOTING ****************************

    // this is the function of the Governor (openzeppelin) contract we will be calling
    // function propose(
    //     address[] memory targets,// contract address array
    //     uint256[] memory values,// eth sent (gk)
    //     bytes[] memory calldatas,// an encoded list of the functions (with values passed) we want to access on this proposal
    //     string memory description
    // )

    // before we vote we setUniquenessScore
    await governorContract.connect(owner).setUniqunessScores();

    // parameters
    let NEW_STORE_VALUE = 77;
    let FUNC = "store";
    let PROPOSAL_DESCRIPTION = "Proposal #1 77 in the Box!"

    // 1. propose

    let encodedFunctionCall = boxContract.interface.encodeFunctionData(FUNC, [NEW_STORE_VALUE]);
    console.log(`Proposing ${FUNC} on ${boxContract.address} with ${[NEW_STORE_VALUE]}`)
    console.log(`Proposal Description:\n  ${PROPOSAL_DESCRIPTION}`)

    console.log(`right before we propose, we are on block ${await hre.ethers.provider.getBlockNumber()}`);
    const proposeTx = await governorContract.propose(
        [boxContract.address],
        [0],
        [encodedFunctionCall],
        PROPOSAL_DESCRIPTION
      )

      console.log(`right after we propose, we are on block ${await hre.ethers.provider.getBlockNumber()}`);

    // this proposeTx is important. It calls the Governor.propose() function (see above) which emits a 
    // ProposalCreated event below 
    //
    // ProposalCreated(
    //     proposalId,
    //     _msgSender(),
    //     targets,
    //     values,
    //     new string[](targets.length),
    //     calldatas,
    //     snapshot,
    //     deadline,
    //     description
    // );
    //
    // we need the 'proposalId' parameter of the event (for later when we go to vote), which is a hash. To that end, 
    // we keep the proposeReceipt of the proposeTx, and get the events from the receipt, and from events
    // we keep the first value - there is another patrick collins video about events
    
    let proposeReceipt = await proposeTx.wait(1);
    let proposalId = proposeReceipt.events[0].args.proposalId;
    console.log(`proposalId = ${proposalId}`);

    
    const proposalSnapShot = await governorContract.proposalSnapshot(proposalId);
    console.log(`vote starts at block ${proposalSnapShot}`);
    const proposalDeadline = await governorContract.proposalDeadline(proposalId);
    console.log(`vote ends at block ${proposalDeadline}`);
    let proposalState = await governorContract.state(proposalId);
    console.log(`current proposal state ${proposalState}`);

    // keep in mind the enum of proposal state, see below
    // enum ProposalState {
    //     Pending, =0
    //     Active, =1
    //     Canceled, =2
    //     Defeated, =3
    //     Succeeded, =4
    //     Queued,=5
    //     Expired, =6
    //     Executed =7
    // }

    // 2. vote 
    // a. first we need to pass the voting delay
    
    // this is a helper function that moves the blockchain a few blocks (only local blockchain of course)
    // it should be added in utils folder and exported here. 
    // we need it here to skip the voting delay
    async function moveBlocks(amount) {
        console.log("Moving blocks...")
        for (let index = 0; index < amount; index++) {
          await network.provider.request({
            method: "evm_mine",
            params: [],
          })
        }
        console.log(`Moved ${amount} blocks`)
      }

    await moveBlocks(VOTING_DELAY + 1);
    console.log(`we moved to block so we can vote ${await hre.ethers.provider.getBlockNumber()}`);
    console.log(`current proposal state ${await governorContract.state(proposalId)}`);

    // 0 = Against, 1 = For, 2 = Abstain for this example
    // we will use cstVoteWithReason. There is another very interesting way to vote 'voteCastBySig', 
    // where voters can generate a signature for free, and then the project can submit those and pay
    // for the gas (gas efficiency, if user cannot pay gas)
    let VoteWay = 1;// we vote in favor
    let reason = "because i like it more"
    let voteTx = await governorContract.castVoteWithReason(proposalId, VoteWay, reason);
    let voteTxReceipt = await voteTx.wait(1)
    console.log(`reason from receipt = ${voteTxReceipt.events[0].args.reason}`);

    console.log(`after we vote we are on block ${await hre.ethers.provider.getBlockNumber()}`);
    console.log(`current proposal state ${await governorContract.state(proposalId)}`);

    await moveBlocks(VOTING_PERIOD + 1);
    console.log(`we moved to block ${await hre.ethers.provider.getBlockNumber()} so the vote period ended `);
    console.log(`current proposal state ${await governorContract.state(proposalId)}`);

    // 3. queue proposal - anyone can queue
    console.log("=========== queueing proposal")
    const descriptionHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(PROPOSAL_DESCRIPTION))
    // could also use ethers.utils.id(PROPOSAL_DESCRIPTION)
    const queueTx = await governorContract.connect(account1).queue([boxContract.address], [0], [encodedFunctionCall], descriptionHash)
    await queueTx.wait(1)
    console.log(`after queueing, proposal state = ${await governorContract.state(proposalId)}`);

    // 4. execute - anyone can execute
    async function moveTime(amount) {
        console.log("Moving time...")
        await network.provider.send("evm_increaseTime", [amount])
        console.log(`Moved forward in time ${amount} seconds`)
      }

    await moveTime(MIN_DELAY + 1);
    await moveBlocks(1);
    console.log(`after moving time so we pass MIN_DELAY, current proposal state is ${await governorContract.state(proposalId)}`);
    console.log(`old Box value: ${await boxContract.retrieve()}`)
    const excuteTx = await governorContract.connect(account1).execute([boxContract.address], [0], [encodedFunctionCall], descriptionHash);
    await excuteTx.wait(1);

    console.log(`new Box value: ${await boxContract.retrieve()}`)
    console.log(`final proposal state is ${await governorContract.state(proposalId)}`);
    console.log("END");
    
}

run()


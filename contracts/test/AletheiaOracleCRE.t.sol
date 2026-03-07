// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../AletheiaOracle.sol";
import "../AletheiaMarket.sol";
import "../MockUSDC.sol";
import "../IWorldID.sol";
import "../ReceiverTemplate.sol";

contract MockForwarder {
    function push(address receiver, bytes calldata metadata, bytes calldata report) external {
        IReceiver(receiver).onReport(metadata, report);
    }
}

contract MockWorldID is IWorldID {
    function verifyProof(
        uint256,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256[8] calldata
    ) external pure {}
}

contract MarketCreatorProxy {
    function create(
        AletheiaMarket market,
        string memory question,
        uint256 deadline,
        uint256 root,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256[8] memory proof
    ) external returns (uint256) {
        return market.createMarketVerified(question, deadline, root, signalHash, nullifierHash, proof);
    }
}

contract AletheiaOracleCRETest is Test {
    MockForwarder internal forwarder;
    MockWorldID internal worldId;
    MockUSDC internal collateral;
    AletheiaOracle internal oracle;
    AletheiaMarket internal market;

    function setUp() public {
        forwarder = new MockForwarder();
        worldId = new MockWorldID();
        collateral = new MockUSDC(address(this));
        oracle = new AletheiaOracle(address(forwarder));
        market = new AletheiaMarket(
            address(oracle),
            address(collateral),
            address(worldId),
            "app_staging_test",
            "create-market"
        );
        oracle.setPredictionMarket(address(market));
    }

    function _pushValidQuestionReport(string memory question, uint256 deadline, bytes32 proofHash) internal {
        bytes32 digest = keccak256(abi.encode(question, deadline));
        bytes memory validationReport = abi.encode(uint8(3), digest, true, uint8(95), true, true, true, true, proofHash);
        forwarder.push(address(oracle), "", validationReport);
    }

    function test_onReport_onlyForwarder() public {
        bytes memory report = abi.encode(uint8(1), uint256(1), true, uint8(90), keccak256("proof"));
        (bool ok, bytes memory revertData) = address(oracle).call(
            abi.encodeWithSelector(IReceiver.onReport.selector, "", report)
        );
        assertFalse(ok);
        bytes4 selector;
        assembly {
            selector := mload(add(revertData, 32))
        }
        assertEq(selector, ReceiverTemplate.InvalidSender.selector);
    }

    function test_creReport_autoSettlesMarket() public {
        uint256 deadline = block.timestamp + 1 days;
        string memory question = "Will ETH close above $5k by next week?";
        bytes32 digest = keccak256(abi.encode(question, deadline));

        bytes memory validationReport = abi.encode(
            uint8(3),
            digest,
            true,
            uint8(95),
            true,
            true,
            true,
            true,
            keccak256("validation-proof")
        );
        forwarder.push(address(oracle), "", validationReport);

        uint256[8] memory proof;
        proof[0] = 1;
        uint256 marketId = market.createMarketVerified(question, deadline, 1, 1, 123, proof);

        vm.warp(deadline + 1);

        bytes32 proofHash = keccak256("proof-success");
        bytes memory resolutionReport = abi.encode(uint8(1), uint256(1), true, uint8(90), proofHash);
        forwarder.push(address(oracle), "", resolutionReport);

        (,,,,, bool settled, bool outcome,) = market.markets(marketId);
        assertTrue(settled);
        assertTrue(outcome);
    }

    function test_disableNullifierUniqueness_allowsReuseInTestingMode() public {
        market.setWorldIdNullifierUniquenessEnabled(false);
        market.setDailyMarketCreationLimitEnabled(false);

        uint256[8] memory proof;
        proof[0] = 1;
        uint256 reusedNullifier = 777;
        uint256 signalHash = 1;

        uint256 deadlineA = block.timestamp + 1 days;
        string memory questionA = "Will ETH close above $6k?";
        bytes32 digestA = keccak256(abi.encode(questionA, deadlineA));
        bytes memory validationReportA = abi.encode(
            uint8(3),
            digestA,
            true,
            uint8(95),
            true,
            true,
            true,
            true,
            keccak256("validation-proof-a")
        );
        forwarder.push(address(oracle), "", validationReportA);
        uint256 firstMarketId = market.createMarketVerified(questionA, deadlineA, 1, signalHash, reusedNullifier, proof);

        uint256 deadlineB = block.timestamp + 2 days;
        string memory questionB = "Will BTC close below $100k?";
        bytes32 digestB = keccak256(abi.encode(questionB, deadlineB));
        bytes memory validationReportB = abi.encode(
            uint8(3),
            digestB,
            true,
            uint8(93),
            true,
            true,
            true,
            true,
            keccak256("validation-proof-b")
        );
        forwarder.push(address(oracle), "", validationReportB);
        uint256 secondMarketId = market.createMarketVerified(questionB, deadlineB, 1, signalHash, reusedNullifier, proof);

        assertEq(firstMarketId, 1);
        assertEq(secondMarketId, 2);
    }

    function test_marketCreationCooldown_blocksSecondMarketWithin24Hours() public {
        market.setWorldIdNullifierUniquenessEnabled(false);
        market.setDailyMarketCreationLimitEnabled(true);

        MarketCreatorProxy creatorA = new MarketCreatorProxy();
        MarketCreatorProxy creatorB = new MarketCreatorProxy();
        uint256[8] memory proof;
        proof[0] = 1;
        uint256 nullifier = 42;
        uint256 signalHash = 1;

        uint256 deadlineA = block.timestamp + 2 days;
        string memory questionA = "Will ETH close above $5k?";
        _pushValidQuestionReport(questionA, deadlineA, keccak256("validation-a"));
        creatorA.create(market, questionA, deadlineA, 1, signalHash, nullifier, proof);

        uint256 deadlineB = block.timestamp + 3 days;
        string memory questionB = "Will BTC close above $100k?";
        _pushValidQuestionReport(questionB, deadlineB, keccak256("validation-b"));

        (bool ok, bytes memory revertData) = address(creatorB).call(
            abi.encodeWithSelector(
                MarketCreatorProxy.create.selector, market, questionB, deadlineB, 1, signalHash, nullifier, proof
            )
        );
        assertFalse(ok);
        bytes4 selector;
        assembly {
            selector := mload(add(revertData, 32))
        }
        assertEq(selector, AletheiaMarket.MarketCreationCooldown.selector);
    }

    function test_marketCreationCooldown_allowsSecondMarketAfter24Hours() public {
        market.setWorldIdNullifierUniquenessEnabled(false);
        market.setDailyMarketCreationLimitEnabled(true);

        MarketCreatorProxy creatorA = new MarketCreatorProxy();
        MarketCreatorProxy creatorB = new MarketCreatorProxy();
        uint256[8] memory proof;
        proof[0] = 1;
        uint256 nullifier = 777;
        uint256 signalHash = 1;

        uint256 deadlineA = block.timestamp + 2 days;
        string memory questionA = "Will SOL close above $300?";
        _pushValidQuestionReport(questionA, deadlineA, keccak256("validation-c"));
        uint256 firstMarketId = creatorA.create(market, questionA, deadlineA, 1, signalHash, nullifier, proof);
        assertEq(firstMarketId, 1);

        vm.warp(block.timestamp + 1 days + 1);

        uint256 deadlineB = block.timestamp + 2 days;
        string memory questionB = "Will DOGE close above $1?";
        _pushValidQuestionReport(questionB, deadlineB, keccak256("validation-d"));
        uint256 secondMarketId = creatorB.create(market, questionB, deadlineB, 1, signalHash, nullifier, proof);
        assertEq(secondMarketId, 2);
    }
}

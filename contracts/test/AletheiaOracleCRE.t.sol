// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../AletheiaOracle.sol";
import "../AletheiaMarket.sol";
import "../EOTFactory.sol";
import "../EventOutcomeToken.sol";
import "../ReceiverTemplate.sol";
import "../IWorldID.sol";

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
    ) external pure override {}
}

contract AletheiaOracleCRETest is Test {
    MockForwarder internal forwarder;
    AletheiaOracle internal oracle;
    EOTFactory internal factory;
    AletheiaMarket internal market;
    MockWorldID internal worldId;

    function setUp() public {
        forwarder = new MockForwarder();
        worldId = new MockWorldID();
        oracle = new AletheiaOracle(address(forwarder));
        factory = new EOTFactory();
        market = new AletheiaMarket(address(oracle), address(factory), address(worldId), 12345);
        oracle.setPredictionMarket(address(market));
    }

    function test_onReport_onlyForwarder() public {
        bytes memory report = abi.encode(uint256(1), true, uint8(90), keccak256("proof"));

        vm.expectRevert(ReceiverTemplate.InvalidSender.selector);
        oracle.onReport("", report);
    }

    function test_creReport_autoSettlesMarket() public {
        uint256 deadline = block.timestamp + 1 days;

        uint256 requestId = market.requestMarketCreation(
            "Will ETH close above $5k by next week?",
            deadline
        );
        bytes memory validationReport = abi.encode(
            uint8(2),
            uint256(1),
            true,
            uint8(92),
            true,
            true,
            true,
            true,
            keccak256("validation-proof")
        );
        forwarder.push(address(oracle), "", validationReport);

        uint256[8] memory proof;
        uint256 marketId = market.finalizeMarketCreation{value: 2 ether}(
            requestId,
            1 ether,
            1 ether,
            1,
            111,
            proof
        );

        vm.warp(deadline + 1);

        bytes32 proofHash = keccak256("proof-success");
        bytes memory report = abi.encode(uint8(1), uint256(1), true, uint8(90), proofHash);
        forwarder.push(address(oracle), "", report);

        (bool resolved, bool outcome, uint8 confidence, bytes32 storedProof) = oracle.getResolution(1);
        assertTrue(resolved);
        assertTrue(outcome);
        assertEq(confidence, 90);
        assertEq(storedProof, proofHash);

        (uint256 oracleMarketId,,,,,,, bool settled, bool marketOutcome,) = market.markets(marketId);
        (, , , address yesToken,,,,,,) = market.markets(marketId);
        assertEq(oracleMarketId, 1);
        assertTrue(settled);
        assertTrue(marketOutcome);
        assertTrue(EventOutcomeToken(yesToken).redemptionEnabled());
    }

    function test_creReport_lowConfidence_doesNotAutoSettle() public {
        uint256 deadline = block.timestamp + 1 days;

        uint256 requestId = market.requestMarketCreation(
            "Will BTC close above $100k by end of month?",
            deadline
        );
        bytes memory validationReport = abi.encode(
            uint8(2),
            uint256(1),
            true,
            uint8(90),
            true,
            true,
            true,
            true,
            keccak256("validation-proof-2")
        );
        forwarder.push(address(oracle), "", validationReport);

        uint256[8] memory proof;
        uint256 marketId = market.finalizeMarketCreation{value: 2 ether}(
            requestId,
            1 ether,
            1 ether,
            1,
            222,
            proof
        );

        vm.warp(deadline + 1);

        bytes memory report = abi.encode(uint8(1), uint256(1), false, uint8(60), keccak256("proof-low"));
        forwarder.push(address(oracle), "", report);

        (bool resolved, , uint8 confidence, ) = oracle.getResolution(1);
        assertTrue(resolved);
        assertEq(confidence, 60);

        (,,,,,,, bool settled,,) = market.markets(marketId);
        assertFalse(settled);
    }
}

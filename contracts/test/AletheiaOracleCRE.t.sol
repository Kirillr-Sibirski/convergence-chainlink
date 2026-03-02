// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../AletheiaOracle.sol";
import "../AletheiaMarket.sol";
import "../EOTFactory.sol";
import "../EventOutcomeToken.sol";
import "../ReceiverTemplate.sol";

contract MockForwarder {
    function push(address receiver, bytes calldata metadata, bytes calldata report) external {
        IReceiver(receiver).onReport(metadata, report);
    }
}

contract AletheiaOracleCRETest is Test {
    MockForwarder internal forwarder;
    AletheiaOracle internal oracle;
    EOTFactory internal factory;
    AletheiaMarket internal market;

    function setUp() public {
        forwarder = new MockForwarder();
        oracle = new AletheiaOracle(address(forwarder));
        factory = new EOTFactory();
        market = new AletheiaMarket(address(oracle), address(factory));
        oracle.setPredictionMarket(address(market));
    }

    function test_onReport_onlyForwarder() public {
        bytes memory report = abi.encode(uint256(1), true, uint8(90), keccak256("proof"));

        vm.expectRevert(ReceiverTemplate.InvalidSender.selector);
        oracle.onReport("", report);
    }

    function test_creReport_autoSettlesMarket() public {
        uint256 deadline = block.timestamp + 1 days;

        uint256 marketId = market.createMarket{value: 2 ether}(
            "Will ETH close above $5k by next week?",
            deadline,
            1 ether,
            1 ether
        );

        vm.warp(deadline + 1);

        bytes32 proofHash = keccak256("proof-success");
        bytes memory report = abi.encode(uint256(1), true, uint8(90), proofHash);
        forwarder.push(address(oracle), "", report);

        (bool resolved, bool outcome, uint8 confidence, bytes32 storedProof) = oracle.getResolution(1);
        assertTrue(resolved);
        assertTrue(outcome);
        assertEq(confidence, 90);
        assertEq(storedProof, proofHash);

        (
            uint256 oracleMarketId,
            string memory question_,
            uint256 deadline_,
            address yesToken,
            address noToken_,
            address pool_,
            uint256 totalStaked_,
            bool settled,
            bool marketOutcome,
            uint256 createdAt_
            ) = market.markets(marketId);
        question_;
        deadline_;
        noToken_;
        pool_;
        totalStaked_;
        createdAt_;

        assertEq(oracleMarketId, 1);
        assertTrue(settled);
        assertTrue(marketOutcome);
        assertTrue(EventOutcomeToken(yesToken).redemptionEnabled());
    }

    function test_creReport_lowConfidence_doesNotAutoSettle() public {
        uint256 deadline = block.timestamp + 1 days;

        uint256 marketId = market.createMarket{value: 2 ether}(
            "Will BTC close above $100k by end of month?",
            deadline,
            1 ether,
            1 ether
        );

        vm.warp(deadline + 1);

        bytes memory report = abi.encode(uint256(1), false, uint8(60), keccak256("proof-low"));
        forwarder.push(address(oracle), "", report);

        (bool resolved, , uint8 confidence, ) = oracle.getResolution(1);
        assertTrue(resolved);
        assertEq(confidence, 60);

        (
            uint256 oracleMarketId2_,
            string memory question2_,
            uint256 deadline2_,
            address yesToken2_,
            address noToken2_,
            address pool2_,
            uint256 totalStaked2_,
            bool settled,
            bool marketOutcome2_,
            uint256 createdAt2_
            ) = market.markets(marketId);
        oracleMarketId2_;
        question2_;
        deadline2_;
        yesToken2_;
        noToken2_;
        pool2_;
        totalStaked2_;
        marketOutcome2_;
        createdAt2_;

        assertFalse(settled);
    }
}

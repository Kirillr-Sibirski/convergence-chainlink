// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../AletheiaOracle.sol";
import "../AletheiaMarket.sol";
import "../ReceiverTemplate.sol";

contract MockForwarder {
    function push(address receiver, bytes calldata metadata, bytes calldata report) external {
        IReceiver(receiver).onReport(metadata, report);
    }
}

contract AletheiaOracleCRETest is Test {
    MockForwarder internal forwarder;
    AletheiaOracle internal oracle;
    AletheiaMarket internal market;

    function setUp() public {
        forwarder = new MockForwarder();
        oracle = new AletheiaOracle(address(forwarder));
        market = new AletheiaMarket(address(oracle));
        oracle.setPredictionMarket(address(market));
    }

    function test_onReport_onlyForwarder() public {
        bytes memory report = abi.encode(uint8(1), uint256(1), true, uint8(90), keccak256("proof"));

        vm.expectRevert(ReceiverTemplate.InvalidSender.selector);
        oracle.onReport("", report);
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

        uint256 marketId = market.createMarketVerified(question, deadline);

        vm.warp(deadline + 1);

        bytes32 proofHash = keccak256("proof-success");
        bytes memory resolutionReport = abi.encode(uint8(1), uint256(1), true, uint8(90), proofHash);
        forwarder.push(address(oracle), "", resolutionReport);

        (,,,,, bool settled, bool outcome,) = market.markets(marketId);
        assertTrue(settled);
        assertTrue(outcome);
    }
}

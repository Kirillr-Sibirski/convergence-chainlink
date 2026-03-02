// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Script.sol";

contract Test {
    Vm public constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function assertTrue(bool condition) internal pure {
        require(condition, "assertTrue failed");
    }

    function assertFalse(bool condition) internal pure {
        require(!condition, "assertFalse failed");
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        require(a == b, "assertEq(uint256) failed");
    }

    function assertEq(bytes32 a, bytes32 b) internal pure {
        require(a == b, "assertEq(bytes32) failed");
    }
}

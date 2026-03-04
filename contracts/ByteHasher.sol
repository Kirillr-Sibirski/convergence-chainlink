// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library ByteHasher {
    function hashToField(bytes memory value) internal pure returns (uint256) {
        return uint256(keccak256(value)) >> 8;
    }
}


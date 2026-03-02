// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Script.sol";

library stdJson {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function readAddress(string memory json, string memory key) internal returns (address) {
        return vm.parseJsonAddress(json, key);
    }
}

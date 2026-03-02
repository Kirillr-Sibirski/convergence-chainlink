// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./console.sol";

interface Vm {
    function envUint(string calldata) external view returns (uint256);
    function envAddress(string calldata) external view returns (address);
    function envString(string calldata) external view returns (string memory);
    function envBytes32(string calldata) external view returns (bytes32);
    function envExists(string calldata) external view returns (bool);
    function expectRevert(bytes4) external;
    function warp(uint256) external;
    function startBroadcast(uint256 privateKey) external;
    function stopBroadcast() external;
    function addr(uint256 privateKey) external view returns (address);
    function readFile(string calldata path) external view returns (string memory);
    function writeFile(string calldata path, string calldata data) external;
    function toString(address value) external pure returns (string memory);
    function parseJsonAddress(string calldata json, string calldata key) external view returns (address);
}

abstract contract Script {
    Vm public constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventOutcomeToken.sol";

/**
 * @title EOTFactory
 * @notice Factory for deploying YES/NO token pairs for prediction markets
 * @dev Creates standardized ERC-20 tokens with consistent naming
 */
contract EOTFactory {
    struct TokenPair {
        address yesToken;
        address noToken;
        uint256 createdAt;
    }

    // Market ID => Token pair
    mapping(uint256 => TokenPair) public marketTokens;

    // Events
    event TokenPairCreated(
        uint256 indexed marketId,
        address indexed yesToken,
        address indexed noToken,
        string question
    );

    // Errors
    error TokenPairAlreadyExists();

    /**
     * @notice Create a YES/NO token pair for a market
     * @param marketId Unique ID of the market
     * @param question Market question (used in token names)
     * @param marketContract Address of the market contract (has mint/burn permissions)
     * @return yesToken Address of the YES outcome token
     * @return noToken Address of the NO outcome token
     */
    function createTokenPair(
        uint256 marketId,
        string memory question,
        address marketContract
    ) external returns (address yesToken, address noToken) {
        // Ensure no duplicate
        if (marketTokens[marketId].yesToken != address(0)) {
            revert TokenPairAlreadyExists();
        }

        // Create token names and symbols
        string memory yesName = string(abi.encodePacked("AEEIA Market #", _uint2str(marketId), " YES"));
        string memory yesSymbol = string(abi.encodePacked("AEEIA-", _uint2str(marketId), "-YES"));

        string memory noName = string(abi.encodePacked("AEEIA Market #", _uint2str(marketId), " NO"));
        string memory noSymbol = string(abi.encodePacked("AEEIA-", _uint2str(marketId), "-NO"));

        // Deploy tokens
        EventOutcomeToken yes = new EventOutcomeToken(
            yesName,
            yesSymbol,
            marketContract,
            marketId,
            true // isYesToken
        );

        EventOutcomeToken no = new EventOutcomeToken(
            noName,
            noSymbol,
            marketContract,
            marketId,
            false // isYesToken
        );

        yesToken = address(yes);
        noToken = address(no);

        // Store
        marketTokens[marketId] = TokenPair({
            yesToken: yesToken,
            noToken: noToken,
            createdAt: block.timestamp
        });

        emit TokenPairCreated(marketId, yesToken, noToken, question);
    }

    /**
     * @notice Get token pair for a market
     * @param marketId Market ID
     * @return yesToken YES token address
     * @return noToken NO token address
     */
    function getTokenPair(uint256 marketId)
        external
        view
        returns (address yesToken, address noToken)
    {
        TokenPair memory pair = marketTokens[marketId];
        return (pair.yesToken, pair.noToken);
    }

    /**
     * @dev Convert uint256 to string
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}

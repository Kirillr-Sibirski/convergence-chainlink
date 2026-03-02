// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IERC20.sol";

contract ERC20 is IERC20 {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) public virtual override returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 value) public virtual override returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public virtual override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        require(currentAllowance >= value, "ERC20: insufficient allowance");
        unchecked {
            _approve(from, msg.sender, currentAllowance - value);
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal virtual {
        require(from != address(0), "ERC20: transfer from zero");
        require(to != address(0), "ERC20: transfer to zero");

        uint256 fromBal = _balances[from];
        require(fromBal >= value, "ERC20: transfer exceeds balance");
        unchecked {
            _balances[from] = fromBal - value;
        }
        _balances[to] += value;

        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) internal virtual {
        require(to != address(0), "ERC20: mint to zero");

        _totalSupply += value;
        _balances[to] += value;
        emit Transfer(address(0), to, value);
    }

    function _burn(address from, uint256 value) internal virtual {
        require(from != address(0), "ERC20: burn from zero");
        uint256 fromBal = _balances[from];
        require(fromBal >= value, "ERC20: burn exceeds balance");

        unchecked {
            _balances[from] = fromBal - value;
        }
        _totalSupply -= value;
        emit Transfer(from, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) internal virtual {
        require(owner != address(0), "ERC20: approve from zero");
        require(spender != address(0), "ERC20: approve to zero");

        _allowances[owner][spender] = value;
        emit Approval(owner, spender, value);
    }
}

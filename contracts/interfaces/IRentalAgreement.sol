// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IRentalAgreement
 * @dev Interface for the RentalAgreement contract
 */
interface IRentalAgreement {
    /**
     * @dev Enum for contract status
     */
    enum ContractStatus { INITIALIZED, ACTIVE, CLOSED }
    
    /**
     * @dev Withdraws collateral from the rental agreement
     * @param amount The amount of collateral to withdraw
     */
    function withdrawCollateral(uint256 amount) external;

    /**
     * @dev Returns collateral to the rental agreement
     * @param amount The amount of collateral to return
     */
    function returnCollateral(uint256 amount) external payable;

    /**
     * @dev Receives rent payment from a loan
     */
    function receiveRentFromLoan() external payable;

    /**
     * @dev Returns the available collateral amount
     * @return The available collateral amount
     */
    function getAvailableCollateral() external view returns (uint256);

    /**
     * @dev Returns the current security deposit amount
     * @return The current security deposit amount
     */
    function getCurrentSecurityDeposit() external view returns (uint256);

    /**
     * @dev Returns the base rent amount
     * @return The base rent amount
     */
    function getBaseRent() external view returns (uint256);
    
    /**
     * @dev Returns the contract status
     * @return The contract status
     */
    function getContractStatus() external view returns (ContractStatus);
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ILoanAgreementFactory
 * @dev Interface for the LoanAgreementFactory contract
 */
interface ILoanAgreementFactory {
    /**
     * @dev Check if a loan contract is valid
     * @param loanContract The loan contract address to check
     * @return A boolean indicating if the loan contract is valid
     */
    function isValidLoanContract(address loanContract) external view returns (bool);
}
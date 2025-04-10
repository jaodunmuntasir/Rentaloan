// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ILoanAgreement
 * @dev Interface for the LoanAgreement contract
 */
interface ILoanAgreement {
    /**
     * @dev Enum for loan status
     */
    enum Status { 
        INITIALIZED,  // Initial state when contract is created by borrower
        READY,        // After lender sends funds
        ACTIVE,       // After collateral is withdrawn
        PAID,         // After loan amount is paid to rental contract
        COMPLETED,    // Successfully repaid loan
        DEFAULTED     // Loan went into default
    }

    /**
     * @dev Activate the loan by withdrawing collateral
     */
    function activateLoan() external;

    /**
     * @dev Pay the rental contract with loan amount
     */
    function payRental() external;
    
    /**
     * @dev Returns the borrower address
     * @return The borrower address
     */
    function getBorrower() external view returns (address);

    /**
     * @dev Returns the lender address
     * @return The lender address
     */
    function getLender() external view returns (address);

    /**
     * @dev Returns the loan amount
     * @return The loan amount
     */
    function getLoanAmount() external view returns (uint256);

    /**
     * @dev Returns the collateral amount
     * @return The collateral amount
     */
    function getCollateralAmount() external view returns (uint256);

    /**
     * @dev Returns the status of the loan
     * @return The status
     */
    function getStatus() external view returns (Status);

    /**
     * @dev Returns the repayment schedule
     * @return amounts The repayment amounts
     * @return monthNumbers The month numbers for the repayments
     */
    function getRepaymentSchedule() external view returns (uint256[] memory amounts, uint256[] memory monthNumbers);
}
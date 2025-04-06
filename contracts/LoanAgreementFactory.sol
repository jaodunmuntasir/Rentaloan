// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./LoanAgreement.sol";
import "./interfaces/IRentalAgreement.sol";
import "./interfaces/ILoanAgreement.sol";
import "./interfaces/ILoanAgreementFactory.sol";

/**
 * @title LoanAgreementFactory
 * @dev Factory contract for creating loan agreements
 */
contract LoanAgreementFactory is ILoanAgreementFactory, ReentrancyGuard {
    struct LoanAgreementInfo {
        address contractAddress;
        address borrower;
        address lender;
        uint256 amount;
        ILoanAgreement.Status status;
    }
    
    mapping(address => LoanAgreementInfo[]) public borrowerLoans;
    mapping(address => LoanAgreementInfo[]) public lenderLoans;
    mapping(address => bool) public validLoanContracts;
    
    event LoanAgreementCreated(address loan, address borrower, address lender, uint256 amount);
    
    /**
     * @dev Create a new loan agreement
     * @param _lender The lender address
     * @param _rentalContract The rental contract address
     * @param _loanAmount The loan amount
     * @param _interestRate The interest rate
     * @param _duration The duration of the loan
     * @param _graceMonths The grace period in months
     * @return The address of the new loan agreement
     */
    function createLoanAgreement(
        address _lender,
        address _rentalContract,
        uint256 _loanAmount,
        uint256 _interestRate,
        uint256 _duration,
        uint256 _graceMonths
    ) external nonReentrant returns (address) {
        require(_lender != address(0), "LoanAgreementFactory: Invalid lender address");
        require(_rentalContract != address(0), "LoanAgreementFactory: Invalid rental contract address");
        require(_loanAmount > 0, "LoanAgreementFactory: Loan amount must be greater than 0");
        require(_duration > 0, "LoanAgreementFactory: Duration must be greater than 0");
        require(_graceMonths > 0 && _graceMonths <= _duration, "LoanAgreementFactory: Invalid grace months");
        require(_interestRate > 0 && _interestRate <= 100, "LoanAgreementFactory: Invalid interest rate");
        
        // Check if the rental contract has enough collateral
        IRentalAgreement rentalContract = IRentalAgreement(_rentalContract);
        require(rentalContract.getAvailableCollateral() >= _loanAmount, "LoanAgreementFactory: Insufficient collateral");
        
        // Create the loan agreement with msg.sender as the borrower
        LoanAgreement newLoan = new LoanAgreement(
            msg.sender,  // borrower is the caller
            _lender,     // lender is provided as parameter
            _rentalContract,
            _loanAmount,
            _interestRate,
            _duration,
            _graceMonths
        );
        
        // Register the loan contract
        validLoanContracts[address(newLoan)] = true;
        
        // Store loan information
        LoanAgreementInfo memory info = LoanAgreementInfo({
            contractAddress: address(newLoan),
            borrower: msg.sender,
            lender: _lender,
            amount: _loanAmount,
            status: ILoanAgreement.Status.INITIALIZED
        });
        
        borrowerLoans[msg.sender].push(info);
        lenderLoans[_lender].push(info);
        
        emit LoanAgreementCreated(address(newLoan), msg.sender, _lender, _loanAmount);
        return address(newLoan);
    }
    
    /**
     * @dev Check if a loan contract is valid
     * @param loanContract The loan contract address to check
     * @return A boolean indicating if the loan contract is valid
     */
    function isValidLoanContract(address loanContract) external view override returns (bool) {
        return validLoanContracts[loanContract];
    }
    
    /**
     * @dev Get all loans for a borrower
     * @return An array of LoanAgreementInfo for the borrower
     */
    function getBorrowerLoans() external view returns (LoanAgreementInfo[] memory) {
        return borrowerLoans[msg.sender];
    }
    
    /**
     * @dev Get all loans for a lender
     * @return An array of LoanAgreementInfo for the lender
     */
    function getLenderLoans() external view returns (LoanAgreementInfo[] memory) {
        return lenderLoans[msg.sender];
    }
    
    /**
     * @dev Get the current status of a loan
     * This function can be called by anyone to get the most up-to-date status
     * @param loanContract The loan contract address
     * @return The current status of the loan
     */
    function getLoanCurrentStatus(address loanContract) external view returns (ILoanAgreement.Status) {
        require(validLoanContracts[loanContract], "LoanAgreementFactory: Invalid loan contract");
        return ILoanAgreement(loanContract).getStatus();
    }
    
    /**
     * @dev Refresh the status of a specific loan in the factory's records
     * @param loanContract The loan contract address
     */
    function refreshLoanStatus(address loanContract) external {
        require(validLoanContracts[loanContract], "LoanAgreementFactory: Invalid loan contract");
        
        ILoanAgreement loan = ILoanAgreement(loanContract);
        address borrower = loan.getBorrower();
        address lender = loan.getLender();
        ILoanAgreement.Status currentStatus = loan.getStatus();
        
        // Update status in borrower's records
        for (uint i = 0; i < borrowerLoans[borrower].length; i++) {
            if (borrowerLoans[borrower][i].contractAddress == loanContract) {
                borrowerLoans[borrower][i].status = currentStatus;
                break;
            }
        }
        
        // Update status in lender's records
        for (uint i = 0; i < lenderLoans[lender].length; i++) {
            if (lenderLoans[lender][i].contractAddress == loanContract) {
                lenderLoans[lender][i].status = currentStatus;
                break;
            }
        }
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Allow the contract to receive ETH
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./LoanAgreement.sol";
import "./interfaces/IRentalAgreement.sol";
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
        bool active;
    }
    
    mapping(address => LoanAgreementInfo[]) public borrowerLoans;
    mapping(address => LoanAgreementInfo[]) public lenderLoans;
    mapping(address => bool) public validLoanContracts;
    
    event LoanAgreementCreated(address loan, address borrower, address lender, uint256 amount);
    
    /**
     * @dev Create a new loan agreement
     * @param _borrower The borrower address
     * @param _rentalContract The rental contract address
     * @param _loanAmount The loan amount
     * @param _interestRate The interest rate
     * @param _duration The duration of the loan
     * @param _graceMonths The grace period in months
     * @return The address of the new loan agreement
     */
    function createLoanAgreement(
        address _borrower,
        address _rentalContract,
        uint256 _loanAmount,
        uint256 _interestRate,
        uint256 _duration,
        uint256 _graceMonths
    ) external nonReentrant returns (address) {
        require(_borrower != address(0), "LoanAgreementFactory: Invalid borrower address");
        require(_rentalContract != address(0), "LoanAgreementFactory: Invalid rental contract address");
        require(_loanAmount > 0, "LoanAgreementFactory: Loan amount must be greater than 0");
        require(_duration > 0, "LoanAgreementFactory: Duration must be greater than 0");
        require(_graceMonths > 0 && _graceMonths <= _duration, "LoanAgreementFactory: Invalid grace months");
        require(_interestRate > 0 && _interestRate <= 100, "LoanAgreementFactory: Invalid interest rate");
        
        // Check if the rental contract has enough collateral
        IRentalAgreement rentalContract = IRentalAgreement(_rentalContract);
        require(rentalContract.getAvailableCollateral() >= _loanAmount, "LoanAgreementFactory: Insufficient collateral");
        
        // Create the loan agreement
        LoanAgreement newLoan = new LoanAgreement(
            _borrower,
            msg.sender,
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
            borrower: _borrower,
            lender: msg.sender,
            amount: _loanAmount,
            active: true
        });
        
        borrowerLoans[_borrower].push(info);
        lenderLoans[msg.sender].push(info);
        
        emit LoanAgreementCreated(address(newLoan), _borrower, msg.sender, _loanAmount);
        return address(newLoan);
    }
    
    /**
     * @dev Initialize a loan with funding
     * @param loanContract The loan contract address to initialize
     */
    function initializeLoan(address payable loanContract) external payable nonReentrant {
        require(validLoanContracts[loanContract], "LoanAgreementFactory: Invalid loan contract");
        
        LoanAgreement loan = LoanAgreement(loanContract);
        require(msg.sender == loan.lender(), "LoanAgreementFactory: Only lender can initialize");
        require(msg.value == loan.loanAmount(), "LoanAgreementFactory: Must send loan amount");
        
        // Initialize the loan
        loan.initialize{value: msg.value}();
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
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Allow the contract to receive ETH
    }
}
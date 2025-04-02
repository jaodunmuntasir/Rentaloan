// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IRentalAgreement.sol";
import "./interfaces/ILoanAgreement.sol";

/**
 * @title LoanAgreement
 * @dev Contract for managing loan agreements for rental payment
 */
contract LoanAgreement is ILoanAgreement, ReentrancyGuard {
    using SafeMath for uint256;

    address public borrower;
    address public lender;
    address public rentalContract;
    uint256 public loanAmount;
    uint256 public interestRate;
    uint256 public duration;
    uint256 public graceMonths;
    uint256 public collateralAmount;
    uint256 public startTime;
    uint256 public lastPaidMonth;
    uint256 public monthlyPayment;
    uint256 public firstPaymentDue;
    
    // Repayment schedule
    mapping(uint256 => bool) public repaymentMade;
    
    Status private _status;
    
    event LoanStarted(uint256 amount, uint256 collateral);
    event RepaymentMade(uint256 month, uint256 amount);
    event LoanClosed(string reason);
    
    modifier onlyBorrower() {
        require(msg.sender == borrower, "LoanAgreement: Only borrower can call");
        _;
    }
    
    modifier onlyLender() {
        require(msg.sender == lender, "LoanAgreement: Only lender can call");
        _;
    }
    
    modifier loanActive() {
        require(_status == Status.ACTIVE, "LoanAgreement: Loan not active");
        _;
    }
    
    /**
     * @dev Constructor for LoanAgreement
     * @param _borrower The borrower address
     * @param _lender The lender address
     * @param _rentalContract The rental contract address
     * @param _loanAmount The loan amount
     * @param _interestRate The interest rate
     * @param _duration The duration of the loan
     * @param _graceMonths The grace period in months
     */
    constructor(
        address _borrower,
        address _lender,
        address _rentalContract,
        uint256 _loanAmount,
        uint256 _interestRate,
        uint256 _duration,
        uint256 _graceMonths
    ) {
        require(_borrower != address(0), "LoanAgreement: Invalid borrower address");
        require(_lender != address(0), "LoanAgreement: Invalid lender address");
        require(_rentalContract != address(0), "LoanAgreement: Invalid rental contract address");
        require(_loanAmount > 0, "LoanAgreement: Loan amount must be greater than 0");
        require(_duration > 0, "LoanAgreement: Duration must be greater than 0");
        require(_graceMonths > 0 && _graceMonths <= _duration, "LoanAgreement: Invalid grace months");
        require(_interestRate > 0 && _interestRate <= 100, "LoanAgreement: Invalid interest rate");
        
        borrower = _borrower;
        lender = _lender;
        rentalContract = _rentalContract;
        loanAmount = _loanAmount;
        interestRate = _interestRate;
        duration = _duration;
        graceMonths = _graceMonths;
        collateralAmount = _loanAmount;
        _status = Status.ACTIVE;
        startTime = block.timestamp;
        
        // Create repayment schedule
        _createRepaymentSchedule();
    }
    
    /**
     * @dev Initialize the loan by withdrawing collateral and sending rent
     */
    function initialize() external payable nonReentrant {
        require(msg.sender == lender, "LoanAgreement: Only lender can initialize");
        require(msg.value == loanAmount, "LoanAgreement: Must send loan amount");
        require(_status == Status.ACTIVE, "LoanAgreement: Loan already initialized");
        
        IRentalAgreement rental = IRentalAgreement(rentalContract);
        
        // Check available collateral
        require(rental.getAvailableCollateral() >= collateralAmount, "LoanAgreement: Insufficient collateral available");
        
        // Withdraw collateral first (follow checks-effects-interactions pattern)
        rental.withdrawCollateral(collateralAmount);
        
        // Transfer the loan amount to the rental contract to pay rent
        rental.receiveRentFromLoan{value: loanAmount}(lastPaidMonth + 1);
        
        emit LoanStarted(loanAmount, collateralAmount);
    }
    
    /**
     * @dev Create the repayment schedule
     */
    function _createRepaymentSchedule() internal {
        uint256 totalAmount = loanAmount.add(loanAmount.mul(interestRate).div(100));
        monthlyPayment = totalAmount.div(duration);
        firstPaymentDue = startTime + 30 days;
    }

    function getRepaymentInfo(uint256 month) public view returns (uint256 amount, uint256 dueDate, bool isPaid) {
        require(month > 0 && month <= duration, "LoanAgreement: Invalid month");
        amount = monthlyPayment;
        dueDate = firstPaymentDue + ((month - 1) * 30 days);
        isPaid = repaymentMade[month];
        return (amount, dueDate, isPaid);
    }
    
    /**
     * @dev Make a loan repayment
     * @param month The month for which the repayment is being made
     */
    function makeRepayment(uint256 month) external payable nonReentrant loanActive {
        require(month > lastPaidMonth && month <= duration, "LoanAgreement: Invalid month");
        require(!repaymentMade[month], "LoanAgreement: Already paid for this month");
        
        require(msg.value == monthlyPayment, "LoanAgreement: Incorrect payment amount");
        
        uint256 missedMonths = month - lastPaidMonth - 1;
        require(missedMonths <= graceMonths, "LoanAgreement: Too many missed payments");
        
        // Update state before external call
        repaymentMade[month] = true;
        lastPaidMonth = month;
        
        // Transfer payment to lender
        (bool success, ) = lender.call{value: monthlyPayment}("");
        require(success, "LoanAgreement: Transfer to lender failed");
        
        emit RepaymentMade(month, monthlyPayment);
        
        if (month == duration) {
            _closeLoan("Loan fully repaid");
        }
    }
    
    /**
     * @dev Calculate the monthly payment
     * @return The monthly payment amount
     */
    function calculateMonthlyPayment() public view returns (uint256) {
        return loanAmount.add(loanAmount.mul(interestRate).div(100)).div(duration);
    }
    
    /**
     * @dev Close the loan
     * @param reason The reason for closing the loan
     */
    function _closeLoan(string memory reason) internal {
        if (_status == Status.ACTIVE) {
            // Update state before external calls
            _status = Status.CLOSED;
            
            IRentalAgreement rental = IRentalAgreement(rentalContract);
            
            // Check if loan defaulted
            if (lastPaidMonth + graceMonths < duration) {
                // Lender gets the collateral if the borrower defaults
                (bool success, ) = lender.call{value: collateralAmount}("");
                require(success, "LoanAgreement: Transfer to lender failed");
            } else {
                // Return collateral to the rental agreement
                rental.returnCollateral{value: collateralAmount}(collateralAmount);
            }
            
            emit LoanClosed(reason);
        }
    }
    
    /**
     * @dev Close the loan early (can be called by lender)
     * @param reason The reason for closing the loan early
     */
    function closeLoanEarly(string memory reason) external onlyLender loanActive nonReentrant {
        _closeLoan(reason);
    }
    
    /**
     * @dev Get the borrower address
     * @return The borrower address
     */
    function getBorrower() external view override returns (address) {
        return borrower;
    }
    
    /**
     * @dev Get the lender address
     * @return The lender address
     */
    function getLender() external view override returns (address) {
        return lender;
    }
    
    /**
     * @dev Get the loan amount
     * @return The loan amount
     */
    function getLoanAmount() external view override returns (uint256) {
        return loanAmount;
    }
    
    /**
     * @dev Get the collateral amount
     * @return The collateral amount
     */
    function getCollateralAmount() external view override returns (uint256) {
        return collateralAmount;
    }
    
    /**
     * @dev Get the status of the loan
     * @return The status
     */
    function getStatus() external view override returns (Status) {
        return _status;
    }
    
    /**
     * @dev Get the repayment schedule
     * @return The repayment amounts and due dates
     */
    function getRepaymentSchedule() external view override returns (uint256[] memory, uint256[] memory) {
        // Create dynamic arrays on-demand to satisfy the interface
        uint256[] memory amounts = new uint256[](duration);
        uint256[] memory dueDates = new uint256[](duration);
        
        for (uint256 i = 0; i < duration; i++) {
            amounts[i] = monthlyPayment;
            dueDates[i] = firstPaymentDue + (i * 30 days);
        }
        
        return (amounts, dueDates);
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Allow the contract to receive ETH
    }
}
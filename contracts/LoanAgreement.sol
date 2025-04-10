// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IRentalAgreement.sol";
import "./interfaces/ILoanAgreement.sol";
import "./interfaces/ILoanAgreementFactory.sol";

/**
 * @title LoanAgreement
 * @dev Contract for managing loan agreements for rental payment
 */
contract LoanAgreement is ILoanAgreement, ReentrancyGuard {
    using SafeMath for uint256;

    address public borrower;
    address public lender;
    address public rentalContract;
    address public factory;
    uint256 public loanAmount;
    uint256 public interestRate;
    uint256 public duration;
    uint256 public graceMonths;
    uint256 public collateralAmount;
    uint256 public lastPaidMonth;
    uint256 public monthlyPayment;
    
    // Repayment schedule
    mapping(uint256 => bool) public repaymentMade;
    
    Status private _status;
    
    event LoanStarted(uint256 amount, uint256 collateral);
    event StatusChanged(Status oldStatus, Status newStatus);
    event RepaymentMade(uint256 month, uint256 amount);
    event LoanClosed(string reason, Status status);
    
    modifier onlyBorrower() {
        require(msg.sender == borrower, "LoanAgreement: Only borrower can call");
        _;
    }
    
    modifier onlyLender() {
        require(msg.sender == lender, "LoanAgreement: Only lender can call");
        _;
    }
    
    modifier inStatus(Status requiredStatus) {
        require(_status == requiredStatus, "LoanAgreement: Invalid loan status");
        _;
    }
    
    modifier validFactory() {
        require(ILoanAgreementFactory(factory).isValidLoanContract(address(this)), 
                "LoanAgreement: Not created by valid factory");
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
        factory = msg.sender; // Store the factory address
        loanAmount = _loanAmount;
        interestRate = _interestRate;
        duration = _duration;
        graceMonths = _graceMonths;
        collateralAmount = _loanAmount;
        _status = Status.INITIALIZED; // Set by borrower at creation time
        lastPaidMonth = 0; // No months paid yet
        
        // Calculate monthly payment at creation time
        uint256 totalAmount = loanAmount.add(loanAmount.mul(interestRate).div(100));
        monthlyPayment = totalAmount.div(duration);
        
        emit StatusChanged(Status.INITIALIZED, Status.INITIALIZED);
    }
    
    /**
     * @dev Fund the loan (called by lender)
     */
    function fundLoan() external payable onlyLender inStatus(Status.INITIALIZED) nonReentrant validFactory {
        require(msg.value == loanAmount, "LoanAgreement: Must send loan amount");
        
        // Update status to READY
        Status oldStatus = _status;
        _status = Status.READY;
        emit StatusChanged(oldStatus, Status.READY);
        
        // Proceed to activate the loan
        // _activateLoan();
    }

    /**
    * @dev Activate the loan by withdrawing collateral (called by either borrower or lender)
    */
    function activateLoan() external nonReentrant validFactory {
        require(msg.sender == borrower || msg.sender == lender, "LoanAgreement: Only borrower or lender can activate");
        require(_status == Status.READY, "LoanAgreement: Loan must be in READY status");
        
        IRentalAgreement rental = IRentalAgreement(rentalContract);
        
        // Check available collateral
        require(rental.getAvailableCollateral() >= collateralAmount, "LoanAgreement: Insufficient collateral available");
        
        // Withdraw collateral
        rental.withdrawCollateral(collateralAmount);
        
        // Update status to ACTIVE
        Status oldStatus = _status;
        _status = Status.ACTIVE;
        emit StatusChanged(oldStatus, Status.ACTIVE);
    }
    
    /**
    * @dev Pay the rental contract with loan amount (called by either borrower or lender)
    */
    function payRental() external nonReentrant validFactory {
        require(msg.sender == borrower || msg.sender == lender, "LoanAgreement: Only borrower or lender can pay rental");
        require(_status == Status.ACTIVE, "LoanAgreement: Loan must be in ACTIVE status");
        
        IRentalAgreement rental = IRentalAgreement(rentalContract);
        
        // Transfer the loan amount to the rental contract to pay rent
        rental.receiveRentFromLoan{value: loanAmount}();
        
        // Update status to PAID
        Status oldStatus = _status;
        _status = Status.PAID;
        emit StatusChanged(oldStatus, Status.PAID);
        
        emit LoanStarted(loanAmount, collateralAmount);
    }

    /**
     * @dev Get repayment information for a specific month
     * @param month The month to get information for
     * @return amount The payment amount for the month
     * @return isPaid Whether the payment has been made
     */
    function getRepaymentInfo(uint256 month) public view returns (uint256 amount, bool isPaid) {
        require(month > 0 && month <= duration, "LoanAgreement: Invalid month");
        amount = monthlyPayment;
        isPaid = repaymentMade[month];
        return (amount, isPaid);
    }
    
    /**
     * @dev Make a loan repayment
     * @param month The month for which the repayment is being made
     */
    function makeRepayment(uint256 month) external payable inStatus(Status.PAID) nonReentrant validFactory {
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
            _closeLoanSuccessful("Loan fully repaid");
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
     * @dev Close the loan when fully repaid
     * @param reason The reason for closing the loan
     */
    function _closeLoanSuccessful(string memory reason) internal {
        // Update status to COMPLETED
        Status oldStatus = _status;
        _status = Status.COMPLETED;
        
        IRentalAgreement rental = IRentalAgreement(rentalContract);
        
        // Return collateral to the rental agreement
        rental.returnCollateral{value: collateralAmount}(collateralAmount);
        
        emit StatusChanged(oldStatus, Status.COMPLETED);
        emit LoanClosed(reason, Status.COMPLETED);
    }
    
    /**
     * @dev Close the loan when defaulted
     * @param reason The reason for closing the loan
     */
    function _closeLoanDefaulted(string memory reason) internal {
        // Update status to DEFAULTED
        Status oldStatus = _status;
        _status = Status.DEFAULTED;
        
        // Lender gets the collateral if the borrower defaults
        (bool success, ) = lender.call{value: collateralAmount}("");
        require(success, "LoanAgreement: Transfer to lender failed");
        
        emit StatusChanged(oldStatus, Status.DEFAULTED);
        emit LoanClosed(reason, Status.DEFAULTED);
    }
    
    /**
     * @dev Simulate a loan default (for testing purposes)
     */
    function simulateDefault() external onlyBorrower inStatus(Status.PAID) validFactory {
        _closeLoanDefaulted("Loan defaulted (simulated)");
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
        // Create dynamic arrays for the schedule
        uint256[] memory amounts = new uint256[](duration);
        uint256[] memory monthNumbers = new uint256[](duration);
        
        for (uint256 i = 0; i < duration; i++) {
            amounts[i] = monthlyPayment;
            monthNumbers[i] = i + 1; // Month numbers start from 1
        }
        
        return (amounts, monthNumbers);
    }
    
    /**
     * @dev Get detailed payment status for all months
     * @return monthNumbers The month numbers
     * @return isPaid Whether each month is paid
     */
    function getPaymentStatus() external view returns (uint256[] memory, bool[] memory) {
        uint256[] memory monthNumbers = new uint256[](duration);
        bool[] memory isPaid = new bool[](duration);
        
        for (uint256 i = 0; i < duration; i++) {
            monthNumbers[i] = i + 1;
            isPaid[i] = repaymentMade[i + 1];
        }
        
        return (monthNumbers, isPaid);
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Allow the contract to receive ETH
    }
}
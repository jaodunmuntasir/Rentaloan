// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./interfaces/IRentalAgreement.sol";
import "./interfaces/ILoanAgreementFactory.sol";

/**
 * @title RentalAgreement
 * @dev Contract for managing rental agreements between landlords and renters
 */
contract RentalAgreement is IRentalAgreement, ReentrancyGuard {
    using SafeMath for uint256;

    address public landlord;
    address public renter;
    address public loanAgreementFactory;
    uint256 public rentalDuration;
    uint256 public securityDeposit;
    uint256 public currentSecurityDeposit;
    uint256 private _baseRent;
    uint256 public gracePeriod;
    uint256 public startTime;
    uint256 public lastPaidMonth;
    uint256 public dueAmount;
    uint256 public skippedMonths;
    uint256 public currentMonth;

    ContractStatus private _status;

    mapping(uint256 => bool) public rentPaidForMonth;
    mapping(uint256 => bool) public rentSkippedForMonth;

    enum PaymentMethod {
        WALLET,
        LOAN
    }

    event ContractCreated(
        address landlord,
        address renter,
        uint256 duration,
        uint256 deposit,
        uint256 rent
    );
    event SecurityDepositPaid(uint256 amount);
    event RentPaid(uint256 month, uint256 amount, uint256 dueAmount);
    event RentSkipped(uint256 month);
    event ContractClosed(
        string reason,
        uint256 renterReturn,
        uint256 landlordPayment
    );
    event SecurityDepositUpdated(uint256 newAmount);
    event DurationExtended(uint256 newDuration);

    modifier onlyLandlord() {
        require(
            msg.sender == landlord,
            "RentalAgreement: Only landlord can call"
        );
        _;
    }

    modifier onlyRenter() {
        require(msg.sender == renter, "RentalAgreement: Only renter can call");
        _;
    }

    modifier contractActive() {
        require(
            _status == ContractStatus.ACTIVE,
            "RentalAgreement: Contract is not active"
        );
        _;
    }

    /**
     * @dev Constructor for RentalAgreement
     * @param _landlord The landlord address
     * @param _renter The renter address
     * @param _loanAgreementFactory The loan agreement factory address
     * @param _duration The duration of the rental agreement in months
     * @param _securityDeposit The security deposit amount
     * @param _baseRentAmount The base rent amount
     * @param _gracePeriod The grace period in months
     */
    constructor(
        address _landlord,
        address _renter,
        address _loanAgreementFactory,
        uint256 _duration,
        uint256 _securityDeposit,
        uint256 _baseRentAmount,
        uint256 _gracePeriod
    ) {
        require(
            _duration > 0,
            "RentalAgreement: Duration must be greater than 0"
        );
        require(
            _securityDeposit >= _baseRent,
            "RentalAgreement: Security deposit must be >= base rent"
        );
        require(
            _gracePeriod > 0 && _gracePeriod <= _duration.div(2),
            "RentalAgreement: Invalid grace period"
        );
        require(
            _loanAgreementFactory != address(0),
            "RentalAgreement: Invalid loan factory address"
        );

        landlord = _landlord;
        renter = _renter;
        loanAgreementFactory = _loanAgreementFactory;
        rentalDuration = _duration;
        securityDeposit = _securityDeposit;
        _baseRent = _baseRentAmount;
        gracePeriod = _gracePeriod;
        _status = ContractStatus.INITIALIZED;

        emit ContractCreated(
            landlord,
            renter,
            _duration,
            _securityDeposit,
            _baseRent
        );
    }

    /**
     * @dev Pay the security deposit to activate the contract
     */
    function paySecurityDeposit() external payable onlyRenter nonReentrant {
        require(
            _status == ContractStatus.INITIALIZED,
            "RentalAgreement: Contract already initialized"
        );
        require(
            msg.value == securityDeposit,
            "RentalAgreement: Incorrect security deposit amount"
        );

        // Update state
        currentSecurityDeposit = securityDeposit;
        _status = ContractStatus.ACTIVE;
        startTime = block.timestamp;
        lastPaidMonth = 0;
        currentMonth = 0;

        emit SecurityDepositPaid(msg.value);
    }

    /**
     * @dev Pay rent for a specific month
     * @param month The month for which rent is being paid
     * @param method The payment method
     */
    function payRent(
        uint256 month,
        PaymentMethod method
    ) external payable contractActive nonReentrant {
        require(
            month > lastPaidMonth && month <= rentalDuration,
            "RentalAgreement: Invalid month"
        );
        require(
            !rentPaidForMonth[month],
            "RentalAgreement: Rent already paid for this month"
        );
        require(
            !rentSkippedForMonth[month],
            "RentalAgreement: Rent already skipped for this month"
        );

        uint256 unpaidMonths = month - lastPaidMonth;
        require(
            unpaidMonths <= gracePeriod,
            "RentalAgreement: Too many unpaid months"
        );

        uint256 paymentAmount = _baseRent.add(dueAmount);

        if (method == PaymentMethod.WALLET) {
            require(
                msg.value == paymentAmount,
                "RentalAgreement: Incorrect rent amount"
            );

            // Update state before external call

            lastPaidMonth = month;

            for (uint256 i = currentMonth; i <= lastPaidMonth; i++) {
                rentPaidForMonth[i] = true;
            }

            currentMonth = month;

            dueAmount = 0;

            // Transfer to landlord
            (bool success, ) = landlord.call{value: msg.value}("");
            require(success, "RentalAgreement: Transfer to landlord failed");
        } else {
            // Payment will be handled by loan contract
            require(
                msg.value == 0,
                "RentalAgreement: Loan payment should not send ETH"
            );

            // Update state
            // rentPaidForMonth[month] = true;
            // lastPaidMonth = month;
            // dueAmount is handled in receiveRentFromLoan
        }

        emit RentPaid(month, paymentAmount, dueAmount);

        // Check if this was the final month
        if (month == rentalDuration) {
            _closeContract("Rental period completed");
        }
    }

    /**
     * @dev Skip rent for a specific month
     * @param month The month for which rent is being skipped
     */
    function skipRent(uint256 month) external contractActive onlyRenter {
        require(
            month > lastPaidMonth && month <= rentalDuration,
            "RentalAgreement: Invalid month"
        );
        require(
            !rentPaidForMonth[month],
            "RentalAgreement: Rent already paid for this month"
        );
        require(
            !rentSkippedForMonth[month],
            "RentalAgreement: Rent already skipped for this month"
        );
        require(
            month < rentalDuration,
            "RentalAgreement: Cannot skip the final month"
        );
        require(
            skippedMonths < gracePeriod,
            "RentalAgreement: Exceeded maximum allowed skipped months"
        );

        // Update state
        rentSkippedForMonth[month] = true;
        skippedMonths = skippedMonths.add(1);
        lastPaidMonth = month;
        dueAmount = dueAmount.add(_baseRent);

        emit RentSkipped(month);
    }

    /**
     * @dev Receive rent payment from a loan
     */
    function receiveRentFromLoan()
        external
        payable
        override
        contractActive
        nonReentrant
    {
        uint256 paymentAmount = _baseRent.add(dueAmount);
        require(
            msg.value == paymentAmount,
            "RentalAgreement: Incorrect rent amount"
        );
        require(
            ILoanAgreementFactory(loanAgreementFactory).isValidLoanContract(
                msg.sender
            ),
            "RentalAgreement: Invalid loan contract"
        );

        // Update state before external call

        lastPaidMonth = lastPaidMonth.add(1);

        for (uint256 i = currentMonth; i <= lastPaidMonth; i++) {
            rentPaidForMonth[i] = true;
        }

        currentMonth = lastPaidMonth;

        dueAmount = 0; // Reset due amount since it's being paid

        // Transfer to landlord
        (bool success, ) = landlord.call{value: msg.value}("");
        require(success, "RentalAgreement: Transfer to landlord failed");

        emit RentPaid(lastPaidMonth, paymentAmount, dueAmount);
    }

    /**
     * @dev Withdraw collateral from the security deposit for a loan
     * @param amount The amount of collateral to withdraw
     */
    function withdrawCollateral(
        uint256 amount
    ) external override contractActive nonReentrant {
        require(
            ILoanAgreementFactory(loanAgreementFactory).isValidLoanContract(
                msg.sender
            ),
            "RentalAgreement: Invalid loan contract"
        );
        require(
            amount <= getAvailableCollateral(),
            "RentalAgreement: Insufficient collateral"
        );

        // Update state before external call
        currentSecurityDeposit = currentSecurityDeposit.sub(amount);
        updateGracePeriod();

        // Transfer the collateral
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "RentalAgreement: Collateral transfer failed");
    }

    /**
     * @dev Return collateral to the security deposit
     * @param amount The amount of collateral to return
     */
    function returnCollateral(
        uint256 amount
    ) external payable override contractActive nonReentrant {
        require(
            ILoanAgreementFactory(loanAgreementFactory).isValidLoanContract(
                msg.sender
            ),
            "RentalAgreement: Invalid loan contract"
        );
        require(msg.value == amount, "RentalAgreement: Incorrect amount");

        // Update state
        currentSecurityDeposit = currentSecurityDeposit.add(amount);
        updateGracePeriod();
    }

    /**
     * @dev Close the contract early (can be called by either landlord or renter)
     * @param reason The reason for closing the contract early
     */
    function closeContractEarly(
        string memory reason
    ) external contractActive nonReentrant {
        require(
            msg.sender == landlord || msg.sender == renter,
            "RentalAgreement: Only landlord or renter can close early"
        );

        uint256 renterReturn;
        uint256 landlordPayment;

        if (msg.sender == landlord) {
            // If landlord closes early, renter gets all of the security deposit
            renterReturn = currentSecurityDeposit;
            landlordPayment = 0;
        } else {
            // If renter closes early, landlord gets all of the security deposit
            renterReturn = 0;
            landlordPayment = currentSecurityDeposit;
        }

        // Update state before external calls
        _status = ContractStatus.CLOSED;

        // Transfer funds
        if (renterReturn > 0) {
            (bool success, ) = renter.call{value: renterReturn}("");
            require(success, "RentalAgreement: Transfer to renter failed");
        }

        if (landlordPayment > 0) {
            (bool success, ) = landlord.call{value: landlordPayment}("");
            require(success, "RentalAgreement: Transfer to landlord failed");
        }

        emit ContractClosed(reason, renterReturn, landlordPayment);
    }

    /**
     * @dev Extend the duration of the rental agreement
     * @param additionalMonths The number of additional months
     */
    function extendContractDuration(
        uint256 additionalMonths
    ) external onlyLandlord contractActive {
        require(
            additionalMonths > 0,
            "RentalAgreement: Additional months must be greater than 0"
        );
        require(
            lastPaidMonth == rentalDuration - 1,
            "RentalAgreement: Can only extend in the last month"
        );

        // Update duration
        rentalDuration = rentalDuration.add(additionalMonths);

        emit DurationExtended(rentalDuration);
    }

    /**
     * @dev Get the available collateral amount
     * @return The available collateral amount
     */
    function getAvailableCollateral() public view override returns (uint256) {
        return currentSecurityDeposit.sub(_baseRent.mul(2));
    }

    /**
     * @dev Get the current security deposit amount
     * @return The current security deposit amount
     */
    function getCurrentSecurityDeposit()
        external
        view
        override
        returns (uint256)
    {
        return currentSecurityDeposit;
    }

    /**
     * @dev Get the base rent amount
     * @return The base rent amount
     */
    function getBaseRent() external view override returns (uint256) {
        return _baseRent;
    }

    function updateGracePeriod() internal {
        uint256 calculatedGrace = currentSecurityDeposit / _baseRent;

        if (rentalDuration < calculatedGrace) {
            gracePeriod = rentalDuration > 0 ? rentalDuration - 1 : 0;
        } else {
            gracePeriod = calculatedGrace;
        }
    }

    /**
     * @dev Get the contract status
     * @return The contract status
     */
    function getContractStatus()
        external
        view
        override
        returns (ContractStatus)
    {
        return _status;
    }

    /**
     * @dev Close the contract
     * @param reason The reason for closing the contract
     */
    function _closeContract(string memory reason) internal {
        // Update state before external calls
        _status = ContractStatus.CLOSED;

        uint256 dueRent = 0;

        // Calculate due rent if there are missed payments
        if (lastPaidMonth < rentalDuration) {
            dueRent = dueAmount.add(
                _baseRent.mul(rentalDuration.sub(lastPaidMonth))
            );
        } else {
            dueRent = dueAmount;
        }

        uint256 renterReturn;
        uint256 landlordPayment;

        if (dueRent >= currentSecurityDeposit) {
            // If due rent is greater than or equal to security deposit, landlord gets everything
            landlordPayment = currentSecurityDeposit;
            renterReturn = 0;
        } else {
            // Otherwise, landlord gets due rent, renter gets the remainder
            landlordPayment = dueRent;
            renterReturn = currentSecurityDeposit.sub(dueRent);
        }

        // Transfer funds
        if (renterReturn > 0) {
            (bool success, ) = renter.call{value: renterReturn}("");
            require(success, "RentalAgreement: Transfer to renter failed");
        }

        if (landlordPayment > 0) {
            (bool success, ) = landlord.call{value: landlordPayment}("");
            require(success, "RentalAgreement: Transfer to landlord failed");
        }

        emit ContractClosed(reason, renterReturn, landlordPayment);
    }

    /**
     * @dev Get the contract details
     * @return A tuple containing all the contract details
     */
    function getContractDetails()
        external
        view
        returns (
            address,
            address,
            uint256,
            uint256,
            uint256,
            uint256,
            ContractStatus,
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return (
            landlord,
            renter,
            rentalDuration,
            securityDeposit,
            _baseRent,
            gracePeriod,
            _status,
            currentSecurityDeposit,
            lastPaidMonth,
            dueAmount,
            skippedMonths,
            currentMonth
        );
    }

    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Allow the contract to receive ETH
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RentalAgreement.sol";

/**
 * @title RentalAgreementFactory
 * @dev Factory contract for creating rental agreements
 */
contract RentalAgreementFactory {
    struct RentalAgreementInfo {
        address contractAddress;
        string name;
        bool active;
    }
    
    mapping(address => RentalAgreementInfo[]) public landlordAgreements;
    mapping(address => RentalAgreementInfo[]) public renterAgreements;
    
    event AgreementCreated(address agreement, address landlord, address renter, string name);
    
    /**
     * @dev Create a new rental agreement
     * @param _renter The renter address
     * @param _loanAgreementFactory The loan agreement factory address
     * @param _duration The duration of the rental agreement in months
     * @param _securityDeposit The security deposit amount
     * @param _baseRent The base rent amount
     * @param _gracePeriod The grace period in months
     * @param _name The name of the agreement
     * @return The address of the new rental agreement
     */
    function createAgreement(
        address _renter,
        address _loanAgreementFactory,
        uint256 _duration,
        uint256 _securityDeposit,
        uint256 _baseRent,
        uint256 _gracePeriod,
        string memory _name
    ) external returns (address) {
        require(_renter != address(0), "RentalAgreementFactory: Invalid renter address");
        require(_loanAgreementFactory != address(0), "RentalAgreementFactory: Invalid loan factory address");
        require(_duration > 0, "RentalAgreementFactory: Duration must be greater than 0");
        require(_securityDeposit >= _baseRent, "RentalAgreementFactory: Security deposit must be >= base rent");
        require(_gracePeriod > 0 && _gracePeriod <= _duration / 2, "RentalAgreementFactory: Invalid grace period");
        require(bytes(_name).length > 0, "RentalAgreementFactory: Name cannot be empty");
        
        RentalAgreement newAgreement = new RentalAgreement(
            msg.sender,
            _renter,
            _loanAgreementFactory,
            _duration,
            _securityDeposit,
            _baseRent,
            _gracePeriod
        );
        
        RentalAgreementInfo memory info = RentalAgreementInfo({
            contractAddress: address(newAgreement),
            name: _name,
            active: true
        });
        
        landlordAgreements[msg.sender].push(info);
        renterAgreements[_renter].push(info);
        
        emit AgreementCreated(address(newAgreement), msg.sender, _renter, _name);
        return address(newAgreement);
    }
    
    /**
     * @dev Get all agreements for a landlord
     * @return An array of RentalAgreementInfo for the landlord
     */
    function getLandlordAgreements() external view returns (RentalAgreementInfo[] memory) {
        return landlordAgreements[msg.sender];
    }
    
    /**
     * @dev Get all agreements for a renter
     * @return An array of RentalAgreementInfo for the renter
     */
    function getRenterAgreements() external view returns (RentalAgreementInfo[] memory) {
        return renterAgreements[msg.sender];
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {
        // Allow the contract to receive ETH
    }
}
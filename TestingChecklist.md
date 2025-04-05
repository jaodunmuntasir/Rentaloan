# Application Testing Checklist

This document provides a systematic checklist for manually testing all features and workflows in the application. Use this to verify functionality across different user roles.

## Authentication

- [x] **Registration**
  - [x] User can register with email, password, and wallet address (wallet address automatically assigned)
  - [x] Registration fails with invalid email format
  - [ ] Registration fails with password too short
  - [x] User receives appropriate error messages

- [x] **Login**
  - [x] User can log in with correct credentials
  - [x] Login fails with incorrect credentials
  - [x] User receives appropriate error messages
  - [x] User is redirected to dashboard after successful login

- [x] **Profile Management**
  - [x] User can view their profile information
  - [x] User can update their profile information
  - [x] Changes are persisted after logout/login

## Landlord Perspective

- [ ] **Rental Agreement Creation**
  - [x] Landlord can access the create rental agreement page
  - [x] Form validates required fields (address, tenant wallet address, duration, etc.)
  - [x] Landlord can set security deposit and monthly rent amounts
  - [x] Grace period for late payments is automatically calculated and set
  - [x] Blockchain transaction is initiated upon submission
  - [ ] User is informed of transaction status
  - [x] New rental agreement appears in landlord's dashboard

- [ ] **Rental Agreement Management**
  - [x] Landlord can view all their rental agreements
  - [ ] Landlord can filter agreements by status
  - [x] Rental agreement details show correct property information
  - [ ] Landlord can see payment history for each agreement
  - [ ] Landlord receives notification when tenant pays rent/deposit

- [ ] **Extension Approval**
  - [ ] Landlord can see extension requests from tenants
  - [ ] Landlord can approve or reject extension requests
  - [ ] Extension updates the rental agreement end date

## Renter/Borrower Perspective

- [ ] **View Rental Agreements**
  - [ ] Renter can view all their rental agreements
  - [ ] Rental agreement details show correct property information
  - [ ] Payment history is displayed correctly
  - [ ] Due dates for next payments are clearly shown

- [ ] **Security Deposit Payment**
  - [ ] Renter can initiate security deposit payment
  - [ ] Payment amount matches the agreement terms
  - [ ] Blockchain transaction is initiated correctly
  - [ ] Transaction status is communicated to the renter
  - [ ] Rental status updates after successful payment

- [ ] **Rent Payment**
  - [ ] Renter can initiate monthly rent payment
  - [ ] System correctly calculates the current month due
  - [ ] Blockchain transaction is initiated correctly
  - [ ] Transaction status is communicated to the renter
  - [ ] Payment history updates after successful payment

- [ ] **Skip Rent**
  - [ ] Renter can request to skip rent when eligible
  - [ ] System verifies eligibility based on rental contract terms
  - [ ] Blockchain transaction is initiated correctly
  - [ ] Transaction status is communicated to the renter
  - [ ] Next payment due date updates accordingly

- [ ] **Extend Rental Agreement**
  - [ ] Renter can request rental agreement extension
  - [ ] System validates the extension request
  - [ ] Blockchain transaction is initiated correctly
  - [ ] Transaction status is communicated to the renter
  - [ ] Rental end date updates after successful extension

- [ ] **Loan Request Creation**
  - [ ] Renter can create a loan request against their rental property
  - [ ] System validates eligibility for loan based on rental agreement status
  - [ ] Renter can specify loan amount and duration
  - [ ] Collateral calculation works correctly
  - [ ] Loan request is created and visible in the system

- [ ] **Loan Offer Management**
  - [ ] Borrower can view all loan offers for their request
  - [ ] Offer details show interest rates and terms clearly
  - [ ] Borrower can compare multiple offers
  - [ ] Borrower can accept a loan offer
  - [ ] Borrower receives confirmation after accepting an offer

- [ ] **Loan Repayment**
  - [ ] Borrower can see their active loans
  - [ ] Monthly payment amounts are calculated correctly
  - [ ] Payment schedule is displayed with due dates
  - [ ] Borrower can make monthly payments
  - [ ] Borrower can pay off the entire loan
  - [ ] Payment history updates after successful transactions

## Lender Perspective

- [ ] **Browse Loan Requests**
  - [ ] Lender can view all open loan requests
  - [ ] Lender can filter requests by amount, duration, etc.
  - [ ] Request details show collateral information
  - [ ] Lender can view borrower reputation/history

- [ ] **Create Loan Offer**
  - [ ] Lender can select a loan request to make an offer
  - [ ] Lender can set interest rate and terms
  - [ ] System calculates monthly payment amounts
  - [ ] Offer preview shows total interest and repayment amount
  - [ ] Confirmation is shown after offer submission

- [ ] **Loan Offer Management**
  - [ ] Lender can view all their submitted offers
  - [ ] Offer status updates when borrower accepts/rejects
  - [ ] Lender can withdraw pending offers
  - [ ] Lender receives notification when offer is accepted

- [ ] **Loan Agreement Management**
  - [ ] Lender can view all their active loan agreements
  - [ ] Lender can initialize loan funding after offer acceptance
  - [ ] Blockchain transaction is initiated correctly
  - [ ] Transaction status is communicated to the lender
  - [ ] Lender can track repayment progress
  - [ ] Lender receives notification for each repayment

## Dashboard and Notifications

- [ ] **Dashboard Overview**
  - [ ] User sees appropriate content based on their role
  - [ ] Active rental agreements are displayed
  - [ ] Active loans are displayed
  - [ ] Payment notifications are shown
  - [ ] Upcoming payments are highlighted

- [ ] **Transaction History**
  - [ ] All transactions are listed with correct details
  - [ ] Transactions can be filtered by type
  - [ ] Transaction status is displayed correctly
  - [ ] Transaction hashes link to blockchain explorer

## Error Handling and Edge Cases

- [ ] **Network Errors**
  - [ ] Application shows appropriate message when blockchain network is unavailable
  - [ ] Failed transactions provide clear error messages
  - [ ] User can retry failed operations

- [ ] **Validation Errors**
  - [ ] All forms show appropriate validation errors
  - [ ] Server-side validation prevents invalid data
  - [ ] Error messages are clear and helpful

- [ ] **Edge Cases**
  - [ ] Application handles case when user has no rental agreements
  - [ ] Application handles case when no loan offers are available
  - [ ] Application prevents actions on expired agreements
  - [ ] Application handles case when wallet has insufficient funds

## Notes

For each test, record:
- Whether the feature works as expected
- Any errors encountered
- Suggestions for improvement
- Browser and device information 
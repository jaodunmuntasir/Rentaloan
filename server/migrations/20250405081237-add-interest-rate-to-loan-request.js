'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add interestRate column to the loan_requests table
    await queryInterface.addColumn('loan_requests', 'interestRate', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 5.0 // Default interest rate of 5%
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove interestRate column from the loan_requests table
    await queryInterface.removeColumn('loan_requests', 'interestRate');
  }
};

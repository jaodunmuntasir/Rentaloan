'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Remove expirationDate column from loan_offers table
    await queryInterface.removeColumn('loan_offers', 'expirationDate');
  },

  async down (queryInterface, Sequelize) {
    // Add back expirationDate column to loan_offers table if needed to rollback
    await queryInterface.addColumn('loan_offers', 'expirationDate', {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    });
  }
};

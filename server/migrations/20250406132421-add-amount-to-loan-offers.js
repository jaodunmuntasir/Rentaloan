'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('loan_offers', 'amount', {
      type: Sequelize.DECIMAL(18, 6),
      allowNull: true  // Making it nullable for existing records
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('loan_offers', 'amount');
  }
};

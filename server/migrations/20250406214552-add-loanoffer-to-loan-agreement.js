'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('loan_agreements', 'loanOfferId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'loan_offers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('loan_agreements', 'loanOfferId');
  }
};
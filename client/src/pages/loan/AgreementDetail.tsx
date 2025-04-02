import React from 'react';
import { useParams } from 'react-router-dom';

const LoanAgreementDetail: React.FC = () => {
  const { address } = useParams();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Loan Agreement Details</h1>
      <p className="text-gray-500">Viewing loan agreement at address: {address}</p>
      <p className="text-gray-500">This page is under construction.</p>
    </div>
  );
};

export default LoanAgreementDetail; 
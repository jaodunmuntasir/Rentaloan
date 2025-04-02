import React from 'react';
import { useParams } from 'react-router-dom';

const LoanRequestDetail: React.FC = () => {
  const { id } = useParams();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Loan Request Details</h1>
      <p className="text-gray-500">Viewing loan request: {id}</p>
      <p className="text-gray-500">This page is under construction.</p>
    </div>
  );
};

export default LoanRequestDetail; 
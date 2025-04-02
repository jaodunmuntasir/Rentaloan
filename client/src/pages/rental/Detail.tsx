import React from 'react';
import { useParams } from 'react-router-dom';

const RentalDetail: React.FC = () => {
  const { address } = useParams();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Rental Agreement Details</h1>
      <p className="text-gray-500">Viewing rental agreement at address: {address}</p>
      <p className="text-gray-500">This page is under construction.</p>
    </div>
  );
};

export default RentalDetail; 
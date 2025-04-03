import React from 'react';
import RentalAgreementList from '../../components/rental/RentalAgreementList';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

const RentalList: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Rental Agreements</h1>
        <Button 
          onClick={() => navigate('/rental/create')}
          className="flex items-center"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Agreement
        </Button>
      </div>
      
      <RentalAgreementList />
    </div>
  );
};

export default RentalList; 
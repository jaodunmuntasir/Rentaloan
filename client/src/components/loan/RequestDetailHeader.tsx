import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { ArrowLeft } from 'lucide-react';

interface RequestDetailHeaderProps {
  title: string;
  rentalAgreementName: string;
  status: string;
  statusBadge: React.ReactNode;
}

const RequestDetailHeader: React.FC<RequestDetailHeaderProps> = ({ 
  title, 
  rentalAgreementName,
  status,
  statusBadge
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <h1 className="text-3xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {rentalAgreementName} {" "}
          - {statusBadge}
        </p>
      </div>
    </div>
  );
};

export default RequestDetailHeader; 
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ErrorDisplayProps {
  error: string | null;
  requestId?: string;
  rentalAddress?: string;
  isUserLoggedIn: boolean;
  isBlockchainDataLoading: boolean;
  hasBlockchainData: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  requestId,
  rentalAddress,
  isUserLoggedIn,
  isBlockchainDataLoading,
  hasBlockchainData
}) => {
  const navigate = useNavigate();

  return (
    <Alert variant="destructive" className="max-w-3xl mx-auto">
      <AlertTitle>Error Loading Loan Request</AlertTitle>
      <AlertDescription className="space-y-4">
        <p>{error || "Failed to load loan request details"}</p>

        <div className="bg-gray-100 p-4 rounded-md text-sm my-4">
          <p className="font-semibold">Troubleshooting Information:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Loan Request ID: {requestId}</li>
            <li>Rental Address: {rentalAddress}</li>
            <li>User Logged In: {isUserLoggedIn ? "Yes" : "No"}</li>
            <li>
              Blockchain Data Loading:{" "}
              {isBlockchainDataLoading
                ? "In Progress"
                : hasBlockchainData
                ? "Successful"
                : "Failed"}
            </li>
          </ul>

          <p className="mt-4">Please try the following:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Refresh the page</li>
            <li>
              Check that the loan request exists and is associated with this
              rental address
            </li>
            <li>Verify your permissions to access this loan request</li>
          </ul>
        </div>

        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>

          <Button variant="default" onClick={() => window.location.reload()}>
            <Loader2 className="mr-2 h-4 w-4" />
            Refresh Page
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ErrorDisplay; 
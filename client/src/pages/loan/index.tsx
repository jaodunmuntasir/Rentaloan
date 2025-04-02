import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { CreditCard, Banknote, PlusCircle, FileText } from 'lucide-react';

const Loan: React.FC = () => {
  const location = useLocation();
  
  // Navigation items for loan pages
  const loanNavItems = [
    { 
      path: '/loan/agreements', 
      label: 'My Loan Agreements', 
      icon: <FileText className="h-4 w-4" />,
      description: 'View your active loans'
    },
    { 
      path: '/loan/requests', 
      label: 'Browse Loan Requests', 
      icon: <CreditCard className="h-4 w-4" />,
      description: 'Find loan opportunities'
    },
    { 
      path: '/loan/request/create', 
      label: 'Request a Loan', 
      icon: <PlusCircle className="h-4 w-4" />,
      description: 'Create a new loan request'
    },
  ];
  
  return (
    <div className="space-y-6">
      {/* Loan Submenu */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Banknote className="h-6 w-6 text-primary" />
            Loan Platform
          </h1>
          <p className="text-muted-foreground mt-1">
            Borrow against your rental deposit or invest in loan opportunities
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
          {loanNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col p-4 sm:p-6 hover:bg-gray-50 transition-colors ${
                location.pathname === item.path ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <span className={`${
                  location.pathname === item.path ? 'text-primary' : 'text-gray-500'
                }`}>
                  {item.icon}
                </span>
                {item.label}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
      
      <Outlet />
    </div>
  );
};

export default Loan; 
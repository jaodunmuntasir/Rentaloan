import React from 'react';
import { CreditCard, Banknote, Home, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  submenu?: {
    title: string;
    href: string;
    description: string;
  }[];
}

// Main navigation items
export const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <Home className="h-4 w-4" />,
  },
  {
    title: 'Rentals',
    href: '/rental',
    icon: <Banknote className="h-4 w-4" />,
  },
  {
    title: 'Loans',
    href: '/loan',
    icon: <CreditCard className="h-4 w-4" />,
    submenu: [
      {
        title: 'My Agreements',
        href: '/loan/agreements',
        description: 'View active loan agreements'
      },
      {
        title: 'Browse Requests',
        href: '/loan/requests',
        description: 'Find loan opportunities'
      },
      {
        title: 'Request Loan',
        href: '/loan/request/create',
        description: 'Create a new loan request'
      }
    ]
  },
  {
    title: 'Profile',
    href: '/profile',
    icon: <User className="h-4 w-4" />,
  }
];

interface NavigationProps {
  className?: string;
}

const Navigation: React.FC<NavigationProps> = ({ className }) => {
  const location = useLocation();
  
  // Check if a path is the current active path
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };
  
  // Check if a submenu item is the current active path
  const isSubItemActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <nav className={className}>
      <ul className="space-y-1">
        {navigationItems.map((item) => {
          const active = isActive(item.href);
          
          return (
            <li key={item.href}>
              <Link 
                to={item.href} 
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md 
                  ${active 
                    ? 'bg-blue-50 text-blue-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <span className={active ? 'text-blue-500' : 'text-gray-500'}>
                  {item.icon}
                </span>
                {item.title}
              </Link>
              
              {item.submenu && (
                <ul className="pl-8 mt-1 space-y-1">
                  {item.submenu.map((subItem) => {
                    const subActive = isSubItemActive(subItem.href);
                    
                    return (
                      <li key={subItem.href}>
                        <Link
                          to={subItem.href}
                          className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md
                            ${subActive 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                          {subItem.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Navigation; 
import React from 'react';
import { CreditCard, Banknote, Home, User, LayoutDashboard, Building, Coins } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  submenu?: {
    title: string;
    href: string;
    description: string;
    badge?: string;
  }[];
}

// Main navigation items
export const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: 'Rentals',
    href: '/rental',
    icon: <Building className="h-4 w-4" />,
  },
  {
    title: 'Loans',
    href: '/loan',
    icon: <Coins className="h-4 w-4" />,
    submenu: [
      {
        title: 'My Agreements',
        href: '/loan/agreements',
        description: 'View active loan agreements'
      },
      {
        title: 'Browse Requests',
        href: '/loan/requests',
        description: 'Find loan opportunities',
        badge: 'New'
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
    <nav className={cn("flex flex-col gap-2", className)}>
      <div className="text-xs font-semibold text-muted-foreground px-2">
        MAIN
      </div>
      <ul className="space-y-1">
        {navigationItems.map((item) => {
          const active = isActive(item.href);
          
          return (
            <li key={item.href}>
              <Link 
                to={item.href} 
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  active
                    ? "bg-primary/10 text-primary hover:bg-primary/15" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span>
                  {item.icon}
                </span>
                {item.title}
              </Link>
              
              {item.submenu && active && (
                <ul className="pl-7 mt-1 space-y-1 border-l border-muted ml-1.5">
                  {item.submenu.map((subItem) => {
                    const subActive = isSubItemActive(subItem.href);
                    
                    return (
                      <li key={subItem.href}>
                        <Link
                          to={subItem.href}
                          className={cn(
                            "flex items-center justify-between py-1.5 px-3 text-sm rounded-md transition-colors",
                            subActive
                              ? "bg-primary/10 text-primary font-medium hover:bg-primary/15" 
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span>{subItem.title}</span>
                          {subItem.badge && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              {subItem.badge}
                            </Badge>
                          )}
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
      
      <div className="mt-6 text-xs font-semibold text-muted-foreground px-2">
        RESOURCES
      </div>
      <ul className="space-y-1">
        <li>
          <Link 
            to="/help" 
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <span>
              <CreditCard className="h-4 w-4" />
            </span>
            Help & Documentation
          </Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation; 
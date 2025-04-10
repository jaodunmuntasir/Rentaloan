import React from 'react';
import { Card, CardContent } from '../ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  change?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  change,
  variant = 'default'
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'text-green-500 bg-green-50 dark:bg-green-900/20';
      case 'warning':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'danger':
        return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-primary bg-primary/10';
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col p-6">
        <div className="flex items-center justify-between space-x-4">
          <div className={`p-2 rounded-full ${getVariantClasses()}`}>
            <Icon className="h-5 w-5" />
          </div>
          {change !== undefined && (
            <div className={`text-sm font-medium ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change > 0 ? '+' : ''}{change}%
            </div>
          )}
        </div>
        <div className="mt-2">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatCard; 
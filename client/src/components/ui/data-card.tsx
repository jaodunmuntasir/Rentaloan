import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './card';
import { Separator } from './separator';
import { cn } from '../../lib/utils';

export interface DataItem {
  label: string;
  value: React.ReactNode;
  tooltip?: string;
  className?: string;
}

export interface DataGroupProps {
  title?: string;
  description?: string;
  items: DataItem[];
  layout?: 'grid' | 'list';
  columns?: 1 | 2 | 3;
  className?: string;
}

export interface DataCardProps {
  title?: string;
  description?: string;
  groups: DataGroupProps[];
  footer?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
}

export const DataGroup: React.FC<DataGroupProps> = ({
  title,
  description,
  items,
  layout = 'grid',
  columns = 2,
  className,
}) => {
  const getGridCols = () => {
    switch (columns) {
      case 1: return 'grid-cols-1';
      case 3: return 'grid-cols-1 md:grid-cols-3';
      case 2:
      default: return 'grid-cols-1 md:grid-cols-2';
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <div className="space-y-1">
          <h3 className="text-lg font-medium">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      
      <div className={cn(
        layout === 'grid' 
          ? `grid ${getGridCols()} gap-4` 
          : "space-y-2"
      )}>
        {items.map((item, i) => (
          <div key={i} className={cn("space-y-1", item.className)}>
            <dt className="text-sm font-medium text-muted-foreground">{item.label}</dt>
            <dd className="text-sm font-semibold">{item.value}</dd>
          </div>
        ))}
      </div>
    </div>
  );
};

const DataCard: React.FC<DataCardProps> = ({
  title,
  description,
  groups,
  footer,
  className,
  headerClassName,
  contentClassName,
  footerClassName,
}) => {
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader className={headerClassName}>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      
      <CardContent className={cn("space-y-6", contentClassName)}>
        {groups.map((group, i) => (
          <React.Fragment key={i}>
            <DataGroup {...group} />
            {i < groups.length - 1 && <Separator className="my-4" />}
          </React.Fragment>
        ))}
      </CardContent>
      
      {footer && (
        <CardFooter className={cn("flex justify-between", footerClassName)}>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
};

export default DataCard; 
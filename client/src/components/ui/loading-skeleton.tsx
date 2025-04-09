import React from 'react';
import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { cn } from '../../lib/utils';

export interface LoadingSkeletonProps {
  title?: string;
  variant?: 'default' | 'card' | 'inline';
  lines?: number;
  className?: string;
  contentClassName?: string;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  title,
  variant = 'default',
  lines = 3,
  className,
  contentClassName
}) => {
  // Generate an array of skeleton lines
  const skeletonLines = Array.from({ length: lines }, (_, i) => i);
  
  // Create simple skeleton lines
  const renderSkeletonLines = () => (
    <div className={cn("space-y-2", contentClassName)}>
      {skeletonLines.map((i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            // Vary the widths for a more natural look
            i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-5/6" : "w-4/6"
          )} 
        />
      ))}
    </div>
  );
  
  // Inline variant just returns the skeleton lines
  if (variant === 'inline') {
    return <div className={className}>{renderSkeletonLines()}</div>;
  }
  
  // Card variant wraps the skeleton in a card
  if (variant === 'card') {
    return (
      <Card className={className}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          {renderSkeletonLines()}
        </CardContent>
      </Card>
    );
  }
  
  // Default variant includes a title skeleton if title is not provided
  return (
    <div className={cn("space-y-4", className)}>
      {!title && <Skeleton className="h-8 w-3/4" />}
      {title && <h3 className="text-lg font-medium">{title}</h3>}
      {renderSkeletonLines()}
    </div>
  );
};

export default LoadingSkeleton; 
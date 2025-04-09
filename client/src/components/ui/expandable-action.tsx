import React, { useState } from 'react';
import { Button } from './button';
import { cn } from '../../lib/utils';
import { ChevronUpIcon, ChevronDownIcon } from '@radix-ui/react-icons';

export interface ExpandableActionProps {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  expanded?: boolean;
  onToggle?: (id: string, expanded: boolean) => void;
  onAction?: () => Promise<any> | void;
  actionLabel?: string;
  children?: React.ReactNode;
  buttonVariant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost' | 'link';
  className?: string;
  contentClassName?: string;
}

const ExpandableAction: React.FC<ExpandableActionProps> = ({
  id,
  label,
  description,
  disabled = false,
  expanded: controlledExpanded,
  onToggle,
  onAction,
  actionLabel = 'Confirm',
  children,
  buttonVariant = 'outline',
  className = '',
  contentClassName = ''
}) => {
  // Use internal state if not controlled externally
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // Determine if expanded state is controlled or uncontrolled
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  
  // Handle toggle
  const handleToggle = () => {
    if (onToggle) {
      onToggle(id, !isExpanded);
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        onClick={handleToggle}
        variant={isExpanded ? "secondary" : buttonVariant}
        className="w-full justify-between"
        disabled={disabled}
      >
        <span>{label}</span>
        {isExpanded ? (
          <ChevronUpIcon className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 ml-2" />
        )}
      </Button>
      
      {isExpanded && (
        <div className={cn("p-4 border rounded-md bg-slate-50", contentClassName)}>
          {description && <p className="text-sm mb-4">{description}</p>}
          
          {children}
          
          {onAction && (
            <Button 
              onClick={onAction} 
              disabled={disabled}
              className="w-full mt-4"
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpandableAction; 
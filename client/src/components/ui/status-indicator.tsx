import React from 'react';

export type StatusVariant = 
  | 'default'
  | 'pending'
  | 'warning'
  | 'success'
  | 'error'
  | 'info'
  | 'active';

export interface StatusConfig {
  bg: string;
  text: string;
  border: string;
}

export interface StatusIndicatorProps {
  label: string;
  description?: string;
  variant?: StatusVariant;
  customConfig?: StatusConfig;
  icon?: React.ReactNode;
  className?: string;
}

const STATUS_CONFIGS: Record<StatusVariant, StatusConfig> = {
  default: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    border: 'border-gray-300'
  },
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-300'
  },
  warning: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-300'
  },
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-300'
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-300'
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-300'
  },
  active: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    border: 'border-indigo-300'
  }
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  label,
  description,
  variant = 'default',
  customConfig,
  icon,
  className = ''
}) => {
  const config = customConfig || STATUS_CONFIGS[variant];
  
  return (
    <div className={`px-4 py-2 rounded-lg border ${config.bg} ${config.text} ${config.border} ${className}`}>
      <div className="font-semibold flex items-center">
        {icon && <span className="mr-2">{icon}</span>}
        Status: {label}
      </div>
      {description && (
        <div className="text-xs mt-1">
          {description}
        </div>
      )}
    </div>
  );
};

export default StatusIndicator; 
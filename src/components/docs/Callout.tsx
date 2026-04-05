/**
 * Callout Component
 * Warning, Info, Success, Error alerts
 */

import React from 'react';
import {
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import './Callout.css';

type CalloutType = 'warning' | 'info' | 'success' | 'error';

const iconMap: Record<CalloutType, React.ReactNode> = {
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
  success: <CheckCircle size={20} />,
  error: <AlertCircle size={20} />,
};

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
}

export function Callout({ type = 'info', title, children }: CalloutProps) {
  return (
    <div className={`callout callout-${type}`}>
      <div className="callout-icon">{iconMap[type]}</div>
      <div className="callout-content">
        {title && <div className="callout-title">{title}</div>}
        <div className="callout-body">{children}</div>
      </div>
    </div>
  );
}

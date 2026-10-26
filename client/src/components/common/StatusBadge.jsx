import React from 'react';
import { ORDER_STATUS_CONFIG } from '../../utils/patternOptions';

export const StatusBadge = ({ status }) => {
  const config = ORDER_STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    badgeClass: 'pending',
  };

  return (
    <span className={`status-badge ${config.badgeClass}`}>
      <span className="status-dot"></span>
      {config.label}
    </span>
  );
};

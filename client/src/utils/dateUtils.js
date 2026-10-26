/**
 * Date and time utilities formatted for standard display (DD/MM/YYYY)
 */

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '-';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return `${formatDate(dateString)} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return '-';
  }
};

export const getDeadlineStatus = (deadlineDate, status) => {
  if (['delivered', 'cancelled'].includes(status)) {
    return { type: 'neutral', text: formatDate(deadlineDate) };
  }

  if (!deadlineDate) return { type: 'neutral', text: '-' };

  const deadline = new Date(deadlineDate);
  const now = new Date();

  // Reset times for day comparison
  const dDay = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffTime = dDay.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return {
      type: 'today',
      badge: 'Due Today!',
      text: 'Due Today',
      isUrgent: true,
    };
  } else if (diffDays < 0) {
    return {
      type: 'overdue',
      badge: `${Math.abs(diffDays)} days overdue`,
      text: 'Overdue',
      isUrgent: true,
    };
  } else if (diffDays === 1) {
    return {
      type: 'tomorrow',
      badge: 'Tomorrow',
      text: 'Due Tomorrow',
      isUrgent: false,
    };
  } else {
    return {
      type: 'upcoming',
      badge: `${diffDays} days left`,
      text: `${diffDays} days left (${formatDate(deadlineDate)})`,
      isUrgent: false,
    };
  }
};

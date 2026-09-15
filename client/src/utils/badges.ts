import type { CSSProperties } from 'react';

const basePillStyle: CSSProperties = {
  borderRadius: '20px',
  padding: '4px 12px',
  fontWeight: 600,
  fontSize: '0.78rem',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  whiteSpace: 'nowrap',
  lineHeight: '1.2',
};

// Priority pill — matches Zen Green mockup exactly
export const getPriorityPill = (p: string): CSSProperties => {
  switch (p) {
    case 'CRITICAL':
    case 'HIGH':    return { ...basePillStyle, backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' };
    case 'MEDIUM':  return { ...basePillStyle, backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' };
    case 'LOW':     return { ...basePillStyle, backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0' };
    default:        return { ...basePillStyle, backgroundColor: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB' };
  }
};

// Status pill — matches Zen Green mockup exactly
export const getStatusPill = (s: string): CSSProperties => {
  switch (s) {
    case 'NEW':                   return { ...basePillStyle, backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' };
    case 'OPEN':                  return { ...basePillStyle, backgroundColor: '#E0F2FE', color: '#0369A1', border: '1px solid #7DD3FC' };
    case 'IN_PROGRESS':           return { ...basePillStyle, backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' };
    case 'WAITING_FOR_REQUESTER': return { ...basePillStyle, backgroundColor: '#FFEDD5', color: '#EA580C', border: '1px solid #FED7AA' };
    case 'RESOLVED':              return { ...basePillStyle, backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' };
    case 'CLOSED':                return { ...basePillStyle, backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' };
    case 'REOPENED':               return { ...basePillStyle, backgroundColor: '#F3E8FF', color: '#9333EA', border: '1px solid #E9D5FF' };
    case 'CANCELLED':              return { ...basePillStyle, backgroundColor: '#FFE4E6', color: '#E11D48', border: '1px solid #FECDD3' };
    default:                      return { ...basePillStyle, backgroundColor: '#FEF9C3', color: '#CA8A04', border: '1px solid #FDE047' };
  }
};

export const formatStatus = (s: string) =>
  s === 'IN_PROGRESS' ? 'In Progress' :
  s === 'WAITING_FOR_REQUESTER' ? 'Waiting for Requester' :
  s.charAt(0) + s.slice(1).toLowerCase();

export const formatPriority = (p: string) =>
  p.charAt(0) + p.slice(1).toLowerCase();

export const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return dateStr;
  }
};

// Role badge — shared by Header.tsx and UserManagement.tsx
export const getRoleBadge = (role: string): { style: CSSProperties; label: string } => {
  switch (role) {
    case 'REQUESTER':
      return { style: { backgroundColor: '#EEF2FF', color: '#4F46E5' }, label: 'Requester' };
    case 'IT_STAFF':
      return { style: { backgroundColor: '#CCFBF1', color: '#0D9488' }, label: 'IT Staff' };
    case 'ADMINISTRATOR':
      return { style: { backgroundColor: '#FEF3C7', color: '#D97706' }, label: 'Administrator' };
    default:
      return { style: { backgroundColor: '#E2E8F0', color: '#475569' }, label: role };
  }
};

// Smart pagination with ellipsis (matches mockup "1 2 3 4 5 … 6")
export const getPaginationPages = (current: number, total: number): (number | '...')[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '...')[] = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
};

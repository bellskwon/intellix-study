import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, AlertTriangle, FlaskConical } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig = {
  pending_review: { label: 'Pending', icon: Clock, className: 'bg-muted text-muted-foreground' },
  quiz_required: { label: 'Quiz Required', icon: FlaskConical, className: 'bg-primary/10 text-primary' },
  approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-chart-3/10 text-chart-3' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  flagged: { label: 'Flagged', icon: AlertTriangle, className: 'bg-accent/15 text-accent' },
};

export default function RecentSubmissions({ submissions = [] }) {
  const recent = submissions.slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <p className="text-muted-foreground text-sm">No submissions yet. Upload your first study session!</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Submissions</h3>
      </div>
      <div className="divide-y divide-border">
        {recent.map(sub => {
          const status = statusConfig[sub.status] || statusConfig.pending_review;
          const Icon = status.icon;
          return (
            <div key={sub.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{sub.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sub.subject?.replace('_', ' ')} · {format(new Date(sub.created_date), 'MMM d')}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {sub.points_awarded > 0 && (
                  <span className="text-sm font-semibold text-accent">+{sub.points_awarded}</span>
                )}
                <Badge variant="secondary" className={`${status.className} gap-1 text-xs`}>
                  <Icon className="w-3 h-3" />
                  {status.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
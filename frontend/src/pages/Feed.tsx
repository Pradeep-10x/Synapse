import { ActivityItem, ActivityProps } from '@/components/feed/ActivityItem';

// Mock Data for specific design look
const ACTIVITIES: ActivityProps[] = [
  {
    type: 'system',
    timestamp: '12:47',
    content: {
      text: 'Live event stream optimized',
    },
  },
  {
    type: 'post',
    user: { name: 'Kristen Lee', avatar: 'https://i.pravatar.cc/150?u=kristen' },
    timestamp: '12:43',
    content: {
      text: 'posted a new photo',
      mediaUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=80',
      highlight: 'Urban Views',
    },
  },
  {
    type: 'event',
    timestamp: '12:39',
    content: {
      text: 'Community Meetup is now active',
    },
  },
  {
    type: 'join',
    user: { name: 'Mark' },
    timestamp: '12:35',
    content: {
      text: 'joined the channel',
      highlight: 'Tech Talk',
    },
  },
  {
    type: 'create',
    user: { name: 'Sarah Connor' },
    timestamp: '12:20',
    content: {
      text: 'deployed new instance to',
      highlight: 'Production',
    },
  },
];

export default function FeedPage() {
  return (
    <div className="animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="mb-8 pt-2">
        <h1 className="text-sm font-medium text-[var(--synapse-text-muted)] tracking-widest uppercase mb-1">
          Live Status: <span className="text-[var(--synapse-text)]">Active</span> • 24 Events • 6 Domains
        </h1>
      </div>

      {/* Main Activity Card */}
      <div className="bg-[var(--synapse-surface)] border border-[var(--synapse-border)] rounded-[var(--radius-lg)] overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[var(--synapse-border)] bg-[rgba(255,255,255,0.02)]">
          <h2 className="font-semibold text-lg text-[var(--synapse-text)]">Activity Stream</h2>
        </div>

        <div className="p-6">
          <div className="flex flex-col">
            {ACTIVITIES.map((activity, index) => (
              <ActivityItem key={index} {...activity} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


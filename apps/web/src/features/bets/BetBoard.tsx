import type { Bet } from '@/lib/api';

export default function BetBoard({ bet }: { bet: Bet }) {
  const net = Math.round(bet.net_balance);
  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold">{bet.name}</h3>
        <span className="text-xs text-sub">vs {bet.enforcer}</span>
      </div>
      <p className="mb-4 mt-1.5 text-sm text-sub">{bet.rule_summary}</p>
      <div className="flex gap-8">
        <div className="flex flex-col">
          <span className="stat-num">{bet.current_streak}</span>
          <span className="stat-label">day streak</span>
        </div>
        <div className="flex flex-col">
          <span className="stat-num">{bet.days_to_payout}</span>
          <span className="stat-label">days to payout</span>
        </div>
        <div className="flex flex-col">
          <span className={`stat-num ${net >= 0 ? 'text-good' : 'text-bad'}`}>
            {net >= 0 ? '+' : '−'}${Math.abs(net)}
          </span>
          <span className="stat-label">net</span>
        </div>
      </div>
    </div>
  );
}

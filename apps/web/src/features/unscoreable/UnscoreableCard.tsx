import { CURRENT_BOOK } from '@/config/goals';
import MantraRotator from './MantraRotator';

// The un-scoreable corner: no metric, no progress bar — deliberately not graded.
export default function UnscoreableCard() {
  return (
    <div className="card">
      <h2 className="section-title">Off the scoreboard</h2>
      <p className="mb-2">📖 {CURRENT_BOOK}</p>
      <MantraRotator />
    </div>
  );
}

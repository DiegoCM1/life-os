import DashboardPage from '@/features/dashboard/DashboardPage';
import { parseRange } from '@/lib/range';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: {
  searchParams: Promise<{ spiral?: string; day?: string }>;
}) {
  const { spiral, day } = await searchParams;
  return <DashboardPage spiralRange={parseRange(spiral)} day={day} />;
}

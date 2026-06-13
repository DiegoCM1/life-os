import DashboardPage from '@/features/dashboard/DashboardPage';
import { parseRange } from '@/lib/range';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: {
  searchParams: Promise<{ spiral?: string }>;
}) {
  const { spiral } = await searchParams;
  return <DashboardPage spiralRange={parseRange(spiral)} />;
}

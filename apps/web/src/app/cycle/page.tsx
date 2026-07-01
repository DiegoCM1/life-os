import CycleReviewPage from '@/features/cycle/CycleReviewPage';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  return <CycleReviewPage week={week} />;
}

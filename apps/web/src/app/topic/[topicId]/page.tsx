import TopicDetailPage from '@/features/topics/TopicDetailPage';
import { parseRange } from '@/lib/range';

export const dynamic = 'force-dynamic';

export default async function Page({ params, searchParams }: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const [{ topicId }, { range }] = await Promise.all([params, searchParams]);
  return <TopicDetailPage topicId={topicId} range={parseRange(range)} />;
}


import { ItemDetailView } from '@/components/admin/item-detail-view';

// This is now a pure Server Component. Its only job is to get the `originalId`
// from the URL params and pass it down to the client component.
export default function AdminItemDetailPage({ params }: { params: { originalId: string } }) {
  const { originalId } = params;

  // We pass the originalId as a simple string prop to the view component.
  return <ItemDetailView originalId={originalId} />;
}

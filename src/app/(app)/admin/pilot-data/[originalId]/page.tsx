
import { ItemDetailView } from '@/components/admin/item-detail-view';

// This is a pure Server Component for displaying pilot data item details.
// Its only job is to get the `originalId` from the URL params and pass it 
// down to the client component that handles data fetching and rendering.
export default function AdminPilotItemDetailPage({ params }: { params: { originalId: string } }) {
  const { originalId } = params;

  // We pass the originalId as a simple string prop to the view component.
  return <ItemDetailView originalId={originalId} />;
}

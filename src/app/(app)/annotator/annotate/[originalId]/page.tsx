import { AnnotationInterfaceWrapper } from "@/components/annotator/annotation-interface-wrapper";

// This is now a pure Server Component. Its only job is to get the `originalId`
// from the URL params and pass it down to a Client Component.
export default function AnnotateItemPage({ params }: { params: { originalId: string } }) {
  const { originalId } = params;

  // We pass the originalId as a simple string prop to the wrapper.
  return <AnnotationInterfaceWrapper originalId={originalId} />;
}

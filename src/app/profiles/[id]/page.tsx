import { ProfileDetailScreen } from "@/features/profiles";
export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProfileDetailScreen id={id} />;
}

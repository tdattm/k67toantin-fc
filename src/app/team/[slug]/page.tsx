import { TeamBoard } from "@/components/team-board";
export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <TeamBoard slug={(await params).slug} />;
}

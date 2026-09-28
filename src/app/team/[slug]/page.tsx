"use client";
import { use } from "react";
import dynamic from "next/dynamic";
import { TeamBoard } from "@/components/team-board";
import { Shell } from "@/components/shell";
const AccountBoard = dynamic(() => import("@/components/account-board").then(module => module.AccountBoard));
export default function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  if (/^u-[a-f0-9]{12}$/.test(slug)) return <AccountBoard slug={slug}/>;
  if (/^[a-f0-9]{12}$/.test(slug)) return <TeamBoard slug={slug}/>;
  return <Shell><p>Link đội không hợp lệ.</p></Shell>;
}

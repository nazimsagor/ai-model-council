import type { Metadata } from "next";
import { HomeComposer } from "@/components/HomeComposer";

export const metadata: Metadata = {
  title: "Home",
};

export default function HomePage() {
  return <HomeComposer />;
}

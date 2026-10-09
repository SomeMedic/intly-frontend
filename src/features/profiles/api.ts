import { api } from "@/services/api";
import type { PublicSource } from "./contracts";

export async function getPublicSources(): Promise<PublicSource[]> {
  const result = await api.get<{ items: PublicSource[] }>("/sources");
  return result.items;
}

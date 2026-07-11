"use client";

import useSWR from "swr";
import LabList from "@/components/LabList";
import {
  LAB_ENTRIES_KEY,
  fetchLabEntries,
  normalizeLabEntry,
  type ApiLabEntry,
} from "@/lib/api/content";
import type { LabMeta } from "@/lib/lab";

interface Props {
  staticEntries: LabMeta[];
}

const fetcher = () => fetchLabEntries();

/**
 * Wraps LabList with SWR so newly added lab entries (from the admin API)
 * appear without a site rebuild. Falls back to staticEntries if API is unreachable.
 */
export default function LabSectionDynamic({ staticEntries }: Props) {
  const { data: apiEntries } = useSWR<ApiLabEntry[]>(LAB_ENTRIES_KEY, fetcher, {
    fallbackData: undefined,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const entries: LabMeta[] = apiEntries && apiEntries.length > 0
    ? apiEntries.map(normalizeLabEntry)
    : staticEntries;

  return <LabList entries={entries} />;
}

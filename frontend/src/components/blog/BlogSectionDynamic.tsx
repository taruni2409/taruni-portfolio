"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { BlogSection } from "./BlogIndexStats";
import {
  BLOG_POSTS_KEY,
  fetchBlogPosts,
  normalizeBlogPost,
  type ApiBlogPost,
} from "@/lib/api/content";

interface StaticPost {
  slug: string;
  title: string;
  date: string;
  publishedAt?: string;
  description: string;
  tags: string[];
  readingTime?: number;
  image?: string;
}

interface Props {
  /** Posts from the build-time MDX scan — baseline that is always present */
  staticPosts: StaticPost[];
}

const fetcher = () => fetchBlogPosts();

/**
 * Merges static (MDX build-time) posts with live API posts so no post is
 * ever dropped. Static posts are the baseline; API posts override by slug
 * (applying any admin edits) and add admin-only posts not in MDX.
 *
 * This prevents the race condition where the frontend deploys before the
 * backend has synced, which used to make newly published MDX posts invisible
 * because the API response (without the new slug) replaced staticPosts entirely.
 */
export default function BlogSectionDynamic({ staticPosts }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: apiPosts } = useSWR<ApiBlogPost[]>(BLOG_POSTS_KEY, fetcher, {
    fallbackData: undefined,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const posts = useMemo(() => {
    // Before mount: use staticPosts as-is to match the server render exactly.
    // After mount: merge with API posts so admin edits and new posts appear.
    const merged = new Map<string, StaticPost>(
      staticPosts.map((p) => [p.slug, p])
    );
    if (mounted && apiPosts && apiPosts.length > 0) {
      for (const p of apiPosts) {
        merged.set(p.slug, normalizeBlogPost(p));
      }
    }
    return Array.from(merged.values()).sort(
      (a, b) => ((a.publishedAt ?? a.date) < (b.publishedAt ?? b.date) ? 1 : -1)
    );
  }, [staticPosts, apiPosts, mounted]);

  return <BlogSection posts={posts} />;
}

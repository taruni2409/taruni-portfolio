"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  content: string;
}

/**
 * Renders plain Markdown content (from admin-published posts in content.db).
 * Used as the fallback renderer when a post has no MDX file in the filesystem.
 */
export default function BlogPostMarkdown({ content }: Props) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  );
}

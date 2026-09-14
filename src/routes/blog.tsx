import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Wordmark } from "@/components/brand";
import { BLOG_POSTS } from "@/lib/blog";
import { listPublishedPosts } from "@/lib/blog.functions";

export const Route = createFileRoute("/blog")({
  loader: () => listPublishedPosts(),
  errorComponent: () => (
    <div className="page-shell">
      <main className="page-main">
        <h1 className="page-title">Blog unavailable</h1>
        <p className="page-lede">Please refresh the page and try again.</p>
      </main>
    </div>
  ),
  notFoundComponent: () => (
    <div className="page-shell">
      <main className="page-main">
        <h1 className="page-title">Not found</h1>
      </main>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Blog — Review Policy Guides | Removal Work" },
      {
        name: "description",
        content:
          "Practical guides on Google review policy: what counts as a violation, what evidence strengthens a report, and what happens after you report.",
      },
      { property: "og:title", content: "Blog — Review Policy Guides | Removal Work" },
      {
        property: "og:description",
        content:
          "Practical guides on Google review policy: violations, evidence, and honest outcome tracking.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/blog" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const dbPosts = Route.useLoaderData();
  return (
    <div className="page-shell">
      <header className="page-header">
        <Link to="/" aria-label="Removal Work home">
          <Wordmark />
        </Link>
        <Link to="/" className="page-back">
          <ArrowLeft className="size-4" /> Home
        </Link>
      </header>
      <main className="page-main">
        <p className="page-eyebrow">Blog</p>
        <h1 className="page-title">Review policy guides</h1>
        <p className="page-lede">
          Short, honest guides on what Google&apos;s review policies actually say — written for business owners,
          not lawyers.
        </p>
        <div className="blog-grid">
          {(dbPosts ?? []).map((post) => (
            <Link
              key={post.id}
              to="/blog/$slug"
              params={{ slug: post.slug }}
              className="blog-card"
            >
              <span className="blog-card-meta">
                {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "Draft"}
                {post.authorName ? ` · ${post.authorName}` : ""}
              </span>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <span className="blog-card-cta">
                Read guide <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.slug}
              to="/blog/$slug"
              params={{ slug: post.slug }}
              className="blog-card"
            >
              <span className="blog-card-meta">
                {post.date} · {post.readingTime}
              </span>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <span className="blog-card-cta">
                Read guide <ArrowRight className="size-4" />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <footer className="page-footer">
        <p>© {new Date().getFullYear()} Removal Work. Not affiliated with Google.</p>
      </footer>
    </div>
  );
}

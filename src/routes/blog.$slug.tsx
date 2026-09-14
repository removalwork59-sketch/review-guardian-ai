import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/brand";
import { getPost } from "@/lib/blog";

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData, params }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} | Removal Work` : "Blog | Removal Work" },
      ...(loaderData
        ? [
            { name: "description", content: loaderData.description },
            { property: "og:title", content: loaderData.title },
            { property: "og:description", content: loaderData.description },
          ]
        : []),
      { property: "og:type", content: "article" },
      { property: "og:url", content: `/blog/${params.slug}` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `/blog/${params.slug}` }],
    scripts: loaderData
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: loaderData.title,
              description: loaderData.description,
              datePublished: loaderData.date,
              author: { "@type": "Organization", name: "Removal Work" },
            }),
          },
        ]
      : [],
  }),
  component: BlogPost,
  notFoundComponent: () => (
    <div className="page-shell">
      <main className="page-main">
        <h1 className="page-title">Post not found</h1>
        <p className="page-lede">This guide doesn&apos;t exist or was moved.</p>
        <Link to="/blog" className="page-back">
          <ArrowLeft className="size-4" /> Back to blog
        </Link>
      </main>
    </div>
  ),
});

function BlogPost() {
  const post = Route.useLoaderData();
  return (
    <div className="page-shell">
      <header className="page-header">
        <Link to="/" aria-label="Removal Work home">
          <Wordmark />
        </Link>
        <Link to="/blog" className="page-back">
          <ArrowLeft className="size-4" /> All guides
        </Link>
      </header>
      <main className="page-main page-article">
        <span className="blog-card-meta">
          {post.date} · {post.readingTime}
        </span>
        <h1 className="page-title">{post.title}</h1>
        {post.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="page-h2">{section.heading}</h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="page-p">
                {p}
              </p>
            ))}
          </section>
        ))}
        <div className="page-cta">
          <p>Check a review against these policies right now.</p>
          <Link to="/" className="page-cta-button">
            Scan a review free
          </Link>
        </div>
      </main>
      <footer className="page-footer">
        <p>© {new Date().getFullYear()} Removal Work. Not affiliated with Google.</p>
      </footer>
    </div>
  );
}

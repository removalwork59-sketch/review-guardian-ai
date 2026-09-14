import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { createPost, deletePost, listMyPosts, updatePost } from "@/lib/blog.functions";
import type { DbBlogPost } from "@/lib/blog.functions";

export const Route = createFileRoute("/_authenticated/blog-manager")({
  head: () => ({
    meta: [
      { title: "Blog manager — Removal Work" },
      { name: "description", content: "Write, edit, publish and delete your blog posts." },
      { property: "og:title", content: "Blog manager — Removal Work" },
      { property: "og:description", content: "Write, edit, publish and delete your blog posts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BlogManagerPage,
});

type Draft = {
  title: string;
  slug: string;
  description: string;
  authorName: string;
  coverImageUrl: string;
  body: string;
  published: boolean;
};

const EMPTY: Draft = {
  title: "",
  slug: "",
  description: "",
  authorName: "",
  coverImageUrl: "",
  body: "",
  published: false,
};

function BlogManagerPage() {
  const fetchPosts = useServerFn(listMyPosts);
  const create = useServerFn(createPost);
  const update = useServerFn(updatePost);
  const remove = useServerFn(deletePost);
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Draft>(EMPTY);
  const [open, setOpen] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: () => fetchPosts({ data: undefined }),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["blog-posts"] });
  };

  const saveMutation = useMutation({
    mutationFn: (draft: Draft & { id: string | null }) =>
      draft.id
        ? update({ data: { ...draft, id: draft.id } })
        : create({ data: { ...draft, id: undefined } as never }),
    onSuccess: () => {
      invalidate();
      setForm(EMPTY);
      setEditingId(null);
      setOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
  });

  const posts: DbBlogPost[] = data ?? [];
  const busy = saveMutation.isPending || deleteMutation.isPending;

  function startEdit(post: DbBlogPost) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      description: post.description,
      authorName: post.authorName,
      coverImageUrl: post.coverImageUrl,
      body: post.body,
      published: post.published,
    });
    setOpen(true);
  }

  return (
    <AppShell
      title="Blog manager"
      description="Write real posts and publish them to your public blog."
      actions={
        <Button
          type="button"
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY);
            setOpen((value) => !value);
          }}
        >
          {open ? <X className="size-4" /> : <Plus className="size-4" />}
          {open ? "Close" : "New post"}
        </Button>
      }
    >
      {open ? (
        <form
          className="surface app-card app-data-card"
          onSubmit={(event) => {
            event.preventDefault();
            saveMutation.mutate({ ...form, id: editingId });
          }}
        >
          <p className="font-display text-lg font-semibold text-ink">
            {editingId ? "Edit post" : "New post"}
          </p>
          <input
            className="app-input"
            placeholder="Title"
            required
            minLength={3}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="app-input"
            placeholder="URL slug (optional — made from the title)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
          <input
            className="app-input"
            placeholder="Short description shown in search results"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            className="app-input"
            placeholder="Author name"
            value={form.authorName}
            onChange={(e) => setForm({ ...form, authorName: e.target.value })}
          />
          <input
            className="app-input"
            placeholder="Cover image link (optional)"
            value={form.coverImageUrl}
            onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
          />
          <textarea
            className="app-input resize-y"
            rows={10}
            placeholder="Post content"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            Publish on the public blog
          </label>
          {saveMutation.error ? (
            <p className="text-sm text-danger">Could not save. Check the title and slug are unique.</p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {editingId ? "Save changes" : "Create post"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {isPending ? (
        <EmptyState title="Loading posts…" body="One moment." />
      ) : error ? (
        <EmptyState title="We couldn't load your posts" body="Please refresh the page and try again." />
      ) : posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          body="Use New post to write your first real article. Nothing is published until you tick Publish."
        />
      ) : (
        <div className="app-list-grid">
          {posts.map((post) => (
            <article key={post.id} className="surface app-card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold text-ink">{post.title}</p>
                  <p className="text-sm text-muted-foreground">
                    /blog/{post.slug}
                    {post.authorName ? ` · ${post.authorName}` : ""} ·{" "}
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    post.published
                      ? "border-safe/30 bg-safe-soft text-safe"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {post.published ? "Published" : "Draft"}
                </span>
              </div>
              {post.description ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.description}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => startEdit(post)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    saveMutation.mutate({
                      title: post.title,
                      slug: post.slug,
                      description: post.description,
                      authorName: post.authorName,
                      coverImageUrl: post.coverImageUrl,
                      body: post.body,
                      published: !post.published,
                      id: post.id,
                    })
                  }
                >
                  {post.published ? "Unpublish" : "Publish"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  className="ml-auto text-danger hover:text-danger"
                  onClick={() => {
                    if (window.confirm("Delete this post?")) deleteMutation.mutate(post.id);
                  }}
                >
                  <Trash2 className="size-3.5" /> Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DbBlogPost = {
  id: string;
  slug: string;
  title: string;
  description: string;
  authorName: string;
  coverImageUrl: string;
  body: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
};

function toPost(row: any): DbBlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    authorName: row.author_name ?? "",
    coverImageUrl: row.cover_image_url ?? "",
    body: row.body ?? "",
    published: row.published,
    publishedAt: row.published_at,
    createdAt: row.created_at,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const postInput = z.object({
  title: z.string().trim().min(3).max(140),
  slug: z.string().trim().max(80).optional(),
  description: z.string().trim().max(300).default(""),
  authorName: z.string().trim().max(80).default(""),
  coverImageUrl: z.string().trim().max(500).default(""),
  body: z.string().trim().max(40000).default(""),
  published: z.boolean().default(false),
});

/** Public, read-only: published posts for the public blog pages. */
export const listPublishedPosts = createServerFn({ method: "GET" }).handler(
  async (): Promise<DbBlogPost[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
      global: {
        fetch: (input: any, init: any) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data, error } = await client
      .from("blog_posts")
      .select("*")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(100);
    if (error) return [];
    return (data ?? []).map(toPost);
  },
);

export const listMyPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DbBlogPost[]> => {
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select("*")
      .eq("author_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toPost);
  });

export const createPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => postInput.parse(input))
  .handler(async ({ data, context }): Promise<DbBlogPost> => {
    const slug = slugify(data.slug || data.title) || `post-${Date.now()}`;
    const { data: row, error } = await context.supabase
      .from("blog_posts")
      .insert({
        author_id: context.userId,
        slug,
        title: data.title,
        description: data.description,
        author_name: data.authorName,
        cover_image_url: data.coverImageUrl,
        body: data.body,
        published: data.published,
        published_at: data.published ? new Date().toISOString() : null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toPost(row);
  });

export const updatePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    postInput.partial().extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<DbBlogPost> => {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch["title"] = data.title;
    if (data.slug !== undefined && data.slug) patch["slug"] = slugify(data.slug);
    if (data.description !== undefined) patch["description"] = data.description;
    if (data.authorName !== undefined) patch["author_name"] = data.authorName;
    if (data.coverImageUrl !== undefined) patch["cover_image_url"] = data.coverImageUrl;
    if (data.body !== undefined) patch["body"] = data.body;
    if (data.published !== undefined) {
      patch["published"] = data.published;
      patch["published_at"] = data.published ? new Date().toISOString() : null;
    }

    const { data: row, error } = await context.supabase
      .from("blog_posts")
      .update(patch as never)
      .eq("id", data.id)
      .eq("author_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return toPost(row);
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("blog_posts")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) throw error;
    return { ok: true as const };
  });

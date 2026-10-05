"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Trash2, Edit2, Newspaper } from "lucide-react";
import type { Row } from "@/lib/db";
import { action } from "./provider";

export function AdminNews({ data, lang, t }: { data: any; lang: "en" | "ml"; t: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Row | null>(null);
  const [error, setError] = useState("");

  const newsList = data.newsList || [];

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;
    setError("");
    const formData = new FormData(e.currentTarget);
    const value = Object.fromEntries(formData.entries()) as Record<string, any>;
    value.published = value.published === "on";

    startTransition(async () => {
      try {
        const res = await action("news", value);
        if (res.error) throw new Error(res.error);
        setEditing(null);
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this news article?")) return;
    startTransition(async () => {
      await action("deleteNews", { id });
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="panel">
        <div className="section-heading">
          <h2>{editing.id ? "Edit News" : "New Article"}</h2>
          <button className="button" onClick={() => setEditing(null)}>
            Back
          </button>
        </div>
        <form className="sbk-form" onSubmit={handleSave}>
          {error && <div className="error-message">{error}</div>}
          <input type="hidden" name="id" value={editing.id || ""} />
          
          <div className="field">
            <label>Slug (URL snippet, e.g. calicut-fc-wins)</label>
            <input type="text" name="slug" defaultValue={editing.slug} required pattern="[a-z0-9-]+" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div className="field">
              <label>Title (English)</label>
              <input type="text" name="title_en" defaultValue={editing.title_en} required />
            </div>
            <div className="field">
              <label>Title (Malayalam)</label>
              <input type="text" name="title_ml" defaultValue={editing.title_ml} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div className="field">
              <label>Excerpt (English) - Short summary</label>
              <textarea name="excerpt_en" defaultValue={editing.excerpt_en} rows={2} />
            </div>
            <div className="field">
              <label>Excerpt (Malayalam) - Short summary</label>
              <textarea name="excerpt_ml" defaultValue={editing.excerpt_ml} rows={2} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <div className="field">
              <label>Content (English) - Markdown supported</label>
              <textarea name="content_en" defaultValue={editing.content_en} rows={10} style={{ fontFamily: "monospace" }} />
            </div>
            <div className="field">
              <label>Content (Malayalam) - Markdown supported</label>
              <textarea name="content_ml" defaultValue={editing.content_ml} rows={10} style={{ fontFamily: "monospace" }} />
            </div>
          </div>

          <div className="field">
            <label>Hero Image URL</label>
            <input type="url" name="image_url" defaultValue={editing.image_url} placeholder="https://..." />
          </div>

          <label className="checkbox-label" style={{ margin: "20px 0" }}>
            <input type="checkbox" name="published" defaultChecked={editing.published} />
            <b>Publish this article</b>
          </label>

          <button type="submit" className="button primary" disabled={isPending}>
            {isPending ? "Saving..." : "Save Article"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="section-heading">
        <h2>News Portal</h2>
        <button className="button primary" onClick={() => setEditing({})}>
          <Plus size={16} /> New Article
        </button>
      </div>
      
      <div className="panel table-panel">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Date</th>
              <th>Title</th>
              <th>Slug</th>
              <th className="action-cell"></th>
            </tr>
          </thead>
          <tbody>
            {newsList.map((news: Row) => (
              <tr key={news.id}>
                <td>
                  {news.published ? (
                    <span className="badge" style={{ background: "#d4edda", color: "#155724" }}>Published</span>
                  ) : (
                    <span className="badge" style={{ background: "#e2e3e5", color: "#383d41" }}>Draft</span>
                  )}
                </td>
                <td>{news.published_at ? new Date(news.published_at).toLocaleDateString() : "—"}</td>
                <td>
                  <b>{news.title_en}</b><br />
                  <small style={{ color: "#666" }}>{news.title_ml}</small>
                </td>
                <td><code>{news.slug}</code></td>
                <td className="action-cell">
                  <button className="icon-button" onClick={() => setEditing(news)} title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button className="icon-button danger" onClick={() => handleDelete(news.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {!newsList.length && (
              <tr>
                <td colSpan={5} className="empty">No news articles found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

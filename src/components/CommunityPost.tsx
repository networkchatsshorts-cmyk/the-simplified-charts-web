'use client';

import Link from 'next/link';
import { useState } from 'react';

type CommunityPostCategory =
  | 'learning'
  | 'stocks-to-watch-next-week';

type Post = {
  id: string;
  title: string;
  slug: string;
  body: string;
  image_urls: string[];
  created_at: string;
  youtube_post_url?: string | null;
  category?: CommunityPostCategory | null;
};

type Comment = {
  id: string;
  display_name: string;
  body: string;
  created_at: string;
  is_admin?: boolean;
};

type CommunityPostProps = {
  post: Post;
  linkTitle?: boolean;
  headingTag?: 'h1' | 'h2' | 'h3';
};

export default function CommunityPost({
  post,
  linkTitle = true,
  headingTag = 'h2',
}: CommunityPostProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState('');

  async function loadComments() {
    if (loaded) return;

    const r = await fetch(
      `/api/comments?postId=${post.id}`,
      {
        cache: 'no-store',
      }
    );

    const d = await r.json();

    if (r.ok) {
      setComments(d.comments || []);
      setLoaded(true);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setStatus('Posting...');

    const r = await fetch('/api/comments', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        postId: post.id,
        displayName: name,
        body,
      }),
    });

    const d = await r.json();

    if (!r.ok) {
      setStatus(
        d.error || 'Could not post comment.'
      );
      return;
    }

    setComments([
      d.comment,
      ...comments,
    ]);

    setName('');
    setBody('');
    setStatus('Comment added.');
    setLoaded(true);
  }

  const categoryLabel =
    post.category ===
    'stocks-to-watch-next-week'
      ? 'STOCKS TO WATCH NEXT WEEK'
      : 'LEARNING';

  const Heading = headingTag;

  return (
    <>
      <article className="communityPost card">
        <div className="cardbody">

          {/* COMMUNITY SUBSECTION TAG */}
          <div className="communityCategoryTag">
            {categoryLabel}
          </div>

          <div className="small">
            {new Date(
              post.created_at
            ).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>

          {/* POST TITLE */}
          <Heading>
            {linkTitle ? (
              <Link
                href={`/community/${post.slug}`}
                className="communityPostTitleLink"
              >
                {post.title}
              </Link>
            ) : (
              post.title
            )}
          </Heading>

          <div className="prose">
            {post.body}
          </div>

          {!!post.image_urls?.length && (
            <div className="postImages">
              {post.image_urls.map(
                (url, i) => (
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt={`${post.title} image ${
                      i + 1
                    }`}
                    loading="lazy"
                  />
                )
              )}
            </div>
          )}

          {post.youtube_post_url && (
            <a
              className="btn"
              href={post.youtube_post_url}
              target="_blank"
              rel="noreferrer"
            >
              View on YouTube ↗
            </a>
          )}

          <div className="comments">
            <div className="commentSectionHeader">
              <strong>
                {loaded
                  ? `${comments.length} comment${
                      comments.length === 1
                        ? ''
                        : 's'
                    }`
                  : 'Join the discussion'}
              </strong>

              <button
                className="btn"
                onClick={loadComments}
              >
                {loaded
                  ? 'Refresh comments'
                  : 'View comments'}
              </button>
            </div>

            <form
              onSubmit={submit}
              className="commentForm"
            >
              <label>Your name</label>

              <input
                maxLength={60}
                value={name}
                onChange={e =>
                  setName(e.target.value)
                }
                placeholder="Name"
                required
              />

              <label>Comment</label>

              <textarea
                maxLength={2000}
                value={body}
                onChange={e =>
                  setBody(e.target.value)
                }
                placeholder="Write a comment..."
                required
              />

              <button
                className="btn primary"
                type="submit"
              >
                Post comment
              </button>

              <span className="small">
                {status}
              </span>
            </form>

            {loaded && (
              <div className="commentList">
                {comments.map(c => (
                  <div
                    className={`comment ${
                      c.is_admin
                        ? 'adminComment'
                        : ''
                    }`}
                    key={c.id}
                  >
                    <div className="commentMeta">
                      <strong>
                        {c.display_name}
                      </strong>

                      {c.is_admin && (
                        <span className="adminBadge">
                          ADMIN
                        </span>
                      )}

                      <span className="small">
                        {new Date(
                          c.created_at
                        ).toLocaleString(
                          'en-IN'
                        )}
                      </span>
                    </div>

                    <p>{c.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </article>

      <style>{`
        .communityCategoryTag {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          margin-bottom: 10px;
          padding: 6px 11px;
          border: 1px solid #e5c44f;
          border-radius: 999px;
          background: #fff8d8;
          color: #6b5500;
          font-size: 11px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.06em;
        }

        .communityPostTitleLink {
          color: inherit;
          text-decoration: none;
        }

        .communityPostTitleLink:hover {
          text-decoration: underline;
          text-decoration-thickness: 1px;
          text-underline-offset: 3px;
        }
      `}</style>
    </>
  );
}

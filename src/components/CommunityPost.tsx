'use client';

import { useEffect, useState } from 'react';

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
  headingTag?: 'h1' | 'h2';
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

  // Image fullscreen / lightbox
  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  const [visibleImageControls, setVisibleImageControls] =
    useState<number | null>(null);

  const Heading = headingTag;

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

  function openImage(url: string) {
    setSelectedImage(url);
    setVisibleImageControls(null);
  }

  function closeImage() {
    setSelectedImage(null);
  }

  // ESC closes fullscreen image
  useEffect(() => {
    if (!selectedImage) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeImage();
      }
    }

    document.addEventListener(
      'keydown',
      handleKeyDown
    );

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener(
        'keydown',
        handleKeyDown
      );

      document.body.style.overflow =
        originalOverflow;
    };
  }, [selectedImage]);

  const categoryLabel =
    post.category ===
    'stocks-to-watch-next-week'
      ? 'STOCKS TO WATCH NEXT WEEK'
      : 'LEARNING';

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

          <Heading>
            {linkTitle ? (
              <a
                href={`/community/${post.slug}`}
              >
                {post.title}
              </a>
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
                  <div
                    key={`${url}-${i}`}
                    className={`communityImageWrap ${
                      visibleImageControls === i
                        ? 'showControls'
                        : ''
                    }`}
                    onMouseEnter={() =>
                      setVisibleImageControls(i)
                    }
                    onMouseLeave={() =>
                      setVisibleImageControls(null)
                    }
                    onClick={() =>
                      setVisibleImageControls(i)
                    }
                    role="group"
                    aria-label={`Image ${
                      i + 1
                    } of ${post.title}`}
                  >
                    <img
                      src={url}
                      alt={`${post.title} image ${
                        i + 1
                      }`}
                      loading="lazy"
                    />

                    <button
                      type="button"
                      className="communityImageFullView"
                      onClick={e => {
                        e.stopPropagation();
                        openImage(url);
                      }}
                      aria-label={`Open image ${
                        i + 1
                      } in full view`}
                    >
                      ⛶ Full View
                    </button>
                  </div>
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

      {/* FULLSCREEN IMAGE LIGHTBOX */}
      {selectedImage && (
        <div
          className="communityImageLightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Full image view"
          onClick={closeImage}
        >
          <button
            type="button"
            className="communityImageClose"
            onClick={closeImage}
            aria-label="Close full image view"
          >
            ✕
          </button>

          <div
            className="communityImageLightboxContent"
            onClick={e =>
              e.stopPropagation()
            }
          >
            <img
              src={selectedImage}
              alt={`${post.title} full view`}
            />

            <button
              type="button"
              className="communityImageSkip"
              onClick={closeImage}
            >
              Skip / Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
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

        .communityImageWrap {
          position: relative;
          display: block;
          width: 100%;
          cursor: zoom-in;
        }

        .communityImageWrap img {
          display: block;
          width: 100%;
          height: auto;
          max-width: 100%;
        }

        .communityImageFullView {
          position: absolute;
          right: 14px;
          bottom: 14px;
          z-index: 2;
          border: 0;
          border-radius: 10px;
          padding: 10px 14px;
          background: rgba(10, 14, 22, 0.92);
          color: #fff;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          opacity: 0;
          transform: translateY(6px);
          pointer-events: none;
          transition:
            opacity 0.18s ease,
            transform 0.18s ease;
          box-shadow:
            0 6px 20px
            rgba(0, 0, 0, 0.25);
        }

        .communityImageWrap:hover
          .communityImageFullView,
        .communityImageWrap.showControls
          .communityImageFullView {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }

        .communityImageFullView:hover {
          transform:
            translateY(0)
            scale(1.02);
        }

        .communityImageLightbox {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px;
          background: rgba(0, 0, 0, 0.9);
          animation:
            communityFadeIn
            0.16s ease;
        }

        .communityImageLightboxContent {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .communityImageLightboxContent img {
          display: block;
          width: auto;
          height: auto;
          max-width: 92vw;
          max-height: 84vh;
          object-fit: contain;
          border-radius: 6px;
          box-shadow:
            0 12px 50px
            rgba(0, 0, 0, 0.45);
        }

        .communityImageClose {
          position: fixed;
          top: 18px;
          right: 20px;
          z-index: 100000;
          width: 46px;
          height: 46px;
          border: 0;
          border-radius: 50%;
          background: rgba(20, 20, 20, 0.9);
          color: #fff;
          font-size: 24px;
          line-height: 1;
          cursor: pointer;
          box-shadow:
            0 6px 20px
            rgba(0, 0, 0, 0.3);
        }

        .communityImageClose:hover {
          background:
            rgba(45, 45, 45, 0.98);
        }

        .communityImageSkip {
          margin-top: 18px;
          border: 1px solid
            rgba(255, 255, 255, 0.35);
          border-radius: 10px;
          padding: 10px 18px;
          background:
            rgba(20, 20, 20, 0.88);
          color: #fff;
          font: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        .communityImageSkip:hover {
          background:
            rgba(45, 45, 45, 0.98);
        }

        .communityPostTitleLink {
          color: inherit;
          text-decoration: none;
        }

        @keyframes communityFadeIn {
          from {
            opacity: 0;
          }

          to {
            opacity: 1;
          }
        }

        @media (max-width: 768px) {
          .communityImageFullView {
            right: 10px;
            bottom: 10px;
            padding: 9px 12px;
            font-size: 13px;
            opacity: 0;
          }

          .communityImageWrap.showControls
            .communityImageFullView {
            opacity: 1;
            pointer-events: auto;
          }

          .communityImageLightbox {
            padding: 16px;
          }

          .communityImageLightboxContent img {
            max-width: 94vw;
            max-height: 78vh;
            border-radius: 4px;
          }

          .communityImageClose {
            top: 12px;
            right: 12px;
            width: 44px;
            height: 44px;
          }

          .communityImageSkip {
            margin-top: 14px;
            padding: 10px 16px;
          }
        }
      `}</style>
    </>
  );
}

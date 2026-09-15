'use client';

import { useEffect, useMemo, useState } from 'react';

type Topic = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  youtube_playlist_id: string | null;
  youtube_playlist_url: string | null;
};

type Video = {
  id: string;
  title: string;
  youtube_video_id: string;
  slug: string;
  published_at: string | null;
  topic_id: string | null;
  content_type: 'long' | 'short';
  classification_locked: boolean;
};

type Post = {
  id: string;
  title: string;
  body: string;
  published: boolean;
  created_at: string;
};

type Comment = {
  id: string;
  display_name: string;
  body: string;
  published: boolean;
  created_at: string;
  post_id: string;
  is_admin: boolean;
};

export default function AdminClient() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [playlist, setPlaylist] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postImages, setPostImages] = useState<FileList | null>(null);
  const [postYoutubeUrl, setPostYoutubeUrl] = useState('');
  const [postPublished, setPostPublished] = useState(true);
  const [replyPostId, setReplyPostId] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [status, setStatus] = useState('');
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);

  async function load() {
    const r = await fetch('/api/admin/data', { cache: 'no-store' });
    if (!r.ok) return;

    const d = await r.json();

    setTopics(d.topics || []);
    setVideos(d.videos || []);
    setPosts(d.posts || []);
    setComments(d.comments || []);
  }

  useEffect(() => {
    void load();
  }, []);

  const longVideos = useMemo(
    () => videos.filter(v => v.content_type === 'long'),
    [videos]
  );

  const shortVideos = useMemo(
    () => videos.filter(v => v.content_type === 'short'),
    [videos]
  );

  async function syncPlaylist() {
    if (!playlist.trim()) {
      return setStatus('Paste a YouTube playlist URL first.');
    }

    setStatus('Fetching playlist details and syncing all videos...');

    const r = await fetch('/api/admin/sync-playlist', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playlistUrl: playlist }),
    });

    const d = await r.json();

    if (!r.ok) {
      return setStatus(d.error || 'Playlist sync failed.');
    }

    setStatus(
      `${d.playlist.title} synced. ${d.synced}/${d.found} videos imported${
        d.skipped ? `, ${d.skipped} skipped` : ''
      }${d.archived ? `, ${d.archived} archived` : ''}.`
    );

    setPlaylist('');
    await load();
  }

  async function syncAllPlaylists() {
    setStatus('Syncing every saved YouTube playlist. Please wait...');

    const r = await fetch('/api/admin/sync-all-playlists', {
      method: 'POST',
    });

    const d = await r.json();

    if (!r.ok) {
      return setStatus(d.error || 'Sync all playlists failed.');
    }

    const successes = (d.results || []).filter((x: any) => x.ok);
    const failures = (d.results || []).filter((x: any) => !x.ok);

    const imported = successes.reduce(
      (sum: number, x: any) => sum + (x.summary?.synced || 0),
      0
    );

    const archived = successes.reduce(
      (sum: number, x: any) => sum + (x.summary?.archived || 0),
      0
    );

    setStatus(
      `All playlists synced. ${successes.length} succeeded${
        failures.length ? `, ${failures.length} failed` : ''
      }. ${imported} videos updated/imported${
        archived ? `, ${archived} archived` : ''
      }.`
    );

    await load();
  }

  async function syncAllShorts() {
    setStatus(
      'Scanning the channel uploads and syncing Shorts under 3 minutes...'
    );

    const r = await fetch('/api/admin/sync-all-shorts', {
      method: 'POST',
    });

    const d = await r.json();

    if (!r.ok) {
      return setStatus(d.error || 'Shorts sync failed.');
    }

    const x = d.result;

    setStatus(
      `Shorts sync complete. ${x.found} Shorts found, ${x.synced} synced${
        x.newlyClassified
          ? `, ${x.newlyClassified} newly classified`
          : ''
      }.`
    );

    await load();
  }

  async function syncSubscriberCount() {
    setStatus('Fetching the current YouTube subscriber count...');

    try {
      const r = await fetch('/api/admin/sync-subscriber-count', {
        method: 'POST',
      });

      const d = await r.json();

      if (!r.ok) {
        return setStatus(d.error || 'Subscriber count sync failed.');
      }

      setStatus(
        `Subscriber count synced: ${Number(d.subscriberCount).toLocaleString(
          'en-IN'
        )} subscribers.`
      );
    } catch (error) {
      return setStatus(
        error instanceof Error
          ? error.message
          : 'Subscriber count sync failed.'
      );
    }
  }

  async function submitVideoToIndexNow(video: Video) {
    setStatus(`Submitting "${video.title}" to IndexNow...`);

    try {
      const r = await fetch('/api/admin/indexnow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: `${window.location.origin}/videos/${video.slug}`,
        }),
      });

      const d = await r.json();

      if (!r.ok) {
        return setStatus(
          d.error || 'IndexNow submission failed.'
        );
      }

      const result = d.indexNow || {};

      setStatus(
        result.submitted === 1
          ? `IndexNow: ${video.title} submitted successfully (HTTP ${
              result.statuses?.[0]?.status ?? 'unknown'
            }).`
          : `IndexNow: ${video.title} was not submitted.${
              result.errors?.length
                ? ` ${result.errors[0]}`
                : ''
            }`
      );
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'IndexNow submission failed.'
      );
    }
  }

  async function addShort() {
    if (!shortUrl.trim()) {
      return setStatus('Paste a YouTube Short URL first.');
    }

    setStatus('Fetching Short...');

    const r = await fetch('/api/admin/add-short', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: shortUrl }),
    });

    const d = await r.json();

    if (!r.ok) {
      return setStatus(d.error || 'Short import failed.');
    }

    setStatus(`Short added: ${d.video.title}`);

    setShortUrl('');
    await load();
  }

  async function setClassification(
    id: string,
    contentType: 'long' | 'short'
  ) {
    const r = await fetch(`/api/admin/videos/${id}/classification`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contentType }),
    });

    const d = await r.json();

    if (!r.ok) {
      return setStatus(d.error || 'Could not move video.');
    }

    setVideos(prev =>
      prev.map(v =>
        v.id === id
          ? {
              ...v,
              content_type: contentType,
              classification_locked: true,
              topic_id: d.video?.topic_id ?? v.topic_id,
            }
          : v
      )
    );

    setStatus(
      contentType === 'short'
        ? 'Video moved to Shorts.'
        : 'Video moved to Long Videos.'
    );
  }

  async function createPost() {
    setStatus('Publishing community post...');

    const fd = new FormData();

    fd.append('title', postTitle);
    fd.append('body', postBody);
    fd.append('youtubePostUrl', postYoutubeUrl);
    fd.append('published', String(postPublished));

    Array.from(postImages || []).forEach(file =>
      fd.append('images', file)
    );

    const r = await fetch('/api/admin/posts', {
      method: 'POST',
      body: fd,
    });

    const d = await r.json();

    setStatus(
      r.ok ? 'Community post saved.' : d.error || 'Post failed.'
    );

    if (r.ok) {
      setPostTitle('');
      setPostBody('');
      setPostImages(null);
      setPostYoutubeUrl('');
      await load();
    }
  }

  async function deletePost(id: string) {
    if (
      !window.confirm(
        'Permanently delete this community post and its comments?'
      )
    ) {
      return;
    }

    const r = await fetch(`/api/admin/posts/${id}`, {
      method: 'DELETE',
    });

    const d = await r.json();

    if (!r.ok) {
      return setStatus(d.error || 'Could not delete post.');
    }

    setStatus('Community post permanently deleted.');
    await load();
  }

  async function togglePost(id: string, published: boolean) {
    const r = await fetch(`/api/admin/posts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ published }),
    });

    if (r.ok) {
      await load();
    }
  }

  async function deleteComment(id: string) {
    if (!window.confirm('Permanently delete this comment?')) {
      return;
    }

    const r = await fetch(`/api/admin/comments/${id}`, {
      method: 'DELETE',
    });

    const d = await r.json();

    if (!r.ok) {
      return setStatus(d.error || 'Could not delete comment.');
    }

    setStatus('Comment permanently deleted.');
    await load();
  }

  async function toggleComment(id: string, published: boolean) {
    const r = await fetch(`/api/admin/comments/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ published }),
    });

    if (r.ok) {
      await load();
    }
  }

  async function replyAsAdmin() {
    if (!replyPostId || !replyBody.trim()) {
      return setStatus(
        'Select a post and write an admin reply.'
      );
    }

    const r = await fetch('/api/admin/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        postId: replyPostId,
        body: replyBody,
      }),
    });

    const d = await r.json();

    if (!r.ok) {
      return setStatus(d.error || 'Could not post admin reply.');
    }

    setReplyBody('');
    setStatus('Admin reply posted.');
    await load();
  }

  const renderDropZone = (
    kind: 'long' | 'short',
    title: string,
    data: Video[]
  ) => (
    <div
      className="classificationColumn"
      onDragOver={e => e.preventDefault()}
      onDrop={async () => {
        if (draggedVideoId) {
          await setClassification(draggedVideoId, kind);
          setDraggedVideoId(null);
        }
      }}
    >
      <div className="classificationHeader">
        <div>
          <strong>{title}</strong>
          <div className="small">{data.length} videos</div>
        </div>
      </div>

      <div className="classificationList">
        {data.map(v => (
          <div
            className="classificationItem"
            key={v.id}
            draggable
            onDragStart={() => setDraggedVideoId(v.id)}
            onDragEnd={() => setDraggedVideoId(null)}
          >
            <div>
              <strong>{v.title}</strong>
              <div className="small">
                {v.published_at
                  ? new Date(v.published_at).toLocaleDateString(
                      'en-IN'
                    )
                  : ''}
              </div>
            </div>

            <span className="dragHint">↕</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <section className="section">
        <h2>Content Sync</h2>

        <p className="small">
          Playlists organize long-form analysis automatically.
          Shorts are classified by duration: under 3 minutes =
          Short. Manual drag-and-drop can override any mistake.
        </p>

        <div className="card adminActionCard">
          <div className="cardbody">
            <div className="eyebrow">Playlist</div>

            <h3>Sync a YouTube Playlist</h3>

            <p className="small">
              Paste a playlist URL once. The playlist name becomes
              its website section and future syncs use the saved
              playlist ID.
            </p>

            <label>Playlist URL</label>

            <input
              value={playlist}
              onChange={e => setPlaylist(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
            />

            <button
              className="btn primary"
              onClick={syncPlaylist}
            >
              Sync Playlist
            </button>
          </div>
        </div>

        <div className="card adminActionCard">
          <div className="cardbody">
            <div className="eyebrow">Maintenance</div>

            <h3>Sync All Playlists</h3>

            <p className="small">
              Update every saved playlist, including new videos,
              changed metadata and removals.
            </p>

            <button
              className="btn"
              onClick={syncAllPlaylists}
            >
              Sync All Playlists
            </button>
          </div>
        </div>

        <div className="card adminActionCard">
          <div className="cardbody">
            <div className="eyebrow">Automatic Shorts</div>

            <h3>Sync All Channel Shorts</h3>

            <p className="small">
              Scans your channel uploads and imports all videos
              under 3 minutes into Shorts. The daily cron also
              refreshes recent channel uploads automatically.
            </p>

            <button
              className="btn"
              onClick={syncAllShorts}
            >
              Sync All Shorts
            </button>
          </div>
        </div>

        <div className="card adminActionCard">
          <div className="cardbody">
            <div className="eyebrow">Channel Stats</div>

            <h3>Sync YouTube Subscriber Count</h3>

            <p className="small">
              Manually fetch the current subscriber count from YouTube and
              update the number shown on the homepage.
            </p>

            <button
              className="btn"
              onClick={syncSubscriberCount}
            >
              Sync Subscriber Count
            </button>
          </div>
        </div>

        <div className="card adminActionCard">
          <div className="cardbody">
            <div className="eyebrow">Manual fallback</div>

            <h3>Add a YouTube Short</h3>

            <label>Short URL</label>

            <input
              value={shortUrl}
              onChange={e => setShortUrl(e.target.value)}
              placeholder="https://www.youtube.com/shorts/..."
            />

            <button
              className="btn primary"
              onClick={addShort}
            >
              Add Short
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">
              Fix classification mistakes
            </div>

            <h2>Long Videos ↔ Shorts</h2>
          </div>
        </div>

        <p className="small">
          Drag any video card from one column to the other. A
          manual move is locked so the next automatic sync will
          keep your choice.
        </p>

        <div className="classificationBoard">
          {renderDropZone(
            'long',
            'Long Videos',
            longVideos
          )}

          {renderDropZone(
            'short',
            'Shorts',
            shortVideos
          )}
        </div>
      </section>

      <section className="section">
        <div className="topicHeader">
          <div>
            <div className="eyebrow">
              Automatic sections
            </div>

            <h2>Your Playlist Categories</h2>
          </div>
        </div>

        <div className="grid">
          {topics.map(t => (
            <div className="card" key={t.id}>
              <div className="cardbody">
                <h3>{t.name}</h3>

                <p className="small">
                  {t.description ||
                    'No playlist description.'}
                </p>

                <p className="small">
                  {videos.filter(
                    v => v.topic_id === t.id
                  ).length}{' '}
                  videos
                </p>

                {t.youtube_playlist_url && (
                  <a
                    className="small"
                    href={t.youtube_playlist_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open playlist ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {!topics.length && (
          <div className="card">
            <div className="cardbody">
              <p className="small">
                No playlist categories yet.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="section">
        <h2>Create Community Post</h2>

        <label>Title</label>

        <input
          value={postTitle}
          onChange={e => setPostTitle(e.target.value)}
          placeholder="Market update / chart / question"
        />

        <label>Post text</label>

        <textarea
          value={postBody}
          onChange={e => setPostBody(e.target.value)}
          placeholder="Write your community post..."
        />

        <label>Images</label>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={e => setPostImages(e.target.files)}
        />

        <label>Optional YouTube post URL</label>

        <input
          value={postYoutubeUrl}
          onChange={e => setPostYoutubeUrl(e.target.value)}
          placeholder="https://www.youtube.com/post/..."
        />

        <label>
          <input
            type="checkbox"
            checked={postPublished}
            onChange={e =>
              setPostPublished(e.target.checked)
            }
            style={{
              width: 'auto',
              marginRight: 8,
            }}
          />{' '}
          Published
        </label>

        <button
          className="btn primary"
          onClick={createPost}
        >
          Publish community post
        </button>
      </section>

      <section className="section">
        <h2>Community Posts</h2>

        <table className="table">
          <thead>
            <tr>
              <th>Post</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {posts.map(p => (
              <tr key={p.id}>
                <td>
                  <strong>{p.title}</strong>

                  <div className="small">
                    {new Date(
                      p.created_at
                    ).toLocaleString('en-IN')}
                  </div>
                </td>

                <td>
                  {p.published
                    ? 'Published'
                    : 'Hidden'}
                </td>

                <td>
                  <button
                    className="btn"
                    onClick={() =>
                      togglePost(
                        p.id,
                        !p.published
                      )
                    }
                  >
                    {p.published
                      ? 'Hide'
                      : 'Publish'}
                  </button>{' '}

                  <button
                    className="btn danger"
                    onClick={() =>
                      deletePost(p.id)
                    }
                  >
                    Delete permanently
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>Admin Reply</h2>

        <p className="small">
          Reply from this panel and visitors will see an ADMIN
          badge.
        </p>

        <select
          value={replyPostId}
          onChange={e =>
            setReplyPostId(e.target.value)
          }
        >
          <option value="">
            Choose a community post
          </option>

          {posts.map(p => (
            <option
              key={p.id}
              value={p.id}
            >
              {p.title}
            </option>
          ))}
        </select>

        <textarea
          value={replyBody}
          onChange={e =>
            setReplyBody(e.target.value)
          }
          placeholder="Write an admin reply..."
        />

        <button
          className="btn primary"
          onClick={replyAsAdmin}
        >
          Reply as Admin
        </button>
      </section>

      <section className="section">
        <h2>Comment Moderation</h2>

        <table className="table">
          <thead>
            <tr>
              <th>Comment</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {comments.map(c => (
              <tr key={c.id}>
                <td>
                  <strong>
                    {c.display_name}
                    {c.is_admin
                      ? ' · ADMIN'
                      : ''}
                  </strong>

                  <div className="small">
                    {c.body}
                  </div>

                  <div className="small">
                    {new Date(
                      c.created_at
                    ).toLocaleString('en-IN')}
                  </div>
                </td>

                <td>
                  {c.published
                    ? 'Visible'
                    : 'Hidden'}
                </td>

                <td>
                  <button
                    className="btn"
                    onClick={() =>
                      toggleComment(
                        c.id,
                        !c.published
                      )
                    }
                  >
                    {c.published
                      ? 'Hide'
                      : 'Restore'}
                  </button>{' '}

                  <button
                    className="btn danger"
                    onClick={() =>
                      deleteComment(c.id)
                    }
                  >
                    Delete permanently
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="section">
        <h2>Current Videos</h2>

        <p className="small">
          VideoObject structured data is included on every
          video page.
        </p>

        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Published</th>
              <th>VideoObject</th>
              <th>URL</th>
            </tr>
          </thead>

          <tbody>
            {videos.map(v => (
              <tr key={v.id}>
                <td>{v.title}</td>

                <td>
                  {v.content_type === 'short'
                    ? 'Short'
                    : 'Long'}
                </td>

                <td>
                  {v.published_at?.slice(0, 10)}
                </td>

                <td>
                  <strong>✅ Active</strong>
                </td>

                <td>
                  <a
                    href={`/videos/${v.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open ↗
                  </a>{' '}

                  <button
                    className="btn"
                    onClick={() => submitVideoToIndexNow(v)}
                  >
                    Submit Request to Index Now
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="small">{status}</p>

      <button
        className="btn"
        onClick={async () => {
          await fetch('/api/admin/logout', {
            method: 'POST',
          });

          location.href = '/admin/login';
        }}
      >
        Sign out
      </button>
    </div>
  );
}

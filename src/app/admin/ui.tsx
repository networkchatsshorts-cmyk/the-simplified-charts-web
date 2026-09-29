'use client';

import { Fragment, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

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
  seo_description: string | null;
  seo_description_managed: boolean;
  what_we_cover: string | null;
  key_questions: string | null;
  our_approach: string | null;
};

type CommunityPostCategory = 'learning' | 'stocks-to-watch-next-week';

type Post = {
  id: string;
  title: string;
  body: string;
  published: boolean;
  created_at: string;
  category?: CommunityPostCategory;
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

function AdminAccordion({
  eyebrow,
  title,
  description,
  section,
  loading,
  loaded,
  error,
  onOpen,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  section: string;
  loading?: boolean;
  loaded?: boolean;
  error?: string;
  onOpen: (section: string) => void;
  children: ReactNode;
}) {
  return (
    <details
      className="adminAccordion"
      data-admin-section={section}
      onToggle={event => {
        if ((event.currentTarget as HTMLDetailsElement).open) {
          onOpen(section);
        }
      }}
    >
      <summary className="adminAccordionSummary">
        <span className="adminAccordionCopy">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <strong>{title}</strong>
          {description && <span className="small">{description}</span>}
        </span>
        <span className="adminAccordionIcon" aria-hidden="true">+</span>
      </summary>
      <div className="adminAccordionBody">
        {loading && !loaded ? (
          <div className="card"><div className="cardbody"><p className="small">Loading this section…</p></div></div>
        ) : error ? (
          <div className="card"><div className="cardbody"><p className="small">{error}</p><button className="btn" onClick={() => onOpen(section)}>Retry</button></div></div>
        ) : children}
      </div>
    </details>
  );
}

export default function AdminClient() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicVideoCounts, setTopicVideoCounts] = useState<Record<string, number>>({});
  const [videos, setVideos] = useState<Video[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [playlist, setPlaylist] = useState('');
  const [singleVideoUrl, setSingleVideoUrl] = useState('');
  const [singleVideoTopicId, setSingleVideoTopicId] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postCategory, setPostCategory] =
    useState<CommunityPostCategory>('learning');
  const [postImages, setPostImages] = useState<FileList | null>(null);
  const [postYoutubeUrl, setPostYoutubeUrl] = useState('');
  const [postPublished, setPostPublished] = useState(true);
  const [replyPostId, setReplyPostId] = useState('');
  const [replyTargetType, setReplyTargetType] = useState<'post' | 'comment'>('post');
  const [replyCommentId, setReplyCommentId] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [status, setStatus] = useState('');
  const [draggedVideoId, setDraggedVideoId] = useState<string | null>(null);
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);
  const [seoDescriptionDraft, setSeoDescriptionDraft] = useState('');
  const [whatWeCoverDraft, setWhatWeCoverDraft] = useState('');
  const [keyQuestionsDraft, setKeyQuestionsDraft] = useState('');
  const [ourApproachDraft, setOurApproachDraft] = useState('');
  const [savingVideoContent, setSavingVideoContent] = useState(false);

  type AdminSectionKey =
    | 'sync'
    | 'classification'
    | 'playlists'
    | 'create-post'
    | 'posts'
    | 'reply'
    | 'comments'
    | 'videos';

  const [sectionLoaded, setSectionLoaded] = useState<Partial<Record<AdminSectionKey, boolean>>>({});
  const [sectionLoading, setSectionLoading] = useState<Partial<Record<AdminSectionKey, boolean>>>({});
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<AdminSectionKey, string>>>({});

  async function loadSection(section: AdminSectionKey, force = false) {
    if (!force && sectionLoaded[section]) return;

    setSectionLoading(prev => ({ ...prev, [section]: true }));
    setSectionErrors(prev => ({ ...prev, [section]: '' }));

    try {
      const r = await fetch(`/api/admin/data?section=${encodeURIComponent(section)}`, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));

      if (!r.ok) {
        throw new Error(d.error || `Could not load ${section}.`);
      }

      if (section === 'sync' || section === 'playlists') {
        setTopics(d.topics || []);
      }

      if (section === 'playlists') {
        setTopicVideoCounts(d.videoCounts || {});
      }

      if (section === 'classification' || section === 'videos') {
        setVideos(prev => {
          const existing = new Map(prev.map(v => [v.id, v]));
          return (d.videos || []).map((video: Partial<Video>) => ({
            ...(existing.get(video.id || '') || {}),
            ...video,
          })) as Video[];
        });
      }

      if (section === 'posts' || section === 'reply') {
        setPosts(d.posts || []);
      }

      if (section === 'reply' || section === 'comments') {
        setComments(d.comments || []);
      }

      setSectionLoaded(prev => ({ ...prev, [section]: true }));
    } catch (error) {
      setSectionErrors(prev => ({
        ...prev,
        [section]: error instanceof Error ? error.message : `Could not load ${section}.`,
      }));
    } finally {
      setSectionLoading(prev => ({ ...prev, [section]: false }));
    }
  }

  function handleSectionOpen(section: AdminSectionKey) {
    if (section === 'create-post') return;
    void loadSection(section);
  }

  async function refreshSections(sections: AdminSectionKey[]) {
    const targets = sections.filter(section => sectionLoaded[section]);
    await Promise.all(targets.map(section => loadSection(section, true)));
  }

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
    await refreshSections(['sync', 'classification', 'playlists', 'videos']);
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

    await refreshSections(['sync', 'classification', 'playlists', 'videos']);
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

    await refreshSections(['sync', 'classification', 'playlists', 'videos']);
  }

  async function syncSingleVideo() {
    if (!singleVideoUrl.trim()) {
      return setStatus('Paste a YouTube video URL first.');
    }

    setStatus('Fetching and syncing this YouTube video...');

    try {
      const r = await fetch('/api/admin/sync-video', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          url: singleVideoUrl,
          topicId: singleVideoTopicId || null,
        }),
      });

      const d = await r.json();

      if (!r.ok) {
        return setStatus(d.error || 'Single video sync failed.');
      }

      const redirectMessage = d.slugChanged
        ? ' Old URL now permanently redirects to the new URL.'
        : '';

      setStatus(
        `Video synced: ${d.video?.title || 'Video'}.${redirectMessage}`
      );

      setSingleVideoUrl('');
      setSingleVideoTopicId('');
      await refreshSections(['sync', 'classification', 'playlists', 'videos']);
    } catch (error) {
      return setStatus(
        error instanceof Error
          ? error.message
          : 'Single video sync failed.'
      );
    }
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
    await refreshSections(['sync', 'classification', 'playlists', 'videos']);
  }

  function openVideoContentEditor(video: Video) {
    setEditingVideoId(video.id);
    setSeoDescriptionDraft(
      video.seo_description_managed ? video.seo_description || '' : ''
    );
    setWhatWeCoverDraft(video.what_we_cover || '');
    setKeyQuestionsDraft(video.key_questions || '');
    setOurApproachDraft(video.our_approach || '');
    setStatus('');
  }

  function closeVideoContentEditor() {
    setEditingVideoId(null);
    setSeoDescriptionDraft('');
    setWhatWeCoverDraft('');
    setKeyQuestionsDraft('');
    setOurApproachDraft('');
  }

  async function saveVideoContent(video: Video) {
    setSavingVideoContent(true);
    setStatus('Saving SEO description and website analysis...');

    try {
      const r = await fetch(
        `/api/admin/videos/${encodeURIComponent(video.youtube_video_id)}/content`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            seoDescription: seoDescriptionDraft,
            whatWeCover: whatWeCoverDraft,
            keyQuestions: keyQuestionsDraft,
            ourApproach: ourApproachDraft,
          }),
        }
      );

      const d = await r.json();

      if (!r.ok) {
        setStatus(d.error || 'Could not save video SEO content.');
        return;
      }

      setVideos(prev =>
        prev.map(v =>
          v.id === video.id
            ? {
                ...v,
                seo_description: d.video?.seo_description ?? null,
                seo_description_managed:
                  d.video?.seo_description_managed ?? false,
                what_we_cover: d.video?.what_we_cover ?? null,
                key_questions: d.video?.key_questions ?? null,
                our_approach: d.video?.our_approach ?? null,
              }
            : v
        )
      );

      setStatus(`SEO content saved for "${video.title}".`);
      closeVideoContentEditor();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Could not save video SEO content.'
      );
    } finally {
      setSavingVideoContent(false);
    }
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
    fd.append('category', postCategory);
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
      setPostCategory('learning');
      setPostImages(null);
      setPostYoutubeUrl('');
      await refreshSections(['posts', 'reply']);
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
    await refreshSections(['posts', 'reply', 'comments']);
  }

  async function togglePost(id: string, published: boolean) {
    const r = await fetch(`/api/admin/posts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ published }),
    });

    if (r.ok) {
      await refreshSections(['posts', 'reply']);
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
    await refreshSections(['comments']);
  }

  async function toggleComment(id: string, published: boolean) {
    const r = await fetch(`/api/admin/comments/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ published }),
    });

    if (r.ok) {
      await refreshSections(['comments']);
    }
  }

  function selectCommentForReply(comment: Comment) {
    setReplyTargetType('comment');
    setReplyCommentId(comment.id);
    setReplyPostId(comment.post_id);
    setStatus('Comment selected. Open Admin Reply to respond to it.');
    window.setTimeout(() => {
      const section = document.querySelector('details[data-admin-section="reply"]') as HTMLDetailsElement | null;
      if (section) {
        section.open = true;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }

  async function replyAsAdmin() {
    if (!replyBody.trim()) {
      return setStatus('Write an admin reply first.');
    }

    let postId = replyPostId;
    let parentCommentId: string | null = null;

    if (replyTargetType === 'comment') {
      const target = comments.find(comment => comment.id === replyCommentId);
      if (!target) {
        return setStatus('Choose a comment to reply to.');
      }
      postId = target.post_id;
      parentCommentId = target.id;
    } else if (!replyPostId) {
      return setStatus('Choose a community post to reply to.');
    }

    const r = await fetch('/api/admin/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        postId,
        parentCommentId,
        body: replyBody,
      }),
    });

    const d = await r.json();

    if (!r.ok) {
      return setStatus(d.error || 'Could not post admin reply.');
    }

    setReplyBody('');
    setReplyCommentId('');
    setStatus(parentCommentId ? 'Admin reply posted to the comment.' : 'Admin reply posted to the post.');
    await refreshSections(['comments', 'reply']);
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
      <div className="adminAccordionIntro">
        <p className="small">Expand only what you need. Each section fetches its own data when opened, so the initial admin page stays compact and avoids loading unrelated details.</p>
      </div>
      <AdminAccordion
        eyebrow="YouTube sync and imports"
        title="Content Sync"
        description="Fetch playlist/category data only when opened"
        section="sync"
        loading={sectionLoading["sync"] || false}
        loaded={sectionLoaded["sync"] || false}
        error={sectionErrors["sync"] || ''}
        onOpen={section => handleSectionOpen(section as AdminSectionKey)}
      >

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
            <div className="eyebrow">Single Video</div>

            <h3>Sync One YouTube Video</h3>

            <p className="small">
              Re-fetch one specific video from YouTube. Existing videos keep
              their current playlist/category; choose a category only when
              adding a new video.
            </p>

            <label>Video URL</label>

            <input
              value={singleVideoUrl}
              onChange={e => setSingleVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />

            <label>Playlist / category (only for a new video)</label>

            <select
              value={singleVideoTopicId}
              onChange={e => setSingleVideoTopicId(e.target.value)}
            >
              <option value="">Keep existing / choose if new</option>
              {topics.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <button
              className="btn primary"
              onClick={syncSingleVideo}
            >
              Sync Video
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
      
      </AdminAccordion>
      <AdminAccordion
        eyebrow="Long Videos \u2194 Shorts"
        title="Video Classification"
        description="Fetch videos only when opened"
        section="classification"
        loading={sectionLoading["classification"] || false}
        loaded={sectionLoaded["classification"] || false}
        error={sectionErrors["classification"] || ''}
        onOpen={section => handleSectionOpen(section as AdminSectionKey)}
      >

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
      
      </AdminAccordion>
      <AdminAccordion
        eyebrow="Your Playlist Categories"
        title="Playlist Categories"
        description="Fetch categories only when opened"
        section="playlists"
        loading={sectionLoading["playlists"] || false}
        loaded={sectionLoaded["playlists"] || false}
        error={sectionErrors["playlists"] || ''}
        onOpen={section => handleSectionOpen(section as AdminSectionKey)}
      >

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
                  {topicVideoCounts[t.id] ?? 0}{' '}
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
      
      </AdminAccordion>
      <AdminAccordion
        eyebrow="Publish a new community post"
        title="Create Community Post"
        description="No data is fetched for this form"
        section="create-post"
        loading={sectionLoading["create-post"] || false}
        loaded={sectionLoaded["create-post"] || false}
        error={sectionErrors["create-post"] || ''}
        onOpen={section => handleSectionOpen(section as AdminSectionKey)}
      >

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

        <label>Community subsection</label>

        <select
          value={postCategory}
          onChange={e =>
            setPostCategory(
              e.target.value as CommunityPostCategory
            )
          }
        >
          <option value="learning">Learning</option>
          <option value="stocks-to-watch-next-week">
            Stocks to watch next week
          </option>
        </select>

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
      
      </AdminAccordion>
      <AdminAccordion
        eyebrow="Manage, hide or delete posts"
        title="Community Posts"
        description="Fetch posts only when opened"
        section="posts"
        loading={sectionLoading["posts"] || false}
        loaded={sectionLoaded["posts"] || false}
        error={sectionErrors["posts"] || ''}
        onOpen={section => handleSectionOpen(section as AdminSectionKey)}
      >

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
      
      </AdminAccordion>
      <AdminAccordion
        eyebrow="Reply to a community post"
        title="Admin Reply"
        description="Fetch posts and comments only when opened"
        section="reply"
        loading={sectionLoading["reply"] || false}
        loaded={sectionLoaded["reply"] || false}
        error={sectionErrors["reply"] || ''}
        onOpen={section => handleSectionOpen(section as AdminSectionKey)}
      >

        <h2>Admin Reply</h2>

        <p className="small">
          Reply to the original post or directly to any visitor/admin comment.
        </p>

        <label>Reply target</label>
        <select
          value={replyTargetType}
          onChange={e => {
            const type = e.target.value as 'post' | 'comment';
            setReplyTargetType(type);
            if (type === 'post') setReplyCommentId('');
          }}
        >
          <option value="post">Reply to community post</option>
          <option value="comment">Reply to a comment</option>
        </select>

        {replyTargetType === 'post' ? (
          <>
            <label>Community post</label>
            <select
              value={replyPostId}
              onChange={e => setReplyPostId(e.target.value)}
            >
              <option value="">Choose a community post</option>
              {posts.map(p => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label>Comment to reply to</label>
            <select
              value={replyCommentId}
              onChange={e => setReplyCommentId(e.target.value)}
            >
              <option value="">Choose a comment</option>
              {comments.map(c => {
                const post = posts.find(p => p.id === c.post_id);
                const preview = c.body.replace(/\s+/g, ' ').slice(0, 90);
                return (
                  <option key={c.id} value={c.id}>
                    {c.is_admin ? 'Admin' : c.display_name} — {preview}{post ? ` · ${post.title}` : ''}
                  </option>
                );
              })}
            </select>
            {!comments.length && (
              <p className="small">No comments loaded yet. Open Comment Moderation once to fetch them, or use “Reply to comment” beside a comment.</p>
            )}
          </>
        )}

        <textarea
          value={replyBody}
          onChange={e => setReplyBody(e.target.value)}
          placeholder="Write an admin reply..."
        />

        <button
          className="btn primary"
          onClick={replyAsAdmin}
        >
          Reply as Admin
        </button>
      
      </AdminAccordion>
      <AdminAccordion
        eyebrow="Moderate visitor comments"
        title="Comment Moderation"
        description="Fetch comments only when opened"
        section="comments"
        loading={sectionLoading["comments"] || false}
        loaded={sectionLoaded["comments"] || false}
        error={sectionErrors["comments"] || ''}
        onOpen={section => handleSectionOpen(section as AdminSectionKey)}
      >

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
                    {c.is_admin ? 'Admin' : c.display_name}
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
                    onClick={() => selectCommentForReply(c)}
                  >
                    Reply to comment
                  </button>{' '}

                  <button
                    className="btn"
                    onClick={() => toggleComment(c.id, !c.published)}
                  >
                    {c.published ? 'Hide' : 'Restore'}
                  </button>{' '}

                  <button
                    className="btn danger"
                    onClick={() => deleteComment(c.id)}
                  >
                    Delete permanently
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      
      </AdminAccordion>
      <AdminAccordion
        eyebrow="Manage SEO description and full website analysis"
        title="Current Videos / SEO"
        description="Fetch video details only when opened"
        section="videos"
        loading={sectionLoading["videos"] || false}
        loaded={sectionLoaded["videos"] || false}
        error={sectionErrors["videos"] || ''}
        onOpen={section => handleSectionOpen(section as AdminSectionKey)}
      >

        <h2>Current Videos</h2>

        <p className="small">
          VideoObject structured data is included on every video page.
          SEO description and the three website analysis sections are managed here
          per YouTube video ID and are never overwritten by YouTube sync.
        </p>

        <div className="card adminActionCard">
          <div className="cardbody">
            <strong>SEO description rule</strong>
            <p className="small">
              Keep the description useful and page-specific. This editor
              uses a 160-character publishing limit as a practical target;
              Google does not impose a fixed meta-description length. A saved
              description becomes the page's active meta description.
            </p>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Published</th>
              <th>SEO description</th>
              <th>Website analysis</th>
              <th>VideoObject</th>
              <th>URL</th>
              <th>Manage</th>
            </tr>
          </thead>

          <tbody>
            {videos.map(v => (
              <Fragment key={v.id}>
                <tr>
                  <td>
                    <strong>{v.title}</strong>
                    <div className="small">
                      YouTube ID: {v.youtube_video_id}
                    </div>
                  </td>

                  <td>
                    {v.content_type === 'short'
                      ? 'Short'
                      : 'Long'}
                  </td>

                  <td>
                    {v.published_at?.slice(0, 10)}
                  </td>

                  <td>
                    {v.seo_description_managed &&
                    v.seo_description ? (
                      <>
                        <div>
                          {v.seo_description}
                        </div>
                        <div className="small">
                          {v.seo_description.length}/160 · Active
                        </div>
                      </>
                    ) : (
                      <span className="small">
                        Not set / not active
                      </span>
                    )}
                  </td>

                  <td>
                    {v.what_we_cover || v.key_questions || v.our_approach ? (
                      <strong>✅ Added</strong>
                    ) : (
                      <span className="small">
                        Not added
                      </span>
                    )}
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
                    </a>
                  </td>

                  <td>
                    <button
                      className="btn"
                      onClick={() =>
                        editingVideoId === v.id
                          ? closeVideoContentEditor()
                          : openVideoContentEditor(v)
                      }
                    >
                      {editingVideoId === v.id
                        ? 'Close'
                        : 'Edit SEO'}
                    </button>
                  </td>
                </tr>

                {editingVideoId === v.id && (
                  <tr>
                    <td colSpan={8}>
                      <div className="card">
                        <div className="cardbody">
                          <div className="eyebrow">
                            Website content
                          </div>

                          <h3>{v.title}</h3>

                          <p className="small">
                            These fields are bound to YouTube video ID{' '}
                            <strong>{v.youtube_video_id}</strong>.
                            Playlist sync can change the YouTube title,
                            description, thumbnail and slug, but it will
                            not overwrite these fields.
                          </p>

                          <label htmlFor={`seo-description-${v.id}`}>
                            SEO Description
                          </label>

                          <textarea
                            id={`seo-description-${v.id}`}
                            value={seoDescriptionDraft}
                            onChange={e =>
                              setSeoDescriptionDraft(e.target.value)
                            }
                            maxLength={160}
                            placeholder="Write a unique description for this video page."
                            rows={4}
                          />

                          <div className="small">
                            {seoDescriptionDraft.length}/160
                          </div>

                          <div className="card adminActionCard" style={{ marginTop: '20px' }}>
                            <div className="cardbody">
                              <strong>Website Analysis</strong>
                              <p className="small">
                                Fill these three sections to build the website analysis shown on the video page.
                              </p>
                            </div>
                          </div>

                          <label htmlFor={`what-we-cover-${v.id}`}>
                            What We Cover
                          </label>

                          <textarea
                            id={`what-we-cover-${v.id}`}
                            value={whatWeCoverDraft}
                            onChange={e => setWhatWeCoverDraft(e.target.value)}
                            maxLength={10000}
                            placeholder="What is being analysed in this video?"
                            rows={6}
                          />

                          <label htmlFor={`key-questions-${v.id}`}>
                            The Key Questions
                          </label>

                          <textarea
                            id={`key-questions-${v.id}`}
                            value={keyQuestionsDraft}
                            onChange={e => setKeyQuestionsDraft(e.target.value)}
                            maxLength={10000}
                            placeholder="What key questions does the analysis examine?"
                            rows={6}
                          />

                          <label htmlFor={`our-approach-${v.id}`}>
                            Our Approach
                          </label>

                          <textarea
                            id={`our-approach-${v.id}`}
                            value={ourApproachDraft}
                            onChange={e => setOurApproachDraft(e.target.value)}
                            maxLength={10000}
                            placeholder="How do we analyse the chart, levels, price action or setup?"
                            rows={6}
                          />

                          <div className="small">
                            These three sections become the primary written content on the video page.
                            YouTube description remains secondary backend data and is not used as
                            the website's SEO description.
                          </div>

                          <div className="adminSeoPreview">
                            <div className="eyebrow">Google / page preview</div>

                            <div className="adminSeoPreviewTitle">
                              {v.title}
                            </div>

                            <div className="adminSeoPreviewUrl">
                              https://thesimplifiedcharts.in/videos/{v.slug}
                            </div>

                            <div className="adminSeoPreviewDescription">
                              {seoDescriptionDraft.trim() ||
                                'No SEO description is set yet.'}
                            </div>
                          </div>

                          <div className="adminContentPreview">
                            <div className="eyebrow">Website preview</div>

                            <h4>
                              Check the Full Analysis, Key Levels &amp; BUY/SELL View
                            </h4>

                            <div className="prose">
                              {whatWeCoverDraft.trim() && (
                                <>
                                  <strong>What We Cover</strong>
                                  <div>{whatWeCoverDraft}</div>
                                </>
                              )}

                              {keyQuestionsDraft.trim() && (
                                <>
                                  <strong>The Key Questions</strong>
                                  <div>{keyQuestionsDraft}</div>
                                </>
                              )}

                              {ourApproachDraft.trim() && (
                                <>
                                  <strong>Our Approach</strong>
                                  <div>{ourApproachDraft}</div>
                                </>
                              )}

                              {!whatWeCoverDraft.trim() &&
                                !keyQuestionsDraft.trim() &&
                                !ourApproachDraft.trim() &&
                                'No website analysis sections are set yet.'}
                            </div>
                          </div>

                          <button
                            className="btn primary"
                            disabled={savingVideoContent}
                            onClick={() =>
                              void saveVideoContent(v)
                            }
                          >
                            {savingVideoContent
                              ? 'Saving...'
                              : 'Save Changes'}
                          </button>

                          <button
                            className="btn"
                            disabled={savingVideoContent}
                            onClick={closeVideoContentEditor}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      
      </AdminAccordion>
      <p className="small">{status}</p>

      <button className="btn" onClick={async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        location.href = '/admin/login';
      }}>
        Sign out
      </button>
    </div>
  );
}

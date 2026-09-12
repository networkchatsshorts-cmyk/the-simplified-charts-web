'use client';

import { useEffect, useState } from 'react';

type Topic = { id: string; name: string; slug: string; description: string | null; youtube_playlist_id: string | null; youtube_playlist_url: string | null };
type Video = { id: string; title: string; youtube_video_id: string; slug: string; published_at: string | null; topic_id: string | null };
type Post = { id: string; title: string; body: string; published: boolean; created_at: string };
type Comment = { id: string; display_name: string; body: string; published: boolean; created_at: string; post_id: string; is_admin?: boolean };

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
  const [status, setStatus] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  async function load() {
    const r = await fetch('/api/admin/data', { cache: 'no-store' });
    if (r.ok) {
      const d = await r.json();
      setTopics(d.topics || []);
      setVideos(d.videos || []);
      setPosts(d.posts || []);
      setComments(d.comments || []);
    }
  }

  useEffect(() => { load(); }, []);

  async function syncPlaylist() {
    if (!playlist.trim()) return setStatus('Paste a YouTube playlist URL first.');
    setStatus('Fetching playlist details and syncing all videos...');
    const r = await fetch('/api/admin/sync-playlist', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ playlistUrl: playlist })
    });
    const d = await r.json();
    if (!r.ok) return setStatus(d.error || 'Playlist sync failed.');
    setStatus(`${d.playlist.title} synced. ${d.synced}/${d.found} videos imported${d.skipped ? `, ${d.skipped} skipped` : ''}${d.archived ? `, ${d.archived} archived` : ''}.`);
    setPlaylist('');
    await load();
  }

  async function syncAllPlaylists() {
    setStatus('Syncing every saved YouTube playlist. Please wait...');
    const r = await fetch('/api/admin/sync-all-playlists', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const d = await r.json();
    if (!r.ok) return setStatus(d.error || 'Sync all playlists failed.');

    const successes = (d.results || []).filter((x: any) => x.ok);
    const failures = (d.results || []).filter((x: any) => !x.ok);
    const imported = successes.reduce((sum: number, x: any) => sum + (x.summary?.synced || 0), 0);
    const archived = successes.reduce((sum: number, x: any) => sum + (x.summary?.archived || 0), 0);
    setStatus(
      `All playlists synced. ${successes.length} succeeded${failures.length ? `, ${failures.length} failed` : ''}. ${imported} videos updated/imported${archived ? `, ${archived} archived` : ''}.`
    );
    await load();
  }

  async function addShort() {
    if (!shortUrl.trim()) return setStatus('Paste a YouTube Short URL first.');
    setStatus('Fetching Short...');
    const r = await fetch('/api/admin/add-short', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: shortUrl })
    });
    const d = await r.json();
    if (!r.ok) return setStatus(d.error || 'Short import failed.');
    setStatus(`Short added: ${d.video.title}`);
    setShortUrl('');
    await load();
  }

  async function createPost() {
    setStatus('Publishing community post...');
    const fd = new FormData();
    fd.append('title', postTitle);
    fd.append('body', postBody);
    fd.append('youtubePostUrl', postYoutubeUrl);
    fd.append('published', String(postPublished));
    Array.from(postImages || []).forEach((file) => fd.append('images', file));
    const r = await fetch('/api/admin/posts', { method: 'POST', body: fd });
    const d = await r.json();
    setStatus(r.ok ? 'Community post saved.' : (d.error || 'Post failed'));
    if (r.ok) {
      setPostTitle(''); setPostBody(''); setPostImages(null); setPostYoutubeUrl(''); await load();
    }
  }

  async function togglePost(id: string, published: boolean) {
    const r = await fetch(`/api/admin/posts/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ published }) });
    if (r.ok) await load();
  }

  async function deleteComment(id: string) {
    if (!window.confirm('Permanently delete this comment?')) return;
    const r = await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
    const d = await r.json();
    setStatus(r.ok ? 'Comment deleted permanently.' : (d.error || 'Could not delete comment.'));
    if (r.ok) await load();
  }

  async function replyAsAdmin(postId: string) {
    const text = (replyDrafts[postId] || '').trim();
    if (!text) return setStatus('Write an admin reply first.');
    const r = await fetch('/api/admin/comments', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ postId, body: text }) });
    const d = await r.json();
    setStatus(r.ok ? 'Admin reply posted.' : (d.error || 'Could not post reply.'));
    if (r.ok) {
      setReplyDrafts(prev => ({ ...prev, [postId]: '' }));
      await load();
    }
  }

  async function deletePost(id: string) {
    if (!window.confirm('Permanently delete this community post and its comments/images?')) return;
    const r = await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    const d = await r.json();
    setStatus(r.ok ? 'Community post deleted permanently.' : (d.error || 'Could not delete post.'));
    if (r.ok) await load();
  }

  return <div>
    <section className="section">
      <h2>Add Content</h2>
      <p className="small">No manual category setup. Paste a YouTube playlist or a YouTube Short and the site organizes it automatically.</p>

      <div className="card" style={{ marginTop: 18 }}><div className="cardbody">
        <div className="eyebrow">Option 1</div>
        <h3>YouTube Playlist</h3>
        <p className="small">The playlist name becomes the website section. Its description and all available videos are imported automatically.</p>
        <label>Playlist URL</label>
        <input value={playlist} onChange={e => setPlaylist(e.target.value)} placeholder="https://www.youtube.com/playlist?list=..." />
        <button className="btn primary" onClick={syncPlaylist}>Sync Playlist</button>
      </div></div>

      <div className="card" style={{ marginTop: 18 }}><div className="cardbody">
        <div className="eyebrow">One-click maintenance</div>
        <h3>Sync All Playlists</h3>
        <p className="small">Refresh every saved playlist at once. New videos are added, changed metadata is updated, and videos no longer in a playlist are archived from the site.</p>
        <button className="btn" onClick={syncAllPlaylists}>Sync All Playlists</button>
      </div></div>

      <div className="card" style={{ marginTop: 18 }}><div className="cardbody">
        <div className="eyebrow">Option 2</div>
        <h3>YouTube Short</h3>
        <p className="small">The Short is fetched and placed automatically in the Shorts section.</p>
        <label>Short URL</label>
        <input value={shortUrl} onChange={e => setShortUrl(e.target.value)} placeholder="https://www.youtube.com/shorts/..." />
        <button className="btn primary" onClick={addShort}>Add Short</button>
      </div></div>
    </section>

    <section className="section">
      <div className="topicHeader"><div><div className="eyebrow">Automatic sections</div><h2>Your Playlist Categories</h2></div></div>
      <div className="grid">
        {topics.map(t => <div className="card" key={t.id}><div className="cardbody">
          <h3>{t.name}</h3>
          <p className="small">{t.description || 'No playlist description.'}</p>
          <p className="small">{videos.filter(v => v.topic_id === t.id).length} videos</p>
          {t.youtube_playlist_url && <a className="small" href={t.youtube_playlist_url} target="_blank" rel="noreferrer">Open playlist ↗</a>}
        </div></div>)}
      </div>
      {!topics.length && <div className="card"><div className="cardbody"><p className="small">No playlist categories yet. Paste a playlist above.</p></div></div>}
    </section>

    <section className="section"><h2>Community post</h2><p className="small">Create a post like a YouTube Community post, add multiple images, publish/unpublish it, and let visitors comment.</p><label>Title</label><input value={postTitle} onChange={e=>setPostTitle(e.target.value)} placeholder="Market update / chart / question"/><label>Post text</label><textarea value={postBody} onChange={e=>setPostBody(e.target.value)} placeholder="Write your community post..."/><label>Images (multiple allowed)</label><input type="file" accept="image/*" multiple onChange={e=>setPostImages(e.target.files)}/><label>Optional YouTube post URL</label><input value={postYoutubeUrl} onChange={e=>setPostYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/post/..."/><label><input type="checkbox" checked={postPublished} onChange={e=>setPostPublished(e.target.checked)} style={{width:'auto',marginRight:8}}/> Published</label><button className="btn primary" onClick={createPost}>Publish community post</button></section>

    <section className="section"><h2>Community posts</h2><div className="communityAdminList">{posts.map(p=><div className="card adminPostCard" key={p.id}><div className="cardbody"><div className="topicHeader"><div><h3>{p.title}</h3><div className="small">{p.created_at.slice(0,16).replace('T',' ')}</div></div><span className="pill">{p.published?'Published':'Hidden'}</span></div><div className="adminReplyBox"><label>Reply as Admin</label><textarea value={replyDrafts[p.id] || ''} onChange={e=>setReplyDrafts(prev=>({...prev,[p.id]:e.target.value}))} placeholder="Write an official reply..." maxLength={2000} /><button className="btn primary" onClick={()=>replyAsAdmin(p.id)}>Post admin reply</button></div><button className="btn danger" onClick={()=>deletePost(p.id)}>Delete permanently</button></div></div>)}</div></section>

    <section className="section"><h2>Comment moderation</h2><p className="small">Review all comments and permanently remove anything you do not want to keep.</p><table className="table"><thead><tr><th>Comment</th><th>Status</th><th>Action</th></tr></thead><tbody>{comments.map(c=><tr key={c.id}><td><strong>{c.is_admin?'The Simplified Charts':c.display_name}</strong>{c.is_admin && <span className="adminBadge tableBadge">ADMIN</span>}<div className="small">{c.body}</div><div className="small">{c.created_at.slice(0,16).replace('T',' ')}</div></td><td>{c.published?'Visible':'Hidden'}</td><td><button className="btn danger" onClick={()=>deleteComment(c.id)}>Delete permanently</button></td></tr>)}</tbody></table></section>

    <section className="section"><h2>Current videos</h2><table className="table"><thead><tr><th>Title</th><th>Published</th><th>URL</th></tr></thead><tbody>{videos.map(v=><tr key={v.id}><td>{v.title}</td><td>{v.published_at?.slice(0,10)}</td><td><a href={`/videos/${v.slug}`} target="_blank" rel="noreferrer">Open ↗</a></td></tr>)}</tbody></table></section>

    <p className="small">{status}</p>
    <button className="btn" onClick={async()=>{await fetch('/api/admin/logout',{method:'POST'});location.href='/admin/login'}}>Sign out</button>
  </div>;
}

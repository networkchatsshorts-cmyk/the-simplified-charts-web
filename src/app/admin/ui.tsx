'use client';
import {useEffect,useState} from 'react';

type Topic={id:string;name:string;slug:string;description:string|null;youtube_playlist_id:string|null};
type Video={id:string;title:string;youtube_video_id:string;slug:string;published_at:string|null;topic_id:string|null};

export default function AdminClient(){
 const [topics,setTopics]=useState<Topic[]>([]); const [videos,setVideos]=useState<Video[]>([]); const [url,setUrl]=useState(''); const [topicId,setTopicId]=useState(''); const [preview,setPreview]=useState<any>(null); const [intro,setIntro]=useState(''); const [keyPoints,setKeyPoints]=useState(''); const [seoDesc,setSeoDesc]=useState(''); const [status,setStatus]=useState(''); const [playlist,setPlaylist]=useState(''); const [newTopic,setNewTopic]=useState('');
 async function load(){const r=await fetch('/api/admin/data');if(r.ok){const d=await r.json();setTopics(d.topics||[]);setVideos(d.videos||[]);}}
 useEffect(()=>{load()},[]);
 async function fetchVideo(){setStatus('Fetching YouTube data...');const r=await fetch('/api/admin/fetch-video',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url})});const d=await r.json();if(!r.ok){setStatus(d.error||'Failed');return;}setPreview(d);setSeoDesc((d.description||'').slice(0,160));setStatus('Preview ready.');}
 async function saveVideo(){setStatus('Saving...');const r=await fetch('/api/admin/save-video',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({video:preview,topicId,analysisIntro:intro,keyPoints:keyPoints.split('\n').map(x=>x.trim()).filter(Boolean),seoDescription:seoDesc})});const d=await r.json();setStatus(r.ok?`Saved: ${d.url}`:(d.error||'Save failed'));if(r.ok){setPreview(null);setUrl('');await load();}}
 async function sync(){setStatus('Syncing playlist...');const r=await fetch('/api/admin/sync-playlist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({playlistUrl:playlist,topicId})});const d=await r.json();setStatus(r.ok?`Synced ${d.synced} videos.`:(d.error||'Sync failed'));if(r.ok){setPlaylist('');await load();}}
 async function createTopic(){if(!newTopic.trim())return;const r=await fetch('/api/admin/data',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:newTopic})});const d=await r.json();setStatus(r.ok?'Topic created.':(d.error||'Failed'));if(r.ok){setNewTopic('');await load();}}
 return <div>
  <section className="section"><h2>1. Add a YouTube video</h2><label>YouTube URL</label><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..."/><button className="btn primary" onClick={fetchVideo}>Fetch video</button>
  {preview&&<div className="card" style={{marginTop:20}}><div className="cardbody"><h3>{preview.title}</h3><p className="small">{preview.channelTitle} · {preview.publishedAt}</p><label>Website category</label><select value={topicId} onChange={e=>setTopicId(e.target.value)}><option value="">No category</option>{topics.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select><label>SEO description</label><textarea value={seoDesc} onChange={e=>setSeoDesc(e.target.value)}/><label>Analysis intro</label><textarea value={intro} onChange={e=>setIntro(e.target.value)} placeholder="Write original page content, not just a copy of the YouTube description."/><label>Key points, one per line</label><textarea value={keyPoints} onChange={e=>setKeyPoints(e.target.value)}/><button className="btn primary" onClick={saveVideo}>Save video page</button></div></div>}
  </section>
  <section className="section"><h2>2. Sync a YouTube playlist</h2><label>Playlist URL or playlist ID</label><input value={playlist} onChange={e=>setPlaylist(e.target.value)} placeholder="https://www.youtube.com/playlist?list=..."/><label>Website category</label><select value={topicId} onChange={e=>setTopicId(e.target.value)}><option value="">Choose category</option>{topics.map(t=><option value={t.id} key={t.id}>{t.name}</option>)}</select><button className="btn primary" onClick={sync}>Sync playlist</button></section>
  <section className="section"><h2>3. Categories</h2><div style={{display:'flex',gap:8}}><input value={newTopic} onChange={e=>setNewTopic(e.target.value)} placeholder="BSE Analysis"/><button className="btn" onClick={createTopic}>Add category</button></div><p className="small">Example: BSE, Vodafone Idea, Reliance, Banking, Breakouts.</p></section>
  <section className="section"><h2>Current videos</h2><table className="table"><thead><tr><th>Title</th><th>Published</th><th>URL</th></tr></thead><tbody>{videos.map(v=><tr key={v.id}><td>{v.title}</td><td>{v.published_at?.slice(0,10)}</td><td><a href={`/videos/${v.slug}`} target="_blank">Open ↗</a></td></tr>)}</tbody></table></section>
  <p className="small">{status}</p>
  <button className="btn" onClick={async()=>{await fetch('/api/admin/logout',{method:'POST'});location.href='/admin/login'}}>Sign out</button>
 </div>
}

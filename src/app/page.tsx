import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import AdminClient from './ui';
export default async function AdminPage(){ if(!(await isAdmin())) redirect('/admin/login'); return <main className="container"><div className="adminBox" style={{maxWidth:1000}}><div className="eyebrow">Admin</div><h1>Content manager</h1><p className="lead">Paste a YouTube video URL or sync an existing YouTube playlist into your website.</p><AdminClient/></div></main>; }

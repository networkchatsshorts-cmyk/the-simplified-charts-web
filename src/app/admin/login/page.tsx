import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { isAdmin } from '@/lib/auth';
import LoginForm from './ui';
export default async function LoginPage(){ if(await isAdmin()) redirect('/admin'); return <main className="container"><div className="adminBox"><div className="eyebrow">Admin</div><h1>Video manager</h1><LoginForm/></div></main>; }

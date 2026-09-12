import { NextResponse } from 'next/server';
import { adminCookie, makeSession } from '@/lib/auth';
export async function POST(req:Request){const {password}=await req.json();if(!password||password!==process.env.ADMIN_PASSWORD)return NextResponse.json({error:'Unauthorized'},{status:401});const res=NextResponse.json({ok:true});res.cookies.set(adminCookie,makeSession(),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:60*60*24*7});return res;}

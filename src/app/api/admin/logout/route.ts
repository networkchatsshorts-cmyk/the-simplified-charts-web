import { NextResponse } from 'next/server';
import { adminCookie } from '@/lib/auth';
export async function POST(){const res=NextResponse.json({ok:true});res.cookies.set(adminCookie,'',{httpOnly:true,expires:new Date(0),path:'/'});return res;}

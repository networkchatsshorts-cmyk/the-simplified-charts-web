import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { extractVideoId, fetchVideo } from '@/lib/youtube';
export async function POST(req:Request){if(!(await isAdmin()))return NextResponse.json({error:'Unauthorized'},{status:401});const {url}=await req.json();const id=extractVideoId(url||'');if(!id)return NextResponse.json({error:'Could not extract a YouTube video ID.'},{status:400});try{return NextResponse.json(await fetchVideo(id));}catch(e:any){return NextResponse.json({error:e.message},{status:400});}}

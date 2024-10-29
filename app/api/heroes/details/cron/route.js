import { fetchHeroDetails } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic'

export async function GET(req){
    const offset = parseInt(req.nextUrl.searchParams.get("offset"))
    const limit = parseInt(req.nextUrl.searchParams.get("limit"))
    
    try{
        await fetchHeroDetails(offset, limit)
        return NextResponse.json({success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
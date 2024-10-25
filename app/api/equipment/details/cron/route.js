import { fetchHeroDetails } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(req){
    const offset = req.nextUrl.searchParams.get("offset")
    const limit = req.nextUrl.searchParams.get("limit")
    
    try{
        const result = await fetchHeroDetails(offset, limit)
        return NextResponse.json({data: result, success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
import { fetchListEmblem } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic'

export async function GET(){
    try{
        const listEmblem = await fetchListEmblem()
        return NextResponse.json({dataLength: listEmblem.length, success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
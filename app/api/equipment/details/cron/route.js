import { NextResponse } from "next/server";
import { extractOffset } from "@/lib/helper";
import { head } from "@vercel/blob";
import fetch from "node-fetch";
import { SCRAPING_LIMIT } from "@/lib/const";

export const maxDuration = 60;

export async function GET(){
    try{
        const {url} = await head("output/equipment.json")
        const equipmentList = await fetch(url).then(res => res.json())
        const offsets = extractOffset(equipmentList.length)
        await Promise.all(offsets.map((offset) => fetch(`https://${process.env.VERCEL_URL}/api/equipment/details?offset=${offset}&limit=${SCRAPING_LIMIT}`)))

        return NextResponse.json({success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
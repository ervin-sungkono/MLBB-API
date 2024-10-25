import { NextResponse } from "next/server";
import { extractOffset } from "@/lib/helper";
import { head } from "@vercel/blob";
import fetch from "node-fetch";
import { SCRAPING_LIMIT } from "@/lib/const";

export const maxDuration = 60;

export async function GET(){
    try{
        const {url} = await head("output/hero.json")
        const heroList = await fetch(url).then(res => res.json())
        const offsets = extractOffset(heroList.length)
        const results = await Promise.all(offsets.map(async(offset) => await fetch(`https://${process.env.VERCEL_URL}/api/heroes/details?offset=${offset}&limit=${SCRAPING_LIMIT}`)))
        console.log(results)

        return NextResponse.json({success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
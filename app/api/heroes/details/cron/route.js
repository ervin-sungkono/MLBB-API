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
        const results = await Promise.all(offsets.map((offset) => {
            const payload = { offset: offset, limit: SCRAPING_LIMIT }
            return fetch(`https://${process.env.VERCEL_URL}/api/heroes/details`, {
                method: 'POST',
                body: JSON.stringify(payload)
            }).then(res => res.json())
        }))
        .filter(res => res.success)
        .map(res => res.data)

        return NextResponse.json({data: results, success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
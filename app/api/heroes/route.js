import { head } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { MAX_REQUESTS_PER_INTERVAL } from "@/lib/const";
import fetch from "node-fetch";

export async function GET(){
    const headerList = headers()
    const cacheToken = headerList["x-forwarded-for"] || headerList.socket?.remoteAddress || "unknown";

    const { limited, remaining } = isRateLimited(cacheToken);
    if(limited){
        return NextResponse.json({ error: "Rate limit exceeded" }, {status: 429})
    }
    
    try{
        const { url } = await head("output/hero.json")
        const data = await fetch(url).then(res => res.json())

        return NextResponse.json({
            ratelimit_limit: MAX_REQUESTS_PER_INTERVAL,
            ratelimit_remaining: remaining,
            success: true,
            data: data
        }, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({data: null, success: false}, {status: 500})
    }
}
import { head } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_REQUESTS_PER_INTERVAL } from "@/lib/const";
import fetch from "node-fetch";

const limiter = rateLimit()

export async function GET(){
    const headerList = headers()
    const cacheToken = headerList["x-forwarded-for"] || headerList.socket?.remoteAddress || "unknown";

    const { limited, remaining } = limiter.check(cacheToken);
    if(limited){
        return NextResponse.json({ error: "Rate limit exceeded" }, {status: 429})
    }
    
    try{
        const { url } = await head("output/hero.json")
        const data = await fetch(url).then(res => res.json())

        const response = NextResponse.json({
            success: true,
            data: data
        }, {status: 200})
        response.headers.set("X-RateLimit-Limit", MAX_REQUESTS_PER_INTERVAL)
        response.headers.set("X-RateLimit-Remaining", remaining)

        return response
    }catch(err){
        console.log(err)
        const response = NextResponse.json({
            data: null, 
            success: false
        }, {status: 500})

        response.headers.set("X-RateLimit-Limit", MAX_REQUESTS_PER_INTERVAL)
        response.headers.set("X-RateLimit-Remaining", remaining)

        return response
    }
}
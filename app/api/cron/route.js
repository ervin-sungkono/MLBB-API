import { NextResponse } from "next/server";
import fetch from "node-fetch";

export const maxDuration = 60;
const baseUrl = 'https://' + process.env.VERCEL_URL

export async function GET(){
    try{
        const urls = [`${baseUrl}/api/heroes/cron`, `${baseUrl}/api/equipment/cron`]
        console.log(urls)
        const result = await Promise.all(urls.map(url => fetch(url, { 
                method: 'GET', 
                headers: {
                    'Content-Type': "application/json"
                } 
            })
            .then(res => {
                if(res.ok) return res.json()
                throw new Error("Failed to fetch: ", res.status)
            })
            .catch(err => {
                console.log(err)
                return null
            })
        ))
        return NextResponse.json({data: result, success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
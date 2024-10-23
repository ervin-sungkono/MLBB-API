import { head } from "@vercel/blob";
import { NextResponse } from "next/server";
import fetch from "node-fetch";

export const maxDuration = 60;

export async function GET(req){
    try{
        const { id } = req.params
        const { url } = await head(`output/hero/${id}.json`)

        const data = await fetch(url).then(res => res.json())
        return NextResponse.json({data: data, success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({data:null, success: false}, {status: 500})
    }
}
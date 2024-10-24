import { head } from "@vercel/blob";
import { NextResponse } from "next/server";
import fetch from "node-fetch";

export async function GET(){
    try{
        const { url } = await head("output/hero.json")
        const data = await fetch(url).then(res => res.json())

        return NextResponse.json({data: data, success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({data: null, success: false}, {status: 500})
    }
}
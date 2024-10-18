import { fetchListHeroes } from "@/lib/scraper";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";



export async function GET(){
    try{
        await fetchListHeroes()
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }

    

    return NextResponse.json({success: true}, {status: 200})
}
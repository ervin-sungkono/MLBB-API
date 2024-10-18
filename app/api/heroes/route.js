import { fetchListHeroes } from "@/lib/scraper";
import { NextResponse } from "next/server";

export async function GET(){
    try{
        const blob = await fetchListHeroes()
        return NextResponse.json({data: blob}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
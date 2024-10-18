import { fetchListHeroes } from "@/lib/scraper";
import { readFileSync } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(){
    try{
        await fetchListHeroes()
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
    
    const jsonData = JSON.parse(readFileSync(path.resolve("./output", "hero.json"), 'utf-8'))

    return NextResponse.json({data: jsonData}, {status: 200})
}
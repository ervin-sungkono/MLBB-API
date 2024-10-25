import { fetchListEquipment } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function GET(){
    try{
        const result = await fetchListEquipment()
        return NextResponse.json({data:result, success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
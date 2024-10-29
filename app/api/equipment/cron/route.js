import { fetchListEquipment } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = 'force-dynamic'

export async function GET(){
    try{
        const listEquipment = await fetchListEquipment()
        return NextResponse.json({dataLength: listEquipment.length, success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
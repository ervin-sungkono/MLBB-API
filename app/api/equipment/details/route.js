import { fetchEquipmentDetails } from "@/lib/scraper";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req){
    const {offset, limit} = await req.json()
    
    try{
        await fetchEquipmentDetails(offset, limit)
        return NextResponse.json({success: true}, {status: 200})
    }catch(err){
        console.log(err)
        return NextResponse.json({success: false}, {status: 500})
    }
}
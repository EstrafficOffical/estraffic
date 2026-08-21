import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session=await auth(); const meRole=String((session?.user as any)?.role||""); const meId=String((session?.user as any)?.id||"");
  if(!session?.user || !["OWNER","ADMIN"].includes(meRole)) return NextResponse.json({error:"Forbidden"},{status:403});
  const target=await prisma.user.findUnique({where:{id:params.id},select:{id:true,role:true,status:true}}); if(!target) return NextResponse.json({error:"User not found"},{status:404});
  const body=await req.json().catch(()=>({})); const action=String(body.action||"");
  if(meRole==="ADMIN" && target.role!=="MANAGER" && !(target.role==="USER"&&body.role==="MANAGER")) return NextResponse.json({error:"ADMIN may only manage MANAGER accounts"},{status:403});
  if(action==="set-role") { const next=String(body.role||""); if(!["MANAGER","ADMIN","OWNER"].includes(next)) return NextResponse.json({error:"Invalid role"},{status:400}); if(meRole!=="OWNER"&&next!=="MANAGER") return NextResponse.json({error:"Only OWNER can grant ADMIN/OWNER"},{status:403}); if(params.id===meId) return NextResponse.json({error:"You cannot change your own role here"},{status:400}); await prisma.user.update({where:{id:params.id},data:{role:next as any,status:"APPROVED"}}); return NextResponse.json({ok:true}); }
  if(action==="suspend"||action==="reactivate") { if(params.id===meId) return NextResponse.json({error:"You cannot suspend your own account"},{status:400}); if(target.role==="OWNER"&&action==="suspend"){const activeOwners=await prisma.user.count({where:{role:"OWNER",status:"APPROVED"}});if(activeOwners<=1)return NextResponse.json({error:"Cannot suspend the final active OWNER"},{status:400})} await prisma.user.update({where:{id:params.id},data:{status:action==="suspend"?"SUSPENDED":"APPROVED"}}); return NextResponse.json({ok:true}); }
  if(action==="remove-staff") { if(meRole!=="OWNER") return NextResponse.json({error:"Only OWNER can remove staff access"},{status:403}); if(params.id===meId)return NextResponse.json({error:"You cannot remove your own staff access"},{status:400}); if(target.role==="OWNER"){const owners=await prisma.user.count({where:{role:"OWNER",status:"APPROVED"}});if(owners<=1)return NextResponse.json({error:"Cannot remove the final active OWNER"},{status:400})} await prisma.user.update({where:{id:params.id},data:{role:"USER",tier:3,assignedManagerId:null}}); return NextResponse.json({ok:true}); }
  return NextResponse.json({error:"Unknown action"},{status:400});
}

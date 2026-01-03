"use client"
import { UserDetailContext } from '@/context/UserDetailContext'
import { api } from '@/convex/_generated/api';
import { useConvex } from 'convex/react';
import React, { useContext, useEffect, useState } from 'react'
import { useSidebar } from '../ui/sidebar';
import Link from 'next/link';

export default function Workspacehistory() {
    const {userDetail,setUserDetail}=useContext(UserDetailContext);
    const convex=useConvex();
    const [workspaceList,setWorkspaceList]=useState();
    const {toggleSideBar}=useSidebar();

    useEffect(()=>{
        userDetail&&GetAllWorkspace();
    },[userDetail])

    const GetAllWorkspace=async()=>{
        const result=await convex.query(api.workspace.GetAllWorkspace,{
            userId:userDetail?._id
        });
        setWorkspaceList(result);
        // Removed console.log for cleaner console output
    }
  return (
    <div > 
        <h2 className='font-medium text-lg'></h2>
        <div>
            {workspaceList&&workspaceList?.map((workspace,index)=>(
                <Link href={'/workspace/'+workspace?._id} key={index}>
                <h2 onClick={toggleSideBar} className='text-sm text-gray-400 mt-2 font-light cursor-pointer hover:text-white'>
                    {workspace?.messages[0].content}
                </h2>
                </Link>
            ))}
        </div>
    </div>
  )
}

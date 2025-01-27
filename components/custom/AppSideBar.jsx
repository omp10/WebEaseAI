import React from 'react'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
  } from "@/components/ui/sidebar"
import Image from 'next/image'
import { Button } from '../ui/button'
import { MessageCircleCode } from 'lucide-react'
import Workspacehistory from './Workspacehistory'
import SideBarFooter from './SideBarFooter'
function AppSideBar() {
  return (
    <Sidebar>
    <SidebarHeader className="p-2" />
    <Image src={'/logo1.jpg'} alt='logo' width={40} height={30}/>
    <Button className="mt-5"><MessageCircleCode/>Start New Chat</Button>

    <SidebarContent className="p-5">
      <SidebarGroup />
      <Workspacehistory/>
      <SidebarGroup />
    </SidebarContent>
    <SidebarFooter />
    <SideBarFooter></SideBarFooter>
  </Sidebar>
  )
}

export default AppSideBar
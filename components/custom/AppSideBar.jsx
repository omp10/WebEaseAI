"use client";
import React, { useContext } from 'react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from "@/components/ui/sidebar";
import Image from 'next/image';
import { Button } from '../ui/button';
import { PlusCircle } from 'lucide-react';
import Workspacehistory from './Workspacehistory';
import SideBarFooter from './SideBarFooter';
import ModelSelector from './ModelSelector';
import { motion } from "framer-motion";
import { useRouter } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';
import { UserDetailContext } from '@/context/UserDetailContext';
import { toast } from 'sonner';

function AppSideBar() {
    const router = useRouter();
    const CreateWorkspace = useMutation(api.workspace.CreateWorkspace);
    const { userDetail } = useContext(UserDetailContext);

    const handleCreateNewChat = async () => {
        if (!userDetail || !userDetail._id) {
            toast.error("You must be logged in to create a new chat.");
            return;
        }

        try {
            const workspaceId = await CreateWorkspace({
                user: userDetail._id,
                messages: [],
            });
            router.push(`/workspace/${workspaceId}`);
        } catch (error) {
            console.error("Failed to create workspace:", error);
            toast.error("Failed to start new chat. Please try again.");
        }
    };

    return (
        <Sidebar className="p-4 bg-gray-950 border-r border-gray-800 flex flex-col h-full">
            {/* Sidebar Header with Branding */}
            <SidebarHeader className="flex items-center gap-2 p-2 mb-4">
                <Image
                    src={'/logo.png'}
                    alt='logo'
                    width={40}
                    height={40}
                    className="rounded-full flex-shrink-0"
                    style={{ width: 'auto', height: 'auto' }}
                />
                <span className="text-xl font-bold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                    WebEase AI
                </span>
            </SidebarHeader>

            {/* "Start New Chat" Button */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="p-2 mb-4"
            >
                <Button
                    onClick={handleCreateNewChat}
                    className="w-full justify-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors py-3 shadow-lg"
                >
                    <PlusCircle size={20} />
                    Start New Chat
                </Button>
            </motion.div>

            {/* Model Selector */}
            <ModelSelector />

            {/* Chat History Section */}
            <SidebarContent className="flex-1 p-2 overflow-y-auto scrollbar-hide">
                <h3 className="text-sm font-semibold text-gray-400 mb-2 px-2 uppercase tracking-wide">
                    History
                </h3>
                <Workspacehistory />
            </SidebarContent>

            {/* Sidebar Footer with User Options */}
            <SidebarFooter className="mt-auto">
                <SideBarFooter />
            </SidebarFooter>
        </Sidebar>
    );
}

export default AppSideBar;
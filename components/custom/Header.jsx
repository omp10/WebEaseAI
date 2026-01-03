// Header.jsx
"use client";

import React, { useContext } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { UserDetailContext } from "@/context/UserDetailContext";
import { useSidebar } from "../ui/sidebar";
import { ActionContext } from "@/context/ActionContext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LucideDownload, PanelsRightBottom, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const { userDetail } = useContext(UserDetailContext);
  const { open, toggleSidebar } = useSidebar();
  const { setAction } = useContext(ActionContext);
  const path = usePathname();

  const isWorkspacePath = path?.includes("workspace");

  const handleActionButton = (actionType) => {
    setAction({
      actionType,
      timeStamp: Date.now(),
    });
  };

  const buttonVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
    hover: { scale: 1.05, boxShadow: "0px 8px 15px rgba(0,0,0,0.2)" },
    tap: { scale: 0.95 },
  };

  const headerVariants = {
    visible: { y: 0, opacity: 1 },
    hidden: { y: -100, opacity: 0 },
  };

  return (
    <AnimatePresence>
      {!open && ( // Only render if the sidebar is not open
        <motion.header
          key="main-header"
          className="sticky top-0 z-50 p-4 flex justify-between items-center border-b border-gray-700 backdrop-blur-sm bg-gray-900/50"
          variants={headerVariants}
          initial="visible"
          animate="visible"
          exit="hidden"
        >
          {/* Logo and Home Link */}
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="Company Logo" 
              width={40} 
              height={40} 
              className="rounded-full"
              style={{ width: 'auto', height: 'auto' }}
            />
            <span className="font-bold text-xl text-white">
              WebEaseAI
            </span>
          </Link>

          {/* User Actions */}
          <AnimatePresence mode="wait">
            {!userDetail?.name ? (
              <motion.div
                key="auth-buttons"
                className="flex gap-5"
                variants={buttonVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <Button
                  variant="ghost"
                  className="text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  Sign In
                </Button>
                <Button className="bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                  Get Started
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="logged-in-actions"
                className="flex gap-4 items-center"
                variants={buttonVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
               
                {isWorkspacePath && (
                  <>
                    <motion.div whileHover="hover" whileTap="tap">
                      <Button
                        variant="ghost"
                        onClick={() => handleActionButton("export")}
                        className="text-gray-300 hover:bg-gray-800 hover:text-blue-400 transition-colors"
                      >
                        <LucideDownload className="mr-2" size={18} /> Export
                      </Button>
                    </motion.div>
                    <motion.div whileHover="hover" whileTap="tap">
                      <Button
                        onClick={() => handleActionButton("deploy")}
                        className="bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <PanelsRightBottom className="mr-2" size={18} /> Deploy
                      </Button>
                    </motion.div>
                  </>
                )}
                {userDetail.picture && (
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Image
                      src={userDetail.picture}
                      alt={`${userDetail.name}'s Profile`}
                      width={40}
                      height={40}
                      className="rounded-full cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all"
                      onClick={toggleSidebar}
                      style={{ width: 'auto', height: 'auto' }}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>
      )}
    </AnimatePresence>
  );
};

export default Header;
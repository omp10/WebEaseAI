"use client";
import { LogOut, Wallet, X } from 'lucide-react';
import React from 'react';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { googleLogout } from '@react-oauth/google';
import { useSidebar } from "../ui/sidebar";
import { motion } from "framer-motion";

function SideBarFooter() {
    const { toggleSidebar, isMobile, setOpen, setOpenMobile } = useSidebar();
    const router = useRouter();

    const logOut = () => {
        googleLogout();
        localStorage.removeItem("user");
        router.push('/');
    };

    const options = [
        {
            name: 'My Subscription',
            icon: Wallet,
            path: '/pricing'
        },
        {
            name: 'Sign Out',
            icon: LogOut,
            action: logOut,
        },
    ];

    const onOptionClick = (option) => {
        // Close the sidebar first
        if (isMobile) {
            setOpenMobile(false);
        } else {
            setOpen(false);
        }

        if (option.path) {
            router.push(option.path);
        } else if (option.action) {
            option.action();
        }
    };

    const handleCloseSidebar = () => {
        if (isMobile) {
            setOpenMobile(false);
        } else {
            setOpen(false);
        }
    };

    const buttonVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { 
            opacity: 1, 
            x: 0, 
            transition: { 
                type: "spring", 
                stiffness: 100, 
                damping: 10 
            } 
        },
        hover: { scale: 1.05, backgroundColor: "#1f2937" },
        tap: { scale: 0.95 }
    };

    return (
        <div className="p-2 mb-10 border-t border-gray-700 pt-4">
            {/* Close Button */}
            <div className="absolute top-2 right-2">
                <motion.button
                    onClick={handleCloseSidebar} // <-- Call the new handler
                    className="p-2 rounded-full text-gray-400 hover:bg-gray-700 transition-colors"
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                >
                    <X size={20} />
                </motion.button>
            </div>
            {/* Buttons List */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    visible: {
                        transition: {
                            staggerChildren: 0.1
                        }
                    }
                }}
            >
                {options.map((option, index) => (
                    <motion.div
                        key={index}
                        variants={buttonVariants}
                    >
                        <Button
                            onClick={() => onOptionClick(option)}
                            variant="ghost"
                            className="w-full flex justify-start my-3 transition-colors text-gray-300 hover:text-white hover:bg-gray-800"
                        >
                            <option.icon className="mr-3 text-blue-400" size={20} />
                            <span className="font-medium">{option.name}</span>
                        </Button>
                    </motion.div>
                ))}
            </motion.div>
        </div>
    );
}

export default SideBarFooter;
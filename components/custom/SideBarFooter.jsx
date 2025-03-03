import { LogOut, Wallet } from 'lucide-react'
import React from 'react'
import { Button } from '../ui/button'
import { useRouter } from 'next/navigation'
import { googleLogout } from '@react-oauth/google';
import { useSidebar } from "../ui/sidebar";

function SideBarFooter() {
    const {toggleSidebar}=useSidebar();
    const router = useRouter();

    const logOut = () => {
        googleLogout(); // Google sign-out
        localStorage.removeItem("user"); // Clear user session (if stored)
        router.push('/'); // Redirect to login page
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
            action: logOut, // Calls logOut() function
        },
    ];

    const onOptionClick = (option) => {
        toggleSidebar();
        if (option.path) {
            router.push(option.path);
        } else if (option.action) {
            option.action();
        }
    };

    return (
        <div className="p-2 mb-10">
            {options.map((option, index) => (
                <Button 
                    onClick={() => onOptionClick(option)} 
                    key={index} 
                    variant="ghost" 
                    className="w-full flex justify-start my-3"
                >
                    <option.icon className="mr-2"/>
                    {option.name}
                </Button>
            ))}
        </div>
    );
}

export default SideBarFooter;

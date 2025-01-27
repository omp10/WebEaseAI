"use client";

import React, { useContext } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Colors from "@/data/Colors";
import { UserDetailContext } from "@/context/UserDetailContext";
import { useSidebar } from "../ui/sidebar";
import { ActionContext } from "@/context/ActionContext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LucideDownload } from "lucide-react";

const Header = () => {
  const { userDetail } = useContext(UserDetailContext);
  const { toggleSidebar } = useSidebar();
  const { setAction } = useContext(ActionContext);
  const path = usePathname();

  const isWorkspacePath = path?.includes("workspace");

  const handleActionButton = (actionType) => {
    setAction({
      actionType,
      timeStamp: Date.now(),
    });
  };

  return (
    <div className="p-4 flex justify-between items-center border-b">
      {/* Logo */}
      <Link href="/">
        <Image src="/logo1.jpg" alt="Company Logo" width={40} height={40} />
      </Link>

      {/* User Actions */}
      {!userDetail?.name ? (
        <div className="flex gap-5">
          <Button variant="ghost">Sign In</Button>
          <Button className="bg-blue-500 text-white hover:bg-blue-600">
            Get Started
          </Button>
        </div>
      ) : (
        isWorkspacePath && (
          <div className="flex gap-2 items-center">
            {/* Export Button */}
            <Button variant="ghost" onClick={() => handleActionButton("export")}>
              <LucideDownload className="mr-2" /> Export
            </Button>

            {/* Deploy Button */}
            <Button
              onClick={() => handleActionButton("deploy")}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              Deploy
            </Button>

            {/* User Profile Picture */}
            {userDetail.picture && (
              <Image
                src={userDetail.picture}
                alt={`${userDetail.name}'s Profile`}
                width={40}
                height={40}
                className="rounded-full w-[30px] cursor-pointer"
                onClick={toggleSidebar}
              />
            )}
          </div>
        )
      )}
    </div>
  );
};

export default Header;

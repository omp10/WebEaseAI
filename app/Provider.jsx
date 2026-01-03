"use client";

import React, { useContext, useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import Header from "@/components/custom/Header";
import { MessagesContext } from "@/context/MessagesContext";
import { UserDetailContext } from "@/context/UserDetailContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSideBar from "@/components/custom/AppSideBar";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { ActionContext } from "@/context/ActionContext";
import { ModelSelectionProvider } from "@/context/ModelSelectionContext";
import { useRouter } from "next/navigation";
import { Toaster } from 'react-hot-toast';

function Provider({ children }) {
  const [messages, setMessages] = useState();
  const [userDetail, setUserDetail] = useState();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const convex = useConvex();
  const [action, setAction] = useState();
  const router = useRouter();

  useEffect(() => {
    IsAuthenticated();
  }, []); // Only run once on mount

  const IsAuthenticated = async () => {
    if (typeof window === "undefined") {
      setIsCheckingAuth(false);
      return;
    }

    setIsCheckingAuth(true);
    
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) {
        setIsCheckingAuth(false);
        return; // No user in localStorage - user is not signed in
      }

      let user;
      try {
        user = JSON.parse(userStr);
      } catch (parseError) {
        console.error("Error parsing user from localStorage:", parseError);
        localStorage.removeItem("user");
        setIsCheckingAuth(false);
        return;
      }

      if (!user || !user.email) {
        localStorage.removeItem("user");
        setIsCheckingAuth(false);
        return;
      }

      // Fetch user details from database
      const result = await convex.query(api.users.GetUser, { email: user.email });
      if (!result) {
        // User not found in database - clear localStorage
        localStorage.removeItem("user");
        setIsCheckingAuth(false);
        return;
      }
      
      // User found - set userDetail
      setUserDetail(result);
    } catch (error) {
      console.error("Error fetching user:", error);
      // On error, don't clear localStorage - might be a temporary network issue
      // Just don't set userDetail
    } finally {
      setIsCheckingAuth(false);
    }
  };

  return (
    <div>
      <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID_KEY}>
        <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID }}>
          <UserDetailContext.Provider value={{ userDetail, setUserDetail }}>
            <MessagesContext.Provider value={{ messages, setMessages }}>
              <ActionContext.Provider value={{ action, setAction }}>
                <ModelSelectionProvider>
                  <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                    <SidebarProvider defaultOpen={false} className="flex flex-col">
                      <Header />
                      <Toaster />
                      {children}
                      <div className="absolute"> 
                        <AppSideBar />
                      </div>
                    </SidebarProvider>
                  </NextThemesProvider>
                </ModelSelectionProvider>
              </ActionContext.Provider>
            </MessagesContext.Provider>
          </UserDetailContext.Provider>
        </PayPalScriptProvider>
      </GoogleOAuthProvider>
    </div>
  );
}

export default Provider;

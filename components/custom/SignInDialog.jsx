"use client";
import React, { useContext } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Lookup from "@/data/Lookup";
import { Button } from "../ui/button";
import { useGoogleLogin } from "@react-oauth/google";
import { UserDetailContext } from "@/context/UserDetailContext";
import axios from "axios";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { v4 as uuidv4 } from "uuid";

function SignInDialog({ openDialog, closeDialog }) {
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const CreateUser = useMutation(api.users.CreateUser);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log(tokenResponse);
      const userInfo = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: "Bearer" + tokenResponse?.access_token } }
      );

      console.log(userInfo);
      const user = userInfo.data;
      await CreateUser({
        name: user?.name,
        email: user?.email,
        picture: user?.picture,
        uid: uuidv4(),
      });
      
      if(typeof window!==undefined){
        localStorage.setItem('user',JSON.stringify(user))
      }

      setUserDetail(userInfo?.data);
      closeDialog(false);
    },

    onError: (errorResponse) => console.log(errorResponse),
  });

  return (
    <Dialog open={openDialog} onOpenChange={closeDialog}>
      <DialogContent>
        <DialogHeader>
          {/* Use DialogTitle for the heading */}
          <DialogTitle className="text-center justify-center items-center">
            {Lookup?.SIGNIN_HEADING || "Welcome"}
          </DialogTitle>
          {/* Use DialogDescription only for brief descriptions */}
          <DialogDescription className="text-center justify-center items-center">
            {Lookup?.SIGNIN_SUBHEADING || "Sign in to access your account."}
          </DialogDescription>
        </DialogHeader>
        {/* Main content should be outside of DialogDescription */}
        <div className="flex flex-col items-center justify-center gap-3">
          <Button
            className="bg-blue-500 text-white hover:bg-blue-400 mt-1"
            onClick={googleLogin}
          >
            Sign In with Google
          </Button>
          <p className="text-sm text-gray-500 text-center mt-2">
            {Lookup?.SIGNIn_AGREEMENT_TEXT ||
              "By signing in, you agree to our terms and conditions."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SignInDialog;

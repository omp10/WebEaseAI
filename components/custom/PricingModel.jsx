"use client";
import Lookup from "@/data/Lookup";
import React, { useContext, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { UserDetailContext } from "@/context/UserDetailContext";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSidebar } from "../ui/sidebar";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { toast } from "sonner"; // Using sonner for consistent toasts

function PricingModel() {
  const { userDetail, setUserDetail } = useContext(UserDetailContext);
  const [selectedOption, setSelectedOption] = useState(null);
  const UpdateToken = useMutation(api.users.UpdateToken);
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    // Ensure the sidebar is closed
    toggleSidebar(false);
  }, [toggleSidebar]);

  const onPaymentSuccess = async () => {
    if (!selectedOption) {
      toast.error("Please select a pricing option.");
      return;
    }

    try {
      const token = userDetail?.token + Number(selectedOption?.value);
      
      // Update tokens in the database
      await UpdateToken({
        token: token,
        userId: userDetail?.id,
      });

      // Update local state to reflect the new token count
      setUserDetail(prev => ({
        ...prev,
        token: token
      }));

      toast.success(`Payment successful! ${selectedOption.tokens} tokens have been added to your account.`);
      setSelectedOption(null); // Clear selected option
    } catch (error) {
      console.error("Failed to update tokens:", error);
      toast.error("Failed to update tokens. Please contact support.");
    }
  };

  // Framer motion variants
  const cardVariants = {
    initial: { opacity: 0, y: 50, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    hover: { scale: 1.05, boxShadow: "0px 10px 30px rgba(59, 130, 246, 0.2)" },
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <motion.h1 
        className="text-4xl sm:text-5xl font-extrabold text-center mb-6 text-white"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Choose a plan that works for you
      </motion.h1>
      <motion.p 
        className="text-lg text-gray-400 text-center mb-12 max-w-2xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        Select from our flexible pricing options to get more tokens and unlock the full potential of our AI assistant.
      </motion.p>
      
      <motion.div
        className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
        gap-8 w-full"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {Lookup.PRICING_OPTIONS.map((pricing, index) => (
          <motion.div
            key={index}
            className={`border p-8 flex rounded-2xl flex-col gap-4 transition-all duration-300
            ${selectedOption?.name === pricing.name ? "border-blue-500 bg-gray-800" : "border-gray-700 hover:border-gray-600 bg-gray-900"}
            `}
            variants={cardVariants}
            whileHover="hover"
          >
            <div className="flex flex-col gap-2">
              <h2 className="font-bold text-2xl text-white">{pricing.name}</h2>
              <h2 className="font-medium text-lg text-blue-400">
                {pricing.tokens} Tokens
              </h2>
            </div>
            <p className="text-gray-400 font-light min-h-[50px]">{pricing.desc}</p>
            <div className="flex-1 flex items-end">
              <h2 className="font-bold text-center text-5xl text-white mt-6 w-full">
                ${pricing.price}
              </h2>
            </div>
            
            <PayPalButtons
              className="mt-6"
              onClick={() => {
                setSelectedOption(pricing);
              }}
              style={{ layout: "horizontal", color: "gold", tagline: false, shape: "pill" }}
              onApprove={() => onPaymentSuccess()}
              onCancel={() => toast.info("Payment has been cancelled.")}
              createOrder={(data, actions) => {
                return actions.order.create({
                  purchase_units: [
                    {
                      amount: {
                        value: pricing.price,
                        currency_code: "USD",
                      },
                    },
                  ],
                });
              }}
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default PricingModel;
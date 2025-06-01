import React from "react";
import { Box } from "@mui/material";
import appConfig from "../../config/appConfig";

const TypingIndicator = () => (
  <Box sx={{ mb: 4, px: { xs: 2, md: 6 } }}>
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
      {[0, 0.15, 0.3].map((delay, index) => (
        <Box
          key={index}
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: appConfig.theme.typingIndicatorColor,
            animation: "typing 1.4s infinite ease-in-out",
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </Box>
    {/* Animation Styles */}
    <style>
      {`
        @keyframes typing {
          0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.4;
          }
          30% {
              transform: translateY(-4px);
              opacity: 1;
          }
        }
      `}
    </style>
  </Box>
);

export default TypingIndicator;

import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import appConfig from "../../config/appConfig";
import { useChat } from "../../context/ChatContext";

const ChatHeader = () => {
  const { handleNewChat } = useChat();
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        px: 3,
        py: 2,
        borderBottom: `1px solid ${appConfig.theme.borderColor}`,
      }}
    >
      <Typography
        variant="body2"
        color={appConfig.theme.secondaryTextColor}
        sx={{ fontSize: "0.875rem" }}
      >
        {appConfig.uiText.headerUrl}
      </Typography>
      
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Chip
          label={appConfig.uiText.headerChip}
          size="small"
          sx={{
            backgroundColor: appConfig.theme.lightBgColor,
            color: appConfig.theme.secondaryTextColor,
            border: `1px solid ${appConfig.theme.borderColor}`,
            fontSize: "0.75rem",
          }}
        />
        
        <Box
          sx={{
            backgroundColor: appConfig.theme.primaryColor,
            color: "white",
            px: 2.5,
            py: 1,
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: appConfig.theme.primaryHoverColor,
              transform: "translateY(-1px)",
            },
          }}
          onClick={handleNewChat}
        >
          {appConfig.uiText.newChatButton}
        </Box>
      </Box>
    </Box>
  );
};

export default ChatHeader;

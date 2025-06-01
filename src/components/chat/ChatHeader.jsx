import React from "react";
import { Box, IconButton, Button } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import appConfig from "../../config/appConfig";
import { useChat } from "../../context/ChatContext";

const ChatHeader = () => {
  const { handleNewChat } = useChat();

  const handleBack = () => {
    console.log("Back button clicked");
  };

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
      {/* Left side - Back button */}
      <IconButton
        onClick={handleBack}
        sx={{ color: appConfig.theme.secondaryTextColor }}
      >
        <ArrowBackIcon />
      </IconButton>

      {/* Right side - New Chat button */}
      <Button
        onClick={handleNewChat}
        startIcon={<AddIcon fontSize="small" />}
        variant="outlined"
        size="small"
        sx={{
          borderRadius: 2,
        }}
      >
        {appConfig.uiText.newChatButton}
      </Button>
    </Box>
  );
};

export default ChatHeader;
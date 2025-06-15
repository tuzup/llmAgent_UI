import React from "react";
import { Box, IconButton, Button, Stack, Divider, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import appConfig from "../../config/appConfig";
import { useChat } from "../../context/ChatContext";
import { History, Save } from "@mui/icons-material";

const ChatHeader = () => {
  const { handleNewChat, toggleSavedDrawer, savedDrawerOpen, toggleSaveChatModal, messages } = useChat();

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
      <Tooltip title="Back">
        <IconButton
          onClick={handleBack}
          sx={{ color: appConfig.theme.secondaryTextColor }}
        >
          <ArrowBackIcon />
        </IconButton>
      </Tooltip>

      {/* Right side - New Chat button */}
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        spacing={2}
      >
        {messages.length > 0 &&
          <Tooltip title={appConfig.uiText.saveToolTip || "Save Current Chat"}>
            <IconButton
              onClick={toggleSaveChatModal}
              sx={{
                color: appConfig.theme.primaryColor,
                borderRadius: 2,
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                },
              }}>
              <Save fontSize="small" />
            </IconButton>
          </Tooltip>}
        <Tooltip title={savedDrawerOpen ? appConfig.uiText.hideSavedToolTip : appConfig.uiText.showSavedToolTip}>
          <IconButton
            onClick={toggleSavedDrawer}
            sx={{
              color: savedDrawerOpen ? appConfig.theme.complementaryColor : appConfig.theme.primaryColor,
              borderRadius: 2,
              backgroundColor: savedDrawerOpen ? appConfig.theme.primaryColor : "transparent",
              "&:hover": {
                backgroundColor: savedDrawerOpen ? appConfig.theme.primaryColor : "rgba(0, 0, 0, 0.04)",
              },
            }}>
            <History fontSize="small" />
          </IconButton>
        </Tooltip>
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
      </Stack>
    </Box>
  );
};

export default ChatHeader;
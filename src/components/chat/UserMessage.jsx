import React from "react";
import { Box, Paper } from "@mui/material";
import appConfig from "../../config/appConfig";

const UserMessage = ({ message }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "flex-end",
      mb: 3,
      px: { xs: 2, md: 6 },
    }}
  >
    <Paper
      elevation={0}
      sx={{
        p: 2,
        backgroundColor: appConfig.theme.userMessageBg,
        color: appConfig.theme.userMessageText,
        borderRadius: "18px",
        borderBottomRightRadius: "6px",
        maxWidth: "65%",
        wordBreak: "break-word",
        border: `1px solid ${appConfig.theme.borderColor}`,
        fontSize: appConfig.layout.chatInput.fontSize || "1rem",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap"
      }}
    >
      {message.content}
    </Paper>
  </Box>
);

export default UserMessage;

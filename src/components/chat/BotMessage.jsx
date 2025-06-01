import React from "react";
import { Box } from "@mui/material";
import appConfig from "../../config/appConfig";

// Import response type components
import MarkdownResponse from "./responses/MarkdownResponse";
import ChartResponse from "./responses/ChartResponse";
import GridResponse from "./responses/GridResponse";

const BotMessage = ({ message }) => {
  const renderResponseByType = () => {
    switch (message.responseType) {
      case "chart":
        return <ChartResponse content={message.content} />;
      case "grid":
        return <GridResponse content={message.content} />;
      case "markdown":
      default:
        return <MarkdownResponse content={message.content} />;
    }
  };

  return (
    <Box
      sx={{
        mb: 4,
        px: { xs: 2, md: 6 },
      }}
    >
      {renderResponseByType()}
    </Box>
  );
};

export default BotMessage;
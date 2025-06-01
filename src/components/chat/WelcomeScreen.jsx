import React from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import appConfig from "../../config/appConfig";
import { useChat } from "../../context/ChatContext";

const WelcomeScreen = () => {
  const { handleSendMessage } = useChat();
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        px: 4,
        py: 7,
      }}
    >
      <Typography
        variant="body1"
        color={appConfig.theme.secondaryTextColor}
        sx={{ mb: 1, fontSize: "27px"}}
      >
        {appConfig.uiText.welcomeScreen.greeting}
      </Typography>

      <Typography
        variant="h4"
        sx={{
          fontWeight: 600,
          mb: 8,
          color: appConfig.theme.userMessageText,
          fontSize: { xs: "1.75rem", md: "2.25rem" },
          textAlign: "center",
        }}
      >
        {appConfig.uiText.welcomeScreen.headline}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 2,
          maxWidth: 900,
          width: "100%",
        }}
      >
        {appConfig.uiText.suggestions.map((card, index) => (
          <Card
            key={index}
            elevation={0}
            sx={{
              cursor: "pointer",
              transition: "all 0.2s ease",
              border: `1px solid ${appConfig.theme.borderColor}`,
              borderRadius: "12px",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 8px 25px rgba(0,0,0,0.06)",
                borderColor: appConfig.theme.borderColorHover,
              },
            }}
            onClick={() => handleSendMessage(card.title)}
          >
            <CardContent sx={{ p: 3 }}>
              {card.icon && (
                <Box sx={{ mb: 1.5, color: card.color || appConfig.theme.primaryColor }}>
                  {card.icon}
                </Box>
              )}
              <Typography
                variant="body2"
                sx={{
                  color: "#475569",
                  lineHeight: 1.6,
                  fontSize: "0.875rem",
                }}
              >
                {card.title}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default WelcomeScreen;

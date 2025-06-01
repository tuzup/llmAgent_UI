import React from "react";
import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Sidebar from "./components/Sidebar";
import ChatArea from "./components/ChatArea";
import appConfig from "./config/appConfig";
import { ChatProvider } from "./context/ChatContext";

// Create theme using config values
const theme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#f5f5f5",
    },
    primary: {
      main: appConfig.theme.primaryColor,
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ChatProvider>
        <Box sx={{ display: "flex", height: "100vh", width: "100vw" }}>
          <Sidebar />
          <ChatArea />
        </Box>
      </ChatProvider>
    </ThemeProvider>
  );
}

export default App;

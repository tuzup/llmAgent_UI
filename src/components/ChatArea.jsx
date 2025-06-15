import React from "react";
import { Box, Collapse, Container, Drawer } from "@mui/material";
import appConfig from "../config/appConfig";
import { useChat } from "../context/ChatContext";

// Import modular components
import ChatHeader from "./chat/ChatHeader";
import WelcomeScreen from "./chat/WelcomeScreen";
import UserMessage from "./chat/UserMessage";
import BotMessage from "./chat/BotMessage";
import TypingIndicator from "./chat/TypingIndicator";
import ChatInput from "./chat/ChatInput";
import SavedChat from "./chat/SavedChat";
import SaveChatModal from "./chat/SaveChatModal";


/**
 * ChatArea component renders the main chat interface, including the header, chat messages,
 * welcome screen, typing indicator, and input box. It uses the chat context for state management.
 *
 * ## Configuration
 * - The layout and appearance of the chat area can be customized via `appConfig` (e.g., `appConfig.layout.chatInput.bottomPadding`).
 * - To adjust the chat input's bottom padding, edit the `bottomPadding` value in the configuration file at `src/config/appConfig.js`.
 * - The chat area background color and other styles can be modified in the `sx` prop of the main `<Box>` container.
 *
 * ## Editing Chat Functionality
 * - To change how messages are rendered, edit the `UserMessage` and `BotMessage` components.
 * - To customize the welcome screen, modify the `WelcomeScreen` component.
 * - The chat header (with new chat functionality) is handled by the `ChatHeader` component; update it to change header actions or appearance.
 * - The chat input logic + autocomplete is encapsulated in the `ChatInput` component; edit this to change how users send messages.
 * 
 * ## Chat Context
 * The chat context provides the necessary state and functions for managing chat messages, user input, and other chat-related features.
 * The Api calls and message handling logic are encapsulated within the `ChatContext` provider, allowing for easy access throughout the application.
 *
 */

const ChatArea = () => {
    const {
        messages,
        isTyping,
        messagesEndRef,
        savedDrawerOpen
    } = useChat();


    return (
        <Box
            sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#ffffff",
                minHeight: "100vh",
                position: "relative",
            }}
        >
            {/* Header Component */}
            <ChatHeader />

            {/* Save Chat Modal */}
            <SaveChatModal />

            {/* Content area with messages and drawer */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "row",
                    flex: 1,
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                 {/* Chat History Drawer  */}
                <Drawer
                    variant="persistent"
                    anchor="left"
                    open={savedDrawerOpen}
                    sx={{
                        width: savedDrawerOpen ? appConfig.layout?.savedChat?.drawerWidth || 300 : 0,
                        flexShrink: 0,
                        position: "relative",
                        '& .MuiDrawer-paper': {
                            width: appConfig.layout?.savedChat?.drawerWidth || 300,
                            position: "relative",
                            height: "100%",
                            borderRight: `1px solid ${appConfig.theme.borderColor}`,
                            boxSizing: 'border-box',
                        },
                    }}
                >
                    <SavedChat/>
                </Drawer>

                {/* Main Chat Content */}
                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "#ffffff",
                        transition: theme => theme.transitions.create('width', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.leavingScreen,
                        }),
                        width: savedDrawerOpen ? `calc(100% - ${appConfig.layout?.savedChat?.drawerWidth || 300}px)` : '100%',
                        overflow: "hidden",
                    }}
                >
                    {/* Chat Messages */}
                    <Box sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        overflowY: "auto",
                    }}>
                        {messages.length === 0 ? (
                            /* Welcome Screen Component */
                            <WelcomeScreen />
                        ) : (
                            /* Chat Messages */
                            <Box
                                sx={{
                                    flex: 1,
                                    display: "flex",
                                    justifyContent: "center",
                                    py: 4,
                                }}
                            >
                                <Container
                                    maxWidth="md"
                                    disableGutters={true}
                                    sx={{ pb: appConfig.layout?.chatInput?.bottomPadding || 5 }}
                                >
                                    {messages.map((msg) =>
                                        msg.role === "user" ? (
                                            <UserMessage key={msg.id} message={msg} />
                                        ) : (
                                            <BotMessage key={msg.id} message={msg} />
                                        )
                                    )}

                                    {isTyping &&
                                        <Box sx={{ pb: 5 }}>
                                            <TypingIndicator />
                                        </Box>}
                                    <div ref={messagesEndRef} />
                                </Container>
                            </Box>
                        )}
                    </Box>

                    {/* Input Component - Fixed at bottom */}
                    <ChatInput />
                </Box>
            </Box>
        </Box>
    );
};

export default ChatArea;

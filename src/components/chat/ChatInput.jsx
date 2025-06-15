import React, { useState, useRef } from "react";
import { Box, IconButton, InputBase, Typography, Chip } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import appConfig from "../../config/appConfig";
import { useChat } from "../../context/ChatContext";

const ChatInput = () => {
    const { handleSendMessage: sendMessage, isTyping, savedDrawerOpen } = useChat();
    const [message, setMessage] = useState("");
    const [suggestion, setSuggestion] = useState("");
    const [additionalSuggestions, setAdditionalSuggestions] = useState([]); // Store additional matches
    const [showTabHint, setShowTabHint] = useState(false);
    const inputRef = useRef(null);

    // Find suggestion based on current input
    const findSuggestion = (input) => {
        // Return empty if autocomplete is disabled or input is empty
        if (!appConfig.autocomplete?.enabled || !input.trim()) {
            setAdditionalSuggestions([]);
            return "";
        }

        // Get the last word being typed (after last space)
        const words = input.split(" ");
        const currentWord = words[words.length - 1];

        // Check if word length meets the threshold from config
        const threshold = appConfig.autocomplete?.threshold || 2;
        if (currentWord.length < threshold) {
            setAdditionalSuggestions([]);
            return "";
        }

        // Handle case sensitivity based on config
        const caseSensitive = appConfig.autocomplete?.caseSensitive || false;

        // Find all matches instead of just one
        const matches = [];
        for (const code of appConfig.autocomplete.predefinedCodes) {
            const codeToCompare = caseSensitive ? code : code.toLowerCase();
            const currentToCompare = caseSensitive ? currentWord : currentWord.toLowerCase();

            if (codeToCompare.startsWith(currentToCompare)) {

                if (!appConfig.autocomplete?.suggestions?.enabled) {
                    // If suggestions are disabled, return the suffix directly
                    return code.substring(currentWord.length);
                } else {
                    matches.push(code);
                }

                if (matches.length >= appConfig.autocomplete.suggestions?.maxSuggestions) break;
            }
        }

        // No matches
        if (matches.length === 0) {
            setAdditionalSuggestions([]);
            return "";
        }

        if (matches.length > 1 && appConfig.autocomplete?.suggestions?.enabled) {
            appConfig.autocomplete.suggestions?.skipTop1InList ? setAdditionalSuggestions(matches.slice(1, appConfig.autocomplete?.maxSuggestions)) : setAdditionalSuggestions(matches);
        } else {
            setAdditionalSuggestions([]);
        }

        // Return the top match suggestion suffix for the input field
        return matches[0].substring(currentWord.length);
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setMessage(value);

        const newSuggestion = findSuggestion(value);
        setSuggestion(newSuggestion);

        // Show tab hint only if suggestion exists and tab hint is enabled in config
        const shouldShowHint = !!newSuggestion && appConfig.autocomplete?.tabHintEnabled !== false;
        setShowTabHint(shouldShowHint);
    };

    const handleKeyDown = (e) => {
        // Disable interaction while typing
        if (isTyping) return;

        // Handle tab completion
        if (e.key === "Tab" && suggestion) {
            e.preventDefault();

            const words = message.split(" ");
            const currentWord = words[words.length - 1];
            const completedWord = currentWord + suggestion;

            // Replace the last word with the completed word
            words[words.length - 1] = completedWord;
            setMessage(words.join(" "));
            setSuggestion("");
            setAdditionalSuggestions([]);
            setShowTabHint(false);
        } else if (e.key === "Enter" && !e.shiftKey && message.trim()) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // Handle clicking on alternative suggestion chip
    const handleSuggestionClick = (suggestionText) => {
        const words = message.split(" ");
        const currentWordIndex = words.length - 1;

        // Replace current word with the clicked suggestion
        words[currentWordIndex] = suggestionText;
        const newMessage = words.join(" ");

        setMessage(newMessage);
        setSuggestion("");
        setAdditionalSuggestions([]);
        setShowTabHint(false);

        // Focus back the input and position cursor at the end of the new message
        if (inputRef.current) {
            const textarea = inputRef.current.querySelector('textarea');
            textarea.focus();
            // Position cursor at the end of text
            textarea.selectionStart = newMessage.length;
            textarea.selectionEnd = newMessage.length;

        }

    };

    const handleSendMessage = () => {
        if (isTyping || !message.trim()) return; // Prevent sending if typing or empty message

        sendMessage(message);
        setMessage("");
        setSuggestion("");
        setAdditionalSuggestions([]);
        setShowTabHint(false);
    };

    return (
        <Box
            sx={{
                position: "fixed",
                bottom: 0,
                left: (appConfig.layout?.sidebar?.width || 0) + (savedDrawerOpen ? (appConfig.layout?.savedChat?.drawerWidth || 300) : 0),
                right: 0,
                zIndex: 100,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                transition: "left 0.2s ease-in-out",
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    maxWidth: appConfig.layout?.chatInput?.maxWidth || 800,
                    p: 3,
                    mb: 3,
                    borderRadius: 7,
                    border: `1px solid ${appConfig.theme.borderColor}`,
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                    background: "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(7px)",
                }}
            >
                {/* Tab Hint */}
                <Box
                    sx={{
                        position: "relative",
                        height: showTabHint ? "24px" : "0px",
                        transition: "all 0.2s ease",
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            color: appConfig.theme.successTextColor,
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            opacity: showTabHint ? 1 : 0,
                            transform: showTabHint ? "translateY(0)" : "translateY(-8px)",
                            transition: "all 0.2s ease",
                            pointerEvents: "none",
                        }}
                    >
                        {appConfig.uiText.tabHint}
                    </Typography>
                </Box>

                {/* Additional Suggestions Chips */}
                {additionalSuggestions.length > 0 && (
                    <Box
                        sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 1,
                            mb: 1.5,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {additionalSuggestions.map((suggestedText, index) => (
                            <Chip
                                key={index}
                                label={suggestedText}
                                size="small"
                                onClick={() => handleSuggestionClick(suggestedText)}
                                sx={{
                                    borderRadius: '12px',
                                    backgroundColor: 'rgba(49, 49, 49, 0.1)',
                                    border: `1px solid ${appConfig.theme.borderColor}`,
                                    color: appConfig.theme.secondaryTextColor,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    '&:hover': {
                                        backgroundColor: 'rgba(54, 116, 181, 0.2)',
                                    },
                                }}
                            />
                        ))}
                    </Box>
                )}

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                    }}
                >
                    <Box
                        sx={{
                            position: "relative",
                            flex: 1,
                            borderRadius: "12px",
                            "&:hover": {
                                borderColor: isTyping
                                    ? appConfig.theme.borderColor
                                    : appConfig.theme.borderColorHover,
                            },
                            opacity: isTyping ? 0.7 : 1,
                        }}
                    >
                        <Box sx={{ position: "relative" }}>
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    pointerEvents: "none",
                                    zIndex: 1,
                                    padding: "14px",
                                    fontSize: appConfig.layout.chatInput.fontSize || "1rem",
                                    lineHeight: "1.4375em",
                                    whiteSpace: "pre-wrap",
                                    overflow: "hidden",
                                }}
                            >
                                <span style={{ color: "transparent" }}>{message}</span>
                                <span style={{ color: "#9ca3af" }}>{suggestion}</span>
                            </Box>

                            <InputBase
                                ref={inputRef}
                                fullWidth
                                multiline
                                maxRows={4}
                                placeholder={appConfig.uiText.inputPlaceholder}
                                value={message}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                disabled={appConfig.chat.disableInputWhileTyping ? isTyping : false}
                                sx={{
                                    position: "relative",
                                    zIndex: 2,
                                    padding: "14px",
                                    fontSize: appConfig.layout.chatInput.fontSize || "0.95rem",
                                    backgroundColor: "transparent",
                                    "& .MuiInputBase-input": {
                                        backgroundColor: "transparent",
                                        color: appConfig.theme.userMessageText,
                                    },
                                }}
                            />
                        </Box>
                    </Box>

                    <IconButton
                        onClick={handleSendMessage}
                        disabled={!message.trim() || isTyping}
                        sx={{
                            backgroundColor: message.trim() && !isTyping
                                ? appConfig.theme.primaryColor
                                : appConfig.theme.borderColor,
                            color: "white",
                            borderRadius: 2,
                            width: 45,
                            height: 45,
                            "&:hover": {
                                backgroundColor: message.trim() && !isTyping
                                    ? appConfig.theme.primaryHoverColor
                                    : appConfig.theme.borderColor,
                                transform: message.trim() && !isTyping ? "translateY(-1px)" : "none",
                            },
                            "&:disabled": {
                                color: appConfig.theme.disabledTextColor,
                                backgroundColor: appConfig.theme.borderColor,
                            },
                            transition: "all 0.2s ease",
                        }}
                    >
                        <SendIcon fontSize="medium" />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
};

export default ChatInput;
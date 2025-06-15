import React, { useRef, useState } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Divider,
    IconButton,
    TextField,
    InputAdornment,
    Collapse
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import appConfig from '../../config/appConfig';
import { useChat } from '../../context/ChatContext';
import { KeyboardDoubleArrowLeft, Search } from '@mui/icons-material';
import DeleteChatModal from './DeleteChatModal';

const SavedChat = () => {

    const { savedChats, handleSelectChat, selectedChatId, toggleSavedDrawer, toggleDeleteChatModal, setPendingDeleteChat } = useChat();
    const [hoveredChatId, setHoveredChatId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const inputRef = useRef(null);


    // Function to toggle search visibility
    const toggleSearch = () => {
        // If search is being shown, focus the input field
        if (!showSearch && inputRef.current) {
            setTimeout(() => {
                inputRef.current.focus();
            }, 300);
        }
        // Toggle the search visibility
        setShowSearch(!showSearch);
        if (showSearch) {
            setSearchQuery(""); // Clear search when hiding
        }
    };

    // Function to handle chat deletion
    const handleDeleteChat = (chat) => {
        toggleDeleteChatModal(chat);

    }
    // Filter savedChats based on search query
    const filteredChats = savedChats.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, borderBottom: `1px solid ${appConfig.theme.borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: appConfig.theme.userMessageText }}>
                    {appConfig.uiText.savedChatTitle}
                </Typography>
                <Box>
                    <IconButton onClick={toggleSearch}
                    sx={{
                        backgroundColor: showSearch ? appConfig.theme.primaryColor : 'transparent',
                        color: showSearch ? '#fff' : appConfig.theme.iconColor,
                        '&:hover': {
                            backgroundColor: showSearch ? appConfig.theme.primaryColor : 'rgba(0, 0, 0, 0.04)',
                            color: showSearch ? '#fff' : appConfig.theme.iconColor
                        }
                    }}
                    >
                        <Search />
                    </IconButton>
                    <IconButton
                        onClick={toggleSavedDrawer}
                    >
                        <KeyboardDoubleArrowLeft />
                    </IconButton>
                </Box>
            </Box>

            {/* Search Input */}
            <Collapse in={showSearch} timeout="auto" >
                    <Box sx={{ px: 1, mt: 2, mb: 2 }}>
                        <TextField
                            fullWidth
                            inputRef={inputRef}
                            size="small"
                            placeholder="Search saved chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search fontSize="small" color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 5,
                                    backgroundColor: '#fff',
                                    '&.Mui-focused fieldset': {
                                        borderColor: appConfig.theme.primaryColor,
                                    },
                                },
                                '& .MuiInputLabel-root.Mui-focused': {
                                    color: appConfig.theme.primaryColor,
                                },
                            }}
                        />
                    </Box>

                    <Divider />
                </Collapse>

            <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
                {filteredChats.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: "center" }}>
                        <Typography
                            variant="body2"
                            sx={{ color: appConfig.theme.secondaryTextColor }}
                        >
                            {searchQuery ? appConfig.uiText.noMatchingChats : appConfig.uiText.noSavedChats}
                        </Typography>
                    </Box>
                ) : (
                    filteredChats.map((chat) => (
                        <React.Fragment key={chat.id}>
                            <ListItem
                                disablePadding
                                onMouseEnter={() => setHoveredChatId(chat.id)}
                                onMouseLeave={() => setHoveredChatId(null)}
                                secondaryAction={
                                    (hoveredChatId === chat.id) && (
                                        <IconButton
                                            aria-label="delete"
                                            size="small"
                                            onClick={() => {
                                                handleDeleteChat(chat)
                                            }}
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: appConfig.theme.warningBgColor,
                                                    color: appConfig.theme.complementaryColor
                                                }
                                            }}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    )
                                }
                                sx={{
                                    backgroundColor: (selectedChatId === chat.id) ? appConfig.theme.selectedChatBgColor : 'transparent',
                                }}
                            >
                                <ListItemButton
                                    onClick={() => handleSelectChat(chat.id)}
                                    sx={{
                                        py: 1.5,
                                        px: 2,
                                        backgroundColor: chat.active ? 'rgba(54, 116, 181, 0.08)' : 'transparent',
                                        '&:hover': {
                                            backgroundColor: chat.active ? 'rgba(54, 116, 181, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                                        },
                                    }}
                                >
                                    <ListItemText
                                        primary={chat.title}
                                        secondary={chat.date}
                                        primaryTypographyProps={{
                                            fontWeight: chat.active ? 500 : 400,
                                            color: chat.active ? appConfig.theme.primaryColor : appConfig.theme.userMessageText,
                                            noWrap: hoveredChatId === chat.id ? false : true 
                                        }}
                                        secondaryTypographyProps={{
                                            fontSize: '0.75rem',
                                            color: appConfig.theme.secondaryTextColor
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        </React.Fragment>
                    ))
                )}
            </List>

            <DeleteChatModal/>
        </Box>
    );
};

export default SavedChat;
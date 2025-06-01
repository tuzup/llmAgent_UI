import React from "react";
import {
    Box,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    IconButton,
    Avatar,
} from "@mui/material";
import {
    Close as CloseIcon,
    Chat as ChatIcon,
    Dashboard as DashboardIcon,
    Print as PrintIcon,
    Settings as SettingsIcon,
} from "@mui/icons-material";
import appConfig from "../config/appConfig";

const Sidebar = () => {
    // Map config items to icon components
    const getIconComponent = (iconName) => {
        switch (iconName) {
            case "Chat": return <ChatIcon />;
            case "Dashboard": return <DashboardIcon />;
            case "Print": return <PrintIcon />;
            case "Settings": return <SettingsIcon />;
            default: return <ChatIcon />;
        }
    };
    
    // Generate menu items from configuration
    const menuItems = appConfig.sidebar.menuItems.map(item => ({
        id: item.id,
        icon: getIconComponent(item.icon),
        color: item.active ? appConfig.theme.primaryColor : appConfig.theme.secondaryTextColor,
        active: item.active,
        label: item.label
    }));

    // Don't render if sidebar is disabled in config
    if (!appConfig.layout?.sidebar?.showSidebar) {
        return null;
    }
    
    return (
        <Box
            sx={{
                width: appConfig.layout?.sidebar?.width || 80,
                backgroundColor: "white",
                borderRight: `1px solid ${appConfig.theme.borderColor}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: 2,
            }}
        >
            {/* Logo/Close Icon */}
            <IconButton
                sx={{
                    mb: 3,
                    backgroundColor: "#1f2937",
                    color: "white",
                    "&:hover": {
                        backgroundColor: "#374151",
                    },
                }}
            >
                <CloseIcon />
            </IconButton>

            {/* Menu Items */}
            <List sx={{ width: "100%", px: 1 }}>
                {menuItems.map((item, index) => (
                    <ListItem key={item.id} disablePadding sx={{ mb: 1 }}>
                        <ListItemButton
                            sx={{
                                minHeight: 48,
                                justifyContent: "center",
                                px: 2.5,
                                borderRadius: 2,
                                backgroundColor: item.active ? "#eff6ff" : "transparent",
                                transition: "all 0.2s ease",
                                "&:hover": {
                                    backgroundColor: item.active ? "#eff6ff" : appConfig.theme.lightBgColor,
                                },
                            }}
                        >
                            <ListItemIcon
                                sx={{
                                    minWidth: 0,
                                    justifyContent: "center",
                                    color: item.color,
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>

            {/* User Avatar at Bottom */}
            <Box sx={{ mt: "auto" }}>
                <Avatar
                    sx={{
                        width: 40,
                        height: 40,
                        backgroundColor: appConfig.theme.lightBgColor,
                    }}
                    src={appConfig.sidebar.avatarUrl}
                />
            </Box>
        </Box>
    );
};

export default Sidebar;

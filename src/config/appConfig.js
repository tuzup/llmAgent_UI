import {
  AutoGraph,
  TableChart,
  ManageSearch
} from "@mui/icons-material";
import React from "react";

const appConfig = {
  // Autocomplete settings
  autocomplete: {
    threshold: 2, // Minimum characters before triggering autocomplete
    enabled: true, // Enable/disable autocomplete feature
    caseSensitive: false, // Whether autocomplete should be case sensitive
    suggestions: {
      enabled: true, // Enable/disable suggestions
      maxSuggestions: 10, // Maximum number of suggestions to show
      skipTop1InList: false, // Skip the top suggestion for the suggestions list, it will appear in the input box
    },
    predefinedCodes: [
      "Plot the graph",
      "graph",
      "Cell Id", 
      "Analyze",
      "kdpwx-72",
      "kdpwx-72-H8291",
      "kdpwx-72-H8293",
      "kdpwx-72-H8221",
      "kdpwx-72-H7291",
      "kdpwx-72-H7591",
      "kdpwx-72-H291",
      "rqmzt-19-Z2340",
      "blxvr-08-K5823",
      "ntjqe-57-M1789",
      "zmcya-63-P9027",
      "wtxob-21-T1144",
      "qnevm-90-B6653",
      "sulrk-46-R3208",
      "vhzcn-33-Y4776",
      "jxydp-12-F9981",
    ],
    tabHintEnabled: true, // Whether to show the tab hint message
  },
  
  // UI text configuration
  uiText: {
    welcomeScreen: {
      greeting: "Hi, there 👋",
      headline: "How can I help?",
    },
    suggestions: [
      {
        title: "Help me to analze the all the cell in order number MTF-45_452LDS",
        color: "#6366f1",
        icon: React.createElement(ManageSearch, { sx: { fontSize: 28 } })
      },
      {
        title: "I want to visualize the data of the cell with id kdpwx-72 during the first cycle",
        color: "#8b5cf6",
        icon: React.createElement(TableChart, { sx: { fontSize: 28 } })
      },
      {
        title: "Plot a comparison graph of the cell with id kdpwx-72 and rqmzt-19",
        color: "#06b6d4",
        icon: React.createElement(AutoGraph, { sx: { fontSize: 28 } })
      },
    ],
    inputPlaceholder: "Ask me anything...",
    tabHint: "Press Tab to complete the suggestion",
    disclaimer: "",
    headerUrl: "app.centra.com/dashboard",
    headerChip: "CentraAI 2.0",
    newChatButton: "New Chat",
    savedChatTitle: "Saved Chats",
    showSavedToolTip: "Show Saved Chats",
    hideSavedToolTip: "Hide Saved Chats",
    saveToolTip: "Save Current Chat",
    noSavedChats: "No saved chats found",
    noMatchingChats: "No matching chats found",
  },
  
  // Chat settings
  chat: {
    responseDelay: 1500, // milliseconds before bot responds
    disableInputWhileTyping: false, // Disable input while bot is typing
    // Sample responses for testing
    dummyResponses: [
      "Hello! How can I assist you today?\n\n# Welcome\n\n- This is a list item\n- Another item\n\n> Blockquotes are supported!\n\n---",
      "Here is a code example:\n\n```javascript\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\nconsole.log(greet('World'));\n```\n\n1. Numbered list\n2. Second item\n\n[GitHub](https://github.com)",
      "You can use **bold**, *italic*, ~~strikethrough~~, `inline code`, tables, and images:\n\n| Syntax | Description |\n|--------|-------------|\n| Header | Title       |\n| Paragraph | Text    |\n\n![Alt text](https://via.placeholder.com/40)"
    ],
    gridResponse: {
      gridHeight: 500, // Height of the grid response area in pixels
      pagination: true, // Enable pagination for grid responses
      paginationPageSize: 10, // Number of items per page in grid responses
      paginationAutoPageSize: true, // Automatically adjust page size based on container size, if true paginationPageSize will be ignored
    }
  },

  saveChat:{
    maxTitleLength: 50,
  },
  
  // Theme and styling
  theme: {
    primaryColor: "#3674B5",
    primaryHoverColor: "#5b5bd6",
    secondaryTextColor: "#64748b",
    complementaryColor: "#ffffff",
    successTextColor:'#16a34a',
    lightBgColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderColorHover: "#cbd5e1",
    userMessageBg: "#f8fafc",
    userMessageText: "#1e293b",
    botMessageText: "#334155",
    typingIndicatorColor: "#6366f1",
    warningBgColor: "#B22222",
    selectedChatBgColor: "#F2F2F2",
  },
  
  // Layout settings
  layout: {
    chatInput: {
      position: "fixed", // 'fixed' or 'relative'
      bottomPadding: 10, // Space in the content area for fixed input (in MUI spacing units)
      maxWidth: 800, // Maximum width of the chat input area
      fontSize : "1rem", // Font size for the chat input
    },
    sidebar: {
      width: 80, // Width of the sidebar in pixels
      showSidebar: true, // Whether to show the sidebar or not
    },
    savedChat: {
      drawerWidth: 300, // Width of the saved chat drawer
    }

  },
  
  // Sidebar configuration
  sidebar: {
    menuItems: [
      { id: "chat", label: "Chat", icon: "Chat", active: true },
      { id: "dashboard", label: "Dashboard", icon: "Dashboard", active: false },
      { id: "print", label: "Print", icon: "Print", active: false },
      { id: "settings", label: "Settings", icon: "Settings", active: false },
    ],
    avatarUrl: "/path-to-user-image.jpg"
  }
};

export default appConfig;

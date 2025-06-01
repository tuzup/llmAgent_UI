import React, { createContext, useState, useRef, useEffect, useContext } from "react";
import appConfig from "../config/appConfig";

// Create Chat Context
export const ChatContext = createContext();

// Custom hook for using the chat context
export const useChat = () => useContext(ChatContext);

// Sample Chart Data
const sampleChartOptions = {
    title: {
        text: "Monthly Revenue",
    },
    data: [
        { month: "Jan", revenue: 155000 },
        { month: "Feb", revenue: 129000 },
        { month: "Mar", revenue: 146000 },
        { month: "Apr", revenue: 187000 },
        { month: "May", revenue: 220000 },
        { month: "Jun", revenue: 245000 },
    ],
    series: [
        {
            xKey: "month",
            yKey: "revenue",
            yName: "Revenue ($)",
        },
    ],
};

// Sample Grid Data
const sampleGridOptions = {
    title: "User Data",
    columnDefs: [
        { field: "name", headerName: "Name", sortable: true, filter: true },
        { field: "age", headerName: "Age", sortable: true, filter: true },
        { field: "country", headerName: "Country", sortable: true, filter: true },
        { field: "role", headerName: "Role", sortable: true, filter: true },
    ],
    rowData: [
        { name: "John Doe", age: 35, country: "USA", role: "Developer" },
        { name: "Jane Smith", age: 28, country: "Canada", role: "Designer" },
        { name: "Bob Johnson", age: 42, country: "UK", role: "Manager" },
        { name: "Alice Brown", age: 31, country: "Australia", role: "Product Owner" },
        { name: "Charlie Wilson", age: 37, country: "Germany", role: "Tester" },
        { name: "Jane Smith", age: 28, country: "Canada", role: "Designer" },
        { name: "Bob Johnson", age: 42, country: "UK", role: "Manager" },
        { name: "Alice Brown", age: 31, country: "Australia", role: "Product Owner" },
        { name: "Charlie Wilson", age: 37, country: "Germany", role: "Tester" },
        { name: "Jane Smith", age: 28, country: "Canada", role: "Designer" },
        { name: "Bob Johnson", age: 42, country: "UK", role: "Manager" },
        { name: "Alice Brown", age: 31, country: "Australia", role: "Product Owner" },
        { name: "Charlie Wilson", age: 37, country: "Germany", role: "Tester" },
        { name: "Jane Smith", age: 28, country: "Canada", role: "Designer" },
        { name: "Bob Johnson", age: 42, country: "UK", role: "Manager" },
        { name: "Alice Brown", age: 31, country: "Australia", role: "Product Owner" },
        { name: "Charlie Wilson", age: 37, country: "Germany", role: "Tester" },
    ],
};

// Chat Context Provider Component
export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom whenever messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSendMessage = (messageText) => {
        const userMessage = {
            id: Date.now(),
            text: messageText,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsTyping(true);

        // Simulate response with configured delay
        setTimeout(() => {
            // Generate a random response type (for demo purposes)
            const responseTypes = ["markdown", "chart", "grid"];
            const randomType = responseTypes[Math.floor(Math.random() * responseTypes.length)];

            let botMessage;

            if (randomType === "markdown") {
                // Use a markdown response from config
                const randomResponse =
                    appConfig.chat.dummyResponses[
                    Math.floor(Math.random() * appConfig.chat.dummyResponses.length)
                    ];

                botMessage = {
                    id: Date.now() + 1,
                    responseType: "markdown",
                    content: randomResponse,
                    sender: "bot",
                    timestamp: new Date(),
                };
            }
            else if (randomType === "chart") {
                // Use a chart response
                botMessage = {
                    id: Date.now() + 1,
                    responseType: "chart",
                    content: {
                        chartType: "column", // or 'bar', 'line', 'pie', etc.
                        chartOptions: sampleChartOptions,
                    },
                    sender: "bot",
                    timestamp: new Date(),
                };
            }
            else if (randomType === "grid") {
                // Use a grid response
                botMessage = {
                    id: Date.now() + 1,
                    responseType: "grid",
                    content: sampleGridOptions,
                    sender: "bot",
                    timestamp: new Date(),
                };
            }

            setMessages((prev) => [...prev, botMessage]);
            setIsTyping(false);
        }, appConfig.chat.responseDelay);
    };

    const handleNewChat = () => {
        setMessages([]);
        setIsTyping(false);
    };

    // Values to be exposed through the context
    const contextValue = {
        messages,
        isTyping,
        messagesEndRef,
        handleSendMessage,
        handleNewChat,
    };

    return (
        <ChatContext.Provider value={contextValue}>
            {children}
        </ChatContext.Provider>
    );
};

export default ChatProvider;
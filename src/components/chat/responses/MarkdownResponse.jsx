import React from "react";
import ReactMarkdown from "react-markdown";
import { Box } from "@mui/material";
import appConfig from "../../../config/appConfig";

const MarkdownResponse = ({ content }) => {
    return (
        <Box
            sx={{
                lineHeight: 1.8,
                color: appConfig.theme.botMessageText,
                fontSize: "0.95rem",
                fontWeight: 400,
                "& strong": {
                    fontWeight: 600,
                    color: appConfig.theme.userMessageText,
                },
                "& p": {
                    marginTop: 0,
                    marginBottom: 2,
                },
                "& ul, & ol": {
                    paddingLeft: 2,
                },
                "& code": {
                    backgroundColor: "#f1f5f9",
                    padding: "2px 4px",
                    borderRadius: 1,
                    fontSize: "0.9em",
                },
                "& pre": {
                    backgroundColor: "#f8fafc",
                    padding: 2,
                    borderRadius: 1,
                    overflow: "auto",
                    border: `1px solid ${appConfig.theme.borderColor}`,
                },
                "& h1, & h2, & h3, & h4, & h5, & h6": {
                    color: appConfig.theme.userMessageText,
                    marginTop: 2,
                    marginBottom: 1,
                },
            }}
        >
            <ReactMarkdown>{content}</ReactMarkdown>
        </Box>
    );
};

export default MarkdownResponse;
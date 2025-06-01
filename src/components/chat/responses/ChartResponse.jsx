import React from "react";
import { Box, Typography } from "@mui/material";
import appConfig from "../../../config/appConfig";
import { AgCharts } from "ag-charts-react";


const ChartResponse = ({ content }) => {
    const { chartType, chartOptions } = content;

    return (
        <Box
            sx={{
                width: "100%",
                my: 2,
                border: `1px solid ${appConfig.theme.borderColor}`,
                borderRadius: 2,
                overflow: "hidden",
            }}
        >
            {chartOptions.title?.text && (
                <Typography
                    variant="subtitle1"
                    sx={{
                        p: 2,
                        borderBottom: `1px solid ${appConfig.theme.borderColor}`,
                        fontWeight: 500,
                    }}
                >
                    {chartOptions.title.text}
                </Typography>
            )}
            <Box sx={{ height: 350, p: 2 }}>
                <AgCharts options={chartOptions} />
            </Box>
        </Box>
    );
};

export default ChartResponse;
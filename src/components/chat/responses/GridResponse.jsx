import React, { useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import { Box, Typography } from "@mui/material";


import {
    ClientSideRowModelModule,
    ModuleRegistry,
    PaginationModule,
    themeQuartz,
    ColumnAutoSizeModule,
    AllCommunityModule,
    ValidationModule
} from "ag-grid-community";
import appConfig from "../../../config/appConfig";

// Register required modules
ModuleRegistry.registerModules([
    PaginationModule,
    ClientSideRowModelModule,
    ColumnAutoSizeModule,
    ValidationModule  ,
    AllCommunityModule 
]);

const GridResponse = ({ content }) => {
    const { columnDefs, rowData, title } = content;
    const containerRef = useRef(null);

    // Simplified container style
    const containerStyle = {
        width: "100%",
        height: appConfig.chat.gridResponse.gridHeight || 400,
        marginBottom: 0,
        display: "block"
    };

    return (
        <Box
            ref={containerRef}
            sx={{
                width: "100%",
                my: 0,
                mb: 0,
                pb: 3,
                overflow: 'hidden',
                position: 'relative'
            }}
        >
            {title && (
                <Typography
                    variant="subtitle1"
                    sx={{
                        mb: 1,
                        fontWeight: 500,
                        color: '#334155'
                    }}
                >
                    {title}
                </Typography>
            )}

            <div
                style={containerStyle}
            >
                <AgGridReact
                    sideBar={true}
                    theme={themeQuartz}
                    rowData={rowData}
                    columnDefs={columnDefs}
                    defaultColDef={{
                        flex: 1,
                        minWidth: 100,
                    }}
                    pagination={appConfig.chat.gridResponse.pagination || true}
                    paginationPageSize={appConfig.chat.gridResponse.paginationPageSize || 10}
                    paginationAutoPageSize={appConfig.chat.gridResponse.paginationAutoPageSize || false}
                    domLayout="normal"
                    // onGridReady={(params) => {
                    //     setTimeout(() => {
                    //         params.api.sizeColumnsToFit();
                    //     }, 0);
                    // }}
                />
            </div>

            {/* Empty div fixes the boundary issue */}
            {/* <div style={{ height: 0, overflow: 'hidden', margin: 0, padding: 0 }}></div> */}
        </Box>
    );
};

export default GridResponse;
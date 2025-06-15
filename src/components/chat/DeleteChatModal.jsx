import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button
} from "@mui/material";
import { useChat } from "../../context/ChatContext";

const DeleteChatModal = () => {
    const {
        deleteChatModalOpen,
        toggleDeleteChatModal,
        pendingDeleteChat,
        deleteSavedChat
    } = useChat();

    const handleConfirmDelete = () => {
        console.log("Deleting chat:", pendingDeleteChat);
            deleteSavedChat(pendingDeleteChat.id);
        toggleDeleteChatModal();
    };

    return (
        <Dialog open={deleteChatModalOpen} onClose={toggleDeleteChatModal}>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogContent sx={{ minWidth: 500 }}>
                <DialogContentText>
                    Are you sure you want to delete {pendingDeleteChat ? <b>{pendingDeleteChat.title}</b> : "this chat"}?
                    <br />
                    This action cannot be undone.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={toggleDeleteChatModal}>Cancel</Button>
                <Button onClick={handleConfirmDelete} color="error" autoFocus>
                    Delete
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DeleteChatModal;
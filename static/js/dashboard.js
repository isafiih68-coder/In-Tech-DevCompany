// In.Tech - Dashboard JavaScript

const userList = document.getElementById("user-list");
const userTotal = document.getElementById("user-total");
const message = document.getElementById("dashboard-message");
const refreshButton = document.getElementById("refresh-button");

const messagesTotal = document.getElementById("messages-total");
const learningTotal = document.getElementById("learning-total");
const systemStatus = document.getElementById("system-status");
const systemOverviewStatus = document.getElementById("system-overview-status");
const recentMessages = document.getElementById("recent-messages");

const csrfToken = document.querySelector(
    'meta[name="csrf-token"]'
).content;

const addUserForm = document.getElementById("add-user-form");
const newUserName = document.getElementById("new-user-name");

addUserForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = newUserName.value.trim();

    if (!name || name.length > 100) {
        message.textContent = "Enter a name with up to 100 characters.";
        return;
    }

    try {
        const response = await fetch("/api/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
            },
            body: JSON.stringify({ name: name })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to create user.");
        }

        message.textContent = data.message;
        addUserForm.reset();
        await loadUsers();
    } catch (error) {
        message.textContent = error.message;
    }
});

async function loadUsers() {
    try {
        const response = await fetch("/api/users");
        const data = await response.json();

        if (!response.ok) {
            throw new Error("Unable to load user data.");
        }

        userList.replaceChildren();
        userTotal.textContent = "Total users: " + data.total;

        data.users.forEach(function (user) {
            const row = document.createElement("tr");

            const idCell = document.createElement("td");
            idCell.textContent = user.id;

            const nameCell = document.createElement("td");
            nameCell.textContent = user.name;

            const dateCell = document.createElement("td");
            dateCell.textContent = user.created_at;

            const actionCell = document.createElement("td");

            const editButton = document.createElement("button");
            editButton.textContent = "Edit";
            editButton.addEventListener("click", function () {
                editUser(user.id, user.name);
            });

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", function () {
                removeUser(user.id);
            });

            actionCell.append(editButton, deleteButton);
            row.append(idCell, nameCell, dateCell, actionCell);
            userList.appendChild(row);
        });

    } catch (error) {
        message.textContent = error.message;
    }
}

async function editUser(id, oldName) {
    const newName = prompt("Enter the new name:", oldName);

    if (newName === null) return;

    try {
        const response = await fetch("/api/users/" + id, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
            },
            body: JSON.stringify({ name: newName })
        });

        const data = await response.json();
        message.textContent = data.message || data.error;

        if (response.ok) {
            loadUsers();
        }
    } catch (error) {
        message.textContent = "Unable to update user.";
    }
}

async function removeUser(id) {
    if (!confirm("Delete user ID " + id + "?")) return;

    try {
        const response = await fetch("/api/users/" + id, {
            method: "DELETE",
            headers: {
                "X-CSRF-Token": csrfToken
            }
        });

        const data = await response.json();
        message.textContent = data.message || data.error;

        if (response.ok) {
            loadUsers();
        }
    } catch (error) {
        message.textContent = "Unable to delete user.";
    }
}



// INTECH CONTACT MESSAGES MANAGEMENT START

const messagesList = document.getElementById("messages-list");
const messagesStatus = document.getElementById("messages-status");
const messageSearch = document.getElementById("message-search");
const messagesRefreshButton = document.getElementById("messages-refresh-button");
const messageDialog = document.getElementById("message-dialog");
const messageDialogSubject = document.getElementById("message-dialog-subject");
const messageDialogMeta = document.getElementById("message-dialog-meta");
const messageDialogContent = document.getElementById("message-dialog-content");
const messageDialogClose = document.getElementById("message-dialog-close");

function formatMessageDate(value) {
    const parsedDate = new Date(value);

    return Number.isNaN(parsedDate.getTime())
        ? value
        : parsedDate.toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short"
        });
}

let messagesRequestVersion = 0;

async function loadMessages(query = "") {
    const requestVersion = ++messagesRequestVersion;

    messagesStatus.textContent = "Loading messages...";
    messagesList.replaceChildren();

    try {
        const response = await fetch(
            "/api/messages?q=" + encodeURIComponent(query)
        );
        const data = await response.json();

        if (requestVersion !== messagesRequestVersion) {
            return;
        }

        if (!response.ok) {
            throw new Error(data.error || "Unable to load contact messages.");
        }

        if (!data.messages.length) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");
            cell.colSpan = 6;
            cell.textContent = "No contact messages found.";
            row.appendChild(cell);
            messagesList.appendChild(row);
            messagesStatus.textContent = "0 messages found.";
            return;
        }

        data.messages.forEach(function (item) {
            const row = document.createElement("tr");

            const idCell = document.createElement("td");
            idCell.textContent = item.id;

            const nameCell = document.createElement("td");
            nameCell.textContent = item.name;

            const emailCell = document.createElement("td");
            emailCell.textContent = item.email;

            const subjectCell = document.createElement("td");
            subjectCell.textContent = item.subject;

            const dateCell = document.createElement("td");
            dateCell.textContent = formatMessageDate(item.created_at);

            const actionsCell = document.createElement("td");
            const actions = document.createElement("div");
            actions.className = "message-actions";

            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "message-action-button";
            viewButton.textContent = "View";
            viewButton.addEventListener("click", function () {
                viewContactMessage(item.id);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.className = "message-action-button message-delete-button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", function () {
                removeContactMessage(item.id);
            });

            actions.append(viewButton, deleteButton);
            actionsCell.appendChild(actions);
            row.append(
                idCell,
                nameCell,
                emailCell,
                subjectCell,
                dateCell,
                actionsCell
            );

            messagesList.appendChild(row);
        });

        messagesStatus.textContent =
            data.total + (data.total === 1 ? " message found." : " messages found.");
    } catch (error) {
        if (requestVersion === messagesRequestVersion) {
            messagesStatus.textContent = error.message;
        }
    }
}

async function viewContactMessage(id) {
    try {
        const response = await fetch("/api/messages/" + id);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to open this message.");
        }

        messageDialogSubject.textContent = data.subject;
        messageDialogMeta.textContent =
            "From: " + data.name +
            " | Email: " + data.email +
            " | Received: " + formatMessageDate(data.created_at);

        messageDialogContent.textContent = data.message;

        if (typeof messageDialog.showModal === "function") {
            messageDialog.showModal();
        } else {
            messagesStatus.textContent = "Your browser does not support the message dialog.";
        }
    } catch (error) {
        messagesStatus.textContent = error.message;
    }
}

async function removeContactMessage(id) {
    if (!confirm("Delete contact message ID " + id + "?")) {
        return;
    }

    try {
        const response = await fetch("/api/messages/" + id, {
            method: "DELETE",
            headers: {
                "X-CSRF-Token": csrfToken
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to delete this message.");
        }

        messagesStatus.textContent = data.message;
        await loadMessages(messageSearch.value.trim());
        await loadOverview();
    } catch (error) {
        messagesStatus.textContent = error.message;
    }
}

messagesRefreshButton.addEventListener("click", function () {
    loadMessages(messageSearch.value.trim());
});

messageSearch.addEventListener("input", function () {
    loadMessages(messageSearch.value.trim());
});

messageDialogClose.addEventListener("click", function () {
    messageDialog.close();
});

// INTECH CONTACT MESSAGES MANAGEMENT END


async function loadOverview() {
    try {
        const response = await fetch("/api/dashboard-overview");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to load dashboard overview.");
        }

        const stats = data.statistics;

        messagesTotal.textContent = stats.new_messages;
        learningTotal.textContent = stats.learning_pages;
        systemStatus.textContent = stats.system_status;
        systemOverviewStatus.textContent = stats.system_status;

        recentMessages.replaceChildren();

        if (!data.recent_messages.length) {
            const emptyMessage = document.createElement("p");
            emptyMessage.textContent = "No contact messages have been received yet.";
            recentMessages.appendChild(emptyMessage);
            return;
        }

        data.recent_messages.forEach(function (item) {
            const card = document.createElement("article");
            card.className = "recent-message-item";

            const name = document.createElement("strong");
            name.textContent = item.name;

            const subject = document.createElement("p");
            subject.textContent = item.subject;

            const date = document.createElement("small");
            const parsedDate = new Date(item.created_at);

            date.textContent = Number.isNaN(parsedDate.getTime())
                ? item.created_at
                : parsedDate.toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short"
                });

            card.append(name, subject, date);
            recentMessages.appendChild(card);
        });

    } catch (error) {
        messagesTotal.textContent = "Unavailable";
        learningTotal.textContent = "Unavailable";
        systemStatus.textContent = "Unavailable";
        systemOverviewStatus.textContent = "Unavailable";

        recentMessages.textContent = error.message;
    }
}


// INTECH LEARNING MANAGEMENT START
const learningForm = document.getElementById("learning-content-form");
const learningCategory = document.getElementById("learning-category");
const learningTitle = document.getElementById("learning-title");
const learningContent = document.getElementById("learning-content");
const learningSubmit = document.getElementById("learning-submit");
const learningCancel = document.getElementById("learning-cancel");
const learningStatus = document.getElementById("learning-status");
const learningList = document.getElementById("learning-list");
const learningCount = document.getElementById("learning-count");

let editingContentId = null;

const learningCategoryNames = {
    "web-development": "Web Development",
    "backend-development": "Backend Development",
    "database-management": "Database Management",
    "software-engineering": "Software Engineering"
};

function resetLearningForm() {
    learningForm.reset();
    editingContentId = null;
    learningSubmit.textContent = "Add Learning Content";
    learningCancel.hidden = true;
}

function formatLearningDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short"
        });
}

async function loadLearningContents() {
    learningList.textContent = "Loading learning materials...";

    try {
        const response = await fetch("/api/learning-contents");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to load learning materials.");
        }

        learningList.replaceChildren();
        learningCount.textContent = `${data.total} items`;

        if (!data.contents.length) {
            const empty = document.createElement("p");
            empty.textContent = "No additional learning materials yet.";
            learningList.appendChild(empty);
            return;
        }

        data.contents.forEach(function (item) {
            const card = document.createElement("article");
            card.className = "learning-item";

            const heading = document.createElement("h4");
            heading.textContent = item.title;

            const category = document.createElement("p");
            category.className = "learning-item-category";
            category.textContent =
                learningCategoryNames[item.category] || item.category;

            const date = document.createElement("small");
            date.textContent = "Updated: " + formatLearningDate(item.updated_at);

            const preview = document.createElement("p");
            preview.className = "learning-item-preview";
            preview.textContent = item.content;

            const actions = document.createElement("div");
            actions.className = "learning-item-actions";

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", function () {
                editLearningContent(item.id);
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.addEventListener("click", function () {
                removeLearningContent(item.id, item.title);
            });

            actions.append(editButton, deleteButton);
            card.append(heading, category, date, preview, actions);
            learningList.appendChild(card);
        });
    } catch (error) {
        learningList.textContent = error.message;
        learningCount.textContent = "Unavailable";
    }
}

learningForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const payload = {
        category: learningCategory.value,
        title: learningTitle.value.trim(),
        content: learningContent.value.trim()
    };

    if (!payload.title || !payload.content) {
        learningStatus.textContent = "Complete all learning content fields.";
        return;
    }

    const isEditing = editingContentId !== null;
    const url = isEditing
        ? `/api/learning-contents/${editingContentId}`
        : "/api/learning-contents";

    try {
        learningSubmit.disabled = true;
        learningStatus.textContent = "Saving learning content...";

        const response = await fetch(url, {
            method: isEditing ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": csrfToken
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to save learning content.");
        }

        learningStatus.textContent = data.message;
        resetLearningForm();
        await loadLearningContents();
    } catch (error) {
        learningStatus.textContent = error.message;
    } finally {
        learningSubmit.disabled = false;
    }
});

async function editLearningContent(contentId) {
    try {
        const response = await fetch(`/api/learning-contents/${contentId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to load learning content.");
        }

        editingContentId = data.id;
        learningCategory.value = data.category;
        learningTitle.value = data.title;
        learningContent.value = data.content;
        learningSubmit.textContent = "Save Changes";
        learningCancel.hidden = false;
        learningStatus.textContent = "Editing learning content.";

        learningForm.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        learningStatus.textContent = error.message;
    }
}

async function removeLearningContent(contentId, title) {
    if (!confirm(`Delete "${title}"?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/learning-contents/${contentId}`, {
            method: "DELETE",
            headers: { "X-CSRF-Token": csrfToken }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to delete learning content.");
        }

        if (editingContentId === contentId) {
            resetLearningForm();
        }

        learningStatus.textContent = data.message;
        await loadLearningContents();
    } catch (error) {
        learningStatus.textContent = error.message;
    }
}

learningCancel.addEventListener("click", function () {
    resetLearningForm();
    learningStatus.textContent = "Edit cancelled.";
});
// INTECH LEARNING MANAGEMENT END


refreshButton.addEventListener("click", loadUsers);

loadUsers();
loadOverview();
loadLearningContents();

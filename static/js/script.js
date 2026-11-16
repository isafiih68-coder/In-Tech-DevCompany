// In.Tech - Homepage Interactions

const welcomeButton = document.getElementById("welcome-button");
const welcomePanel = document.getElementById("welcome-panel");

const roadmapButtons = document.querySelectorAll(".roadmap-button");
const technologyButtons = document.querySelectorAll(".technology-select-button");
const roadmapMessage = document.getElementById("roadmap-message");
const roadmapTitle = document.getElementById("roadmap-title");

const form = document.getElementById("contact-message-form");
const message = document.getElementById("form-message");

const csrfMeta = document.querySelector('meta[name="csrf-token"]');
const csrfToken = csrfMeta ? csrfMeta.content : "";

// CLICK ME
welcomeButton.addEventListener("click", function () {
    welcomePanel.hidden = !welcomePanel.hidden;
});

// INTEGRATED TECHNOLOGY AND LEARNING RESOURCES

const learningQueries = {
    HTML: "HTML tutorial official documentation",
    CSS: "CSS tutorial official documentation",
    JavaScript: "JavaScript tutorial official documentation",
    Python: "Python tutorial official documentation",
    Flask: "Flask tutorial official documentation"
};

function selectLearningTopic(topic) {
    const query = learningQueries[topic];

    if (!query) {
        roadmapTitle.textContent = "Learning resource not found";
        roadmapMessage.hidden = false;
        return;
    }

    technologyButtons.forEach(function (button) {
        const selected = button.dataset.topic === topic;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    });

    roadmapButtons.forEach(function (button) {
        const selected = button.dataset.topic === topic;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
    });

    roadmapTitle.textContent = "Learning " + topic;

    const panelText = roadmapMessage.querySelector("p");
    panelText.textContent =
        "Search results for " + topic +
        " have been opened in Google.";

    roadmapMessage.hidden = false;

    const googleUrl =
        "https://www.google.com/search?q=" +
        encodeURIComponent(query);

    window.open(googleUrl, "_blank", "noopener,noreferrer");
}

// Technology cards activate their matching Learning button.
technologyButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        selectLearningTopic(button.dataset.topic);
    });
});

// Learning buttons activate their matching Technology card.
roadmapButtons.forEach(function (button) {
    button.addEventListener("click", function () {
        selectLearningTopic(button.dataset.topic);
    });
});

// CONTACT FORM
// CONTACT FORM
form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!csrfToken) {
        message.textContent =
            "CSRF token is unavailable. Please reload the page.";
        return;
    }

    message.textContent = "Submitting...";

    try {
        const formData = new FormData(form);

        const response = await fetch("/contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-CSRF-Token": csrfToken
            },
            body: new URLSearchParams(formData)
        });

        const data = await response.json();

        message.textContent =
            data.message || data.error || "Request completed.";

        if (response.ok) {
            form.reset();
        }

        console.log("Server response:", data);

    } catch (error) {
        message.textContent = "Unable to connect to server.";
        console.error(error);
    }
});

const navLinks = document.querySelectorAll(".nav-link");
const navSections = document.querySelectorAll(
    "#home, #services, #technologies, #contact-form"
);

navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
        navLinks.forEach(function (item) {
            item.classList.remove("active");
        });
        link.classList.add("active");
    });
});

if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                navLinks.forEach(function (link) {
                    link.classList.toggle(
                        "active",
                        link.getAttribute("href") === "#" + entry.target.id
                    );
                });
            }
        });
    }, { rootMargin: "-25% 0px -60% 0px" });

    navSections.forEach(function (section) {
        navObserver.observe(section);
    });
}

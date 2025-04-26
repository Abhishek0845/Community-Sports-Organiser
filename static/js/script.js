document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("chat-form");
    const input = document.getElementById("user-input");
    const messagesContainer = document.getElementById("chat-messages");

    // Function to display messages in the chat
    function appendMessage(role, text) {
        const message = document.createElement("div");
        message.classList.add("message", role === "user" ? "user-message" : "bot-message");

        const content = document.createElement("div");
        content.classList.add("message-content");
        content.innerHTML = `<p>${text}</p>`;
        message.appendChild(content);

        messagesContainer.appendChild(message);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // When the chat form is submitted
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const userText = input.value.trim();
        if (!userText) return;

        appendMessage("user", userText);
        input.value = "";

        appendMessage("bot", "🤖 Typing...");

        try {
            const response = await fetch("https://www.chatbase.co/chatbot-iframe/1lWMHyz9d2w7buDxmVu6l", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer rwujl0lmyqpyhl7st65hsdv3pl9jrrb3" // ← Replace this
                },
                body: JSON.stringify({
                    chatbotId: "1lWMHyz9d2w7buDxmVu6l", // ← Replace this
                    messages: [{ role: "user", content: userText }]
                })
            });

            const data = await response.json();

            // Remove the "Typing..." message
            const loadingMessage = document.querySelector(".bot-message:last-child");
            if (loadingMessage) loadingMessage.remove();

            const botReply = data.message || "❌ Sorry, I didn’t get that.";
            appendMessage("bot", botReply);
        } catch (error) {
            console.error("Chatbase error:", error);
            const loadingMessage = document.querySelector(".bot-message:last-child");
            if (loadingMessage) loadingMessage.remove();

            appendMessage("bot", "⚠️ Failed to contact the bot. Please try again.");
        }
    });

    // Quick query buttons
    document.querySelectorAll(".quick-query").forEach(btn => {
        btn.addEventListener("click", () => {
            input.value = btn.getAttribute("data-query");
            form.dispatchEvent(new Event("submit"));
        });
    });

    // Sport icons click interaction
    document.querySelectorAll(".sport-icon").forEach(icon => {
        icon.addEventListener("click", () => {
            const sport = icon.getAttribute("data-sport");
            input.value = `Tell me about the ${sport} tournament`;
            form.dispatchEvent(new Event("submit"));
        });
    });
});

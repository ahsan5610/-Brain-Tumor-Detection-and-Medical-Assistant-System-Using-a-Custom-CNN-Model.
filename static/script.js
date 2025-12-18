// ----------------------------
// Shared UI Functions
// ----------------------------

// Use a custom message box instead of alert()
function displayMessage(text, isError = false) {
    const msgBox = document.getElementById("messageBox");
    msgBox.textContent = text;
    msgBox.classList.remove('hidden');
    msgBox.className = isError 
        ? 'text-sm p-3 bg-red-500/50 text-white rounded-lg transition duration-300' 
        : 'text-sm p-3 bg-blue-500/50 text-white rounded-lg transition duration-300';
    setTimeout(() => msgBox.classList.add('hidden'), 5000);
}

// ----------------------------
// Image Preview Functionality
// ----------------------------
document.getElementById('imageUpload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    const placeholder = document.getElementById('previewPlaceholder');

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            placeholder.classList.add('hidden');
        }
        reader.readAsDataURL(file);
    } else {
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
        preview.src = '';
    }
});

// ----------------------------
// Brain Tumor Prediction
// ----------------------------
async function predictTumor() {
    let fileInput = document.getElementById("imageUpload");
    let predictionElement = document.getElementById("prediction");
    let file = fileInput.files[0];

    if (!file) { 
        displayMessage("Please select an MRI image file before detecting!", true); 
        predictionElement.innerText = "Awaiting Analysis...";
        return; 
    }

    // Show loading state with animation
    predictionElement.innerHTML = '<span class="loader mr-2"></span> Analyzing image...';
    document.getElementById('predictButton').disabled = true;

    let formData = new FormData();
    formData.append("image", file);

    try {
        // NOTE: Replace '/predict' with your actual backend API endpoint
        const response = await fetch("/predict", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        predictionElement.innerHTML =
            `${data.label} (Confidence: ${(data.confidence * 100).toFixed(2)}%)`;
        
        // Highlight result based on prediction
        if (data.label.toLowerCase().includes('tumor')) {
             predictionElement.classList.remove('text-yellow-300/90', 'text-green-400');
             predictionElement.classList.add('text-red-400', 'text-glow');
        } else {
             predictionElement.classList.remove('text-red-400', 'text-yellow-300/90');
             predictionElement.classList.add('text-green-400', 'text-glow');
        }

    } catch (err) {
        console.error("Prediction error:", err);
        predictionElement.innerText = "Error: Could not reach prediction service.";
        displayMessage("Error: Failed to predict tumor. Check console for details.", true);
        predictionElement.classList.remove('text-red-400', 'text-green-400');
        predictionElement.classList.add('text-yellow-300/90');
    } finally {
        document.getElementById('predictButton').disabled = false;
    }
}

// ----------------------------
// Helper Function for Chat Display
// ----------------------------
function appendMessage(message, sender) {
    const chatHistory = document.getElementById("chatHistory");
    
    // 1. Create the row container for alignment
    const rowDiv = document.createElement("div");
    rowDiv.className = sender === 'user' 
        ? "message-row user-message-row flex justify-end" 
        : "message-row bot-message-row flex justify-start";

    // 2. Create the actual bubble
    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = `p-3 rounded-xl max-w-[80%] shadow-lg text-sm transition duration-300 transform hover:scale-[1.02]`;
    
    if (sender === 'user') {
        // Darker blue for contrast
        bubbleDiv.classList.add("bg-blue-600", "text-white");
    } else {
        // Vibrant green for the assistant
        bubbleDiv.classList.add("bg-green-400", "text-gray-900");
    }

    bubbleDiv.innerText = message;

    // Append the bubble to the row, and the row to the history
    rowDiv.appendChild(bubbleDiv);
    chatHistory.appendChild(rowDiv);
    
    // Scroll chat to bottom
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// ----------------------------
// Assistant Chat Functionality
// ----------------------------
async function sendMessage() {
    let input = document.getElementById("userMessage");
    let message = input.value.trim();
    if (message === "") return;
    
    input.value = ""; // Clear input immediately
    
    appendMessage(message, 'user');

    // Simulate bot typing
    const loadingMessage = "Assistant is typing...";
    appendMessage(loadingMessage, 'bot');
    const botMessages = document.getElementById("chatHistory").querySelectorAll('.bot-message-row');
    const tempLoadingBubble = botMessages[botMessages.length - 1].querySelector('div');
    tempLoadingBubble.innerHTML = '<span class="loader mr-2"></span> ' + loadingMessage;
    
    try {
        // NOTE: Replace '/chat' with your actual backend API endpoint
        const response = await fetch("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Replace loading message with actual response
        tempLoadingBubble.parentNode.remove(); 
        appendMessage(data.response, 'bot');

        // Play voice if available
        if (data.audio) {
            let audio = new Audio(data.audio);
            audio.play().catch(err => console.error("Audio playback error (user interaction may be required):", err));
        }

    } catch (err) {
        console.error("Chat error:", err);
        tempLoadingBubble.parentNode.remove();
        appendMessage("Error communicating with the Assistant. Please check the network.", 'bot');
    }
}

// ----------------------------
// Press Enter to send chat message
// ----------------------------
document.getElementById("userMessage").addEventListener("keyup", function(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});
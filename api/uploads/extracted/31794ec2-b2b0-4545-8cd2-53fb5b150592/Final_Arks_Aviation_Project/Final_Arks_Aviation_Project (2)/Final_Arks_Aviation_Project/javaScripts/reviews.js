document.addEventListener("DOMContentLoaded", function () {
  const container = document.querySelector("#testimonialCarousel");
  const wrapper = container.querySelector(".testimonial-wrapper");
  const items = container.querySelectorAll(".testimonial-item");
  const prevBtn = container.querySelector(".carousel-control-prev");
  const nextBtn = container.querySelector(".carousel-control-next");
  const indicators = container.querySelectorAll(".carousel-indicators li");

  let itemWidths = [];
  let positions = [0];
  let currentIndex = 0;

  // Calculate each item's width and position
  function calculateDimensions() {
    itemWidths = [];
    positions = [0];

    items.forEach((item, i) => {
      const width = item.offsetWidth;
      itemWidths.push(width);

      if (i < items.length - 1) {
        positions.push(positions[i] + width);
      }
    });
  }

  // Initialize on load
  calculateDimensions();

  // Update on window resize
  window.addEventListener("resize", calculateDimensions);

  // Move to specific slide
  function goToSlide(index) {
    if (index < 0) {
      index = 0;
    } else if (index >= items.length) {
      index = items.length - 1;
    }

    currentIndex = index;
    wrapper.style.transform = `translateX(-${positions[index]}px)`;

    // Update indicators
    indicators.forEach((indicator, i) => {
      if (i === currentIndex) {
        indicator.classList.add("active");
      } else {
        indicator.classList.remove("active");
      }
    });
  }
});

// ChatBot code

document.addEventListener("DOMContentLoaded", function () {
  const chatbot = document.querySelector(".chatbot-container");
  const chatbotLogo = document.querySelector(".chatbot-logo");
  const closeChatbot = document.querySelector(".chat-close-btn");
  const sendMessage = document.querySelector(".send-message");
  const chatbotInput = document.querySelector(".chatbot-input");
  const chatbotMessages = document.querySelector(".chatbot-messages");

  // Show chatbot on logo click
  chatbotLogo.addEventListener("click", function () {
    chatbot.style.display = "flex"; // Show the chatbot
    chatbotLogo.style.display = "none"; // Hide the chatbot logo
    chatbotInput.focus(); // Focus on the input field
  });

  // Close chatbot
  closeChatbot.addEventListener("click", function (event) {
    event.preventDefault(); // Prevent default action (if any)
    chatbot.style.display = "none"; // Hide the chatbot
    chatbotLogo.style.display = "block"; // Show the chatbot logo again
  });

  // Send message
  sendMessage.addEventListener("click", function () {
    const message = chatbotInput.value.trim(); // Get the message and trim whitespace
    if (message) {
      const messageElement = document.createElement("p"); // Create a new paragraph for the message
      messageElement.textContent = message; // Set the text content to the message
      chatbotMessages.appendChild(messageElement); // Append the message to the messages container
      chatbotInput.value = ""; // Clear the input field
      chatbotMessages.scrollTop = chatbotMessages.scrollHeight; // Scroll to the bottom of the messages
    }
  });

  // Send message on Enter key press
  chatbotInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      sendMessage.click(); // Trigger the send message button click
    }
  });

  // Close chatbot on clicking outside
  window.addEventListener("click", function (event) {
    if (event.target === chatbot) {
      chatbot.style.display = "none"; // Hide the chatbot if clicked outside
      chatbotLogo.style.display = "block"; // Show the chatbot logo again
    }
  });
});

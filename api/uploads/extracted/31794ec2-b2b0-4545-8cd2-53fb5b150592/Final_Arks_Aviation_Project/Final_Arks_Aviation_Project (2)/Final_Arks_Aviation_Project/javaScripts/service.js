// Get all modals
const cabinCrewModal = document.getElementById("cabinCrewModal");
const groundStaffModal = document.getElementById("groundStaffModal");
const cargoModal = document.getElementById("cargoModal");
const securityModal = document.getElementById("securityModal");
const customerServiceModal = document.getElementById("customerServiceModal");

// Get all "Read More" links
const readMoreLinks = document.querySelectorAll(".read-more");

// Get all close buttons
const closeButtons = document.querySelectorAll(".close-btn");

// Function to open the appropriate modal
function openModal(courseType) {
  switch (courseType) {
    case "cabinCrew":
      cabinCrewModal.style.display = "block";
      cabinCrewModal.style.zIndex = "90000";
      document.body.style.overflow = "hidden"; // Prevent scrolling
      break;
    case "groundStaff":
      groundStaffModal.style.display = "block";
      groundStaffModal.style.zIndex = "90000";
      document.body.style.overflow = "hidden";
      break;
    case "cargo":
      cargoModal.style.display = "block";
      cargoModal.style.zIndex = "90000";
      document.body.style.overflow = "hidden";
      break;
    case "security":
      securityModal.style.display = "block";
      securityModal.style.zIndex = "90000";
      document.body.style.overflow = "hidden";
      break;
    case "customerService":
      customerServiceModal.style.display = "block";
      customerServiceModal.style.zIndex = "90000";
      document.body.style.overflow = "hidden";
      break;
  }
}

// Function to close all modals
function closeModals() {
  cabinCrewModal.style.display = "none";
  groundStaffModal.style.display = "none";
  cargoModal.style.display = "none";
  securityModal.style.display = "none";
  customerServiceModal.style.display = "none";
  document.body.style.overflow = "auto"; // Re-enable scrolling
}

// Add click event listeners to "Read More" links
readMoreLinks.forEach((link) => {
  link.addEventListener("click", function (e) {
    e.preventDefault();
    const courseType = this.getAttribute("data-course");
    openModal(courseType);
  });
});

// Add click event listeners to close buttons
closeButtons.forEach((button) => {
  button.addEventListener("click", closeModals);
});

// Close modal when clicking outside of it
window.addEventListener("click", function (e) {
  if (
    e.target === cabinCrewModal ||
    e.target === groundStaffModal ||
    e.target === cargoModal ||
    e.target === securityModal ||
    e.target === customerServiceModal
  ) {
    closeModals();
  }
});

// Close modal with Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeModals();
  }
});

// ARROW

let topBtn = document.getElementById("topBtn");

window.onscroll = function () {
  if (
    document.body.scrollTop > 100 ||
    document.documentElement.scrollTop > 100
  ) {
    topBtn.style.display = "block";
  } else {
    topBtn.style.display = "none";
  }
};

topBtn.onclick = function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

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

// Initialize tooltips and popovers if needed
document.addEventListener("DOMContentLoaded", function () {
  // Add any additional JavaScript functionality here

  // Example: Add active class to current navigation item
  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", function () {
      navLinks.forEach((item) => item.classList.remove("active"));
      this.classList.add("active");
    });
  });
});

// Parallax effect for hero image
window.addEventListener("scroll", function () {
  let scrollPos = window.scrollY;
  let hero = document.querySelector(".about-hero");

  let moveFactor = scrollPos / 5;

  hero.style.backgroundPosition = `center ${100 - moveFactor}%`;
});

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("animatedForm");
  const inputs = form.querySelectorAll(".form-control");

  // Add animation to form controls on focus
  inputs.forEach((input) => {
    input.addEventListener("focus", () => {
      input.style.transform = "scale(1.02)";
    });

    input.addEventListener("blur", () => {
      input.style.transform = "scale(1)";
    });
  });

  // Form submission handling
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Validate form
    let isValid = true;
    inputs.forEach((input) => {
      if (input.hasAttribute("required") && !input.value.trim()) {
        isValid = false;
        showError(input);
      } else {
        showSuccess(input);
      }
    });

    if (isValid) {
      // Animate submit button
      const submitBtn = form.querySelector(".submit-btn");
      submitBtn.style.transform = "scale(0.95)";
      setTimeout(() => {
        submitBtn.style.transform = "scale(1)";
        // Here you would typically send the form data to a server
        alert("Form submitted successfully!");
        form.reset();
      }, 200);
    }
  });

  // Helper functions
  function showError(input) {
    input.classList.remove("success");
    input.classList.add("error");
    input.style.animation = "shake 0.5s ease";
    setTimeout(() => {
      input.style.animation = "";
    }, 500);
  }

  function showSuccess(input) {
    input.classList.remove("error");
    input.classList.add("success");
  }
});

// Add shake animation
const style = document.createElement("style");
style.textContent = `
  @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
  }
`;
document.head.appendChild(style);

// Get the modal and relevant elements
const form = document.querySelector(".hero-form");
const content = document.getElementById("hero-content");
const btn = document.getElementById("registrationBtn");
const closeBtn = document.getElementById("closeBtn");

// Function to show modal only on screens smaller than 768px
btn.addEventListener("click", function () {
  if (window.innerWidth < 768) {
    form.style.display = "block"; // using flex to center content
    form.style.backgroundColor = "white";
    form.style.opacity = "1";
    form.style.width = "80%";
    form.style.height = "70%";
    content.style.display = "none";
  }
});

// Function to close modal when clicking on the close button
closeBtn.addEventListener("click", function () {
  form.style.display = "none";
  content.style.display = "block";
});

// Optional: close modal when clicking outside of it
window.addEventListener("click", function (event) {
  if (event.target === modal) {
    form.style.display = "none";
    content.scrollY.display = "block";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Intersection Observer for scroll animations
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px",
    }
  );

  // Observe all hexagon items
  const hexagonItems = document.querySelectorAll(".hexagon-item");
  hexagonItems.forEach((item) => {
    observer.observe(item);
  });

  // Hover effect for hexagons
  const hexagons = document.querySelectorAll(".hexagon");
  hexagons.forEach((hexagon) => {
    hexagon.addEventListener("mouseenter", () => {
      hexagon.style.transform = "translateY(-10px)";
    });

    hexagon.addEventListener("mouseleave", () => {
      hexagon.style.transform = "translateY(0)";
    });
  });
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

document.addEventListener("DOMContentLoaded", function () {
  // Add custom fade-in class to all hexagons initially
  const hexagons = document.querySelectorAll(".hexagon-wrapper");
  hexagons.forEach((hexagon) => {
    hexagon.classList.add("to-animate");
    hexagon.style.opacity = "0";
    hexagon.style.transform = "translateY(40px)";
  });

  // Function to check if element is in viewport
  function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top <=
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.bottom >= 0
    );
  }

  // Function to handle scroll animation
  function handleScrollAnimation() {
    const elementsToAnimate = document.querySelectorAll(".to-animate");

    elementsToAnimate.forEach((element, index) => {
      if (isInViewport(element)) {
        // Staggered animation delay based on index
        setTimeout(() => {
          element.style.transition =
            "opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
          element.style.opacity = "1";
          element.style.transform = "translateY(0)";
          element.classList.remove("to-animate");
        }, 150 * index);
      }
    });
  }

  // Initialize AOS (Animate On Scroll) library if it's loaded
  let AOS; // Declare AOS variable
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 800,
      easing: "ease-out",
      once: true,
    });
  } else {
    // Run our custom animation on scroll if AOS is not available
    window.addEventListener("scroll", handleScrollAnimation);
    // Also run once on page load
    handleScrollAnimation();
  }

  // Add pulse animation to icons periodically
  const icons = document.querySelectorAll(".icon-circle");
  icons.forEach((icon, index) => {
    // Initial animation with delay
    setTimeout(() => {
      icon.style.animation = "pulse 1.5s ease";
    }, 1000 + index * 300);

    // Periodic animation
    setInterval(() => {
      icon.style.animation = "pulse 1.5s ease";
      setTimeout(() => {
        icon.style.animation = "none";
      }, 1500);
    }, 5000 + index * 1000); // Stagger the animations
  });

  // Make layout responsive
  function adjustLayout() {
    const windowWidth = window.innerWidth;
    const bottomRow = document.querySelector(".bottom-row");

    if (windowWidth <= 768) {
      // Tablet/mobile view - adjust spacing
      if (bottomRow) {
        bottomRow.style.marginTop = "0";
      }
    } else {
      // Desktop view - restore hexagonal layout
      if (bottomRow) {
        bottomRow.style.marginTop = "-50px";
      }
    }
  }

  // Initial layout adjustment
  adjustLayout();

  // Adjust layout on window resize
  window.addEventListener("resize", adjustLayout);

  // Add hover effect for hexagons
  hexagons.forEach((hexagon) => {
    hexagon.addEventListener("mouseenter", function () {
      this.style.zIndex = "10";

      // Add a subtle glow effect on hover
      const hexElement = this.querySelector(".hexagon");
      if (hexElement) {
        hexElement.style.boxShadow =
          "0 8px 30px rgba(230, 28, 28, 0.6), 0 0 15px rgba(255, 255, 255, 0.2)";
      }
    });

    hexagon.addEventListener("mouseleave", function () {
      this.style.zIndex = "1";

      // Remove the glow effect
      const hexElement = this.querySelector(".hexagon");
      if (hexElement) {
        hexElement.style.boxShadow = "0 5px 15px rgba(230, 28, 28, 0.3)";
      }
    });
  });
});

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
      groundStaffModal.style.zIndex = "9000";
      document.body.style.overflow = "hidden";
      break;
    case "cargo":
      cargoModal.style.display = "block";
      cargoModal.style.zIndex = "9000";
      document.body.style.overflow = "hidden";
      break;
    case "security":
      securityModal.style.display = "block";
      securityModal.style.zIndex = "9000";
      document.body.style.overflow = "hidden";
      break;
    case "customerService":
      customerServiceModal.style.display = "block";
      customerServiceModal.style.zIndex = "9000";
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

// Scroll Top button

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

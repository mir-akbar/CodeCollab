const jobs = [
  {
    
      "title": "Aircraft Maintenance Technician",
      "description": "Ensure the safety and reliability of aircraft by performing inspections, repairs, and routine maintenance to meet aviation standards.",
    
    
    qualifications: [
      "High school diploma or equivalent​",
      "FAA Airframe and Powerplant (A&P) certification",
    ],
    skills: [
      "Proficiency in aircraft systems and components​",
      "Ability to read and interpret technical manuals​",
      
    ],
    experience: "2-5 years of experience in aircraft maintenance",
  },
  {
    "title": "Avionics Technician",
  "description": "Install, inspect, and maintain aircraft electronic systems, including navigation, communication, and flight control systems, ensuring optimal performance and safety.",

    qualifications: [
      "Associate degree in avionics or related field​",
      "FCC General Radiotelephone Operator License",
    ],
    skills: [
      "Knowledge of avionics systems​",
      "Experience with  repairing electronic systems​",
      "Attention to detail",
    ],
    experience: "3+ years in avionics maintenance​",
  },
  {
    "title": "Flight Operations Manager",
  "description": "Oversee and coordinate all aspects of flight operations, ensuring compliance with regulations, optimizing schedules, and maintaining efficient airline performance.",
 qualifications: [
      "Bachelor's degree in aviation management​",
      "Commercial Pilot License (CPL)",
    ],
    skills: [
      " p leadership and organizational skills​",
      "Knowledge of flight operations and regulations​",
      "Excellent communication abilities",
    ],
    experience: "5+ years of full stack development experience",
  },
  {
    title: "Quality Assurance Inspector",
    description:
      "Develop and maintain enterprise applications while ensuring high performance and reliability.",
    qualifications: [
      "High school diploma or equivalent​",
      "FAA A&P certification",
    ],
    skills: [
      "Understanding of quality control procedures​",
      "Familiarity with inspection tools and equipment​",
      "Analytical thinking",
    ],
    experience: "3-5 years in aircraft maintenance or quality assurance",
  },
  {
    "title": "Pilot",
    "description": "Train to operate commercial aircraft safely and efficiently while ensuring passenger comfort and compliance with aviation regulations.",
    "qualifications": [
      "Commercial Pilot License (CPL)",
      "Relevant type ratings",
      "Minimum flight hours as required by aviation authorities"
    ],
    "skills": [
      "Excellent hand-eye coordination",
      "In-depth knowledge of flight systems",
      "Strong decision-making skills"
    ],
    "experience": "4+ years of flight experience with commercial airlines"
  },
  {
    "title": "Cabin Crew Training",
    "description": "Prepare for a rewarding career in aviation by learning essential skills in passenger service, safety procedures, and emergency response.",
    "qualifications": [
      "High school diploma or equivalent",
      
      "Medical fitness certification"
    ],
    "skills": [
      "Fluency in English (additional languages are a plus)",
      "Excellent communication  skills",
      "Ability to handle emergencies calmly and efficiently"
    ],
    "experience": "No prior experience required; training provided"
  },
  
  
];

// Populate jobs grid
function populateJobs() {
  const jobsGrid = document.getElementById("jobsGrid");

  jobs.forEach((job) => {
    // Create job card
    const jobCard = document.createElement("div");
    jobCard.className = "job-card";
    jobCard.innerHTML = `
            <h3 class="job-title">${job.title}</h3>
            <p class="job-description">${job.description}</p>
            <div class="requirements">
                <h4>Qualifications</h4>
                <ul>
                    ${job.qualifications
                      .map((qual) => `<li>${qual}</li>`)
                      .join("")}
                </ul>
                <h4>Required Skills</h4>
                <ul>
                    ${job.skills.map((skill) => `<li>${skill}</li>`).join("")}
                </ul>
                <h4>Experience</h4>
                <p>${job.experience}</p>
            </div>
            <button class="apply-btn" onclick="openPopup('${
              job.title
            }')">Apply Now</button>
        `;

    jobsGrid.appendChild(jobCard);
  });
}

// Handle form submission
document
  .getElementById("applicationForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    // In a real application, you would send this data to a server
    const formData = new FormData(this);
    alert(
      "Thank you for your application! We will review it and get back to you soon."
    );
    this.reset();
    closePopup();
  });

// Open popup form
function openPopup(position) {
  const popupOverlay = document.getElementById("popupOverlay");
  const positionInput = document.getElementById("position");
  positionInput.value = position;
  popupOverlay.classList.add("active");
}

// Close popup form
function closePopup() {
  const popupOverlay = document.getElementById("popupOverlay");
  popupOverlay.classList.remove("active");
}

// Initialize the page
document.addEventListener("DOMContentLoaded", function () {
  populateJobs();

  // Add form field highlight effect
  const formInputs = document.querySelectorAll("input, select, textarea");
  formInputs.forEach((input) => {
    input.addEventListener("focus", () => {
      input.style.boxShadow = "0 0 0 2px rgba(255, 87, 34, 0.3)";
      input.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
    });

    input.addEventListener("blur", () => {
      input.style.boxShadow = "none";
      input.style.backgroundColor = "rgb(39, 32, 59)";
    });
  });

  // Close popup when close button is clicked
  document.getElementById("closePopup").addEventListener("click", closePopup);
});

// Add scroll animation
document.addEventListener("scroll", function () {
  const jobCards = document.querySelectorAll(".job-card");
  jobCards.forEach((card) => {
    const cardTop = card.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;

    if (cardTop < windowHeight * 0.85) {
      card.style.opacity = "1";
      card.style.transform = "translateY(0)";
    }
  });
});

// Add subtle glow effect to headings
document.addEventListener("DOMContentLoaded", function () {
  const headings = document.querySelectorAll("h2, h3, h4");
  headings.forEach((heading) => {
    heading.addEventListener("mouseenter", () => {
      heading.style.textShadow = "0 0 10px rgba(255, 255, 255, 0.3)";
    });

    heading.addEventListener("mouseleave", () => {
      heading.style.textShadow = "none";
    });
  });
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
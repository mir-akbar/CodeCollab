const blogPosts = [
  {
    id: 1,
    title:
      "The Future of Aviation Training: Emerging Trends and Innovations to Watch Out For",
    category: "Aviation Training",
    date: "September 6, 2023",
    image: "./images/blog1.jpg",
    excerpt:
      "As technology continues to evolve, aviation training is experiencing a transformative shift. One of the key trends is the...",
    content: ` 
        <p>
            As technology continues to evolve, aviation training is experiencing a transformative shift. One of the key trends is the integration 
            of virtual and augmented reality, which allows pilots and aviation professionals to simulate complex flight scenarios without leaving 
            the ground. Additionally, the use of artificial intelligence and machine learning is revolutionizing flight simulators, providing more 
            realistic training experiences. Another major trend is the focus on sustainability, with aviation programs incorporating eco-friendly 
            practices and green technologies into training. The rise of drone technology also introduces new training programs for future drone 
            pilots and operators. As the aviation industry embraces these advancements, training methods will continue to become more immersive, 
            efficient, and adaptable to the needs of the modern aviation landscape.
        </p>`,
  },
  {
    id: 2,
    title:
      "Why Aviation Careers Are in High Demand: Top Reasons You Should Consider a Job in Aviation",
    category: "Aerospace Opportunities",
    date: "September 6, 2024",
    image: "./images/blog2.jpg",
    excerpt:
      "Aviation careers are experiencing a surge in demand, and there are several compelling reasons why you should consider...",
    content: `
        <p>
            Aviation careers are experiencing a surge in demand, and there are several compelling reasons why you should consider joining the 
            industry. First, the global aviation sector is rapidly expanding, with more airlines, airports, and routes being introduced, leading
             to an increased need for skilled professionals. Additionally, aviation offers a wide range of career paths, from pilots and air 
             traffic controllers to ground crew and maintenance engineers, making it an appealing choice for individuals with diverse interests 
             and skill sets. The high earning potential and opportunities for advancement make aviation careers financially rewarding. 
             Furthermore, aviation professionals often enjoy the excitement and travel opportunities that come with the job. Finally, the aviation 
             industry is crucial to global connectivity, offering individuals a chance to be part of a dynamic and essential field that shapes the 
             world economy.
        </p>`,
  },
  {
    id: 3,
    title:
      "How to Choose the Right Aviation Training Program: A Complete Guide",
    category: "Aviation Training Guide",
    date: "September 2, 2024",
    image: "./images/blog3.jpg",
    excerpt:
      "Choosing the right aviation training program is crucial to launching a successful career in the industry. The first step...",
    content: `
        <p>
            Choosing the right aviation training program is crucial to launching a successful career in the industry. The first step is to 
            research accredited institutions that offer comprehensive courses, ensuring that they are recognized by aviation authorities such 
            as the FAA or EASA. It's important to evaluate the program’s curriculum, which should include both theoretical knowledge and practical
            flight training, offering a balanced approach. Consider the program’s fleet of aircraft and simulators, as modern equipment enhances 
            the learning experience. Additionally, look into the instructors' qualifications and experience skilled and experienced trainers 
            are vital to your development. Financial investment is another critical factor, so assess the cost of the program and available 
            funding options like scholarships or loans. Finally, consider the program’s placement success rate, as a high rate of job placements 
            post-training indicates the quality and reputation of the school. By considering these factors, you can make an informed decision 
            and choose a program that aligns with your career goals.
        </p>`,
  },
  {
    id: 4,
    title: "How Aviation Management Programs Are Shaping Future Leaders",
    category: "Aviation Leadership",
    date: "September 2, 2023",
    image: "./images/blog4.jpg",
    excerpt:
      "Aviation management programs are playing a crucial role in shaping the next generation of...",
    content: `
        <p>
            Aviation management programs are playing a crucial role in shaping the next generation of leaders in the aviation industry. These 
            programs provide students with the necessary skills to oversee and manage the complexities of aviation operations, including airline 
            management, airport operations, and air traffic control. Through a blend of business strategy, leadership development, and specialized 
            aviation knowledge, students gain a comprehensive understanding of how the aviation industry functions. By focusing on areas such as 
            financial management, logistics, regulatory compliance, and marketing, these programs prepare graduates to navigate the fast-paced, 
            global nature of aviation. Moreover, aviation management programs emphasize critical thinking, problem-solving, and decision-making, 
            which are essential for managing challenges and leading teams in high-pressure situations. As the aviation industry evolves, these 
            programs are equipping students with the tools to become successful leaders, driving innovation and growth while maintaining 
            operational efficiency and safety.
        </p>`,
  },
  {
    id: 5,
    title:
      "Why Safety is the Top Priority in Aviation Training and Operational Excellence",
    category: "Aviation Safety",
    date: "September 1, 2024",
    image: "./images/blog5.jpg",
    excerpt:
      "Safety is the cornerstone of aviation training because it directly impacts the lives of ...",
    content: `
        <p>
            Safety is the cornerstone of aviation training because it directly impacts the lives of passengers, crew, and the overall integrity 
            of the aviation industry. In aviation, even the smallest mistake can have severe consequences, making it essential for pilots, crew 
            members, and ground personnel to undergo rigorous safety training. Aviation training programs focus on emergency procedures, risk 
            management, and real-time decision-making to ensure that professionals are prepared for any situation. The importance of safety is 
            ingrained in every aspect of aviation training, from pre-flight checks to emergency response drills. Additionally, safety training 
            involves fostering a culture of responsibility, where every member of the aviation team plays a role in maintaining safety standards. 
            As the aviation industry continues to grow, ensuring that safety remains a top priority helps minimize risks and ensures that aviation 
            remains one of the safest modes of transportation.
        </p>`,
  },
  {
    id: 6,
    title:
      "From Ground Crew to Air Traffic Control: Exploring Careers in Aviation Beyond Flying",
    category: "Non-Flying Roles in Aviation.",
    date: "August 28, 2024",
    image: "./images/blog6.jpg",
    excerpt:
      "Aviation offers a wide range of career opportunities that go beyond being a pilot, and many of these...",
    content: `
        <p>
            Aviation offers a wide range of career opportunities that go beyond being a pilot, and many of these roles play an essential part 
            in keeping the skies safe and operations running smoothly. Ground crew positions, such as aircraft maintenance, baggage handling, 
            and ramp operations, are vital to the safe and efficient turnarounds of flights. These professionals ensure that aircraft are ready 
            for takeoff, addressing any technical or operational issues that arise before the flight. Another key role in aviation is air traffic 
            control, where controllers manage the flow of aircraft on the ground and in the air, ensuring safe distances between planes. Air 
            traffic controllers are responsible for guiding pilots through takeoff, landing, and airways, often under high-pressure conditions. 
            Additionally, careers in aviation management, customer service, and aviation safety are critical for the smooth operation of airlines 
            and airports. These positions offer diverse career paths that combine technical expertise, problem-solving, and customer service. As 
            the aviation industry continues to grow, these non-flying roles remain essential in ensuring the safety, efficiency, and success of 
            air travel.
        </p>`,
  },
];

let currentPosts = 0;
const postsPerLoad = 4;
const initialPosts = 4;

function createBlogCard(post) {
  return `
        <div class="col-md-6 mb-4">
            <div class="card blog-card">
                <img src="${post.image}" class="card-img-top blog-image" alt="${post.title}">
                <div class="card-body">
                    <p href="#" class="blog-category mb-2 d-inline-block">${post.category}</p>
                    <h5 class="card-title">${post.title}</h5>
                    <p class="blog-date mb-3">${post.date}</p>
                    <p class="card-text blog-excerpt">${post.excerpt}</p>
                    <a href="#" class="read-more text-primary" data-post-id="${post.id}">Read More →</a>
                </div>
            </div>
        </div>
    `;
}

function showBlogPost(postId) {
  const post = blogPosts.find((p) => p.id === postId);
  if (!post) return;

  const modal = new bootstrap.Modal(document.getElementById("blogModal"));
  const modalContent = document.querySelector(".blog-modal-content");

  modalContent.querySelector(".modal-image").src = post.image;
  modalContent.querySelector(".modal-image").alt = post.title;
  modalContent.querySelector(".blog-category").textContent = post.category;
  modalContent.querySelector(".modal-title").textContent = post.title;
  modalContent.querySelector(".blog-date").textContent = post.date;
  modalContent.querySelector(".blog-content").innerHTML = post.content;

  modal.show();
}

function loadMorePosts() {
  const container = document.getElementById("blogContainer");
  const endIndex = Math.min(currentPosts + postsPerLoad, blogPosts.length);

  for (let i = currentPosts; i < endIndex; i++) {
    const postElement = document.createElement("div");
    postElement.innerHTML = createBlogCard(blogPosts[i]);
    container.appendChild(postElement.firstElementChild);

    // Add delay to each card animation
    setTimeout(() => {
      container.children[i].querySelector(".blog-card").style.animation =
        "fadeInUp 0.6s forwards";
    }, i * 150);
  }

  currentPosts = endIndex;

  // Show/hide buttons based on current state
  if (currentPosts >= blogPosts.length) {
    document.getElementById("loadMore").style.display = "none";
  }
  if (currentPosts > initialPosts) {
    document.getElementById("loadLess").style.display = "inline-block";
  }

  // Add click event listeners to new Read More links
  document.querySelectorAll(".read-more").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const postId = parseInt(e.target.dataset.postId);
      showBlogPost(postId);
    });
  });
}

function loadLessPosts() {
  const container = document.getElementById("blogContainer");

  // Fade out animation for existing cards
  const cards = container.querySelectorAll(".blog-card");
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.style.opacity = "0";
      card.style.transform = "translateY(20px)";
    }, index * 100); 
  });

  // Clear and reload after animation
  setTimeout(() => {
    container.innerHTML = "";
    currentPosts = 0;

    // Load initial posts with animation
    for (let i = 0; i < initialPosts; i++) {
      const postElement = document.createElement("div");
      postElement.innerHTML = createBlogCard(blogPosts[i]);
      container.appendChild(postElement.firstElementChild);

      setTimeout(() => {
        container.children[i].querySelector(".blog-card").style.animation =
          "fadeInUp 0.6s forwards";
      }, i * 150);
    }

    currentPosts = initialPosts;

    // Reset button states
    document.getElementById("loadMore").style.display = "inline-block";
    document.getElementById("loadLess").style.display = "none";

    // Re-add click event listeners
    document.querySelectorAll(".read-more").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const postId = parseInt(e.target.dataset.postId);
        showBlogPost(postId);
      });
    });
  }, cards.length * 100 + 300);
}

document.getElementById("loadMore").addEventListener("click", loadMorePosts);
document.getElementById("loadLess").addEventListener("click", loadLessPosts);

// Load initial posts
loadMorePosts();

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

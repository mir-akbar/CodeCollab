<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Arks Aviation</title>
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
      rel="stylesheet" />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" />
    <link rel="stylesheet" href="Styles/courses.css" />
    <link rel="stylesheet" href="Styles/header.css" />
    <link rel="stylesheet" href="Styles/footer.css" />
  </head>
  <body>
    <!-- SCROLL-TOP BUTTON -------------------------------------------------------------------------------------------------->
    <button class="scroll-btn" id="topBtn">
      <i class="bi bi-rocket"></i>
    </button>

    <!-- Header  -->
     <?php include_once("includes/header.php") ?>

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">Our<span>Services</span></h1>
        <p class="hero-text">
          We provide world-class aviation education, hands-on flight training,
          and personalized mentorship to help you navigate your path in the
          aviation industry.
        </p>
      </div>
    </section>

    <!-- Chatbot Container -->
    <div class="chatbot-container">
      <div class="chatbot-header">
        <h4>Chat with Us!</h4>

        <button class="chat-close-btn" type="button">X</button>
      </div>
      <div class="chatbot-messages">
        <!-- Messages will be dynamically added here -->
      </div>
      <div class="chatbot-input-container">
        <input
          type="text"
          class="chatbot-input"
          placeholder="Type your message..." />
        <button class="btn btn-primary send-message" type="button">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>

    <!-- Chatbot Logo -->
     <!-- <div class="chatbot-logo">
      <img src="images/chatbot.jpg" alt="Chatbot Logo" />
    </div> -->

    <!-- Courses Section  ------------------------------------------------------------------------------------------------->
    <!-- Courses Section  ------------------------------------------------------------------------------------------------->
    <section class="courses-section">
      <h3 class="section-subtitle">Our Services</h3>
      <h1 class="section-title">
        AVIATION <span style="color: #ffc107">PROGRAMS</span>
      </h1>
      <p class="section-description">
        Explore world-class aviation training with our expertly designed
        courses. From ground school to advanced flight training, we help you
        achieve your aviation dreams.
      </p>

      <div class="courses-grid">
        <!-- Air Hostess & Cabin Crew Training -->
        <div class="course-card">
          <div class="course-image">
            <img src="images/blog1.jpg" alt="Cabin Crew Training" />
          </div>
          <div class="course-content">
            <div class="course-icon">🛩️</div>
            <h2>Air Hostess & Cabin Crew Training</h2>
            <p>
              Become the face of the airline industry! Our Cabin Crew Training
              Program prepares you for exciting opportunities with top domestic
              and international airlines.
            </p>
            <a href="#" class="read-more" data-course="cabinCrew"
              >Read More →</a
            >
          </div>
        </div>

        <!-- Airport Ground Staff Training -->
        <div class="course-card">
          <div class="course-image">
            <img src="images/blog2.jpg" alt="Ground Staff Training" />
          </div>
          <div class="course-content">
            <div class="course-icon">🏢</div>
            <h2>Airport Ground Staff Training</h2>
            <p>
              Be the backbone of airport operations! Our Ground Staff Training
              program prepares students for efficient airport management roles.
            </p>
            <a href="#" class="read-more" data-course="groundStaff"
              >Read More →</a
            >
          </div>
        </div>

        <!-- Cargo & Logistics Management -->
        <div class="course-card">
          <div class="course-image">
            <img src="images/blog3.jpg" alt="Cargo Logistics" />
          </div>
          <div class="course-content">
            <div class="course-icon">📦</div>
            <h2>Cargo & Logistics Management</h2>
            <p>
              Learn the art of cargo handling and global logistics! This course
              is designed to prepare students for air freight, supply chain, and
              cargo operations.
            </p>
            <a href="#" class="read-more" data-course="cargo">Read More →</a>
          </div>
        </div>

        <!-- Aviation Security & Safety Training -->
        <div class="course-card">
          <div class="course-image">
            <img src="images/blog4.jpg" alt="Aviation Security" />
          </div>
          <div class="course-content">
            <div class="course-icon">🛡️</div>
            <h2>Aviation Security & Safety Training</h2>
            <p>
              Protect and secure aviation infrastructure! Our Aviation Security
              Training prepares individuals to handle airport security,
              emergency procedures, and crisis management.
            </p>
            <a href="#" class="read-more" data-course="security">Read More →</a>
          </div>
        </div>

        <!-- Commercial & Customer Service Training -->
        <div class="course-card">
          <div class="course-image">
            <img src="images/blog5.jpg" alt="Customer Service" />
          </div>
          <div class="course-content">
            <div class="course-icon">💼</div>
            <h2>Commercial & Customer Service Training</h2>
            <p>
              Master the business of aviation! This course focuses on the
              commercial and customer service aspects of the airline industry.
            </p>
            <a href="#" class="read-more" data-course="customerService"
              >Read More →</a
            >
          </div>
        </div>
      </div>

      <!-- Modal for Air Hostess & Cabin Crew Training -->
      <div id="cabinCrewModal" class="course-modal">
        <div class="modal-content">
          <span class="close-btn">x</span>
          <div class="modal-header">
            <h2 class="modal-title">Air Hostess & Cabin Crew Training</h2>
          </div>
          <div class="modal-body">
            <img
              src="images/blog1.jpg"
              alt="Cabin Crew Training"
              class="modal-image" />
            <p>
              Become the face of the airline industry! Our Cabin Crew Training
              Program prepares you for exciting opportunities with top domestic
              and international airlines.
            </p>
            <h3>Course Highlights:</h3>
            <ul class="feature-list">
              <li>
                <p>
                  <span class="icon">✈</span> In-flight safety and emergency
                  procedures
                </p>
              </li>
              <li>
                <p>
                  <span class="icon">✈</span>
                  Grooming, personality development & communication skills
                </p>
              </li>
              <li>
                <p>
                  <span class="icon">✈</span> Hospitality, customer service &
                  passenger handling
                </p>
              </li>
              <li>
                <p>
                  <span class="icon">✈</span> Mock aircraft training &
                  real-world exposure
                </p>
              </li>
            </ul>
            <h4>Eligibility Criteria:</h4>
            <ul class="feature-list">
              <li>
                <p><b>📌 Education:</b></p>
                10+2 / 12th pass in any stream, 3-year diploma in engineering,
                or any graduation.
              </li>
              <li>
                <p><b>📌 Age:</b></p>
                18 – 26 years
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Modal for Airport Ground Staff Training -->
      <div id="groundStaffModal" class="course-modal">
        <div class="modal-content">
          <span class="close-btn">x</span>
          <div class="modal-header">
            <h2 class="modal-title">Airport Ground Staff Training</h2>
          </div>
          <div class="modal-body">
            <img
              src="images/blog2.jpg"
              alt="Ground Staff Training"
              class="modal-image" />
            <p>
              Be the backbone of airport operations! Our Ground Staff Training
              program prepares students for efficient airport management roles.
            </p>
            <h4>Course Highlights:</h4>
            <ul class="feature-list">
              <li>
                <p>
                  <span class="icon">🛄</span> Passenger check-in & boarding
                  procedures
                </p>
              </li>
              <li>
                <p>
                  <span class="icon">🛄</span> Baggage handling & security
                  screening
                </p>
              </li>
              <li>
                <p>
                  <span class="icon">🛄</span> Customer assistance & VIP service
                  training
                </p>
              </li>
              <li>
                <p>
                  <span class="icon">🛄</span> Airline ticketing & reservation
                  systems
                </p>
              </li>
            </ul>
            <h4>Eligibility Criteria:</h4>
            <ul class="feature-list">
              <li>
                <p><b>📌 Education:</b></p>
                10+2 / 12th pass in any stream, 3-year diploma in engineering,
                or any graduation.
              </li>
              <li>
                <p><b>📌 Age:</b></p>
                18 – 26 years
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Modal for Cargo & Logistics Management -->
      <div id="cargoModal" class="course-modal">
        <div class="modal-content">
          <span class="close-btn">x</span>
          <div class="modal-header">
            <h2 class="modal-title">Cargo & Logistics Management</h2>
          </div>
          <div class="modal-body">
            <img
              src="images/blog3.jpg"
              alt="Cargo Management"
              class="modal-image" />
            <p>
              Learn the art of cargo handling and global logistics! This course
              is designed to prepare students for air freight, supply chain, and
              cargo operations.
            </p>
            <h4>Course Highlights:</h4>
            <ul class="feature-list">
              <li>
                <p>
                  <span class="icon">📦</span> Air cargo documentation &
                  shipment handling
                </p>
              </li>
              <li>
                <p>
                  <span class="icon">📦</span> Supply chain & freight management
                </p>
              </li>
              <li>
                <p>
                  <span class="icon">📦</span> Airport warehousing & inventory
                  control
                </p>
              </li>
              <li>
                <p>
                  <span class="icon">📦</span> Cargo safety regulations &
                  handling procedures
                </p>
              </li>
            </ul>
            <h4>Eligibility Criteria:</h4>
            <ul class="feature-list">
              <li>
                <p><b>📌 Education:</b></p>
                10+2 / 12th pass in any stream, 3-year diploma in engineering,
                or any graduation.
              </li>
              <li>
                <p><b>📌 Age:</b></p>
                18 – 26 years
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Modal for Aviation Security & Safety Training -->
      <div id="securityModal" class="course-modal">
        <div class="modal-content">
          <span class="close-btn">x</span>
          <div class="modal-header">
            <h2 class="modal-title">Aviation Security & Safety Training</h2>
          </div>
          <div class="modal-body">
            <img
              src="images/blog4.jpg"
              alt="Aviation Security"
              class="modal-image" />
            <p>
              Protect and secure aviation infrastructure! Our Aviation Security
              Training prepares individuals to handle airport security,
              emergency procedures, and crisis management.
            </p>
            <h4>Course Highlights:</h4>
            <ul class="feature-list">
              <li>
                <p>🛃 Airport security protocols & screening procedures</p>
              </li>
              <li>
                <p>🛃 Emergency evacuation & risk management</p>
              </li>
              <li><p>🛃 Aviation law & regulatory compliance</p></li>
              <li>
                <p>🛃 Passenger and baggage security measures</p>
              </li>
            </ul>
            <h4>Eligibility Criteria:</h4>
            <ul class="feature-list">
              <li>
                <p><b>📌 Education:</b></p>
                10+2 / 12th pass in any stream, 3-year diploma in engineering,
                or any graduation.
              </li>
              <li>
                <p><b>📌 Age:</b></p>
                18 – 26 years
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Modal for Commercial & Customer Service Training -->
      <div id="customerServiceModal" class="course-modal">
        <div class="modal-content">
          <span class="close-btn">x</span>
          <div class="modal-header">
            <h2 class="modal-title">Commercial & Customer Service Training</h2>
          </div>
          <div class="modal-body">
            <img
              src="images/blog5.jpg"
              alt="Customer Service Training"
              class="modal-image" />
            <p>
              Master the business of aviation! This course focuses on the
              commercial and customer service aspects of the airline industry.
            </p>
            <ul class="feature-list">
              <li>
                <p>🛃 Airline ticketing & reservations system training</p>
              </li>
              <li>
                <p>🛃 Airport & airline customer service management</p>
              </li>
              <li><p>🛃 Passenger handling & VIP assistance</p></li>
              <li>
                <p>
                  🛃 Business communication & soft skills development and many
                  more…
                </p>
              </li>
            </ul>
            <h4>Eligibility Criteria:</h4>
            <ul class="feature-list">
              <li>
                <p><b>📌 Education:</b></p>
                10+2 / 12th pass in any stream, 3-year diploma in engineering,
                or any graduation.
              </li>
              <li>
                <p><b>📌 Age:</b></p>
                18 – 30 years
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!--------------------------------------------------------------------------------------------------------------------->

    <!-- Footer Section  -->
     <?php include_once("includes/footer.php") ?>
   
    <script>
      document.addEventListener("DOMContentLoaded", function () {
        const form = document.getElementById("contactForm");

        form.addEventListener("submit", function (e) {
          e.preventDefault();

          // Get form values
          const formData = {
            name: form.querySelector('input[type="text"]').value,
            mobile: form.querySelector('input[type="tel"]').value,
            email: form.querySelector('input[type="email"]').value,
            message: form.querySelector("textarea").value,
          };

          // You can handle the form submission here
          console.log("Form submitted:", formData);

          // Show success message
          alert("Thank you for your message! We will get back to you soon.");

          // Reset form
          form.reset();
        });
      });
    </script>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script src="javaScripts/service.js"></script>
    <script src="javaScripts/home.js"></script>
  </body>
</html>

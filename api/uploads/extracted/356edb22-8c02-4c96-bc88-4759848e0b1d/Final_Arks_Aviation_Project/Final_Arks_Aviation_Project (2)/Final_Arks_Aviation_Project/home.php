<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aviacademy - Aviation Training Academy</title>
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
      rel="stylesheet" />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" />
    <link rel="stylesheet" href="https://unpkg.com/aos@next/dist/aos.css" />
    <link rel="stylesheet" href="Styles/home.css" />
    <link rel="stylesheet" href="Styles/header.css" />
    <link rel="stylesheet" href="Styles/footer.css" />

  </head>
  <body>
    <!-- SCROLL-TOP BUTTON -------------------------------------------------------------------------------------------------->
    <button class="scroll-btn" id="topBtn">
      <i class="bi bi-rocket"></i>
    </button>

    <?php 
    include_once("includes/header.php")
    ?>
    
    <!-- Hero Section------------------------------------------------------------------------------------------------------- -->
    <section class="hero-section">
      <div class="hero-content" id="hero-content">
        <h1 class="hero-title">
          The Leading Aviation <span>Training Institute</span> with
          <span>100% Job </span>Guarantee
        </h1>

        <!-- <h2 class="hero-subtitle">Be With Us</h2> -->
        <p class="hero-text">
          Welcome to ARKS International Aviation Academy, the<span
            style="color: #ffc107"
            ><strong> #1 Aviation Training Institute</strong></span
          >
          committed to transforming aspiring individuals into skilled aviation
          professionals.
        </p>
        <div class="hero-buttons">
          <a href="tel:+919611469385" class="btn1">Contact Us</a>
          <a href="#" class="btn2" id="registrationBtn">Enquiry</a>
        </div>
      </div>
      <div class="hero-form" id="popup-form">
        <form id="animatedForm" class="form">
          <h3>Enquiry Form</h3>
          <div class="form-group">
            <label for="name"
              >Full Name

              <i class="fa fa-asterisk" style="font-size: 9px; color: red"></i>
            </label>
            <input
              type="text"
              id="name"
              class="form-control"
              placeholder="Enter the full name"
              required />
          </div>

          <div class="form-group">
            <label for="tel"
              >Phone Number

              <i class="fa fa-asterisk" style="font-size: 9px; color: red"></i>
            </label>
            <input
              type="tel"
              id="number"
              class="form-control"
              placeholder="Phone number"
              required />
          </div>

          <div class="form-group">
            <label for="select1"
              >Intrested in Service
              <i class="fa fa-asterisk" style="font-size: 9px; color: red"></i>
            </label>
            <select id="select1" class="form-control">
              <option value="" disabled selected>Select a service</option>
              <option value="option1">Cabin Crew Training</option>
              <option value="option2">Ground Staff Training</option>
              <option value="option3">Cargo & Logistic</option>
              <option value="">Aviation Security</option>
              <option value="">Customer Service Training</option>
            </select>
          </div>

          <div class="form-group">
            <label for="email">Email</label>
            <input
              type="email"
              id="email"
              class="form-control"
              placeholder="email"
              required />
          </div>

          <div class="form-group">
            <label for="feedback">Feedback:</label>
            <textarea
              id="feedback"
              class="form-control"
              rows="2"
              placeholder="write your opinion here..."
              required></textarea>
          </div>

          <button type="submit" class="submit-btn">Submit</button>
          <button type="submit" class="close" id="closeBtn">X</button>
          <!-- <span class="close" id="closeBtn">x</span> -->
        </form>
      </div>
    </section>

    <!-- CATCHY LINE ----------------------------------------------------------------------------------------------------------- --->

    <div class="headline">
      <h1 data-aos="fade-up" class="animated-text">
        <span class="text1">From Ground to SKY</span>
        <span class="text2"> We Train You to FLY!✈️</span>
      </h1>
    </div>

    <!-- About Section------------------------------------------------------------------------------------------------------  -->
    <section class="about-us">
      <div class="background">
        <div class="video"></div>
      </div>
      <div class="about-content">
        <div class="top">
          <h3>Welcome To Arks Aviation Academy</h3>
          <h1>
            The Premier Aviation & Flight School in Town With
            <span class="top-highlight">100% Job Guarantee</span>
          </h1>
          <p>
            Our industry-focused training programs and 100% job guarantee make
            us the best choice for those looking to build a successful career in
            the aviation industry. We don’t just train, our mission is to place
            you in aviation jobs at leading airlines, airports, and aviation
            service companies. With expert trainers, hands-on experience, and an
            unwavering commitment to your success, we ensure you’re not just
            job-ready but future-ready. Your aviation journey begins here, let’s
            take off together!.
          </p>
        </div>
        <div class="bottom">
          <div class="points">
            <div class="point">
              <i class="fa-solid fa-circle-check"></i
              ><span>Learn from Industry Experts</span>
            </div>
            <div class="point">
              <i class="fa-solid fa-circle-check"></i
              ><span>Easy EMI Options Available</span>
            </div>
            <div class="point">
              <i class="fa-solid fa-circle-check"></i
              ><span>Practical Training Focus</span>
            </div>
            <div class="point">
              <i class="fa-solid fa-circle-check"></i
              ><span>On-Field Experience</span>
            </div>
          </div>
          <div class="points">
            <div class="point">
              <i class="fa-solid fa-circle-check"></i
              ><span>Advanced Training Facilities</span>
            </div>
            <div class="point">
              <i class="fa-solid fa-circle-check"></i
              ><span> Recognized Certification</span>
            </div>
            <div class="point">
              <i class="fa-solid fa-circle-check"></i
              ><span>Affordable Fee Structure</span>
            </div>
            <div class="point">
              <i class="fa-solid fa-circle-check"></i
              ><span class="point-highlight">No Job? 100% Refund !</span>
            </div>
          </div>
        </div>
        <a href="about-us.php" style="text-decoration: none"
          ><span class="btn">About Us</span></a
        >
      </div>
    </section>

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

    <!-- About Us Slider -------------------------------------------------------------------------------------------------->
    <section class="about-hero">
      <div class="about-hero-overlay"></div>
      <div class="about-hero-content">
        <h1 class="fw-bold">
          Gain Expert Knowledge & Secure Your License with
          <span class="highlight">Aviacademy! </span>
        </h1>
        <p>
          Unlock your aviation career with top-tier training and certification.
          Learn from industry experts and take the next step toward your
          professional goals.
        </p>
        <a href="contact-us.php" class="contact-btn">Contact us</a>
      </div>
    </section>
    <!----------------------------------------------------------------------------------------------------------------------->

    <!-- why choose us section ------------------------------------------------------------------------------------------- -->
    <section class="why-choose-us">
      <div class="container-fluid">
        <div class="row justify-content-center text-center mb-5">
          <div class="col-md-8">
            <h2 class="display-4 fw-bold">
              Why Choose <span class="text-warning">Us</span>
            </h2>
          </div>
        </div>

        <div class="hexagon-container">
          <!-- Top row -->
          <div class="hexagon-row">
            <div
              class="hexagon-wrapper"
              data-aos="fade-up"
              data-aos-delay="100">
              <div class="hexagon">
                <div class="hexagon-content">
                  <div class="icon-circle">
                    <i class="fas fa-cog"></i>
                  </div>
                  <h4>100% Job Guarantee or Your Money Back</h4>
                  <p>
                    Your journey to a successful aviation career starts here!
                    Join today and take ZERO financial risk with our 100%
                    placement guarantee or full refund program.
                  </p>
                </div>
              </div>
            </div>

            <div
              class="hexagon-wrapper"
              data-aos="fade-up"
              data-aos-delay="200">
              <div class="hexagon">
                <div class="hexagon-content">
                  <div class="icon-circle">
                    <i class="fas fa-chart-line"></i>
                  </div>
                  <h4>ISO & MSME Certified</h4>
                  <p>
                    We are an ISO-certified and MSME-registered aviation
                    training academy, ensuring high-quality education and
                    recognized certification.
                  </p>
                </div>
              </div>
            </div>

            <div
              class="hexagon-wrapper"
              data-aos="fade-up"
              data-aos-delay="300">
              <div class="hexagon">
                <div class="hexagon-content">
                  <div class="icon-circle">
                    <i class="fas fa-bolt"></i>
                  </div>
                  <h4>Industry-Experienced Trainers & Mentorship</h4>
                  <p>
                    Our instructors are aviation veterans who bring real-world
                    airline & airport experience, preparing you for industry
                    challenges.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom row -->
          <div class="hexagon-row bottom-row">
            <div
              class="hexagon-wrapper"
              data-aos="fade-up"
              data-aos-delay="150">
              <div class="hexagon">
                <div class="hexagon-content">
                  <div class="icon-circle">
                    <i class="fas fa-sync-alt"></i>
                  </div>
                  <h4>Internationally Recognized Certification</h4>
                  <p>
                    Gain an industry-recognized certification that gives you
                    global career opportunities in aviation.
                  </p>
                </div>
              </div>
            </div>

            <div
              class="hexagon-wrapper"
              data-aos="fade-up"
              data-aos-delay="250">
              <div class="hexagon">
                <div class="hexagon-content">
                  <div class="icon-circle">
                    <i class="fas fa-gem"></i>
                  </div>
                  <h4>Advanced Placement Assistance & Career Support</h4>
                  <p>
                    Resume Building & Mock Interviews, Direct Campus Interviews
                    with Airlines & Airports, Industry Networking & Career
                    Counseling.
                  </p>
                </div>
              </div>
            </div>

            <div
              class="hexagon-wrapper"
              data-aos="fade-up"
              data-aos-delay="350">
              <div class="hexagon">
                <div class="hexagon-content">
                  <div class="icon-circle">
                    <i class="fas fa-chart-pie"></i>
                  </div>
                  <h4>Flexible Course Options & Affordable Fee Structure</h4>
                  <p>
                    EMI Options Available, Scholarship Opportunities for
                    Deserving Students.
                  </p>
                </div>
              </div>
            </div>

            <div
              class="hexagon-wrapper"
              data-aos="fade-up"
              data-aos-delay="450">
              <div class="hexagon">
                <div class="hexagon-content">
                  <div class="icon-circle">
                    <i class="fas fa-chevron-right"></i>
                  </div>
                  <h4>Additional Skill Development</h4>
                  <p>
                    Multilingual Training (English, Hindi & International
                    Languages), First Aid & Emergency Response Training,
                    Aviation Law & Safety Regulations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    <!-- ------------------------------------------------------------------------------------------------------------------  -->

    <!-- Main Footer --------------------------------------------------------------------------------------------------------->
    <?php include_once("includes/footer.php") ?>

    <!-- Chatbot Logo -->
    <!-- <div class="chatbot-logo">
      <img src="images/chatbot.jpg" alt="Chatbot Logo" />
    </div> --> 

    <script src="https://unpkg.com/aos@next/dist/aos.js"></script>
    <script>
      AOS.init();
    </script>

    <!-- Bootstrap JS Bundle with Popper -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"></script>
    <script src="javaScripts/home.js"></script>
  </body>
</html>

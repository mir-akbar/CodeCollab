<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tech Careers | Join Our Team</title>
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
      rel="stylesheet" />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" />
    <link rel="stylesheet" href="Styles/career.css" />
    <link rel="stylesheet" href="Styles/header.css" />
    <link rel="stylesheet" href="Styles/footer.css" />
  </head>
  <body>
    <button class="scroll-btn" id="topBtn">
      <i class="bi bi-rocket"></i>
    </button>

        <!-- Header  -->
        <?php include_once("includes/header.php") ?>

    

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title"><span>Career</span></h1>
        <p class="hero-text">
          Take your aviation dreams to new heights! Join ARKS International
          Aviation Academy and embark on a journey toward a successful career in
          the aviation industry. With expert training, hands-on experience, and
          industry-recognized certifications, we prepare you for a future in the
          skies. Your aviation career starts here!
        </p>
      </div>
    </section>

    <main>
      <section class="jobs-container">
        <h1 class="openposition">
          <span style="color: rgb(0, 0, 45)">Open</span> Positions
        </h1>
        <div class="jobs-grid" id="jobsGrid">
          <!-- Jobs will be populated by JavaScript -->
        </div>
      </section>
    </main>

    <!-- Popup Form -->
    <div id="popupOverlay" class="popup-overlay">
      <div id="popupForm" class="popup-form">
        <div class="popup-header">
          <button id="closePopup" class="close-btn">x</button>
          <h2>Apply Now</h2>
        </div>
        <div class="popup-content">
          <form id="applicationForm">
            <div class="form-group">
              <label for="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="enter full name"
                required />
            </div>

            <div class="form-group">
              <label for="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="mobile number"
                required />
            </div>
            <div class="form-group">
              <label for="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="email"
                required />
            </div>

            <div class="form-group">
              <label for="name">College</label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="college name"
                required />
            </div>

            <div class="form-group">
              <label for="position">Course Of Study</label>
              <select name="course" id="">
                <option value="B.Tech">B.E/B.Tech</option>
                <option value="M.Tech">M.E/M.Tech</option>
                <option value="BCA">BCA</option>
                <option value="MCA">MCA</option>
                <option value="BBA">BBA</option>
                <option value="MBA">MBA</option>
                <option value="B.Com">B.Com</option>
                <option value="M.Com">M.Com</option>
              </select>
            </div>
            <div class="form-group">
              <label for="experience">Year of Passing</label>
              <input
                type="number"
                id="experience"
                name="years"
                min="2020"
                max="2050"
                steps="1"
                placeholder="Passing Year"
                required />
            </div>

            <div class="form-group">
              <label for="position">Position</label>
              <select name="position" id="position">
                <option value="position" selected disabled>
                  Select Position
                </option>
                <option value="option1">Cabin Crew Training</option>
                <option value="option2">Ground Staff Training</option>
                <option value="option3">Cargo & Logistic</option>
                <option value="">Aviation Security</option>
                <option value="">Customer Service Training</option>
              </select>
            </div>

            <div class="form-group">
              <label for="resume">Resume/CV</label>
              <input
                type="file"
                id="resume"
                name="resume"
                accept=".pdf,.doc,.docx"
                required />
            </div>
            <div class="form-group">
              <label for="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows="4"
                placeholder="Message here..."
                style="resize: none"
                required></textarea>
            </div>
            <button type="submit" class="submit-btn">Submit Application</button>
          </form>
        </div>
      </div>
    </div>

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

    <!-- Footer Section  -->
    <?php include_once("includes/footer.php") ?>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <script src="javaScripts/career.js"></script>
  </body>
</html>

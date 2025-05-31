<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <title>arks aviation</title>

    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
      rel="stylesheet" />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" />
      <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" />
      <link rel="stylesheet" href="Styles/contact-us.css" />
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
        <h1 class="hero-title">Contact<span>Us</span></h1>
        <p class="hero-text">
          Ready to launch your aviation career? Get in touch with,<span
            ><b> ARKS International Aviation Academy</b></span
          >
          today! Our team is here to guide you through our programs and help you
          take the next step toward success in the aviation industry.
        </p>
      </div>
    </section>

    <!-- FORM -->

    <div class="container-form">
      <div class="row-form">
        <!-- Left Column - Form -->
        <div class="col col-form">
          <div class="card card-form">
            <div class="background-image"></div>
            <div class="header-form">
              <div class="logo">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round">
                  <path
                    d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                </svg>
                <h1 class="title">Dream To Fly High</h1>
              </div>
              <p>Connect with us, your journey begins here!</p>
            </div>

            <form id="contactForm">
              <div class="form-group ">
                <label
                  >Full Name
                  <i
                    class="fa fa-asterisk"
                    style="font-size: 9px; color: red"></i
                ></label>
                <input type="text" placeholder="Enter Full Name" required />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label
                    >Mobile Number
                    <i
                      class="fa fa-asterisk"
                      style="font-size: 9px; color: red"></i
                  ></label>
                  <input
                    type="tel"
                    placeholder="Enter Mobile Number"
                    required />
                </div>
                <div class="form-group">
                  <label>Email Id </label>
                  <input type="email" placeholder="Enter Email Id" required />
                </div>
              </div>

              <div class="form-group">
                <label
                  >Interested in Service
                  <i
                    class="fa fa-asterisk"
                    style="font-size: 9px; color: red"></i
                ></label>
                <select required>
                  <option value="" disabled selected>Select a service</option>
                  <option value="Pilot Training">Pilot Training</option>
                  <option value="Cabin Crew Training">
                    Cabin Crew Training
                  </option>
                  <option value="Aircraft Maintenance">
                    Aircraft Maintenance
                  </option>
                  <option value="Aviation Management">
                    Aviation Management
                  </option>
                  <option value="Ground Staff Training">
                    Ground Staff Training
                  </option>
                </select>
              </div>

              <div class="form-group form-group-message">
                <label>Message</label>
                <textarea rows="3" placeholder="Enter Your message"></textarea>
              </div>

              <button type="submit" class="submit">Submit</button>
            </form>
          </div>
        </div>

        <!-- Right Column - Map and Cards -->
        <div class="col">
          <!-- Map -->
          <div class="card map-container">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3838.427279601358!2d74.50131777489888!3d15.834124784811834!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bbf677b9fdaf893%3A0x913014e86d116740!2sARKS%20International%20Aviation%20Academy!5e0!3m2!1sen!2sin!4v1742585522596!5m2!1sen!2sin"
              width="100%"
              height="300"
              style="border: 0"
              allowfullscreen
              loading="lazy">
            </iframe>
          </div>

          <!-- Info Cards -->
          <div class="info-cards">
            <div class="card info-card">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <h5>Our Location</h5>
              <p>
                First floor, Star Tower, near RPD Cross, Tilakwadi,
                Belagavi-590006
              </p>
            </div>

            <div class="card info-card">
              <!-- <link href="https://maps.app.goo.gl/1pDVrpcZaUhxfPXBA" /> -->
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              <h5>Branch Location</h5>
              <p>
                Kolekar Tikati, Mangalwar Peth, Kolhapur, Maharashtra 416012
              </p>
            </div>

            <div class="card info-card">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <h5>Email Us</h5>
              <p>arksaviation.info@gmail.com<br /></p>
            </div>

            <div class="card info-card">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h5>Working Hours</h5>
              <p>Mon - Sat: 9:00 AM - 6:00 PM<br />Sunday: Closed</p>
            </div>
          </div>
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

    <script src="javaScripts/contact-us.js"></script>
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
  </body>
</html>

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aviation Blog</title>
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
      rel="stylesheet" />
      <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
      <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" />
      <link rel="stylesheet" href="Styles/blogs.css" />
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
        <h1 class="hero-title">Daily<span>Blog's</span></h1>
        <p class="hero-text">
          Stay updated with the latest insights, trends, and stories from the
          world of aviation. Our daily blogs cover everything from pilot
          training tips and industry news to expert advice and success stories.
        </p>
      </div>
    </section>
    <div class="container py-5">
      <h1 class="text-center mb-5">
        Aviation <span style="color: #ffc107">Insights</span>
      </h1>
      <div id="blogContainer" class="row g-4"></div>
      <div class="text-center mt-4">
        <button id="loadMore" class="load-btn btn-primary me-2">
          Load More
        </button>
        <button
          id="loadLess"
          class="load-btn btn-secondary"
          style="display: none">
          Load Less
        </button>
      </div>
    </div>

    <!-- Blog Post Modal -->
    <div
      class="modal fade"
      id="blogModal"
      tabindex="-1"
      aria-labelledby="blogModalLabel"
      aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header border-0 pb-0">
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="blog-modal-content">
              <img src="" alt="" class="modal-image img-fluid rounded mb-4" />
              <span class="blog-category mb-2 d-inline-block"></span>
              <h2 class="modal-title mb-2"></h2>
              <p class="blog-date mb-4"></p>
              <div class="blog-content"></div>
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

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script type="module" src="javaScripts/blogs.js"></script>
  </body>
</html>

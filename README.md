# VELORÉ — Luxury Skincare & Fragrance 3D Website

A high-end, award-winning style luxury e-commerce landing page built to demonstrate advanced front-end web development, 3D interactions, and premium aesthetics. 


///////////// http://localhost:5000/admin.html

This project utilizes cutting-edge CSS, Canvas APIs, and GSAP to create a deeply immersive, tactile, and sensory experience without relying on heavy WebGL frameworks like Three.js.

## 🛠 Technologies Used

### Core
*   **HTML5**: Semantic HTML structure for accessibility and SEO.
*   **CSS3**: Advanced modern CSS including custom properties (variables), Flexbox, CSS Grid, `backdrop-filter` for glassmorphism, dynamic `calc()`, and CSS animations/transitions.
*   **JavaScript (Vanilla ES6+)**: Modular and highly optimized custom JS for DOM manipulation, canvas rendering, and event handling.

### Libraries & Frameworks
*   **GSAP (GreenSock Animation Platform)**: The industry standard for robust, high-performance JavaScript animations. Used for advanced timeline sequencing and staggering elements.
*   **GSAP ScrollTrigger**: For complex, scroll-linked animations and pinning elements (like the massive 3D image sequences).
*   **Lenis**: A lightweight, robust smooth-scrolling library that perfectly syncs with GSAP's ScrollTrigger to provide a buttery-smooth, native-feeling scroll experience.

## ✨ Key Features & Interactions

### 1. 3D Canvas Image Sequencing
Instead of playing a video, the Hero and Story sections utilize HTML5 `<canvas>` elements to scrub through hundreds of high-resolution image frames tied perfectly to the user's scroll position. This creates a flawless, interactive "3D" cinematic effect.

### 2. Premium Product Cards (Glassmorphism & Parallax)
The product grid features advanced Awwwards-level 3D interactions:
*   **Deep Parallax**: Utilizing `transform-style: preserve-3d` and `translateZ()`, the product image, text, and buttons physically "float" at different depths inside the card when hovered.
*   **Dynamic Surface Glare**: A custom JS logic tracks the mouse position over the card to cast a realistic, sweeping light reflection across the glossy surface.
*   **Frosted Glass**: Cards use `backdrop-filter: blur()` to softly obscure the background, integrating them seamlessly into the environment.

### 3. Interactive Environment
*   **Silky Canvas Cursor Trail**: A custom-built Canvas 2D render that draws a smooth, fading, golden ribbon following the user's mouse path.
*   **Ambient Spotlight**: A subtle, screen-blend radial gradient overlay that follows the cursor, illuminating hidden background textures and massive watermarked text (`INTENTION`, `ETERNAL`).
*   **Magnetic Elements**: Footer links and CTA buttons possess "magnetic" physics, pulling slightly toward the cursor when approached.

### 4. Cinematic Micro-Aesthetics
*   **Infinite Editorial Marquee**: A massive, continuously scrolling typographic banner separating sections, providing dynamic horizontal kinetic energy.
*   **Advanced Text Reveals**: Headings use a custom `splitTextElements` utility to slice text into individual words, revealing them with a staggered, 3D fold-in animation on scroll.
*   **Custom Selection & Scrollbars**: Native browser scrollbars are hidden globally, and text highlighting is customized to brand colors (Gold on Black) for edge-to-edge immersion.
*   **Film Grain**: A persistent, animated low-opacity noise overlay adds an organic, cinematic texture to the entire site.

## 📁 Project Structure

```text
/
├── index.html           # Landing page with 3D Canvas sequences
├── shop.html            # E-commerce store with filtering and live cart
├── blog.html            # Dynamic journal/blog system
├── admin.html           # Full CRUD admin dashboard for products & posts
├── backend/
│   ├── server.js        # Node.js/Express API with MongoDB Mongoose models
│   └── .env             # Environment variables (DB, JWT, Payment keys)
├── css/
│   └── style.css        # Global design system, glassmorphism, responsive grids
├── js/
│   ├── animations.js    # GSAP ScrollTriggers & text reveals
│   ├── cart.js          # Unified local storage cart system
│   ├── auth.js          # JWT login/registration flows
│   └── link-products.js # Dynamic product DOM binding
└── README.md            # Project documentation
```

## 🚀 Features & Capabilities

- **Authentication System:** Secure JWT-based user login and registration.
- **E-commerce Engine:** Fully dynamic product inventory, live cart drawer, and order processing.
- **Payment Integration:** Razorpay integration ready for real-world transactions.
- **Admin Dashboard:** A responsive, glassmorphic control panel for managing products, orders, and blog posts.
- **Journal/CMS:** Built-in Markdown-supported blogging system with category filtering.
- **Performance Optimized:** Debounced particle rendering and GPU-accelerated GSAP transforms for fluid 60fps scrolling.

## 💻 How to Run (Full Stack Setup)

This project has been upgraded from a static frontend to a full **MERN stack** application.

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed
- A running [MongoDB](https://www.mongodb.com/) database (local or Atlas)
- (Optional) Razorpay API keys for checkout

### 2. Environment Setup
Create a `.env` file in the root directory and add your credentials:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_random_string
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_SECRET=your_razorpay_secret
```

### 3. Installation & Launch
Open your terminal in the project directory:

```bash
# Install backend dependencies
npm install

# Seed the database with initial products (Run once)
curl http://localhost:5000/api/seed 
# Or open the URL in your browser after the server starts

# Start the development server
npm run dev
# OR: node backend/server.js
```

The application will now be running at `http://localhost:5000`. Navigate to the URL to experience the platform.
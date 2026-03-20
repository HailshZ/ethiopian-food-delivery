# Ethiopian Food Delivery

**Bilingual Ethiopian food delivery website with Stripe payments**

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

This web application is a bilingual (likely Amharic and English) Ethiopian food delivery platform with integrated Stripe payments. Customers can browse menus, place orders, and pay securely online. The platform is designed for ease of use and accessibility for Ethiopian communities both locally and abroad.

---

## Features

- 🌐 **Bilingual Support**: Switch between two languages for broader accessibility.
- 🍲 **Menu Browsing**: View authentic Ethiopian food items and descriptions.
- 🛒 **Order Cart**: Add, remove, or update items before checkout.
- 💳 **Stripe Payments**: Secure and reliable payment integration.
- 📝 **Dynamic UI**: Responsive and visually appealing with EJS templating, JavaScript interactivity, and custom CSS.

---

## Tech Stack

- **Frontend:**  
  - EJS (Embedded JavaScript Templating) - 62.8%
  - JavaScript - 25.4%
  - CSS - 11.8%
- **Backend:**  
  - (Add info here, e.g. Node.js/Express if applicable)
- **Payments:**  
  - Stripe API

---

## Screenshots

<!-- Add screenshots/gifs here -->
<!-- Example: -->
<!-- ![Homepage Screenshot](screenshots/homepage.png) -->

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version X.X.X+)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- Stripe API keys (for production payments)

### Installation

1. **Clone the repository**
    ```bash
    git clone https://github.com/HailshZ/ethiopian-food-delivery.git
    cd ethiopian-food-delivery
    ```

2. **Install dependencies**
    ```bash
    npm install
    ```

3. **Configure environment variables**
    - Copy `.env.example` to `.env` and update with your Stripe keys and other configuration.

4. **Run the app**
    ```bash
    npm start
    ```
    - By default, the app will be available at `http://localhost:3000`

---

## Configuration

- **Stripe:**  
  Set your `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in the `.env` file.
- **Languages:**  
  The bilingual functionality likely uses a config or translation files to enable language switching. Refer to the `locales` or similar folder if present.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Acknowledgements

- [Stripe](https://stripe.com/) for payments
- Community contributors for translations and food descriptions

---

> Made with ❤️ for Ethiopian cuisine lovers!

# ✦ WordMasala AI

**WordMasala** is a premium, AI-powered text polishing application designed to transform your rough drafts into professional, tone-perfect content instantly. Whether you're writing a corporate email, a casual text, or a funny post, WordMasala ensures your message lands exactly how you intended.


## ✨ Key Features

- **🎯 Smart Polishing**: Instantly refines grammar, vocabulary, and flow.
- **🎭 Tone Selection**: Choose from 7+ distinct tones including *Corporate*, *Gen-Z*, *Funny*, and *Polite*.
- **🛡️ High Reliability**: Built-in **Multi-Provider Fallback** system. If the primary AI (Gemini) is busy or hits a limit, it automatically switches to **Groq (Llama 3.3)** to ensure 100% uptime.
- **💎 Premium UI**: A stunning Glassmorphism design featuring dynamic animated gradients and a modern medical-grade aesthetic.
- **🕒 Local History**: Your recent polishes are saved locally in your browser for quick access, with zero-cost persistence.
- **📱 Responsive Design**: Fully optimized for mobile, tablet, and desktop viewing.

## 🚀 Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript.
- **Backend**: Node.js & Express.
- **AI Engines**: 
  - [Google Gemini 2.0 Flash](https://ai.google.dev/)
  - [Groq Llama 3.3 70B](https://groq.com/)
- **Styling**: Modern CSS variables, Glassmorphism, and hardware-accelerated animations.

## 🛠️ Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/kashyap3037-crypto/Fix-My-Tone.git
   cd Fix-My-Tone
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_key
   GROQ_API_KEY=your_groq_key
   PORT=3000
   ```

4. **Run Locally**:
   ```bash
   node server.js
   ```
   Open `http://localhost:3000` in your browser.

## 🌐 Deployment

This project is optimized for deployment on **Render** or **Vercel**. 

- Ensure you add your `GEMINI_API_KEY` and `GROQ_API_KEY` to the environment variables in your deployment dashboard.
- The server will automatically use the correct port provided by the hosting environment.

## 📄 License

This project is licensed under the ISC License.

---
*Built with ✦ by WordMasala*

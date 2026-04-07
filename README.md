# NURA - Feed the Flow

<div align="center">
  <img width="200" alt="NURA Logo" src="./public/logo.jpg" />

  **AI-Powered Nutrition & Wellness Tracking**

  Align your nutrition with your natural rhythm using cutting-edge AI technology.

  [![PWA](https://img.shields.io/badge/PWA-Enabled-brightgreen)](https://nura.app)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-19.2-61dafb)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.2-646cff)](https://vitejs.dev/)
</div>

## 🌊 About NURA

NURA is a next-generation nutrition and wellness application that leverages Google's Gemini AI to help you achieve your health goals through personalized tracking, gamification, and flow state optimization.

### ✨ Key Features

- **🤖 AI-Powered Meal Logging**: Log meals via text, photo, or voice using Gemini AI
- **📊 Flow Score Tracking**: Real-time nutrition optimization score (0-100)
- **🎮 Gamification System**: Levels, streaks, XP, and achievements to keep you motivated
- **📅 Quarterly Planning**: AI-generated 3-month nutrition plans tailored to your biotype and goals
- **💧 Hydration Tracking**: Track water intake with social sharing features
- **📈 Progress Analytics**: Comprehensive charts and insights into your nutrition journey
- **🌙 Dark Mode**: Beautiful light and dark themes with smooth transitions
- **🌍 Multi-language**: Support for English, Portuguese, and Spanish
- **📱 PWA Support**: Install as a native app on any device
- **🔐 Secure Authentication**: Supabase auth with Google OAuth

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Supabase Account** (free tier works)
- **Google Gemini API Key** (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/nura.git
   cd nura
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the `.env.example` file to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   Then fill in your credentials:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

4. **Set up Supabase database**

   - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
   - Navigate to SQL Editor
   - Copy the contents of `supabase-schema.sql` and run it
   - This will create all necessary tables, RLS policies, and storage buckets

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**

   Navigate to `http://localhost:3000`

## 📦 Project Structure

```
nura/
├── public/              # Static assets (PWA icons, etc.)
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React context providers (Auth, etc.)
│   ├── services/        # API services (Supabase, Gemini, etc.)
│   ├── i18n/            # Internationalization files
│   ├── App.tsx          # Main application component
│   ├── index.tsx        # Application entry point
│   ├── types.ts         # TypeScript type definitions
│   └── constants.ts     # Application constants
├── supabase-schema.sql  # Database schema
├── tailwind.config.js   # Tailwind CSS configuration
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies and scripts
```

## 🔑 Getting API Keys

### Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key and add it to your `.env.local` file

### Supabase Setup

1. Visit [Supabase](https://supabase.com)
2. Create a new project
3. Go to Project Settings → API
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - Anon Public Key → `VITE_SUPABASE_ANON_KEY`
5. Run the `supabase-schema.sql` in the SQL Editor

## 🏗️ Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

To preview the production build:
```bash
npm run preview
```

## 🎨 Features Deep Dive

### AI Meal Logging

NURA uses Google's Gemini AI to analyze your meals:

- **Text Input**: "2 eggs, toast, and coffee" → AI calculates calories and macros
- **Photo Scan**: Take a photo of your meal → AI identifies food items and estimates nutrition
- **Voice Input**: Speak your meal → Speech-to-text + AI analysis

### Flow Score

Your Flow Score is calculated based on:
- Calorie adherence (within target range)
- Macro balance (protein, carbs, fats)
- Consistency (logging frequency)
- Hydration levels

Score ranges:
- **75-100**: In the Flow! 🌊 (optimal performance)
- **50-74**: On Track 📈
- **0-49**: Needs Adjustment 🎯

### Gamification

- **Levels**: Gain XP from daily logs and Flow days
- **Streaks**: Track consecutive days in Flow
- **Achievements**: Unlock badges for milestones
- **Social Feed**: Share progress with the community

### Quarterly Plans

AI-generated nutrition plans tailored to:
- **Biotype**: Ectomorph, Mesomorph, or Endomorph
- **Goal**: Aesthetic (muscle definition), Health (wellness), or Performance (strength)
- **Activity Level**: Sedentary, Moderate, or Intense

Plans are divided into 3 phases with progressive targets.

## 🛠️ Tech Stack

- **Frontend**: React 19.2, TypeScript 5.8
- **Build Tool**: Vite 6.2
- **Styling**: Tailwind CSS 4.2
- **UI/UX**: Framer Motion (animations), Recharts (charts)
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI**: Google Gemini 2.5 Flash
- **PWA**: vite-plugin-pwa with Workbox

## 🌐 Browser Support

NURA works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari (iOS 14+)

PWA installation is supported on:
- Android (Chrome)
- iOS (Safari - Add to Home Screen)
- Desktop (Chrome, Edge)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support

For support, email support@nura.app or open an issue in the GitHub repository.

## 🙏 Acknowledgments

- Google Gemini AI for powerful food recognition
- Supabase for seamless backend infrastructure
- The React and Vite communities for excellent tooling
- All contributors and testers

---

<div align="center">
  Made with ❤️ for the Flow State

  **[Website](https://nura.app)** • **[Documentation](https://docs.nura.app)** • **[Community](https://community.nura.app)**
</div>

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Anemia Management Assistant

This project is a React-based application for managing Anemia in CKD patients, based on 2026 KDIGO guidelines.

## Getting Started

### Prerequisites
- Node.js (v20 or higher recommended)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Available Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the app for production.
- `npm run preview`: Locally preview the production build.

## Deployment

This project uses **GitHub Actions** for automated deployment to **GitHub Pages**.

1. Go to **Settings > Pages** in your GitHub repository.
2. Under **Build and deployment**, ensure **Source** is set to **GitHub Actions**.
3. Push changes to the `main` branch. The workflow will automatically build and deploy the application.

## Operation Logs

### Initial Setup (2026-01-06)
- **Configured `package.json`**: Added necessary dependencies and type definitions.
- **Setup GitHub Actions**: Created `.github/workflows/deploy.yml` for automated deployment to GitHub Pages.
- **Configured `.gitignore`**: Added strict rules to ignore `.env`, `coverage`, and other unnecessary files.
- **Documentation**: Updated `README.md` with usage instructions and operation logs.

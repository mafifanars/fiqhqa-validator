# QAFiqih Validator

The QAFiqih Validator app provides a complete interface for annotating and validating datasets on Islamic jurisprudence (Fiqh). It's a collaborative tool for both administrators, who manage the project, and annotators, who perform the validation work.

## Table of Contents

- [Key Features](#key-features)
- [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation & Running](#installation--running)

## Key Features

*   **Dual User Roles:** Separate interfaces and functionalities for Admins and Annotators.
*   **Admin Dashboard:** A central hub to monitor overall project progress, annotator performance, and data statistics.
*   **Data Management:** Upload, view, filter, and manage annotation datasets.
*   **Task Assignment:** A flexible system to assign annotation tasks to annotators based on ranges or ID lists.
*   **Annotation Interface:** An efficient side-by-side view for reading articles and filling out detailed annotation forms.
*   **Pilot Test:** Functionality to run and manage separate pilot tests with dedicated datasets and progress tracking.
*   **Agreement Analysis:** Tools to measure and analyze inter-annotator agreement on overlapping data items.

## Built With

This project is built with a modern, type-safe technology stack:

*   [Next.js](https://nextjs.org/) - React Framework
*   [TypeScript](https://www.typescriptlang.org/) - Programming Language
*   [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
*   [ShadCN UI](https://ui.shadcn.com/) - Component Library
*   [Firebase](https://firebase.google.com/) - Backend (specifically Firestore for the database)
*   [Genkit](https://firebase.google.com/docs/genkit) - Generative AI Toolkit

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Ensure you have Node.js and npm installed on your machine.
*   npm
    ```sh
    npm install npm@latest -g
    ```

### Installation & Running

1.  **Clone the repository** (if applicable) or ensure you are in the project's root directory.

2.  **Install NPM packages:**
    ```sh
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory. This project uses Firebase, so you will need to populate it with your Firebase project configuration if it's not already configured.

4.  **Run the development server:**
    The application runs on port 9002.
    ```sh
    npm run dev
    ```

5.  **Run the Genkit development server (in a separate terminal):**
    This is required for AI-related features.
    ```sh
    npm run genkit:dev
    ```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

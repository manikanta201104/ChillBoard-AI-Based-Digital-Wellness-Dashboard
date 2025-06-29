# ChillBoard - AI-Based Digital Wellness Dashboard - Day 40

## Overview
Welcome to Day 40 of the ChillBoard project! On July 11, 2025, we added a contact form to the About/Help page, enhancing user support and professionalism.

## Features Added
- **Frontend Update**: Added a “Contact Us” section to the About/Help page with a form for “Name,” “Email,” and “Message,” and a “Submit” button.
- **Backend Endpoint**: Created POST `/contact` to log form data to the console and save to a `ContactMessages` collection in MongoDB.
- **Functionality**: Displays a success or error message after submission.

## Setup Instructions

### Prerequisites
- Node.js, npm, and MongoDB installed.
- `.env` with `MONGO_URI`, `JWT_SECRET`, and other credentials (from Day 24).
- Frontend and backend running (see Day 24 README).

### Backend Setup
1. Navigate to `ChillBoard/Backend/` and run `npm install`.
2. Ensure `type: module` is set in `package.json`.
3. Update `index.js` to include `routes/contact.js` (see file changes).
4. Run `nodemon index.js` to start the server.

### Frontend Setup
1. Navigate to `ChillBoard/frontend/` and run `npm install`.
2. Run `npm start` to launch the app at `http://localhost:3000`.

## Usage
1. **Navigate to About/Help**:
   - Go to `http://localhost:3000/about`.
   - Scroll to the “Contact Us” section.
2. **Submit Form**:
   - Fill with “Test User,” “test@example.com,” “Help needed.”
   - Click “Submit”; expect “Message sent successfully” and data in console/MongoDB.
3. **Test Errors**:
   - Leave fields blank or enter invalid email; expect “Failed to send message.”
4. **Verify Data**:
   - Check MongoDB `ContactMessages` collection or console logs.

## File Changes
### Backend
- **`routes/contact.js`**: Added POST `/contact` to handle form submissions.
- **`models/ContactMessage.js`**: Created schema for contact messages.
- **`index.js`**: Updated to include `contactRoutes`.

### Frontend
- **`src/pages/About.js`**: Added “Contact Us” form and submission logic.
- **`src/utils/api.js`**: Added `sendContactMessage` function.

## Testing
- **Form Test**: Submit valid data; verify success message and data save.
- **Error Test**: Submit invalid data; expect error message.
- **Reset Test**: Reload page; ensure form clears after success.
- **No Auth Test**: Submit without login; expect `200` (no auth required).

## Challenges and Solutions
- **Data Persistence**: Used a temporary MongoDB collection; plan to add email integration later.
- **UI Feedback**: Added a 3-second message timeout for user confirmation.

## Future Improvements
- Integrate an email service (e.g., Nodemailer) for contact submissions.
- Add CAPTCHA to prevent spam.
- Include a response confirmation feature.

## Contributors
- [Your Name] - Lead Developer

## License
- MIT License

## Acknowledgements
- Thanks to xAI for support and MongoDB for data storage.

## Commit Message
"Add contact form to About/Help page with backend logging on Day 40"
# Dark Pot - Team Retrospective Tool

Dark Pot is a modern, real-time team retrospective tool that makes retrospective meetings more engaging and effective. It facilitates anonymous feedback collection and structured discussion through a peer-to-peer connection system.

## Features

- **Anonymous Card Submission**: Team members can submit feedback cards anonymously, encouraging honest and open communication
- **Real-time Collaboration**: Uses peer-to-peer connections for instant updates across all participants
- **Random Topic Selection**: Host can randomly select cards for discussion, maintaining an unbiased flow
- **Session Management**:
  - Create new retrospective sessions
  - Join existing sessions via session ID
  - Reset sessions for recurring meetings
- **Role-based Access**:
  - Host controls: Topic selection, session reset, view all cards
  - Participant features: Anonymous card submission, view own cards
- **Modern UI/UX**:
  - Responsive design for all devices
  - Smooth animations and transitions
  - Clean, intuitive interface

## Tech Stack

- React + TypeScript
- Vite for build tooling
- Framer Motion for animations
- Peer.js for P2P connections
- Tailwind CSS for styling

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

1. **Create a Session**:
   - Click "Create New Session"
   - Enter a session name
   - Share the generated session ID with your team

2. **Join a Session**:
   - Click "Join Existing Session"
   - Enter the session ID shared by the host
   - Start participating in the retrospective

3. **During the Session**:
   - Submit feedback cards anonymously
   - Host can randomly select topics for discussion
   - View your submitted cards
   - Host can view all submitted cards
   - Use the share button to invite more participants

4. **Start a New Session**:
   - Host can reset the session
   - All cards will be cleared
   - New session ID will be generated

## Demo
 ※ Split due to Git size conversion constraints
- [Step1](./docs/part1.gif)
- [Step2](./docs/part2.gif)
- [Step3](./docs/part3.gif)

## Development

- Build for production:
  ```bash
  npm run build
  ```
- Preview production build:
  ```bash
  npm run preview
  ```

## License

© 2025 Dark Pot Retrospective Tool. All rights reserved.

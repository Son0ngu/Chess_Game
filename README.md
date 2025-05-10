# Chess Game - Secure Real-Time Web Application

![Chess Game Banner](https://img.shields.io/badge/Chess-Game-brightgreen)
[![React](https://img.shields.io/badge/React-v18-blue)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v16-green)](https://nodejs.org/)
[![Security](https://img.shields.io/badge/Security-Enhanced-red)](https://github.com/yourusername/chess-game)

A secure, real-time web-based chess platform allowing users to play matches online with friends or random opponents. Built with modern web technologies and emphasis on security, user experience, and scalability.

## 🎯 Live Demo

**Play now:** [https://chess-79bd8.web.app/](https://chess-79bd8.web.app/)


## ✨ Features

- **Real-time multiplayer chess** with standard rules implementation
- **Secure authentication** using JWT and CAPTCHA verification
- **End-to-end encryption** via HTTPS with custom SSL certificates
- **Account recovery** with secure password reset workflow
- **Flexible gameplay options** with public/private game rooms
- **Cross-platform design** optimized for desktop and mobile

## 🛠️ Technology Stack

<table>
  <tr>
    <th>Frontend</th>
    <th>Backend</th>
    <th>Security</th>
  </tr>
  <tr>
    <td>
      <ul>
        <li>React.js</li>
        <li>Socket.IO client</li>
        <li>Tailwind CSS</li>
      </ul>
    </td>
    <td>
      <ul>
        <li>Node.js + Express</li>
        <li>MongoDB + Mongoose</li>
        <li>Socket.IO server</li>
      </ul>
    </td>
    <td>
      <ul>
        <li>JWT authentication</li>
        <li>Google reCAPTCHA</li>
        <li>Self-signed HTTPS (cfssl)</li>
        <li>Input validation</li>
        <li>DoS mitigation</li>
        <li>bcrypt password hashing</li>
      </ul>
    </td>
  </tr>
</table>

## 🚀 Deployment

- **Backend:** Deployed on [Render](https://render.com/)
- **Frontend:** Deployed on [Firebase Hosting](https://firebase.google.com/docs/hosting)


## 👥 Team Members

- **Bui Xuan Son**
  - Backend development
  - JWT authentication
  - Password authentication
  - CAPTCHA implementation

- **Phan Viet Anh**
  - Frontend development
  - HTTPS implementation
  - Input validation
  - DoS mitigation
  - Documentation

- **Nguyen Khoi Nguyen**
  - WebSocket connection
  - Password recovery
  - Output sanitization
  - Security testing


---

<p align="center">
  Made with ❤️ by the LoneLy Star Team
</p>

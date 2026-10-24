# Task Manager API

A REST API for managing tasks with user accounts, built for an API testing assessment.

## Project Information

- **Base URL:** `http://localhost:5000/api`
- **Authentication:** JWT Bearer Token
- **Technologies:** Node.js, Express.js, JWT, bcrypt, Postman

## Features

- User account registration and authentication
- JWT-based authentication for protected endpoints
- Task management operations

*Confirm these features against the implemented endpoints before submission.*

## Prerequisites

- Node.js and npm installed
- Git installed (optional)

## Installation and Setup

1. Clone this repository:

   ```bash
   git clone https://github.com/ummasalmaakterjoty/API-Testing.git                              
   ```

2. Navigate into the project folder:

   ```bash
   cd task-api
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Start the server using the command configured in `package.json`. For example, if the start script is `start`:

   ```bash
   npm start
   ```

5. The API is expected to be available at `http://localhost:5000/api` when the server starts successfully.

## API Testing

The API was prepared for testing with Postman. The test report documents the scenarios, expected results, actual results, and evidence.

## Data Storage

Data is stored in memory and resets when the server restarts.

## Assessment Note

This project was built for an API testing assessment.

## Security Note

Do not commit real passwords, JWT tokens, secret keys, or environment files to the public repository.

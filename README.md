# Are You Learning Dev

An interactive learning platform for Aptos Move development, featuring a workshop-based learning system, contract deployment tools, and data processing capabilities.

## Project Structure

```
.
├── frontend/          # React-based web application
├── backend/          # Express.js API server
└── move/             # Move smart contracts
```

## Prerequisites

- Node.js (v18 or higher)
- pnpm (for frontend package management)
- npm (for backend package management)
- Aptos CLI (for Move contract development)

## Getting Started

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Configure the following variables:
   - `PORT`: Backend server port (default: 3001)
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `APTOS_NODE_URL`: Aptos node URL

4. Start the development server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Authenticate with Google Artifact Registry:
    ```shell
    gcloud auth login --update-adc
    ```

    Once authenticated, run the below to authenticate against the private registry itself:
    ```shell
    pnpm artifactregistry-login
    ```

4. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Configure the following variables:
   - `VITE_APTOS_NODE_URL`: Aptos node URL

5. Start the development server:
   ```bash
   pnpm dev
   ```

The application will be available at `http://localhost:5173`

## Features

### Workshop System
- Interactive Move programming tutorials
- Step-by-step learning progress
- Code highlighting and explanations
- Line-by-line descriptions for better understanding

### Contract Development
- Monaco-based code editor with Move syntax highlighting
- Contract compilation and deployment
- Network selection (devnet/testnet/mainnet)
- Contract verification support

### Contract Explorer
- Browse deployed contracts
- View contract modules and resources
- Interact with contract functions
- Monitor contract events

### Data Processing
- Event tracking and processing
- Custom data transformations
- Real-time monitoring
- Configurable processing rules

## Development

### Move Contracts

The Move contracts are located in the `move/` directory. The main package is `meme_factory`, which includes:
- Fungible asset implementation
- Meme coin creation and management
- Security controls and admin features

To compile Move contracts:
```bash
cd move
aptos move compile
```

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.

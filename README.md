# Code Room

Code Room is a collaborative code editor with an online compiler for JavaScript, Python, C++, and Java.

## Run locally

1. Copy `server/.env.example` to `server/.env` and set `ONLINECOMPILER_API_KEY` to your OnlineCompiler API key. Keep this key in the server environment; it is never sent to the browser.
2. In one terminal, start the Express and Socket.IO server:

   ```sh
   cd server
   npm install
   npm start
   ```

3. In another terminal, start the React client:

   ```sh
   cd client
   npm install
   npm start
   ```

The client runs on port 3000 and proxies `/api` requests to the server on port 5001. For a separately hosted client, set `REACT_APP_BACKEND_URL` to the Express server's public origin before building the client (for example, `https://your-api.example.com`). Rebuild the client after changing this value.

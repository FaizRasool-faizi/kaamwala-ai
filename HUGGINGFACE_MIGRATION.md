# KaamWala AI: Hugging Face Spaces Backend Migration Guide 🚀

This guide provides step-by-step instructions to migrate the **KaamWala AI** Node.js/Express backend from Render to **Hugging Face Spaces**.

---

## Why Hugging Face Spaces? 🌟

Compared to Render, Fly.io, or Vercel, Hugging Face Spaces (Docker SDK) is the **absolute best truly free option** for this codebase:

| Feature | Hugging Face Spaces | Render (Free) | Vercel (Free) |
| :--- | :--- | :--- | :--- |
| **Credit Card Required** | **NO (100% Free)** | Yes (for many) | No |
| **Persistent WebSockets** | **YES (Flawless socket.io)** | No / Severe Limits | No (Serverless fails) |
| **RAM / CPU Resources** | **16 GB RAM / 2 vCPUs** | 512 MB RAM / 0.1 CPU | Serverless Limits |
| **Active 24/7** | **Yes (wakes up on traffic)** | Auto-sleeps (slow spin) | N/A (Serverless) |

Since **KaamWala AI** uses `socket.io` for live expert tracking and real-time location updates, **serverless platforms like Vercel will fail**. Hugging Face Spaces runs a persistent Docker container, making it perfect for your real-time WebSocket architecture.

---

## Step 1: Create a Free Hugging Face Account & Space 👤

1. **Sign Up / Log In**: Visit [huggingface.co](https://huggingface.co/) and create a free account (no credit or debit card is required).
2. **Create a New Space**:
   - Go to [huggingface.co/new-space](https://huggingface.co/new-space).
   - **Space Name**: Enter `kaamwala-backend` (or a name of your choice).
   - **License**: Choose `mit` (or leave blank).
   - **SDK**: Select **Docker** (Critical!).
   - **Docker Template**: Select **Blank** (Do not select any template).
   - **Space Hardware**: Choose **CPU Basic (Free • 16GB RAM • 2 vCPU)**.
   - **Visibility**: Set to **Public** (required for the Next.js client to access the API).
   - Click **Create Space**.

---

## Step 2: Configure Environment Variables (Secrets) 🔒

Your backend requires several API keys to communicate with Firestore, Google Maps, and Gemini.

1. In your newly created Hugging Face Space, click on the **Settings** tab (top right).
2. Scroll down to the **Variables and Secrets** section.
3. Click **New Secret** for each of the following keys and enter their respective values from your `server/.env` file:

| Secret Name | Value (Copy from `server/.env`) |
| :--- | :--- |
| `GOOGLE_CLOUD_PROJECT` | `your-google-cloud-project-id` |
| `GEMINI_API_KEY` | `your-gemini-api-key` |
| `GEMINI_MODEL` | `gemini-1.5-flash-latest` |
| `GOOGLE_MAPS_API_KEY` | `your-google-maps-api-key` |
| `GROQ_API_KEY` | `your-groq-api-key` |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |

*Note: You do NOT need to set the `PORT` secret; Hugging Face automatically overrides and assigns port `7860`, which our `Dockerfile` is already pre-configured to listen to.*

---

## Step 3: Deploy the Backend Code 🚢

Hugging Face Spaces expects the `Dockerfile` to be in the **root** of the Git repository pushed to the Space. Because our `Dockerfile` is inside the `server/` subdirectory, we will initialize a Git repository inside the `server/` directory and push it directly to your Hugging Face Space.

### Run these commands in your terminal:

```powershell
# 1. Navigate to your server folder
cd d:\Faiz\hackhthon\kaamwala-ai\server

# 2. Initialize a new Git repository inside the server folder
git init

# 3. Add all files in the server folder
git add .

# 4. Commit the backend files
git commit -m "Initialize Hugging Face Spaces deployment"

# 5. Rename branch to main
git branch -M main

# 6. Add your Hugging Face Space as the git remote
git remote add origin https://huggingface.co/spaces/FaizRasool01/kaamwala-backend

# 7. Force push your code to trigger the build
# (You will be prompted for your Hugging Face Username and your HF Access Token as the password)
git push -u origin main --force
```

### ⚡ Easy Option: Automated PowerShell Deployment Script
To make it even simpler, I have generated an automated deploy script at [server/deploy.ps1](file:///d:/Faiz/hackhthon/kaamwala-ai/server/deploy.ps1). You can run this file directly in a PowerShell window to handle all Git steps automatically!
```powershell
cd d:\Faiz\hackhthon\kaamwala-ai\server
.\deploy.ps1
```

### 🔑 Getting a Hugging Face Access Token:
When running `git push` or using the deploy script, your standard Hugging Face account password will **not** work. You must use a personal access token:
1. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens).
2. Click **New token**.
3. Set token name to `kaamwala-deploy`, select **Write** permissions, and click **Generate a token**.
4. Copy the generated token and use it as your password when Git prompts you.

---

## Step 4: Verify the Backend is Running Successfully 🧪

1. Once the push completes, go to your Space's page on Hugging Face.
2. You will see a status bar showing **Building** ➡️ **Running**.
3. Under the **Logs** tab in your Space, you should see the successful server startup logs:
   ```text
   🚀 Server running on port 7860
   ```
4. Your API is hosted at your Direct URL:
   - **`https://faizrasool01-kaamwala-backend.hf.space`**

---

## Step 5: Update the Frontend API URLs 🔗

Now that your backend is running on Hugging Face, we need to point the frontend Next.js app to the new production URL.

1. Open the frontend environment file at: `client/.env.local`
2. Update the `NEXT_PUBLIC_API_URL` variable with your direct Hugging Face Space URL:
   ```env
   NEXT_PUBLIC_API_URL=https://faizrasool01-kaamwala-backend.hf.space
   ```
3. Save the file. (Done!)
4. Restart your frontend server in the `client` directory:
   ```bash
   npm run dev
   ```

---

### 🎉 Congratulations! Your backend is now 100% migrated to a premium, high-resource, truly free hosting platform with full WebSockets support and zero card verification!

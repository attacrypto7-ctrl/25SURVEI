# Hosting Survei 25 on Netlify (Serverless Mode)

I have configured your application to run on Netlify using **Netlify Functions**. This allows your Express app to run without a traditional server.

## Prerequisites

1.  **GitHub Account**: You must push this code to a GitHub repository.
2.  **Netlify Account**: You must be logged in to Netlify.
3.  **MongoDB Atlas**: Your database is already set up, but ensure your **IP Whitelist** in MongoDB Atlas includes `0.0.0.0/0` (Allow Anywhere) because Netlify's IP addresses change constantly.

## Step-by-Step Deployment

1.  **Push to GitHub**:
    -   Create a new repository on GitHub.
    -   Run these commands in your project folder:
        ```bash
        git init
        git add .
        git commit -m "Initial deploy"
        git branch -M main
        git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
        git push -u origin main
        ```

2.  **Connect to Netlify**:
    -   Go to [Netlify.com](https://www.netlify.com/) and log in.
    -   Click **"Add new site"** -> **"Import from existing project"**.
    -   Select **GitHub**.
    -   Choose your `survei-25` repository.

3.  **Configure Build Settings** (Netlify should detect these automatically, but double-check):
    -   **Base directory**: (leave empty)
    -   **Build command**: (leave empty, or `npm install`)
    -   **Publish directory**: (leave empty, or `public`) -> *Actually, for Functions, we usually rely on `netlify.toml` which I have created for you.*

4.  **Add Environment Variables (CRITICAL)**:
    -   In the Netlify setup screen (or later in Site Settings -> Environment variables), add:
        -   Key: `MONGODB_URI`
        -   Value: `mongodb+srv://yayasankanayamuliaindonesia_db_user:xPmpuiIOd6ifsDBA@cluster0.mbgkxri.mongodb.net/antigravity?retryWrites=true&w=majority&appName=Cluster0`
        -   Key: `SESSION_SECRET`
        -   Value: `survei25-secret-key-2025`

5.  **Deploy Site**:
    -   Click **"Deploy site"**.

## Troubleshooting
-   If you see "Server Error", check the **Function Logs** in Netlify (Site -> Functions -> api -> Logs).
-   Ensure MongoDB Atlas Network Access is set to `0.0.0.0/0`.
-   The app might be slightly slower on the first load (Cold Start), this is normal for serverless functions.

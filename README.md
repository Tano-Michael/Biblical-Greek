# Tano's Koine Academy

A Vercel-ready Biblical Greek learning site built with Next.js, React, TypeScript and Tailwind CSS.

## Deploy correctly

1. Extract this ZIP.
2. Create an empty GitHub repository.
3. Upload the extracted files and folders. `package.json` must be visible at the repository's top level.
4. In Vercel, select **Add New → Project** and import the repository.
5. Confirm **Framework Preset: Next.js**.
6. Leave **Output Directory** empty/default.
7. Deploy.

Do not upload the ZIP file itself into GitHub. Do not place all project files inside another folder unless you also select that folder as Vercel's Root Directory.

## If Vercel displays 404

Open **Project → Settings → Build and Deployment** and check:

- Root Directory: repository root (`.`), unless `package.json` is inside a named subfolder.
- Framework Preset: Next.js.
- Build Command: Default or `npm run build`.
- Output Directory: Default/empty.

Save changes, then open **Deployments**, select the latest deployment, and choose **Redeploy**.

## Current data storage

Lessons and learner progress remain unchanged. Progress is stored in each learner's browser. A Supabase account system and central teacher dashboard can be added to this same project later.

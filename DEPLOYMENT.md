# GitHub Pages Deployment Guide

This repository is pre-configured for GitHub Pages deployment. Follow these steps to publish your Spotify Canvas Generator online.

## 🚀 Quick Deployment

### Step 1: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under "Source", select **GitHub Actions**
5. The site will automatically deploy on the next push to `main`

### Step 2: Update URLs (Important!)
Before deploying, update these placeholders in the code:

1. **README.md**: Replace `yourusername` with your GitHub username (already updated to spencersmolen)
2. **index.html**: Update the og:url and og:image meta tags with your actual GitHub Pages URL (already updated)

### Step 3: Push to Main Branch
```bash
git add .
git commit -m "Configure for GitHub Pages deployment"
git push origin main
```

### Step 4: Access Your Site
Your site will be available at:
```
https://spencersmolen.github.io/spotify-canvas
```

## 🔧 Configuration Files

This repository includes these deployment files:

- **`.github/workflows/deploy.yml`** - Automatic deployment workflow
- **`.nojekyll`** - Ensures all files are served correctly
- **`CNAME.template`** - Template for custom domain (optional)

## 🌐 Custom Domain (Optional)

To use a custom domain:

1. **Create CNAME file**:
   ```bash
   echo "your-domain.com" > CNAME
   ```

2. **Configure DNS** at your domain provider:
   - Add a CNAME record pointing to `spencersmolen.github.io`

3. **Update repository settings**:
   - Go to Settings → Pages
   - Enter your custom domain
   - Enable "Enforce HTTPS"

## 🔄 Automatic Updates

The deployment workflow runs automatically when you:
- Push to the `main` branch
- Create a pull request to `main`

## 📊 Monitoring

After deployment, you can:
- Check the **Actions** tab for deployment status
- View build logs if deployment fails
- Monitor site performance via GitHub Insights

## 🎯 SEO Optimization

The repository includes:
- Proper meta tags for social sharing
- Open Graph images
- Descriptive titles and descriptions
- Mobile-responsive design

## 🐛 Troubleshooting

**Deployment fails?**
- Check the Actions tab for error logs
- Ensure all file paths are correct
- Verify no files exceed GitHub's size limits

**Site not loading?**
- Wait 5-10 minutes after first deployment
- Check that GitHub Pages is enabled in settings
- Verify the repository is public (or you have GitHub Pro/Team)

**Assets not loading?**
- Ensure all asset paths are relative
- Check that asset files are committed to the repository
- Verify file names match exactly (case-sensitive)

## 📝 Next Steps

1. **Update branding**: Replace placeholder URLs with your actual GitHub Pages URL
2. **Custom analytics**: Add Google Analytics or similar tracking
3. **Performance monitoring**: Set up monitoring tools
4. **Social media**: Share your canvas generator!

---

Your Spotify Canvas Generator is now ready for the world! 🎵✨
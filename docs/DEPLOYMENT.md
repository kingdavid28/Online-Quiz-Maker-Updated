# Deployment Guide

## 🚀 Overview

Complete guide for deploying the Online Quiz Maker to production.

## 🌐 Production Deployment

### Vercel Deployment (Recommended)

#### Prerequisites
- Vercel account
- Supabase project
- Domain (optional)

#### Step 1: Prepare Environment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

#### Step 2: Environment Variables

Set these in Vercel dashboard:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_OPENAI_API_KEY=your_openai_key
```

#### Step 3: Deploy

```bash
# Deploy to production
npx vercel --prod

# Deploy with custom domain
npx vercel --prod --domain your-domain.com
```

#### Step 4: Verify Deployment

1. **Visit the deployed URL**
2. **Test authentication flow**
3. **Verify database connection**
4. **Test quiz creation**
5. **Check analytics**

### Alternative Deployments

#### Netlify

```bash
# Build for Netlify
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

#### AWS S3 + CloudFront

```bash
# Build
npm run build

# Deploy to S3
aws s3 sync dist/ s3://your-bucket-name

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

#### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t online-quiz-maker .
docker run -p 3000:3000 online-quiz-maker
```

## 🔧 Configuration

### Build Optimization

#### Vite Config
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Cache busting
        entryFileNames: `assets/quiz-[hash].js`,
        chunkFileNames: `assets/chunk-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    },
    // Optimize chunks
    chunkSizeWarningLimit: 1000
  },
  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
});
```

#### Environment Variables

**Production:**
```env
VITE_SUPABASE_PROJECT_ID=prod_project_id
VITE_SUPABASE_ANON_KEY=prod_anon_key
VITE_OPENAI_API_KEY=prod_openai_key
VITE_APP_ENV=production
```

**Development:**
```env
VITE_SUPABASE_PROJECT_ID=dev_project_id
VITE_SUPABASE_ANON_KEY=dev_anon_key
VITE_OPENAI_API_KEY=dev_openai_key
VITE_APP_ENV=development
```

## 🔒 Security

### HTTPS Required

- **Always use HTTPS** in production
- **Redirect HTTP to HTTPS**
- **Use secure cookies**

### CORS Configuration

```typescript
// Supabase CORS settings
const corsConfig = {
  origins: ['https://your-domain.com', 'https://www.your-domain.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  headers: ['Content-Type', 'Authorization']
};
```

### Environment Security

```bash
# Use .env.production
VITE_SUPABASE_PROJECT_ID=your_secure_project_id
VITE_SUPABASE_ANON_KEY=your_secure_anon_key

# Never commit secrets to git
echo ".env.production" >> .gitignore
```

## 📊 Monitoring

### Vercel Analytics

1. **Enable Vercel Analytics**
2. **Monitor performance metrics**
3. **Track user behavior**
4. **Set up error alerts**

### Custom Monitoring

```typescript
// Error tracking
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Send to monitoring service
});

// Performance monitoring
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Performance entry:', entry);
  }
});
observer.observe({ entryTypes: ['navigation', 'resource'] });
```

### Health Checks

```typescript
// Add health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Environment Setup

```bash
# GitHub Secrets
VERCEL_TOKEN=your_vercel_token
ORG_ID=your_org_id
PROJECT_ID=your_project_id
```

## 🚀 Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist

# Optimize imports
npx vite-bundle-analyzer dist --mode=analyze
```

### Caching Strategy

```typescript
// Service worker for caching
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/assets/quiz-[hash].js',
        '/assets/quiz-[hash].css'
      ]);
    })
  );
});
```

### Image Optimization

```typescript
// Lazy load images
const lazyImages = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      imageObserver.unobserve(img);
    }
  });
});

lazyImages.forEach(img => imageObserver.observe(img));
```

## 🐛 Troubleshooting

### Common Issues

#### Build Failures
```bash
# Clear cache and rebuild
npm run build -- --force
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Deployment Errors
```bash
# Check Vercel logs
npx vercel logs

# Redeploy with force
npx vercel --prod --force

# Check environment variables
npx vercel env ls
```

#### Cache Issues
```bash
# Clear Vercel cache
npx vercel projects ls
npx vercel projects rm <project-name>
npx vercel --prod
```

#### Database Connection Issues
- Verify Supabase project URL and anon key
- Check RLS policies are enabled
- Ensure database tables exist
- Test connection in Supabase dashboard

#### Authentication Issues
- Clear browser localStorage
- Check Supabase auth configuration
- Verify CORS settings in Supabase
- Test with fresh browser session

#### Runtime Errors
1. **Check browser console** for JavaScript errors
2. **Verify network requests** in DevTools
3. **Check authentication flow** - tokens, sessions
4. **Validate environment variables** in production

### Debug Mode

```javascript
// Enable debug logging in production
localStorage.setItem('debug', 'true');

// Check environment
console.log('Environment:', import.meta.env.MODE);
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_PROJECT_ID);
```

### Common Error Messages

#### "Invalid Refresh Token"
```bash
# Solution: Clear local storage and re-login
localStorage.clear();
location.reload();
```

#### "Schema cache issue detected"
```bash
# Solution: Wait a few minutes and retry
# The system has automatic retry logic
```

#### "Cannot find 'question' column"
```bash
# Solution: Check database schema
# Ensure tables exist with correct column names
```

#### "violates check constraint"
```bash
# Solution: Check question_type values
# Must be: 'multiple_choice', 'true_false', 'short_answer'
```

### Performance Issues

#### Slow Loading
- Enable CDN in Vercel dashboard
- Optimize images and assets
- Check bundle size with `npm run build`
- Enable gzip compression

#### Memory Issues
- Check for memory leaks in React components
- Optimize large data sets
- Use React.memo for expensive renders
- Implement virtual scrolling for large lists

### Security Issues

#### CORS Errors
```typescript
// In Supabase dashboard > Settings > API
// Add your domain to CORS origins
https://your-domain.com
https://www.your-domain.com
```

#### Authentication Errors
- Verify JWT token configuration
- Check RLS policies
- Ensure proper session management
- Test with different user roles

## 📈 Scaling

### Database Optimization

```sql
-- Add indexes for performance
CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX idx_attempts_quiz_id ON quiz_attempts(quiz_id);
```

### CDN Configuration

```typescript
// Configure CDN
const CDN_CONFIG = {
  baseUrl: 'https://cdn.your-domain.com',
  version: process.env.npm_package_version,
  cache: 'max-age=31536000'
};
```

### Load Balancing

```yaml
# Docker Compose for scaling
version: '3.8'
services:
  app:
    image: online-quiz-maker
    deploy:
      replicas: 3
    environment:
      - NODE_ENV=production
```

## 🔄 Rollback Strategy

### Quick Rollback

```bash
# Vercel rollback
npx vercel rollback

# Git rollback
git checkout previous-commit
npx vercel --prod
```

### Blue-Green Deployment

```bash
# Deploy to staging
npx vercel --prod --scope staging

# Test staging deployment
# Promote to production
npx vercel promote --scope staging
```

## 📋 Checklist

### Pre-Deployment Checklist

- [ ] **Environment variables** configured
- [ ] **Database migrations** run
- [ ] **Build process** tested locally
- [ ] **SSL certificate** configured
- [ ] **Domain DNS** configured
- [ ] **Monitoring** set up
- [ ] **Error tracking** configured
- [ ] **Performance testing** completed
- [ ] **Security scan** performed
- [ ] **Backup strategy** in place

### Post-Deployment Checklist

- [ ] **Application loads** correctly
- [ ] **Authentication** works
- [ ] **Database connection** stable
- [ ] **All features** functional
- [ ] **Mobile responsive** design
- [ ] **Analytics** tracking
- [ ] **Error monitoring** active
- [ ] **Performance** acceptable
- [ ] **SEO meta tags** present
- [ ] **Social sharing** works

---

## 🎉 Summary

This deployment guide covers:

- ✅ **Vercel Deployment** - Recommended production setup
- ✅ **Security Configuration** - HTTPS, CORS, environment variables
- ✅ **Performance Optimization** - Bundle analysis, caching, CDN
- ✅ **Monitoring & Analytics** - Error tracking, performance metrics
- ✅ **CI/CD Pipeline** - Automated deployment workflow
- ✅ **Troubleshooting** - Common issues and solutions
- ✅ **Scaling Strategy** - Load balancing, database optimization

**Deploy your quiz maker with confidence!** 🚀

### Quick Deploy Command
```bash
npx vercel --prod
```

### Verify Deployment
Visit your URL and test all features before going live!

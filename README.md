# RefashionAI

RefashionAI is a Next.js application that uses AI to generate fashion model images wearing uploaded clothing items. It features background removal capabilities for better AI generation results.

## Features

- AI-powered fashion model image generation
- Background removal for clothing images using Visionatrix API
- User authentication and history tracking
- Multiple AI model support (Gemini API)
- Responsive web interface

## Environment Variables

### Required
```env
# Gemini API Keys (at least one required)
GEMINI_API_KEY_1=your_gemini_api_key_1
GEMINI_API_KEY_2=your_gemini_api_key_2
GEMINI_API_KEY_3=your_gemini_api_key_3

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

### Optional
```env
# Background Removal (Visionatrix API)
VISIONATRIX_API_URL=http://localhost:8288  # Default: localhost:8288
VISIONATRIX_USERNAME=admin                 # Default: admin
VISIONATRIX_PASSWORD=admin                 # Default: admin

# Docker Environment (for file permissions)
PUID=1000                                  # User ID
PGID=1000                                  # Group ID
```

## Background Removal Setup

The background removal feature uses the Visionatrix API. To enable it:

1. Set up a Visionatrix server instance
2. Configure the environment variables above
3. The feature will automatically become available when the API is accessible

The background removal toggle will appear in the upload section when the service is available.

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) to view the application.

## Project Structure

- `src/components/` - React components
- `src/ai/` - AI service integrations
- `src/actions/` - Server actions
- `public/uploads/` - File storage directory
- `user_data/` - User history data

## Docker Support

The application includes Docker support with proper file permissions for unRAID and similar environments.

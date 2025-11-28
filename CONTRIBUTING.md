# Contributing to ReactiGIF

Thank you for your interest in contributing to ReactiGIF! We welcome contributions from the community and are grateful for any help you can provide.

> **📝 Note:** ReactiGIF was originally built as a Thirdweb x402 payment protocol demo (paid model). It was migrated to a free, authenticated service in November 2025. See [MIGRATION_CHANGES.md](MIGRATION_CHANGES.md) for historical context. The current codebase uses Clerk, Prisma, and Upstash Redis.

## 🌟 Ways to Contribute

- 🐛 **Report bugs** - Found a bug? Open an issue with details
- ✨ **Suggest features** - Have an idea? We'd love to hear it
- 📝 **Improve documentation** - Help make our docs clearer
- 🔧 **Fix issues** - Pick up an issue and submit a PR
- 🎨 **Improve UI/UX** - Make the app more beautiful and usable
- ⚡ **Optimize performance** - Help make ReactiGIF faster

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Git
- A GitHub account

### Fork and Clone

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:

```bash
git clone https://github.com/YOUR_USERNAME/x402-gif-generator.git
cd x402-gif-generator
```

3. **Add upstream remote**:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/x402-gif-generator.git
```

### Install Dependencies

```bash
pnpm install
```

### Set Up Environment Variables

Create a `.env.local` file with the required API keys:

```env
# AI Services
GROQ_API_KEY=your_groq_api_key
GIPHY_API_KEY=your_giphy_api_key

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Neon PostgreSQL
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Upstash Redis
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token
```

**Getting API Keys:**
- Groq: https://console.groq.com (free tier available)
- Giphy: https://developers.giphy.com (free tier available)
- Clerk: https://dashboard.clerk.com (free tier available)
- Neon: https://console.neon.tech (free tier available)
- Upstash: https://console.upstash.com (free tier available)

### Set Up Database

```bash
npx prisma generate
npx prisma migrate dev
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see your changes.

## 📋 Development Workflow

### 1. Create a Branch

Create a new branch for your feature or bugfix:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding tests
- `chore/` - Maintenance tasks

### 2. Make Your Changes

- Write clean, readable code
- Follow the existing code style
- Add comments for complex logic
- Keep commits focused and atomic

### 3. Test Your Changes

- Test the feature manually in the browser
- Ensure no console errors
- Test on both desktop and mobile viewports
- Verify authentication flows work correctly

### 4. Commit Your Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add copy-to-clipboard fallback for share button"
```

**Commit message format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title describing the change
- Detailed description of what and why
- Screenshots/GIFs for UI changes
- Reference any related issues

## 🎨 Code Style Guidelines

### TypeScript/React

- Use TypeScript for all new code
- Prefer functional components with hooks
- Use explicit types (avoid `any`)
- Extract reusable logic into custom hooks or utilities

**Good:**
```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function CustomButton({ label, onClick }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}
```

**Bad:**
```tsx
export function CustomButton(props: any) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### Server Components vs Client Components

- **Default to Server Components** - Only use `"use client"` when necessary
- **Use Client Components for:**
  - Event handlers (onClick, onChange, etc.)
  - Browser APIs (localStorage, navigator, etc.)
  - React hooks (useState, useEffect, etc.)
  - Third-party client libraries

### Styling

- Use Tailwind CSS utility classes
- Follow mobile-first responsive design
- Use the `cn()` helper for conditional classes
- Maintain consistent spacing and sizing

**Good:**
```tsx
<div className={cn(
  "flex items-center gap-2",
  isActive && "bg-primary text-primary-foreground"
)}>
```

### File Organization

- Keep components small and focused
- Extract shared logic into `lib/` utilities
- Use meaningful file and variable names
- Group related files together

## 🧪 Testing Guidelines

While we don't have automated tests yet, please manually test:

1. **Authentication flows**
   - Sign in/sign out
   - Anonymous trial generation
   - Rate limiting after trial

2. **GIF generation**
   - All 3 perspectives generate correctly
   - Error handling for failed searches
   - Loading states display properly

3. **Share functionality**
   - Native share on mobile
   - Clipboard fallback on desktop
   - Toast notifications appear

4. **History page**
   - Generations display correctly
   - Pagination works
   - Share/download from history

5. **Responsive design**
   - Mobile (320px - 768px)
   - Tablet (768px - 1024px)
   - Desktop (1024px+)

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. **Description** - Clear description of the bug
2. **Steps to reproduce** - Exact steps to trigger the bug
3. **Expected behavior** - What should happen
4. **Actual behavior** - What actually happens
5. **Screenshots** - If applicable
6. **Environment** - Browser, OS, device type
7. **Console errors** - Any error messages

**Use this template:**

```markdown
## Bug Description
[Clear description]

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Screenshots
[If applicable]

## Environment
- Browser: Chrome 120
- OS: Windows 11
- Device: Desktop

## Console Errors
```
[Paste any console errors]
```
```

## 💡 Feature Requests

When suggesting features, please include:

1. **Problem statement** - What problem does this solve?
2. **Proposed solution** - How would it work?
3. **Alternatives considered** - Other approaches you thought of
4. **Additional context** - Screenshots, mockups, examples

## 🔍 Code Review Process

All submissions require review. We use GitHub pull requests for this purpose:

1. Maintainers will review your PR
2. They may request changes
3. Make requested changes and push to your branch
4. Once approved, a maintainer will merge your PR

**What we look for:**
- Code quality and readability
- Adherence to project conventions
- Proper error handling
- No breaking changes (unless discussed)
- Performance considerations

## 📝 Documentation

When adding features, please update:

- README.md (if user-facing)
- Code comments (for complex logic)
- JSDoc comments (for utility functions)
- CLAUDE.md (if relevant for AI context)

## 🎯 Priority Areas

We're especially interested in contributions for:

- 🧪 **Testing** - Add unit/integration tests
- ♿ **Accessibility** - Improve keyboard navigation, ARIA labels
- 🌍 **Internationalization** - Add multi-language support
- ⚡ **Performance** - Optimize bundle size, loading times
- 🎨 **UI/UX** - Improve animations, transitions, layouts
- 📱 **Mobile** - Enhance mobile experience
- 🔒 **Security** - Identify and fix security issues

## ❓ Questions?

- Open an issue with the `question` label
- Check existing issues for similar questions
- Review the [README.md](README.md) and [CLAUDE.md](CLAUDE.md)

## 🙏 Thank You!

Your contributions make ReactiGIF better for everyone. We appreciate your time and effort!

## 📜 Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.

### Our Standards

**Positive behavior includes:**
- Being respectful and inclusive
- Accepting constructive criticism gracefully
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**
- Harassment or discriminatory language
- Trolling or insulting comments
- Publishing others' private information
- Any conduct inappropriate in a professional setting

### Enforcement

Instances of unacceptable behavior may be reported to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

---

**Happy Contributing! 🎉**


# Contributing to Chai Builder SDK

Thank you for your interest in contributing to Chai Builder SDK! We welcome all types of contributions, including bug reports, feature suggestions, documentation improvements, and code contributions.

## Quick Start

### Prerequisites

- Node.js (version 21 or later)
- pnpm (version 9.10.0 or later)

### Setup

1. Install Node.js 21+:

   ```bash
   nvm install 21
   nvm use 21
   ```

2. Install pnpm globally:

   ```bash
   npm install -g pnpm@9.10.0
   ```

3. Clone the repository:

   ```bash
   git clone https://github.com/chaibuilder/sdk.git
   cd sdk
   ```

4. Install dependencies:

   ```bash
   pnpm install
   ```

5. Run the build script:

   ```bash
   pnpm run build
   ```

6. Start the development server:

   ```bash
   pnpm dev
   ```

7. Open `http://localhost:5173/` in your browser to see the builder in action.

## Development Workflow

### Available Scripts

- **Development**: `pnpm dev` - Start the Vite development server
- **Build**: `pnpm build` - Build the library for production
- **Live Build**: `pnpm live` - Build for live demo
- **Linting**: `pnpm lint` - Check for linting errors
- **Linting (errors only)**: `pnpm lint:errors` - Show only errors
- **Testing**: `pnpm test` - Run unit tests
- **Test Watch**: `pnpm test:watch` - Run tests in watch mode
- **Test Coverage**: `pnpm test:coverage` - Generate test coverage report
- **E2E Tests**: `pnpm e2e` - Run Playwright end-to-end tests
- **E2E UI**: `pnpm e2e:ui` - Run E2E tests in UI mode
- **Preview**: `pnpm preview` - Preview production build locally

### Code Style

We use ESLint for linting and Prettier for code formatting. Code style is enforced via Husky pre-commit hooks:

- Run `pnpm lint` to check for linting errors
- Prettier formatting is automatically applied on commit
- We recommend using ESLint and Prettier extensions in your editor for real-time feedback

Full documentation is available at [docs.chaibuilder.com](https://docs.chaibuilder.com/).

## Project Structure

- `src/core/` - Core builder components and logic
- `src/components/` - UI components (shadcn/ui based)
- `src/actions/` - Server actions and database operations
- `src/express/` - Express.js integration for development
- `frameworks/nextjs/` - Next.js specific implementation
- `docs/` - Documentation source files
- `e2e_tests/` - End-to-end tests

## Testing

We use Vitest for unit tests and Playwright for E2E tests:

- Write unit tests for new features and bug fixes
- Add E2E tests for critical user flows
- Ensure all tests pass before submitting a PR

## Pull Requests

When submitting a pull request:

- Target your PR to the `dev` branch
- Clearly describe the problem and solution
- Include the relevant issue number if applicable
- Add tests for new features or bug fixes
- Ensure all tests pass and linting is clean
- Follow the existing code style and conventions

If you're a first-time contributor, consider starting a discussion or opening an issue related to your changes before submitting a PR. This helps with collaboration and prevents duplicate work.

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. This is enforced via commitlint:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks
- `refactor:` - Code refactoring
- `test:` - Test updates
- `style:` - Code style changes

Example: `feat: add custom block registration API`

## Questions?

If you have any questions, please:

- [Open an issue](https://github.com/chaibuilder/sdk/issues) for bugs or feature requests
- [Start a discussion](https://github.com/chaibuilder/sdk/discussions) for general questions
- Check the [documentation](https://docs.chaibuilder.com/) first

Search existing issues and discussions to avoid duplicates.

## Thank You

Your contributions to open source, no matter how small, make projects like Chai Builder possible. Thank you for taking the time to contribute and help us build a better visual builder for the React community!

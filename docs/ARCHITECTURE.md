# 🏗️ DoramaFlix - Architecture Documentation

## 📋 Overview

DoramaFlix is a Netflix-like streaming platform built with Clean Architecture principles, designed for scalability, maintainability, and high performance.

## 🗂️ Project Structure

```
doramaflix/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── application/        # Application layer (Use Cases)
│   │   │   ├── controllers/    # HTTP controllers
│   │   │   ├── services/       # Application services
│   │   │   └── middlewares/    # Express middlewares
│   │   ├── domain/            # Domain layer (Business Logic)
│   │   │   ├── entities/      # Domain entities
│   │   │   ├── repositories/  # Repository interfaces
│   │   │   └── services/      # Domain services
│   │   ├── infrastructure/    # Infrastructure layer
│   │   │   ├── database/      # Database implementations
│   │   │   ├── storage/       # File storage (R2/S3)
│   │   │   ├── queues/        # RabbitMQ/Redis queues
│   │   │   └── external/      # External APIs (Stripe, etc.)
│   │   ├── presentation/      # Presentation layer
│   │   │   ├── routes/        # API routes
│   │   │   └── validators/    # Request validators
│   │   └── shared/           # Shared utilities
│   │       ├── config/       # Configuration
│   │       ├── utils/        # Helper functions
│   │       └── constants/    # Constants
│   ├── tests/                # Tests
│   ├── docs/                 # Backend documentation
│   └── scripts/              # Build/deployment scripts
├── frontend/                 # React + Tailwind frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── common/       # Shared components
│   │   │   ├── auth/         # Authentication components
│   │   │   ├── video/        # Video player components
│   │   │   └── admin/        # Admin panel components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   ├── store/           # State management
│   │   ├── utils/           # Utility functions
│   │   └── types/           # TypeScript types
│   ├── public/              # Static assets
│   └── tests/               # Frontend tests
├── database/                # Database related files
│   ├── migrations/          # Database migrations
│   ├── seeds/              # Seed data
│   └── scripts/            # Database scripts
├── docker/                 # Docker configurations
├── docs/                   # Project documentation
└── scripts/                # Project scripts
```

## 🏛️ Clean Architecture Layers

### 1. Domain Layer (Core Business Logic)
- **Entities**: Core business objects (User, Course, Episode, etc.)
- **Repository Interfaces**: Contracts for data access
- **Domain Services**: Complex business logic that doesn't belong to entities
- **Value Objects**: Immutable objects that represent domain concepts

### 2. Application Layer (Use Cases)
- **Controllers**: Handle HTTP requests/responses
- **Services**: Orchestrate domain operations
- **DTOs**: Data Transfer Objects for API communication
- **Middlewares**: Cross-cutting concerns (auth, logging, etc.)

### 3. Infrastructure Layer (External Dependencies)
- **Database**: PostgreSQL implementations
- **Storage**: Cloudflare R2/AWS S3 implementations
- **Queues**: Redis/RabbitMQ implementations
- **External APIs**: Stripe, MercadoPago, etc.

### 4. Presentation Layer (API Interface)
- **Routes**: Express route definitions
- **Validators**: Request/response validation
- **Serializers**: Data formatting for API responses

## 🎯 Design Principles

### 1. Dependency Inversion
- High-level modules don't depend on low-level modules
- Both depend on abstractions (interfaces)
- Abstractions don't depend on details

### 2. Single Responsibility
- Each class/module has one reason to change
- Clear separation of concerns

### 3. Open/Closed Principle
- Open for extension, closed for modification
- Use interfaces and dependency injection

### 4. Interface Segregation
- Clients shouldn't depend on interfaces they don't use
- Many specific interfaces over one general interface

## 🔧 Technology Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15+
- **ORM**: Prisma or TypeORM
- **Cache**: Redis
- **Queue**: RabbitMQ
- **Authentication**: JWT
- **File Storage**: Cloudflare R2 / AWS S3
- **Payments**: Stripe / MercadoPago
- **Testing**: Jest + Supertest

### Frontend
- **Framework**: React 18+ / Next.js 14+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand / Redux Toolkit
- **HTTP Client**: Axios / Fetch
- **Video Player**: Video.js / React Player
- **Forms**: React Hook Form + Zod
- **Testing**: Jest + React Testing Library

### DevOps
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Deployment**: Railway / Vercel
- **Monitoring**: DataDog / Grafana
- **Logging**: Winston / Logtail

## 📊 Database Design

### Core Entities
- **Users**: Authentication and user management
- **Courses**: Course/series information
- **Categories**: Content categorization
- **Seasons**: Season grouping for series
- **Episodes**: Individual video content
- **Subscriptions**: User subscription management
- **Payments**: Payment tracking
- **Progress**: User viewing progress
- **Logs**: System activity logs

### Relationships
- User → Subscriptions (1:N)
- User → Progress (1:N)
- Course → Categories (N:M)
- Course → Seasons (1:N)
- Season → Episodes (1:N)
- User → Payments (1:N)

## 🔐 Security Considerations

### Authentication & Authorization
- JWT tokens with refresh mechanism
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Rate limiting on API endpoints

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Environment variable management

### File Security
- Secure file upload validation
- Virus scanning for uploads
- CDN with access controls
- Signed URLs for private content

## 🚀 Performance Optimization

### Backend
- Database indexing strategy
- Query optimization
- Redis caching layer
- Connection pooling
- Async/await patterns
- Background job processing

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Bundle size monitoring
- CDN utilization
- Service worker caching

## 📈 Scalability Strategy

### Horizontal Scaling
- Stateless application design
- Load balancer ready
- Database read replicas
- Microservices architecture preparation

### Caching Strategy
- Redis for session storage
- CDN for static assets
- Application-level caching
- Database query caching

### Queue System
- Background job processing
- Email notifications
- File processing
- Payment webhooks
- Video transcoding

## 🧪 Testing Strategy

### Backend Testing
- Unit tests for domain logic
- Integration tests for APIs
- E2E tests for critical flows
- Performance testing
- Security testing

### Frontend Testing
- Component unit tests
- Integration tests
- E2E tests with Playwright
- Visual regression tests
- Accessibility testing

## 📝 Code Standards

### TypeScript
- Strict mode enabled
- Explicit return types
- No any types
- Consistent naming conventions

### Code Quality
- ESLint for linting
- Prettier for formatting
- Husky for pre-commit hooks
- SonarQube for code quality

### Git Workflow
- Feature branch strategy
- Conventional commits
- Pull request reviews
- Automated CI/CD pipeline

## 🔍 Monitoring & Observability

### Logging
- Structured logging with Winston
- Log levels (error, warn, info, debug)
- Centralized log aggregation
- Error tracking with Sentry

### Metrics
- Application performance metrics
- Business metrics (users, views, revenue)
- Infrastructure metrics
- Custom dashboards

### Health Checks
- Application health endpoints
- Database connectivity checks
- External service status
- Automated alerting

## 🚀 Deployment Strategy

### Environments
- **Development**: Local development
- **Staging**: Pre-production testing
- **Production**: Live environment

### CI/CD Pipeline
1. Code commit triggers pipeline
2. Run tests and quality checks
3. Build Docker images
4. Deploy to staging
5. Run E2E tests
6. Deploy to production
7. Monitor deployment

### Infrastructure as Code
- Docker Compose for local development
- Kubernetes manifests for production
- Environment configuration management
- Automated backups and disaster recovery
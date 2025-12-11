# AYNI - API Backend

API RESTful desarrollada con NestJS para el sistema de gestión del sistema de lineas de vida.

## 🚀 Tecnologías

- **NestJS 11** - Framework Node.js progresivo
- **TypeScript 5** - Lenguaje tipado
- **TypeORM 0.3** - ORM para Node.js
- **PostgreSQL** - Base de datos relacional
- **JWT** - Autenticación basada en tokens
- **Passport** - Middleware de autenticación
- **Swagger/OpenAPI** - Documentación de API
- **AWS S3** - Almacenamiento de archivos
- **Sharp** - Procesamiento de imágenes
- **PDFKit** - Generación de PDFs
- **Docker** - Containerización

## 📋 Requisitos Previos

- Node.js 20+
- PostgreSQL 14+
- npm o yarn
- Docker (opcional)

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone <repository-url>

# Instalar dependencias
npm install
```

## ⚙️ Configuración

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=ayni_db

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3001
CORS_CREDENTIALS=true

# Application
PORT=3000
NODE_ENV=development
```

## 🗄️ Base de Datos

### Crear la base de datos

```bash
createdb ayni_db
```

### Ejecutar migraciones

```bash
npm run migration:run
```

### Generar nueva migración

```bash
npm run migration:generate -- src/migrations/NombreDeMigracion
```

### Revertir migración

```bash
npm run migration:revert
```

### Ver estado de migraciones

```bash
npm run migration:show
```

### Restaurar backup

```bash
psql ayni_db < backups/ayni_backup.sql
```

## 🏃 Ejecutar la Aplicación

### Modo Desarrollo

```bash
npm run start:dev
```

La API estará disponible en `http://localhost:3000`

### Modo Producción

```bash
npm run build
npm run start:prod
```

### Modo Debug

```bash
npm run start:debug
```

## 🐳 Docker

### Build de la imagen

```bash
docker build -t ayni-api .
```

### Ejecutar con Docker Compose

```bash
docker-compose up -d
```

Esto levantará tanto la API como la base de datos PostgreSQL.

## 📁 Estructura del Proyecto

```
src/
├── accidents/                   # Gestión de accidentes
├── alerts/                      # Sistema de alertas
├── auth/                        # Autenticación y autorización
│   ├── decorators/             # Decoradores personalizados
│   ├── entities/               # Entidades de sesión
│   ├── guards/                 # Guards de autenticación
│   └── jwt.strategy.ts         # Estrategia JWT
├── authorization-codes/         # Códigos de autorización
├── common/                      # DTOs y utilidades comunes
│   ├── dto/                    # DTOs compartidos
│   ├── interfaces/             # Interfaces comunes
│   └── validators/             # Validadores personalizados
├── config/                      # Configuraciones
│   ├── cors.config.ts          # Configuración CORS
│   └── typeorm.config.ts       # Configuración TypeORM
├── maintenance/                 # Mantenimiento de equipos
├── purchase-orders/             # Órdenes de compra
├── record-images/               # Gestión de imágenes de registros
├── record-movement-history/     # Historial de movimientos
├── record-relationships/        # Relaciones entre registros
├── record-status-history/       # Historial de estados
├── records/                     # Registros de activos
├── reports/                     # Generación de reportes
├── schedules/                   # Tareas programadas
├── shared/                      # Servicios compartidos
├── users/                       # Gestión de usuarios
├── app.module.ts               # Módulo principal
└── main.ts                     # Punto de entrada
```

## 📚 Documentación API (Swagger)

Una vez iniciada la aplicación, accede a la documentación interactiva:

```
http://localhost:3000/api/docs
```

## 🔐 Autenticación

La API utiliza **JWT (JSON Web Tokens)** para autenticación:

1. **Login**: `POST /auth/login`
   - Body: `{ username, password }`
   - Response: `{ access_token, user }`

2. **Uso del Token**: Incluir en headers:

   ```
   Authorization: Bearer <token>
   ```

3. **Endpoints Protegidos**: Requieren token válido

## 🛡️ Autorización

Sistema de roles y permisos implementado con guards personalizados:

- `JwtAuthGuard` - Verifica token JWT
- `RolesGuard` - Verifica roles del usuario
- Decorador `@Roles()` - Define roles permitidos

## 📦 Módulos Principales

### 🔐 Auth Module

- Login/Logout
- Gestión de sesiones
- Refresh tokens
- Limpieza automática de sesiones expiradas

### 👥 Users Module

- CRUD de usuarios
- Gestión de roles
- Seed inicial de usuarios

### 📋 Records Module

- Gestión de activos/equipos
- Historial de cambios
- Relaciones entre registros
- Gestión de imágenes (AWS S3)

### 🛠️ Maintenance Module

- Programación de mantenimientos
- Seguimiento de mantenimientos
- Alertas de mantenimiento

### 📦 Purchase Orders Module

- Creación y gestión de órdenes de compra
- Estados de órdenes
- Códigos de autorización

### ⚠️ Accidents Module

- Registro de accidentes
- Seguimiento y reportes

### 📊 Reports Module

- Generación de PDFs
- Reportes de activos
- Exportación de datos

### 🔔 Alerts Module

- Sistema de notificaciones
- Alertas programadas
- Email notifications

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 🔧 Scripts Disponibles

- `npm run start` - Inicia la aplicación
- `npm run start:dev` - Modo desarrollo con hot-reload
- `npm run start:debug` - Modo debug
- `npm run start:prod` - Modo producción
- `npm run build` - Compila el proyecto
- `npm run lint` - Ejecuta ESLint
- `npm run format` - Formatea el código con Prettier
- `npm run test` - Ejecuta tests unitarios
- `npm run test:e2e` - Ejecuta tests end-to-end

## 📊 Dependencias Principales

### Core

- `@nestjs/common` - Módulos comunes de NestJS
- `@nestjs/core` - Core de NestJS
- `@nestjs/platform-express` - Plataforma Express

### Database

- `@nestjs/typeorm` - Integración TypeORM
- `typeorm` - ORM
- `pg` - Driver PostgreSQL

### Authentication

- `@nestjs/jwt` - JWT para NestJS
- `@nestjs/passport` - Integración Passport
- `passport-jwt` - Estrategia JWT
- `bcryptjs` - Hash de passwords

### Storage & Files

- `@aws-sdk/client-s3` - Cliente AWS S3
- `sharp` - Procesamiento de imágenes
- `multer` - Upload de archivos
- `pdfkit` - Generación de PDFs

### Validation & Documentation

- `class-validator` - Validación de DTOs
- `class-transformer` - Transformación de objetos
- `@nestjs/swagger` - Documentación OpenAPI

### Utilities

- `@nestjs/config` - Gestión de configuración
- `@nestjs/schedule` - Tareas programadas
- `@nestjs/throttler` - Rate limiting
- `uuid` - Generación de UUIDs

## 🔒 Seguridad

- **CORS** configurado con whitelist
- **Rate Limiting** implementado
- **Helmet** para headers de seguridad
- **Validation Pipes** para validación de datos
- **JWT** para autenticación stateless
- **Bcrypt** para hash de contraseñas
- **Guards** personalizados para autorización

## 📈 Performance

- **Database Indexing** en campos críticos
- **Eager/Lazy Loading** optimizado
- **Query Optimization** con QueryBuilder
- **Caching** strategies
- **Connection Pooling** configurado

## 🔍 Logging

Sistema de logging integrado con niveles:

- `error` - Errores críticos
- `warn` - Advertencias
- `log` - Información general
- `debug` - Debugging
- `verbose` - Detalle exhaustivo

## 🚀 Deployment

### Variables de Entorno en Producción

Asegúrate de configurar todas las variables de entorno necesarias en tu servidor:

```bash
NODE_ENV=production
PORT=3000
# ... resto de variables
```

### PM2 (Recomendado)

```bash
npm install -g pm2
pm2 start dist/main.js --name ayni-api
pm2 save
pm2 startup
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

## 👥 Equipo

Desarrollado por el equipo de AYNI.

## 📞 Soporte

Para soporte técnico, contactar al equipo de desarrollo.

## 🔄 Versiones

- **v0.0.1** - Versión inicial

## 📝 Changelog

Ver archivo `CHANGELOG.md` para detalles de cambios entre versiones.

---

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

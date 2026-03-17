import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Orbit-V API',
      version: '1.0.0',
      description: 'API documentation for Orbit-V backend',
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development Server',
      },
      {
        url: 'https://orbit-v-backend.onrender.com', // Replace with production URL if known
        description: 'Production Server',
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
        }
      },
    },
    security: [
      {
        bearerAuth: [],
      },
      {
        cookieAuth: [],
      }
    ],
  },
  apis: ['./src/routes/*.js', './src/models/*.js'], // Files containing annotations
};

export const swaggerSpec = swaggerJsdoc(options);

import { Controller, Get, Res } from '@nestjs/common'
import { Response } from 'express'
import { apiReference } from '@scalar/nestjs-api-reference'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { INestApplication } from '@nestjs/common'

@Controller('docs')
export class DocsController {
  private app: INestApplication

  setApp(app: INestApplication) {
    this.app = app
  }

  @Get()
  getDocs(@Res() res: Response) {
    if (!this.app) {
      return res.status(500).send('Application not initialized')
    }

    // Generate OpenAPI document using Swagger
    const config = new DocumentBuilder()
      .setTitle('API Documentation')
      .setDescription('API documentation for the project')
      .setVersion('1.0')
      .addTag('reddit', 'Reddit API endpoints')
      .addTag('request-builder', 'Request Builder endpoints')
      .addTag('trend-analysis', 'Trend Analysis endpoints')
      .build()

    const document = SwaggerModule.createDocument(this.app, config)

    const scalarDocs = apiReference({
      theme: 'default',
      layout: 'modern',
      spec: {
        content: JSON.stringify(document),
      },
    })

    return scalarDocs(null, res)
  }
}
